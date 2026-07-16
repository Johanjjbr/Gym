import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono().basePath('/server');

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function initializeDatabase() {
  try {
    console.log('🔧 Verificando conexión a base de datos...');
    const { data: staffCount, error } = await supabase
      .from('staff')
      .select('id', { count: 'exact', head: true });
    if (error) {
      console.log('⚠️ Nota: Tablas aún no existen o no hay staff. Esto es normal en primera ejecución.');
    } else {
      console.log(`✅ Conexión a base de datos exitosa. Personal en DB: ${staffCount || 0}`);
    }
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
  }
}

initializeDatabase();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/auth/signup", async (c) => {
  try {
    const { email, password, name, role, phone, shift } = await c.req.json();
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: currentUser } = await supabase.auth.getUser(authToken);
      if (currentUser.user) {
        const { data: currentStaff } = await supabase
          .from('staff')
          .select('role')
          .eq('auth_user_id', currentUser.user.id)
          .single();
        if (!currentStaff || currentStaff.role !== 'Administrador') {
          return c.json({ error: 'Solo administradores pueden crear usuarios de staff' }, 403);
        }
      }
    }
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name, role }
    });
    if (authError) return c.json({ error: authError.message }, 400);
    const { data: staffData, error: staffError } = await supabase
      .from('staff').insert({ auth_user_id: authData.user.id, name, role, email, phone, shift: shift || 'No asignado', status: 'Activo' }).select().single();
    if (staffError) { await supabase.auth.admin.deleteUser(authData.user.id); return c.json({ error: staffError.message }, 400); }
    return c.json({ message: 'Usuario creado exitosamente', user: authData.user, staff: staffData });
  } catch (error) {
    return c.json({ error: 'Error al crear usuario' }, 500);
  }
});

app.post("/auth/login", async (c) => {
  try {
    const bodyText = await c.req.text();
    let email, password;
    try { const parsed = JSON.parse(bodyText); email = parsed.email; password = parsed.password; } catch { return c.json({ error: 'JSON inválido en body', body_raw: bodyText?.substring(0, 200) }, 400); }
    const authUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
      body: JSON.stringify({ email, password })
    });
    const responseText = await authResponse.text();
    let authData;
    try { authData = JSON.parse(responseText); } catch { return c.json({ error: 'Error de autenticación', debug: { url: authUrl, status: authResponse.status, body: responseText?.substring(0, 500) } }, 500); }
    if (!authResponse.ok) return c.json({ error: authData.error_description || authData.msg || 'Credenciales inválidas' }, 401);
    const { data: staffData, error: staffError } = await supabase
      .from('staff').select('*').eq('auth_user_id', authData.user.id).single();
    if (staffError) return c.json({ error: 'Usuario no encontrado en staff' }, 404);
    return c.json({ session: { access_token: authData.access_token, refresh_token: authData.refresh_token }, user: authData.user, staff: staffData });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Error al iniciar sesión', details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.get("/auth/session", async (c) => {
  try {
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (!authToken) return c.json({ error: 'No token provided' }, 401);
    const { data: { user }, error } = await supabase.auth.getUser(authToken);
    if (error || !user) return c.json({ error: 'Invalid token' }, 401);
    const { data: staffData } = await supabase
      .from('staff').select('*').eq('auth_user_id', user.id).maybeSingle();
    return c.json({ user, staff: staffData || null });
  } catch (error) {
    return c.json({ error: 'Error verificando sesión' }, 500);
  }
});

app.post("/auth/logout", async (c) => {
  try {
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (!authToken) return c.json({ error: 'No token provided' }, 401);
    const { error } = await supabase.auth.admin.signOut(authToken);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ message: 'Logout exitoso' });
  } catch (error) {
    return c.json({ error: 'Error al cerrar sesión' }, 500);
  }
});

