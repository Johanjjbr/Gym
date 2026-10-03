/**
 * Edge function "server" (Hono).
 *
 * Seguridad multi-gimnasio (migraciones 44-47):
 *  - Todas las rutas de datos exigen un token de sesión válido.
 *  - Las consultas usan un cliente con el token del usuario (no la service role),
 *    así RLS limita los datos a su empresa.
 *  - La service role solo se usa para operaciones de Auth (crear/borrar cuentas)
 *    y para leer el registro de staff tras un login con contraseña.
 */
import { Hono, type Context } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type Vars = { db: SupabaseClient; authUserId: string };
type C = Context<{ Variables: Vars }>;

const app = new Hono<{ Variables: Vars }>().basePath('/server');

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

/** Cliente de servicio: SOLO para Auth admin y lectura del staff tras login. */
const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Cliente con el token del usuario: aplica RLS. */
function userClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const bearer = (c: Context) => c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
const db = (c: C) => c.get('db');

const STAFF_ROLES = ['Dueño', 'Administrador', 'Entrenador', 'Recepción'];
/** Campos que nunca se aceptan desde el cliente. */
const strip = <T extends Record<string, unknown>>(o: T) => {
  const { organization_id: _o, auth_user_id: _a, is_super_admin: _s, ...rest } = o ?? {};
  return rest;
};

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Rutas que no requieren sesión
const PUBLIC_ROUTES = new Set(['/health', '/auth/login', '/payments/process-recurring', '/seed']);

app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next();
  const route = c.req.path.replace(/^\/server/, '') || '/';
  if (PUBLIC_ROUTES.has(route)) return next();

  const token = bearer(c);
  if (!token || token === supabaseAnonKey) return c.json({ error: 'Inicia sesión para continuar' }, 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return c.json({ error: 'Sesión inválida o vencida' }, 401);

  c.set('db', userClient(token));
  c.set('authUserId', data.user.id);
  await next();
});

/** Staff que hace la petición (visto con su propio token). */
async function currentStaff(c: C) {
  const { data } = await db(c)
    .from('staff')
    .select('id, role, status, organization_id, gym_id, is_super_admin')
    .eq('auth_user_id', c.get('authUserId'))
    .maybeSingle();
  return data && data.status === 'Activo' ? data : null;
}

app.get("/health", (c) => c.json({ status: "ok" }));

// =============================================
// AUTH
// =============================================

/** Crea una cuenta de staff en la empresa activa (la del cliente si el súper admin está en modo soporte). */
async function createStaffAccount(c: C) {
  const { email, password, name, role, phone, shift, gym_id } = await c.req.json();
  const me = await currentStaff(c);
  if (!me || !(me.role === 'Dueño' || me.role === 'Administrador' || me.is_super_admin)) {
    return { status: 403 as const, body: { error: 'Solo el Dueño o Administración pueden crear personal' } };
  }
  if (!STAFF_ROLES.includes(role)) return { status: 400 as const, body: { error: 'Rol inválido' } };
  if (role === 'Dueño' && me.role !== 'Dueño' && !me.is_super_admin) {
    return { status: 403 as const, body: { error: 'Solo el Dueño puede nombrar a otro Dueño' } };
  }
  if (!email || !password || !name) return { status: 400 as const, body: { error: 'Nombre, correo y contraseña son requeridos' } };

  const [{ data: orgId }, { data: currentGym }] = await Promise.all([
    db(c).rpc('current_org_id'),
    db(c).rpc('current_gym_id'),
  ]);
  if (!orgId) return { status: 400 as const, body: { error: 'No se pudo determinar la empresa' } };
  let branch = currentGym as string | null;
  if (gym_id) {
    // RLS: solo sedes de la empresa activa
    const { data: g } = await db(c).from('gyms').select('id').eq('id', gym_id).maybeSingle();
    if (!g) return { status: 400 as const, body: { error: 'Sede inválida' } };
    branch = g.id;
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name, role },
  });
  if (authError) return { status: 400 as const, body: { error: authError.message } };

  const { data: staffData, error: staffError } = await admin
    .from('staff')
    .insert({
      auth_user_id: authData.user.id, name, role, email, phone,
      shift: shift || 'No asignado', status: 'Activo',
      organization_id: orgId, gym_id: branch,
    })
    .select()
    .single();
  if (staffError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { status: 400 as const, body: { error: staffError.message } };
  }
  return { status: 200 as const, body: { user: authData.user, staff: staffData } };
}

