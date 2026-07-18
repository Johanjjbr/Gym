import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
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
    const { email, password, name, role, phone, shift, gym_id } = await c.req.json();
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: currentUser } = await supabase.auth.getUser(authToken);
      if (currentUser.user) {
        const { data: currentStaff } = await supabase
          .from('staff')
          .select('role, is_super_admin, gym_id')
          .eq('auth_user_id', currentUser.user.id)
          .single();
        if (!currentStaff || currentStaff.role !== 'Administrador') {
          return c.json({ error: 'Solo administradores pueden crear usuarios de staff' }, 403);
        }
        // Si no es super admin, forzar gym_id al mismo del admin
        if (!currentStaff.is_super_admin) {
          if (gym_id && gym_id !== currentStaff.gym_id) {
            return c.json({ error: 'No puedes crear personal para otro gimnasio' }, 403);
          }
        }
      }
    }
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name, role }
    });
    if (authError) return c.json({ error: authError.message }, 400);
    const { data: staffData, error: staffError } = await supabase
      .from('staff').insert({ auth_user_id: authData.user.id, name, role, email, phone, shift: shift || 'No asignado', status: 'Activo', gym_id: gym_id || null }).select().single();
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
    const gymId = c.req.query('gym_id');
    let query = supabase
      .from('users').select('*, trainer:staff!users_assigned_trainer_fkey (id, name, role)');
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query.order('created_at', { ascending: false });
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
      .from('staff').select('id, name, email, phone, shift, status, gym_id').eq('role', 'Entrenador').eq('status', 'Activo').order('name');
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo entrenadores' }, 500);
  }
});

app.get("/users/without-trainer", async (c) => {
  try {
    const { data, error } = await supabase
      .from('users').select('id, name, email, phone, member_number, status, plan, plan_id').is('assigned_trainer', null).eq('status', 'Activo').order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo usuarios sin entrenador' }, 500);
  }
});

app.get("/plans", async (c) => {
  try {
    const { data, error } = await supabase.from('plans').select('*').order('name');
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo planes' }, 500);
  }
});

app.post("/plans", async (c) => {
  try {
    const planData = await c.req.json();
    const { data, error } = await supabase.from('plans').insert(planData).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error creando plan' }, 500);
  }
});

app.put("/plans/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const planData = await c.req.json();
    const { data, error } = await supabase.from('plans').update(planData).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error actualizando plan' }, 500);
  }
});

app.delete("/plans/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('plan_id', id);
    if (userCount && userCount > 0) {
      return c.json({ error: 'No se puede eliminar el plan porque tiene usuarios asignados' }, 400);
    }
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) throw error;
    return c.json({ message: 'Plan eliminado' });
  } catch (error) {
    return c.json({ error: 'Error eliminando plan' }, 500);
  }
});

app.get("/invoices", async (c) => {
  try {
    const { user_id, status, gym_id } = c.req.query();
    let query = supabase.from('invoices').select('*, users!inner (name, member_number, gym_id), plans (name)');
    if (user_id) query = query.eq('user_id', user_id);
    if (status) query = query.eq('status', status);
    if (gym_id) query = query.eq('users.gym_id', gym_id);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo facturas' }, 500);
  }
});

app.get("/users/:userId/invoices", async (c) => {
  try {
    const userId = c.req.param('userId');
    const { data, error } = await supabase
      .from('invoices').select('*, plans (name)').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    return c.json({ error: 'Error obteniendo facturas del usuario' }, 500);
  }
});