app.get("/users", async (c) => {
  try {
    const { data, error } = await supabase
      .from('users').select('*, trainer:staff!users_assigned_trainer_fkey (id, name, role)').order('created_at', { ascending: false });
    if (error) throw error;
    const formattedData = data?.map(user => ({ ...user, trainer_name: user.trainer?.name || null, trainer: undefined }));
    return c.json(formattedData);
  } catch (error) {
    return c.json({ error: 'Error obteniendo usuarios' }, 500);
  }
});

app.get("/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await supabase
      .from('users').select('*, trainer:staff!users_assigned_trainer_fkey (id, name, role)').eq('id', id).single();
    if (error) throw error;
    return c.json({ ...data, trainer_name: data.trainer?.name || null, trainer: undefined });
  } catch (error) {
    return c.json({ error: 'Error obteniendo usuario' }, 500);
  }
});

app.post("/users", async (c) => {
  try {
    const userData = await c.req.json();
    const memberNumber = `GYM-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase.from('users').insert({ ...userData, member_number: memberNumber }).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error creando usuario' }, 500);
  }
});

app.put("/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const userData = await c.req.json();
    const { data, error } = await supabase.from('users').update(userData).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error actualizando usuario' }, 500);
  }
});

app.delete("/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return c.json({ message: 'Usuario eliminado' });
  } catch (error) {
    return c.json({ error: 'Error eliminando usuario' }, 500);
  }
});

app.post("/users/:id/assign-trainer", async (c) => {
  try {
    const userId = c.req.param('id');
    const { trainer_id } = await c.req.json();
    if (trainer_id) {
      const { data: trainer, error: trainerError } = await supabase
        .from('staff').select('id, name, role').eq('id', trainer_id).eq('role', 'Entrenador').single();
      if (trainerError || !trainer) return c.json({ error: 'Entrenador no encontrado o inválido' }, 400);
    }
    const { data, error } = await supabase
      .from('users').update({ assigned_trainer: trainer_id || null }).eq('id', userId)
      .select('*, trainer:staff!users_assigned_trainer_fkey (id, name, role)').single();
    if (error) throw error;
    return c.json({ ...data, trainer_name: data.trainer?.name || null, trainer: undefined });
  } catch (error) {
    return c.json({ error: 'Error asignando entrenador' }, 500);
  }
});

app.get("/trainers", async (c) => {
  try {
    const { data, error } = await supabase
      .from('staff').select('id, name, email, phone, shift, status').eq('role', 'Entrenador').eq('status', 'Activo').order('name');
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo entrenadores' }, 500);
  }
});

app.get("/users/without-trainer", async (c) => {
  try {
    const { data, error } = await supabase
      .from('users').select('id, name, email, phone, member_number, status, plan').is('assigned_trainer', null).eq('status', 'Activo').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo usuarios sin entrenador' }, 500);
  }
});

app.get("/payments", async (c) => {
  try {
    const { user_id } = c.req.query();
    let query = supabase.from('payments').select('*, users (name, member_number)').order('date', { ascending: false });
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo pagos' }, 500);
  }
});

app.get("/users/:userId/payments", async (c) => {
  try {
    const userId = c.req.param('userId');
    const { data, error } = await supabase
      .from('payments').select('*, users (name, member_number)').eq('user_id', userId).order('date', { ascending: false });
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    return c.json({ error: 'Error obteniendo pagos del usuario' }, 500);
  }
});

app.post("/payments", async (c) => {
  try {
    const paymentData = await c.req.json();
    const { data, error } = await supabase.from('payments').insert(paymentData).select().single();
    if (error) throw error;
    if (paymentData.user_id && paymentData.next_payment) {
      await supabase.from('users').update({ next_payment: paymentData.next_payment, status: 'Activo' }).eq('id', paymentData.user_id);
    }
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error creando pago' }, 500);
  }
});

app.get("/staff", async (c) => {
  try {
    const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo staff' }, 500);
  }
});

app.get("/staff/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await supabase.from('staff').select('*').eq('id', id).single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo staff' }, 500);
  }
});

app.post("/staff", async (c) => {
  try {
    const { email, password, name, role, phone, shift } = await c.req.json();
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: currentUser } = await supabase.auth.getUser(authToken);
      if (currentUser.user) {
        const { data: currentStaff } = await supabase.from('staff').select('role').eq('auth_user_id', currentUser.user.id).single();
        if (!currentStaff || currentStaff.role !== 'Administrador') return c.json({ error: 'Solo administradores pueden crear usuarios de staff' }, 403);
      }
    }
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role } });
    if (authError) return c.json({ error: authError.message }, 400);
    const { data: staffData, error: staffError } = await supabase
      .from('staff').insert({ auth_user_id: authData.user.id, name, role, email, phone, shift: shift || 'No asignado', status: 'Activo' }).select().single();
    if (staffError) { await supabase.auth.admin.deleteUser(authData.user.id); return c.json({ error: staffError.message }, 400); }
    return c.json(staffData);
  } catch (error) {
    return c.json({ error: 'Error creando staff' }, 500);
  }
});

app.put("/staff/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const staffData = await c.req.json();
    const { data, error } = await supabase.from('staff').update(staffData).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error actualizando staff' }, 500);
  }
});

app.delete("/staff/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data: staffMember, error: getError } = await supabase.from('staff').select('auth_user_id').eq('id', id).single();
    if (getError) throw getError;
    const { error: deleteError } = await supabase.from('staff').delete().eq('id', id);
    if (deleteError) throw deleteError;
    if (staffMember?.auth_user_id) await supabase.auth.admin.deleteUser(staffMember.auth_user_id);
    return c.json({ message: 'Empleado eliminado' });
  } catch (error) {
    return c.json({ error: 'Error eliminando staff' }, 500);
  }
});

app.get("/attendance", async (c) => {
  try {
    const { date } = c.req.query();
    let query = supabase.from('attendance').select('*, users (name, member_number)').order('created_at', { ascending: false });
    if (date) query = query.eq('date', date);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo asistencia' }, 500);
  }
});

app.post("/attendance", async (c) => {
  try {
    const attendanceData = await c.req.json();
    const { data, error } = await supabase.from('attendance').insert(attendanceData).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error registrando asistencia' }, 500);
  }
});

app.get("/routines", async (c) => {
  try {
    const { data, error } = await supabase
      .from('routine_templates').select('*, creator:staff!created_by (id, name), exercises:routine_exercises (id, exercise_name, day_of_week, order_index, sets, reps, rest_seconds, notes)').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo rutinas' }, 500);
  }
});

app.get("/routines/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await supabase
      .from('routine_templates').select('*, creator:staff!created_by (id, name), exercises:routine_exercises (id, exercise_name, day_of_week, order_index, sets, reps, rest_seconds, notes)').eq('id', id).single();
    if (error) throw error;
    if (data.exercises) data.exercises.sort((a: any, b: any) => a.day_of_week !== b.day_of_week ? a.day_of_week - b.day_of_week : a.order_index - b.order_index);
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo rutina' }, 500);
  }
});

app.post("/routines", async (c) => {
  try {
    const { exercises, ...routineData } = await c.req.json();
    const { data: routine, error: routineError } = await supabase.from('routine_templates').insert({ ...routineData, is_active: true }).select().single();
    if (routineError) throw routineError;
    if (exercises && exercises.length > 0) {
      const exercisesWithRoutineId = exercises.map((ex: any) => ({ routine_id: routine.id, exercise_name: ex.exercise_name, day_of_week: ex.day_of_week, order_index: ex.order_index, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds, notes: ex.notes || null }));
      const { error: exercisesError } = await supabase.from('routine_exercises').insert(exercisesWithRoutineId);
      if (exercisesError) throw exercisesError;
    }
    return c.json(routine);
  } catch (error) {
    return c.json({ error: 'Error creando rutina' }, 500);
  }
});

app.put("/routines/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { exercises, ...routineData } = body;
    const { data: updatedRoutine, error: routineError } = await supabase.from('routine_templates').update(routineData).eq('id', id).select().single();
    if (routineError) throw routineError;
    if (exercises && Array.isArray(exercises)) {
      await supabase.from('routine_exercises').delete().eq('routine_id', id);
      if (exercises.length > 0) {
        const exercisesToInsert = exercises.map((ex: any) => ({ ...ex, routine_id: id }));
        const { error: insertError } = await supabase.from('routine_exercises').insert(exercisesToInsert);
        if (insertError) throw insertError;
      }
    }
    return c.json({ success: true, message: "Rutina actualizada correctamente", routine: updatedRoutine });
  } catch (error) {
    return c.json({ error: 'Error actualizando la rutina y sus ejercicios' }, 500);
  }
});

app.delete("/routines/:id", async (c) => {
  try {
    const { id } = c.req.param();
    await supabase.from('routine_exercises').delete().eq('routine_id', id);
    const { error: routineError } = await supabase.from('routine_templates').delete().eq('id', id);
    if (routineError) throw routineError;
    return c.json({ message: 'Rutina eliminada' });
  } catch (error) {
    return c.json({ error: 'Error eliminando rutina' }, 500);
  }
});

app.get("/exercises", async (c) => {
  try {
    const { data, error } = await supabase.from('exercises').select('*').order('name');
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo ejercicios' }, 500);
  }
});

app.get("/exercises/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await supabase.from('exercises').select('*').eq('id', id).single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo ejercicio' }, 500);
  }
});

app.post("/exercises", async (c) => {
  try {
    const exerciseData = await c.req.json();
    const { data, error } = await supabase.from('exercises').insert(exerciseData).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error creando ejercicio' }, 500);
  }
});

app.put("/exercises/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const exerciseData = await c.req.json();
    const { data, error } = await supabase.from('exercises').update(exerciseData).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error actualizando ejercicio' }, 500);
  }
});

app.delete("/exercises/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) throw error;
    return c.json({ message: 'Ejercicio eliminado' });
  } catch (error) {
    return c.json({ error: 'Error eliminando ejercicio' }, 500);
  }
});

app.get("/routine-assignments", async (c) => {
  try {
    const { user_id } = c.req.query();
    let query = supabase
      .from('user_routine_assignments').select('*, users (name, member_number), routine_templates (name, description, routine_exercises (*)), staff (name)').order('created_at', { ascending: false });
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo asignaciones' }, 500);
  }
});

app.post("/routine-assignments", async (c) => {
  try {
    const assignmentData = await c.req.json();
    await supabase.from('user_routine_assignments').update({ is_active: false }).eq('user_id', assignmentData.user_id).eq('is_active', true);
    const { data, error } = await supabase.from('user_routine_assignments').insert(assignmentData).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error creando asignación' }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: activeUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'Activo');
    const { count: delinquentUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'Moroso');
    const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1); firstDayOfMonth.setHours(0, 0, 0, 0);
    const { data: monthlyPayments } = await supabase.from('payments').select('amount').eq('status', 'Pagado').gte('date', firstDayOfMonth.toISOString());
    const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const today = new Date().toISOString().split('T')[0];
    const { count: todayAttendance } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('type', 'Entrada');
    const { count: totalStaff } = await supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'Activo');
    return c.json({ totalUsers: totalUsers || 0, activeUsers: activeUsers || 0, delinquentUsers: delinquentUsers || 0, monthlyRevenue, todayAttendance: todayAttendance || 0, totalStaff: totalStaff || 0 });
  } catch (error) {
    return c.json({ error: 'Error obteniendo estadísticas' }, 500);
  }
});

app.post("/seed", async (c) => {
  try {
    console.log('🌱 Iniciando seed de datos de prueba...');
    const staffUsers = [
      { email: 'admin@gymteques.com', password: 'Admin123!', name: 'Roberto Administrador', role: 'Administrador', phone: '0414-9999999', shift: 'Tiempo Completo' },
      { email: 'trainer@gymteques.com', password: 'Trainer123!', name: 'Laura Entrenadora', role: 'Entrenador', phone: '0424-8888888', shift: 'Mañana (6am - 2pm)' },
      { email: 'recepcion@gymteques.com', password: 'Recepcion123!', name: 'Pedro Recepcionista', role: 'Recepción', phone: '0412-7777777', shift: 'Tarde (2pm - 10pm)' }
    ];
    const createdStaff = [];
    for (const staffData of staffUsers) {
      const { data: existingStaff } = await supabase.from('staff').select('email').eq('email', staffData.email).single();
      if (!existingStaff) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email: staffData.email, password: staffData.password, email_confirm: true, user_metadata: { name: staffData.name, role: staffData.role } });
        if (authError) { console.error(`Error creando ${staffData.email}:`, authError); continue; }
        const { data: newStaff, error: staffError } = await supabase.from('staff').insert({ auth_user_id: authData.user.id, name: staffData.name, role: staffData.role, email: staffData.email, phone: staffData.phone, shift: staffData.shift, status: 'Activo' }).select().single();
        if (!staffError) { createdStaff.push(newStaff); console.log(`✅ Staff creado: ${staffData.email}`); }
      } else { console.log(`⏭️  Staff ya existe: ${staffData.email}`); }
    }
    const members = [
      { member_number: 'GYM-001', cedula: 'V-12345678', name: 'Carlos Rodríguez', email: 'carlos@example.com', phone: '0414-1234567', status: 'Activo', plan: 'Plan Mensual', start_date: '2025-02-01', next_payment: '2025-03-01', weight: 75.5, height: 1.75, imc: 24.65 },
      { member_number: 'GYM-002', cedula: 'V-23456789', name: 'María González', email: 'maria@example.com', phone: '0424-2345678', status: 'Activo', plan: 'Plan Trimestral', start_date: '2025-01-15', next_payment: '2025-04-15', weight: 62.0, height: 1.65, imc: 22.77 },
      { member_number: 'GYM-003', cedula: 'V-34567890', name: 'José Pérez', email: 'jose@example.com', phone: '0412-3456789', status: 'Moroso', plan: 'Plan Mensual', start_date: '2024-12-01', next_payment: '2025-02-01', weight: 80.0, height: 1.80, imc: 24.69 },
      { member_number: 'GYM-004', cedula: 'V-45678901', name: 'Ana Martínez', email: 'ana@example.com', phone: '0426-4567890', status: 'Activo', plan: 'Plan Anual', start_date: '2025-01-01', next_payment: '2026-01-01', weight: 58.5, height: 1.62, imc: 22.30 },
      { member_number: 'GYM-005', cedula: 'V-56789012', name: 'Luis Hernández', email: 'luis@example.com', phone: '0414-5678901', status: 'Inactivo', plan: 'Plan Mensual', start_date: '2024-11-15', next_payment: '2024-12-15', weight: 88.0, height: 1.78, imc: 27.76 }
    ];
    const createdMembers = [];
    for (const memberData of members) {
      const { data: existingMember } = await supabase.from('users').select('member_number').eq('member_number', memberData.member_number).single();
      if (!existingMember) {
        const { data: newMember, error } = await supabase.from('users').insert(memberData).select().single();
        if (!error) createdMembers.push(newMember);
      }
    }
    if (createdMembers.length > 0) {
      const payments = [
        { user_id: createdMembers[0]?.id, amount: 50.00, date: '2025-02-01', next_payment: '2025-03-01', status: 'Pagado', method: 'Efectivo' },
        { user_id: createdMembers[1]?.id, amount: 135.00, date: '2025-01-15', next_payment: '2025-04-15', status: 'Pagado', method: 'Transferencia' }
      ];
      for (const payment of payments) { if (payment.user_id) await supabase.from('payments').insert(payment); }
    }
    return c.json({ success: true, message: 'Seed completado exitosamente', created: { staff: createdStaff.length, members: createdMembers.length }, credentials: { admin: 'admin@gymteques.com / Admin123!', trainer: 'trainer@gymteques.com / Trainer123!', reception: 'recepcion@gymteques.com / Recepcion123!' } });
  } catch (error) {
    return c.json({ error: 'Error ejecutando seed' }, 500);
  }
});

Deno.serve(app.fetch);