app.post("/auth/signup", async (c) => {
  try {
    const r = await createStaffAccount(c);
    if (r.status !== 200) return c.json(r.body, r.status);
    return c.json({ message: 'Usuario creado exitosamente', ...r.body });
  } catch {
    return c.json({ error: 'Error al crear usuario' }, 500);
  }
});

app.post("/auth/login", async (c) => {
  try {
    let email, password;
    try { ({ email, password } = await c.req.json()); } catch { return c.json({ error: 'JSON inválido en body' }, 400); }
    const authUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
      body: JSON.stringify({ email, password }),
    });
    const authData = await authResponse.json().catch(() => null);
    if (!authData) return c.json({ error: 'Error de autenticación' }, 500);
    if (!authResponse.ok) return c.json({ error: authData.error_description || authData.msg || 'Credenciales inválidas' }, 401);
    const { data: staffData, error: staffError } = await admin
      .from('staff').select('*').eq('auth_user_id', authData.user.id).single();
    if (staffError) return c.json({ error: 'Usuario no encontrado en staff' }, 404);
    return c.json({ session: { access_token: authData.access_token, refresh_token: authData.refresh_token }, user: authData.user, staff: staffData });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Error al iniciar sesión' }, 500);
  }
});

app.get("/auth/session", async (c) => {
  try {
    const { data: { user } } = await admin.auth.getUser(bearer(c));
    const { data: staffData } = await db(c).from('staff').select('*').eq('auth_user_id', c.get('authUserId')).maybeSingle();
    return c.json({ user, staff: staffData || null });
  } catch {
    return c.json({ error: 'Error verificando sesión' }, 500);
  }
});

app.post("/auth/logout", async (c) => {
  try {
    const { error } = await admin.auth.admin.signOut(bearer(c));
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ message: 'Logout exitoso' });
  } catch {
    return c.json({ error: 'Error al cerrar sesión' }, 500);
  }
});

// =============================================
// SOCIOS
// =============================================

app.get("/users", async (c) => {
  try {
    const { data, error } = await db(c)
      .from('users').select('*, trainer:staff!users_assigned_trainer_fkey (id, name, role)').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data?.map((u) => ({ ...u, trainer_name: u.trainer?.name || null, trainer: undefined })));
  } catch {
    return c.json({ error: 'Error obteniendo usuarios' }, 500);
  }
});

app.get("/users/without-trainer", async (c) => {
  try {
    const { data, error } = await db(c)
      .from('users').select('id, name, email, phone, member_number, status, plan').is('assigned_trainer', null).eq('status', 'Activo').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo usuarios sin entrenador' }, 500);
  }
});

app.get("/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await db(c)
      .from('users').select('*, trainer:staff!users_assigned_trainer_fkey (id, name, role)').eq('id', id).single();
    if (error) throw error;
    return c.json({ ...data, trainer_name: data.trainer?.name || null, trainer: undefined });
  } catch {
    return c.json({ error: 'Error obteniendo usuario' }, 500);
  }
});

app.post("/users", async (c) => {
  try {
    const userData = strip(await c.req.json());
    const memberNumber = `GYM-${Date.now().toString().slice(-6)}`;
    const { data, error } = await db(c).from('users').insert({ ...userData, member_number: memberNumber }).select().single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error creando usuario' }, 500);
  }
});

app.put("/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const userData = strip(await c.req.json());
    const { data, error } = await db(c).from('users').update(userData).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error actualizando usuario' }, 500);
  }
});