app.put("/invoices/:id/pay", async (c) => {
  try {
    const { id } = c.req.param();
    const { method, reference, notes } = await c.req.json();
    
    const { data: invoice, error: getError } = await supabase
      .from('invoices').select('*, plans(name)').eq('id', id).single();
    if (getError) throw getError;
    if (!invoice) return c.json({ error: 'Factura no encontrada' }, 404);
    if (invoice.status === 'Pagada') return c.json({ error: 'La factura ya está pagada' }, 400);

    const paidAt = new Date().toISOString();
    
    const { data, error: updateError } = await supabase
      .from('invoices').update({ 
        status: 'Pagada', paid_at: paidAt, method, reference, notes 
      }).eq('id', id).select('*, users (name, member_number), plans (name)').single();
    if (updateError) throw updateError;

    const planId = invoice.plan_id;
    if (planId) {
      const { data: plan } = await supabase.from('plans').select('duration_days').eq('id', planId).single();
      if (plan) {
        const { data: user } = await supabase.from('users').select('plan_id').eq('id', invoice.user_id).single();
        const effectivePlanId = user?.plan_id || planId;
        if (effectivePlanId) {
          const { data: effectivePlan } = await supabase.from('plans').select('duration_days').eq('id', effectivePlanId).single();
          if (effectivePlan) {
            const nextPayment = new Date();
            nextPayment.setDate(nextPayment.getDate() + effectivePlan.duration_days);
            await supabase.from('users').update({ 
              next_payment: nextPayment.toISOString(), status: 'Activo', updated_at: new Date().toISOString() 
            }).eq('id', invoice.user_id);
          }
        }
      }
    }
    
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error registrando pago de factura' }, 500);
  }
});

app.get("/staff", async (c) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*, gym:gyms!staff_gym_id_fkey(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const enriched = data?.map(s => ({ ...s, gym_name: s.gym?.name || null, gym: undefined }));
    return c.json(enriched);
  } catch (error) {
    return c.json({ error: 'Error obteniendo staff' }, 500);
  }
});

app.get("/staff/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await supabase
      .from('staff')
      .select('*, gym:gyms!staff_gym_id_fkey(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return c.json({ ...data, gym_name: data.gym?.name || null, gym: undefined });
  } catch (error) {
    return c.json({ error: 'Error obteniendo staff' }, 500);
  }
});

app.post("/staff", async (c) => {
  try {
    const { email, password, name, role, phone, shift, gym_id } = await c.req.json();
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: currentUser } = await supabase.auth.getUser(authToken);
      if (currentUser.user) {
        const { data: currentStaff } = await supabase.from('staff').select('role, is_super_admin, gym_id').eq('auth_user_id', currentUser.user.id).single();
        if (!currentStaff || currentStaff.role !== 'Administrador') return c.json({ error: 'Solo administradores pueden crear usuarios de staff' }, 403);
        if (!currentStaff.is_super_admin && gym_id && gym_id !== currentStaff.gym_id) {
          return c.json({ error: 'No puedes crear personal para otro gimnasio' }, 403);
        }
      }
    }
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role } });
    if (authError) return c.json({ error: authError.message }, 400);
    const { data: staffData, error: staffError } = await supabase
      .from('staff').insert({ auth_user_id: authData.user.id, name, role, email, phone, shift: shift || 'No asignado', status: 'Activo', gym_id: gym_id || null }).select().single();
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
    const { date, user_id } = c.req.query();
    let query = supabase.from('attendance').select('*, users (name, member_number)').order('created_at', { ascending: false });
    if (date) query = query.eq('date', date);
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo asistencia' }, 500);
  }
});

app.get("/physical-progress", async (c) => {
  try {
    const { user_id } = c.req.query();
    let query = supabase.from('physical_progress').select('*').order('date', { ascending: false });
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo progreso físico' }, 500);
  }
});

app.post("/physical-progress", async (c) => {
  try {
    const progressData = await c.req.json();
    const { data, error } = await supabase.from('physical_progress').insert([{
      ...progressData,
      date: progressData.date || new Date().toISOString(),
    }]).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error registrando progreso físico' }, 500);
  }
});