app.delete("/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await db(c).from('users').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) return c.json({ error: 'No tienes permiso o el socio no existe' }, 403);
    return c.json({ message: 'Usuario eliminado' });
  } catch {
    return c.json({ error: 'Error eliminando usuario' }, 500);
  }
});

app.post("/users/:id/assign-trainer", async (c) => {
  try {
    const userId = c.req.param('id');
    const { trainer_id } = await c.req.json();
    if (trainer_id) {
      const { data: trainer, error: trainerError } = await db(c)
        .from('staff').select('id').eq('id', trainer_id).eq('role', 'Entrenador').single();
      if (trainerError || !trainer) return c.json({ error: 'Entrenador no encontrado o inválido' }, 400);
    }
    const { data, error } = await db(c)
      .from('users').update({ assigned_trainer: trainer_id || null }).eq('id', userId)
      .select('*, trainer:staff!users_assigned_trainer_fkey (id, name, role)').single();
    if (error) throw error;
    return c.json({ ...data, trainer_name: data.trainer?.name || null, trainer: undefined });
  } catch {
    return c.json({ error: 'Error asignando entrenador' }, 500);
  }
});

app.get("/trainers", async (c) => {
  try {
    const { data, error } = await db(c)
      .from('staff').select('id, name, email, phone, shift, status').eq('role', 'Entrenador').eq('status', 'Activo').order('name');
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo entrenadores' }, 500);
  }
});

// =============================================
// PAGOS
// =============================================

app.get("/payments", async (c) => {
  try {
    const { user_id } = c.req.query();
    let query = db(c).from('payments').select('*, users (name, member_number)').order('date', { ascending: false });
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo pagos' }, 500);
  }
});

app.get("/users/:userId/payments", async (c) => {
  try {
    const { data, error } = await db(c)
      .from('payments').select('*, users (name, member_number)').eq('user_id', c.req.param('userId')).order('date', { ascending: false });
    if (error) throw error;
    return c.json(data || []);
  } catch {
    return c.json({ error: 'Error obteniendo pagos del usuario' }, 500);
  }
});

app.post("/payments", async (c) => {
  try {
    const paymentData = strip(await c.req.json());
    const { data, error } = await db(c).from('payments').insert(paymentData).select().single();
    if (error) throw error;
    if (paymentData.user_id && paymentData.next_payment) {
      await db(c).from('users').update({ next_payment: paymentData.next_payment, status: 'Activo' }).eq('id', paymentData.user_id);
    }
    return c.json(data);
  } catch {
    return c.json({ error: 'Error creando pago' }, 500);
  }
});

// Reemplazado por la facturación diaria en la base de datos (run_daily_billing)
app.post("/payments/process-recurring", (c) =>
  c.json({ error: 'La facturación recurrente ahora corre automáticamente en la base de datos' }, 410));

// =============================================
// PLANES
// =============================================

app.get("/plans", async (c) => {
  try {
    const { is_active, type } = c.req.query();
    let query = db(c).from('plans').select('*').order('duration_days');
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo planes' }, 500);
  }
});

app.get("/plans/:id", async (c) => {
  try {
    const { data, error } = await db(c).from('plans').select('*').eq('id', c.req.param('id')).single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo plan' }, 500);
  }
});

app.post("/plans", async (c) => {
  try {
    const { data, error } = await db(c).from('plans').insert(strip(await c.req.json())).select().single();
    if (error) {
      if (error.code === '23505') return c.json({ error: 'Ya existe un plan con ese nombre' }, 409);
      throw error;
    }
    return c.json(data);
  } catch {
    return c.json({ error: 'Error creando plan' }, 500);
  }
});

app.put("/plans/:id", async (c) => {
  try {
    const planData = strip(await c.req.json());
    const { data, error } = await db(c).from('plans').update({ ...planData, updated_at: new Date().toISOString() }).eq('id', c.req.param('id')).select().single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error actualizando plan' }, 500);
  }
});

app.delete("/plans/:id", async (c) => {
  try {
    const { data, error } = await db(c).from('plans').delete().eq('id', c.req.param('id')).select('id');
    if (error) throw error;
    if (!data?.length) return c.json({ error: 'No tienes permiso o el plan no existe' }, 403);
    return c.json({ message: 'Plan eliminado' });
  } catch {
    return c.json({ error: 'Error eliminando plan' }, 500);
  }
});

// =============================================
// PERSONAL
// =============================================

app.get("/staff", async (c) => {
  try {
    const { data, error } = await db(c).from('staff').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo staff' }, 500);
  }
});

app.get("/staff/:id", async (c) => {
  try {
    const { data, error } = await db(c).from('staff').select('*').eq('id', c.req.param('id')).single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo staff' }, 500);
  }
});

app.post("/staff", async (c) => {
  try {
    const r = await createStaffAccount(c);
    if (r.status !== 200) return c.json(r.body, r.status);
    return c.json(r.body.staff);
  } catch {
    return c.json({ error: 'Error creando staff' }, 500);
  }
});

app.put("/staff/:id", async (c) => {
  try {
    const body = strip(await c.req.json());
    if (body.role !== undefined && !STAFF_ROLES.includes(body.role as string)) return c.json({ error: 'Rol inválido' }, 400);
    const { data, error } = await db(c).from('staff').update(body).eq('id', c.req.param('id')).select().single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json(data);
  } catch {
    return c.json({ error: 'Error actualizando staff' }, 500);
  }
});

app.delete("/staff/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const me = await currentStaff(c);
    if (me?.id === id) return c.json({ error: 'No puedes eliminar tu propia cuenta' }, 400);
    // RLS decide si puede borrarlo (misma empresa y rol con permiso)
    const { data, error } = await db(c).from('staff').delete().eq('id', id).select('auth_user_id');
    if (error) throw error;
    if (!data?.length) return c.json({ error: 'No tienes permiso o el empleado no existe' }, 403);
    if (data[0].auth_user_id) await admin.auth.admin.deleteUser(data[0].auth_user_id);
    return c.json({ message: 'Empleado eliminado' });
  } catch {
    return c.json({ error: 'Error eliminando staff' }, 500);
  }
});

// =============================================
// ASISTENCIA
// =============================================

app.get("/attendance", async (c) => {
  try {
    const { date } = c.req.query();
    let query = db(c).from('attendance').select('*, users (name, member_number)').order('created_at', { ascending: false });
    if (date) query = query.eq('date', date);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo asistencia' }, 500);
  }
});

async function registerAttendance(c: C, body: any, allowedSources?: string[]) {
  if (!body?.user_id || !body?.type) return c.json({ error: 'user_id y type son requeridos' }, 400);
  if (!['Entrada', 'Salida'].includes(body.type)) return c.json({ error: 'type debe ser Entrada o Salida' }, 400);
  const source = body.source || 'manual';
  if (allowedSources && !allowedSources.includes(source)) {
    return c.json({ error: 'source inválido: manual, qr, fingerprint, nfc' }, 400);
  }
  // Sin fecha/hora explícitas, la base usa la hora de Caracas
  const args: Record<string, unknown> = {
    p_user_id: body.user_id,
    p_type: body.type,
    p_source: source,
    p_device_id: body.device_id || null,
  };
  if (body.date) args.p_date = String(body.date).slice(0, 10);
  if (body.time) args.p_time = body.time;

  const { data: result, error } = await db(c).rpc('register_attendance_atomic', args);
  if (error) {
    console.error('RPC error:', error);
    return c.json({ error: 'Error registrando asistencia' }, 500);
  }
  if (!result.allowed) return c.json({ error: result.reason, details: result }, 409);
  return c.json(result.data);
}

app.post("/attendance", async (c) => {
  try {
    return await registerAttendance(c, await c.req.json());
  } catch {
    return c.json({ error: 'Error registrando asistencia' }, 500);
  }
});

// Para QR, huella y NFC
app.post("/attendance/checkin", async (c) => {
  try {
    return await registerAttendance(c, await c.req.json(), ['manual', 'qr', 'fingerprint', 'nfc']);
  } catch {
    return c.json({ error: 'Error registrando check-in' }, 500);
  }
});