app.delete("/physical-progress/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { error } = await supabase.from('physical_progress').delete().eq('id', id);
    if (error) throw error;
    return c.json({ message: 'Registro eliminado' });
  } catch (error) {
    return c.json({ error: 'Error eliminando registro de progreso' }, 500);
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

app.get("/routines/:id/stats", async (c) => {
  try {
    const { id } = c.req.param();
    const { count: assignedCount, error: countError } = await supabase
      .from('user_routine_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('routine_id', id)
      .eq('is_active', true);
    if (countError) throw countError;

    const { data: ratingData, error: ratingError } = await supabase
      .from('routine_ratings')
      .select('rating')
      .eq('routine_id', id);
    if (ratingError) throw ratingError;

    const avgRating = ratingData.length > 0
      ? ratingData.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingData.length
      : 0;

    return c.json({
      assigned_count: assignedCount || 0,
      avg_rating: Math.round(avgRating * 10) / 10,
      ratings_count: ratingData.length,
    });
  } catch (error) {
    return c.json({ error: 'Error obteniendo estadísticas' }, 500);
  }
});

app.get("/routines/:id/ratings", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await supabase
      .from('routine_ratings')
      .select('id, user_id, rating, created_at')
      .eq('routine_id', id);
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo calificaciones' }, 500);
  }
});

app.post("/routines/:id/ratings", async (c) => {
  try {
    const { id } = c.req.param();
    const { user_id, rating } = await c.req.json();
    const { data, error } = await supabase
      .from('routine_ratings')
      .upsert({ routine_id: id, user_id, rating }, { onConflict: 'routine_id,user_id' })
      .select()
      .single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error registrando calificación' }, 500);
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
    const gymId = c.req.query('gym_id');
    let usersQuery = supabase.from('users').select('*', { count: 'exact', head: true });
    let activeQuery = supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'Activo');
    let suspendedQuery = supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'Suspendido');
    let staffQuery = supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'Activo');

    if (gymId) {
      usersQuery = usersQuery.eq('gym_id', gymId);
      activeQuery = activeQuery.eq('gym_id', gymId);
      suspendedQuery = suspendedQuery.eq('gym_id', gymId);
      staffQuery = staffQuery.eq('gym_id', gymId);
    }

    const { count: totalUsers } = await usersQuery;
    const { count: activeUsers } = await activeQuery;
    const { count: delinquentUsers } = await suspendedQuery;
    const { count: totalStaff } = await staffQuery;

    const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1); firstDayOfMonth.setHours(0, 0, 0, 0);
    let invQuery = supabase.from('invoices').select('amount').eq('status', 'Pagada').gte('paid_at', firstDayOfMonth.toISOString());
    if (gymId) {
      invQuery = invQuery.in('user_id', (await supabase.from('users').select('id').eq('gym_id', gymId)).data?.map(u => u.id) || []);
    }
    const { data: monthlyInvoices } = await invQuery;
    const monthlyRevenue = monthlyInvoices?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const today = new Date().toISOString().split('T')[0];
    let attQuery = supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('type', 'Entrada');
    if (gymId) {
      attQuery = attQuery.in('user_id', (await supabase.from('users').select('id').eq('gym_id', gymId)).data?.map(u => u.id) || []);
    }
    const { count: todayAttendance } = await attQuery;

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
      { member_number: 'GYM-003', cedula: 'V-34567890', name: 'José Pérez', email: 'jose@example.com', phone: '0412-3456789', status: 'Suspendido', plan: 'Plan Mensual', start_date: '2024-12-01', next_payment: '2025-02-01', weight: 80.0, height: 1.80, imc: 24.69 },
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
      for (const member of createdMembers) {
        if (!member.id || !member.next_payment) continue;
        const { data: plan } = await supabase.from('plans').select('id, price').eq('name', 'Mensual').maybeSingle();
        if (!plan) continue;
        const invoiceNumber = 'FAC-2025-' + String(Math.floor(Math.random() * 9999)).padStart(4, '0');
        await supabase.from('invoices').insert({
          user_id: member.id,
          plan_id: plan.id,
          invoice_number: invoiceNumber,
          amount: plan.price,
          due_date: member.next_payment,
          paid_at: member.start_date,
          status: 'Pagada',
          method: 'Efectivo',
        });
      }
    }
    return c.json({ success: true, message: 'Seed completado exitosamente', created: { staff: createdStaff.length, members: createdMembers.length }, credentials: { admin: 'admin@gymteques.com / Admin123!', trainer: 'trainer@gymteques.com / Trainer123!', reception: 'recepcion@gymteques.com / Recepcion123!' } });
  } catch (error) {
    return c.json({ error: 'Error ejecutando seed' }, 500);
  }
});