app.get("/attendance/status/:userId", async (c) => {
  try {
    const args: Record<string, unknown> = { p_user_id: c.req.param('userId') };
    const date = c.req.query('date');
    if (date) args.p_date = date;
    const { data, error } = await db(c).rpc('get_user_attendance_status', args);
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo estado' }, 500);
  }
});

// =============================================
// RUTINAS Y EJERCICIOS
// =============================================

const ROUTINE_SELECT = '*, creator:staff!created_by (id, name), exercises:routine_exercises (id, exercise_name, day_of_week, order_index, sets, reps, rest_seconds, notes)';

app.get("/routines", async (c) => {
  try {
    const { data, error } = await db(c).from('routine_templates').select(ROUTINE_SELECT).order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo rutinas' }, 500);
  }
});

app.get("/routines/:id", async (c) => {
  try {
    const { data, error } = await db(c).from('routine_templates').select(ROUTINE_SELECT).eq('id', c.req.param('id')).single();
    if (error) throw error;
    data.exercises?.sort((a: any, b: any) => a.day_of_week !== b.day_of_week ? a.day_of_week - b.day_of_week : a.order_index - b.order_index);
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo rutina' }, 500);
  }
});

app.post("/routines", async (c) => {
  try {
    const { exercises, ...routineData } = await c.req.json();
    const { data: routine, error: routineError } = await db(c).from('routine_templates').insert({ ...strip(routineData), is_active: true }).select().single();
    if (routineError) throw routineError;
    if (exercises?.length) {
      const rows = exercises.map((ex: any) => ({ routine_id: routine.id, exercise_name: ex.exercise_name, day_of_week: ex.day_of_week, order_index: ex.order_index, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds, notes: ex.notes || null }));
      const { error } = await db(c).from('routine_exercises').insert(rows);
      if (error) throw error;
    }
    return c.json(routine);
  } catch {
    return c.json({ error: 'Error creando rutina' }, 500);
  }
});

app.put("/routines/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { exercises, ...routineData } = await c.req.json();
    const { data: updated, error: routineError } = await db(c).from('routine_templates').update(strip(routineData)).eq('id', id).select().single();
    if (routineError) throw routineError;
    if (Array.isArray(exercises)) {
      await db(c).from('routine_exercises').delete().eq('routine_id', id);
      if (exercises.length > 0) {
        const { error } = await db(c).from('routine_exercises').insert(exercises.map((ex: any) => ({ ...ex, routine_id: id })));
        if (error) throw error;
      }
    }
    return c.json({ success: true, message: "Rutina actualizada correctamente", routine: updated });
  } catch {
    return c.json({ error: 'Error actualizando la rutina y sus ejercicios' }, 500);
  }
});

app.delete("/routines/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await db(c).from('routine_exercises').delete().eq('routine_id', id);
    const { error } = await db(c).from('routine_templates').delete().eq('id', id);
    if (error) throw error;
    return c.json({ message: 'Rutina eliminada' });
  } catch {
    return c.json({ error: 'Error eliminando rutina' }, 500);
  }
});

app.get("/exercises", async (c) => {
  try {
    const { data, error } = await db(c).from('exercises').select('*').order('name');
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo ejercicios' }, 500);
  }
});

app.get("/exercises/:id", async (c) => {
  try {
    const { data, error } = await db(c).from('exercises').select('*').eq('id', c.req.param('id')).single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo ejercicio' }, 500);
  }
});

app.post("/exercises", async (c) => {
  try {
    const { data, error } = await db(c).from('exercises').insert(strip(await c.req.json())).select().single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error creando ejercicio' }, 500);
  }
});

app.put("/exercises/:id", async (c) => {
  try {
    const { data, error } = await db(c).from('exercises').update(strip(await c.req.json())).eq('id', c.req.param('id')).select().single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error actualizando ejercicio' }, 500);
  }
});

app.delete("/exercises/:id", async (c) => {
  try {
    const { error } = await db(c).from('exercises').delete().eq('id', c.req.param('id'));
    if (error) throw error;
    return c.json({ message: 'Ejercicio eliminado' });
  } catch {
    return c.json({ error: 'Error eliminando ejercicio' }, 500);
  }
});

app.get("/routine-assignments", async (c) => {
  try {
    const { user_id } = c.req.query();
    let query = db(c)
      .from('user_routine_assignments').select('*, users (name, member_number), routine_templates (name, description, routine_exercises (*)), staff (name)').order('created_at', { ascending: false });
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error obteniendo asignaciones' }, 500);
  }
});

app.post("/routine-assignments", async (c) => {
  try {
    const assignmentData = strip(await c.req.json());
    await db(c).from('user_routine_assignments').update({ is_active: false }).eq('user_id', assignmentData.user_id).eq('is_active', true);
    const { data, error } = await db(c).from('user_routine_assignments').insert(assignmentData).select().single();
    if (error) throw error;
    return c.json(data);
  } catch {
    return c.json({ error: 'Error creando asignación' }, 500);
  }
});

// =============================================
// ESTADÍSTICAS (limitadas a la empresa por RLS)
// =============================================

const caracasToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

app.get("/stats", async (c) => {
  try {
    const q = db(c);
    const count = (t: string) => q.from(t).select('*', { count: 'exact', head: true });
    const { count: totalUsers } = await count('users');
    const { count: activeUsers } = await count('users').eq('status', 'Activo');
    const { count: delinquentUsers } = await count('users').eq('status', 'Moroso');
    const firstDayOfMonth = `${caracasToday().slice(0, 8)}01`;
    const { data: monthlyPayments } = await q.from('payments').select('amount').eq('status', 'Pagado').gte('date', firstDayOfMonth);
    const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const { count: todayAttendance } = await count('attendance').eq('date', caracasToday()).eq('type', 'Entrada');
    const { count: totalStaff } = await count('staff').eq('status', 'Activo');
    return c.json({ totalUsers: totalUsers || 0, activeUsers: activeUsers || 0, delinquentUsers: delinquentUsers || 0, monthlyRevenue, todayAttendance: todayAttendance || 0, totalStaff: totalStaff || 0 });
  } catch {
    return c.json({ error: 'Error obteniendo estadísticas' }, 500);
  }
});

app.get("/stats/revenue-trend", async (c) => {
  try {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - i);
      date.setHours(0, 0, 0, 0);
      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const { data: payments } = await db(c)
        .from('payments').select('amount').eq('status', 'Pagado')
        .gte('date', date.toISOString()).lt('date', nextMonth.toISOString());
      const revenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      months.push({ month: monthNames[date.getMonth()], revenue, year: date.getFullYear() });
    }
    return c.json(months);
  } catch {
    return c.json({ error: 'Error obteniendo tendencia de ingresos' }, 500);
  }
});