// =============================================
// GIMNASIOS (Gym Settings)
// =============================================

app.get("/gyms", async (c) => {
  try {
    const includeInactive = c.req.query('include_inactive') === 'true';
    let query = supabase.from('gyms').select('*').order('name');
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo gimnasios' }, 500);
  }
});

app.get("/gyms/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await supabase.from('gyms').select('*').eq('id', id).single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error obteniendo gimnasio' }, 500);
  }
});

app.post("/gyms", async (c) => {
  try {
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    let currentStaff: any = null;
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: currentUser } = await supabase.auth.getUser(authToken);
      if (currentUser.user) {
        const { data: staff } = await supabase.from('staff').select('role, is_super_admin, id').eq('auth_user_id', currentUser.user.id).single();
        currentStaff = staff;
        if (!staff || !staff.is_super_admin) {
          return c.json({ error: 'Solo el super admin puede crear gimnasios' }, 403);
        }
      }
    }
    const gymData = await c.req.json();
    const { data, error } = await supabase.from('gyms').insert({ ...gymData, is_active: true }).select().single();
    if (error) throw error;
    // Auto-asignar el gym al super admin que lo creó
    if (currentStaff) {
      await supabase.from('admin_gyms').insert({ staff_id: currentStaff.id, gym_id: data.id }).select().single();
    }
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error creando gimnasio' }, 500);
  }
});

app.put("/gyms/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: currentUser } = await supabase.auth.getUser(authToken);
      if (currentUser.user) {
        const { data: currentStaff } = await supabase.from('staff').select('role, is_super_admin, gym_id').eq('auth_user_id', currentUser.user.id).single();
        if (!currentStaff || currentStaff.role !== 'Administrador') {
          return c.json({ error: 'Solo administradores pueden modificar gimnasios' }, 403);
        }
        if (!currentStaff.is_super_admin && id !== currentStaff.gym_id) {
          return c.json({ error: 'No puedes modificar un gimnasio que no te pertenece' }, 403);
        }
      }
    }
    const gymData = await c.req.json();
    const { data, error } = await supabase.from('gyms').update({ ...gymData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error actualizando gimnasio' }, 500);
  }
});

// =============================================
// RESEÑAS DE GIMNASIOS
// =============================================

app.get("/gym-reviews/:gymId", async (c) => {
  try {
    const gymId = c.req.param('gymId');
    const { data, error } = await supabase
      .from('gym_reviews')
      .select('*, users(name)')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data || []);
  } catch (error) {
    return c.json({ error: 'Error obteniendo reseñas' }, 500);
  }
});

app.get("/gym-reviews/my/:gymId", async (c) => {
  try {
    const gymId = c.req.param('gymId');
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (!authToken) return c.json(null);
    const { data: { user } } = await supabase.auth.getUser(authToken);
    if (!user) return c.json(null);
    const { data: userData } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();
    if (!userData) return c.json(null);
    const { data, error } = await supabase
      .from('gym_reviews')
      .select('*')
      .eq('gym_id', gymId)
      .eq('user_id', userData.id)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return c.json(data || null);
  } catch (error) {
    return c.json({ error: 'Error obteniendo reseña' }, 500);
  }
});

app.post("/gym-reviews", async (c) => {
  try {
    const { gym_id, rating, comment } = await c.req.json();
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (!authToken) return c.json({ error: 'No autorizado' }, 401);
    const { data: { user } } = await supabase.auth.getUser(authToken);
    if (!user) return c.json({ error: 'No autorizado' }, 401);
    const { data: userData } = await supabase.from('users').select('id, start_date').eq('auth_user_id', user.id).single();
    if (!userData) return c.json({ error: 'Usuario no encontrado' }, 404);
    const daysSinceStart = Math.floor((Date.now() - new Date(userData.start_date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceStart < 30) return c.json({ error: 'Debes tener al menos 30 días como miembro para calificar' }, 400);
    const { data, error } = await supabase
      .from('gym_reviews')
      .insert({ gym_id, user_id: userData.id, rating, comment: comment || null })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return c.json({ error: 'Ya calificaste este gimnasio' }, 400);
      throw error;
    }
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error creando reseña' }, 500);
  }
});

app.put("/gym-reviews/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { rating, comment } = await c.req.json();
    const { data, error } = await supabase
      .from('gym_reviews')
      .update({ rating, comment })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error actualizando reseña' }, 500);
  }
});

app.delete("/gym-reviews/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const { error } = await supabase.from('gym_reviews').delete().eq('id', id);
    if (error) throw error;
    return c.json({ message: 'Reseña eliminada' });
  } catch (error) {
    return c.json({ error: 'Error eliminando reseña' }, 500);
  }
});

// =============================================
// GYMS DEL ADMINISTRADOR
// =============================================

app.get("/admin-gyms", async (c) => {
  try {
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (!authToken) return c.json({ error: 'No autorizado' }, 401);
    const { data: { user } } = await supabase.auth.getUser(authToken);
    if (!user) return c.json({ error: 'No autorizado' }, 401);
    const { data: staffData } = await supabase.from('staff').select('id, is_super_admin').eq('auth_user_id', user.id).single();
    if (!staffData) return c.json({ error: 'Staff no encontrado' }, 404);
    let query = supabase.from('admin_gyms').select('*, gym:gyms!admin_gyms_gym_id_fkey(name, is_active)');
    if (!staffData.is_super_admin) query = query.eq('staff_id', staffData.id);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return c.json((data || []).map((ag: any) => ({ ...ag, gym_name: ag.gym?.name, gym: undefined })));
  } catch (error) {
    return c.json({ error: 'Error obteniendo gyms del admin' }, 500);
  }
});

app.post("/admin-gyms", async (c) => {
  try {
    const { staff_id, gym_id } = await c.req.json();
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: currentUser } = await supabase.auth.getUser(authToken);
      if (currentUser.user) {
        const { data: currentStaff } = await supabase.from('staff').select('is_super_admin').eq('auth_user_id', currentUser.user.id).single();
        if (!currentStaff || !currentStaff.is_super_admin) {
          return c.json({ error: 'Solo super admin puede asignar gyms' }, 403);
        }
      }
    }
    const { data, error } = await supabase.from('admin_gyms').insert({ staff_id, gym_id }).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Error asignando gym al admin' }, 500);
  }
});

app.delete("/admin-gyms/:staffId/:gymId", async (c) => {
  try {
    const staffId = c.req.param('staffId');
    const gymId = c.req.param('gymId');
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    if (authToken && authToken !== Deno.env.get('SUPABASE_ANON_KEY')) {
      const { data: currentUser } = await supabase.auth.getUser(authToken);
      if (currentUser.user) {
        const { data: currentStaff } = await supabase.from('staff').select('is_super_admin').eq('auth_user_id', currentUser.user.id).single();
        if (!currentStaff || !currentStaff.is_super_admin) {
          return c.json({ error: 'Solo super admin puede quitar gyms' }, 403);
        }
      }
    }
    const { error } = await supabase.from('admin_gyms').delete().eq('staff_id', staffId).eq('gym_id', gymId);
    if (error) throw error;
    return c.json({ message: 'Gym removido del admin' });
  } catch (error) {
    return c.json({ error: 'Error removiendo gym del admin' }, 500);
  }
});

Deno.serve(app.fetch);