app.get("/stats/attendance-trend", async (c) => {
  try {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(`${caracasToday()}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const { count } = await db(c)
        .from('attendance').select('*', { count: 'exact', head: true }).eq('date', dateStr).eq('type', 'Entrada');
      days.push({ day: dayNames[date.getUTCDay()], count: count || 0, date: dateStr });
    }
    return c.json(days);
  } catch {
    return c.json({ error: 'Error obteniendo tendencia de asistencia' }, 500);
  }
});

app.get("/stats/user-status-breakdown", async (c) => {
  try {
    const count = (s: string) => db(c).from('users').select('*', { count: 'exact', head: true }).eq('status', s);
    const { count: activeUsers } = await count('Activo');
    const { count: inactiveUsers } = await count('Inactivo');
    const { count: suspendedUsers } = await count('Suspendido');
    const { count: delinquentUsers } = await count('Moroso');
    return c.json([
      { status: 'Activos', count: activeUsers || 0, color: '#10f94e' },
      { status: 'Inactivos', count: inactiveUsers || 0, color: '#6b7280' },
      { status: 'Suspendidos', count: suspendedUsers || 0, color: '#ff3b5c' },
      { status: 'Morosos', count: delinquentUsers || 0, color: '#f59e0b' },
    ]);
  } catch {
    return c.json({ error: 'Error obteniendo desglose de usuarios' }, 500);
  }
});

// =============================================
// PLATAFORMA (solo súper admin)
// =============================================

/** Alta de cliente: empresa + primera sede + cuenta del Dueño. Deshace todo si algo falla. */
app.post("/platform/clients", async (c) => {
  const me = await currentStaff(c);
  if (!me?.is_super_admin) return c.json({ error: 'Solo para la plataforma' }, 403);

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'JSON inválido' }, 400); }
  const company = body?.company ?? {};
  const branch = body?.branch ?? {};
  const owner = body?.owner ?? {};
  const name = String(company.name ?? '').trim();
  const branchName = String(branch.name ?? '').trim();
  const ownerName = String(owner.name ?? '').trim();
  const ownerEmail = String(owner.email ?? '').trim().toLowerCase();
  const password = String(owner.password ?? '');
  if (name.length < 2) return c.json({ error: 'Nombre de la empresa requerido' }, 400);
  if (branchName.length < 2) return c.json({ error: 'Nombre de la sede requerido' }, 400);
  if (ownerName.length < 3) return c.json({ error: 'Nombre del Dueño requerido' }, 400);
  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) return c.json({ error: 'Correo del Dueño inválido' }, 400);
  if (password.length < 8) return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);

  let maxBranches = 1;
  if (body.plan_id) {
    const { data: plan } = await admin.from('platform_plans').select('id, max_branches').eq('id', body.plan_id).maybeSingle();
    if (!plan) return c.json({ error: 'Plan no encontrado' }, 400);
    maxBranches = plan.max_branches;
  }
  const price = body.monthly_price === null || body.monthly_price === undefined || body.monthly_price === '' ? null : Number(body.monthly_price);
  if (price !== null && !(price >= 0)) return c.json({ error: 'Mensualidad inválida' }, 400);
  const due = body.next_due_date && /^\d{4}-\d{2}-\d{2}$/.test(body.next_due_date) ? body.next_due_date : null;

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name, rif: company.rif || null, email: company.email || null, phone: company.phone || null,
      status: 'Activa', plan_id: body.plan_id || null, monthly_price: price, max_branches: maxBranches, next_due_date: due,
    })
    .select('id')
    .single();
  if (orgError) return c.json({ error: orgError.message }, 400);

  let gymId: string | null = null;
  const rollback = async (authUserId?: string) => {
    if (authUserId) await admin.auth.admin.deleteUser(authUserId);
    if (gymId) await admin.from('gyms').delete().eq('id', gymId);
    await admin.from('organizations').delete().eq('id', org.id);
  };

  const code = branchName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'SEDE';
  const { data: gym, error: gymError } = await admin
    .from('gyms')
    .insert({ name: branchName, code, address: branch.address || null, organization_id: org.id, is_active: true })
    .select('id')
    .single();
  if (gymError) { await rollback(); return c.json({ error: gymError.message }, 400); }
  gymId = gym.id;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: ownerEmail, password, email_confirm: true, user_metadata: { name: ownerName, role: 'Dueño' },
  });
  if (authError) { await rollback(); return c.json({ error: authError.message }, 400); }

  const { error: staffError } = await admin.from('staff').insert({
    auth_user_id: authData.user.id, name: ownerName, role: 'Dueño', email: ownerEmail, phone: owner.phone || null,
    shift: 'Completo (6am - 10pm)', status: 'Activo', organization_id: org.id, gym_id: gym.id,
  });
  if (staffError) { await rollback(authData.user.id); return c.json({ error: staffError.message }, 400); }

  return c.json({ organization_id: org.id, gym_id: gym.id });
});

// Datos de prueba deshabilitados en producción (creaban cuentas con claves conocidas)
app.post("/seed", (c) => c.json({ error: 'Deshabilitado' }, 410));

Deno.serve(app.fetch);
