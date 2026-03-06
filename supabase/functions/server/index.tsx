import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// =============================================
// Configuración de Supabase
// =============================================
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================
// Inicializar base de datos al arrancar
// =============================================
async function initializeDatabase() {
  try {
    console.log('🔧 Verificando conexión a base de datos...');
    
    // Verificar si hay usuarios de staff
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

// Ejecutar inicialización
initializeDatabase();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
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

// Health check endpoint
app.get("/make-server-104060a1/health", (c) => {
  return c.json({ status: "ok" });
});

// =============================================
// AUTENTICACIÓN
// =============================================

// Signup - Crear usuario de staff
app.post("/make-server-104060a1/auth/signup", async (c) => {
  try {
    const { email, password, name, role, phone, shift } = await c.req.json();
    
    // Verificar que quien crea el usuario sea administrador
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
    
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: { name, role }
    });
    
    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return c.json({ error: authError.message }, 400);
    }
    
    // Crear registro en tabla staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .insert({
        auth_user_id: authData.user.id,
        name,
        role,
        email,
        phone,
        shift: shift || 'No asignado',
        status: 'Activo'
      })
      .select()
      .single();
    
    if (staffError) {
      console.error('Error creando registro de staff:', staffError);
      // Eliminar usuario de auth si falla la creación en staff
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: staffError.message }, 400);
    }
    
    return c.json({ 
      message: 'Usuario creado exitosamente',
      user: authData.user,
      staff: staffData
    });
    
  } catch (error) {
    console.error('Error en signup:', error);
    return c.json({ error: 'Error al crear usuario' }, 500);
  }
});

// Login - Iniciar sesión
app.post("/make-server-104060a1/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Error en login:', error);
      return c.json({ error: error.message }, 401);
    }
    
    // Obtener datos del staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();
    
    if (staffError) {
      console.error('Error obteniendo datos de staff:', staffError);
      return c.json({ error: 'Usuario no encontrado en staff' }, 404);
    }
    
    return c.json({
      session: data.session,
      user: data.user,
      staff: staffData
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    return c.json({ error: 'Error al iniciar sesión' }, 500);
  }
});

// Verificar sesión
app.get("/make-server-104060a1/auth/session", async (c) => {
  try {
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!authToken) {
      return c.json({ error: 'No token provided' }, 401);
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(authToken);
    
    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    // Obtener datos del staff (puede no existir si es un usuario normal)
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    
    // Si hay un error diferente a "no encontrado", lo registramos pero no fallamos
    if (staffError && staffError.code !== 'PGRST116') {
      console.error('Error obteniendo datos de staff:', staffError);
    }
    
    return c.json({ user, staff: staffData || null });
    
  } catch (error) {
    console.error('Error verificando sesión:', error);
    return c.json({ error: 'Error verificando sesión' }, 500);
  }
});

// Logout
app.post("/make-server-104060a1/auth/logout", async (c) => {
  try {
    const authToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!authToken) {
      return c.json({ error: 'No token provided' }, 401);
    }
    
    const { error } = await supabase.auth.admin.signOut(authToken);
    
    if (error) {
      console.error('Error en logout:', error);
      return c.json({ error: error.message }, 400);
    }
    
    return c.json({ message: 'Logout exitoso' });
    
  } catch (error) {
    console.error('Error en logout:', error);
    return c.json({ error: 'Error al cerrar sesión' }, 500);
  }
});

// =============================================
// CRUD: USERS (Miembros)
// =============================================

// Obtener todos los usuarios
app.get("/make-server-104060a1/users", async (c) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        trainer:staff!users_assigned_trainer_fkey (
          id,
          name,
          role
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Formatear respuesta para incluir trainer_name
    const formattedData = data?.map(user => ({
      ...user,
      trainer_name: user.trainer?.name || null,
      trainer: undefined // remover el objeto trainer anidado
    }));
    
    return c.json(formattedData);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return c.json({ error: 'Error obteniendo usuarios' }, 500);
  }
});

// Obtener un usuario por ID
app.get("/make-server-104060a1/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        trainer:staff!users_assigned_trainer_fkey (
          id,
          name,
          role
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Formatear respuesta para incluir trainer_name
    const formattedData = {
      ...data,
      trainer_name: data.trainer?.name || null,
      trainer: undefined
    };
    
    return c.json(formattedData);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return c.json({ error: 'Error obteniendo usuario' }, 500);
  }
});

// Crear usuario
app.post("/make-server-104060a1/users", async (c) => {
  try {
    const userData = await c.req.json();
    
    console.log('📝 Creando usuario con datos:', JSON.stringify(userData, null, 2));
    
    // Generar número de miembro único
    const memberNumber = `GYM-${Date.now().toString().slice(-6)}`;
    console.log('🔢 Número de miembro generado:', memberNumber);
    
    // Preparar datos para insertar
    const insertData = { ...userData, member_number: memberNumber };
    console.log('💾 Datos a insertar:', JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error de Supabase:', error);
      throw error;
    }
    
    console.log('✅ Usuario creado exitosamente:', data?.id);
    return c.json(data);
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error creando usuario';
    const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
    console.error('📋 Detalles del error:', errorDetails);
    return c.json({ 
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Actualizar usuario
app.put("/make-server-104060a1/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const userData = await c.req.json();
    
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return c.json({ error: 'Error actualizando usuario' }, 500);
  }
});

// Eliminar usuario
app.delete("/make-server-104060a1/users/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return c.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return c.json({ error: 'Error eliminando usuario' }, 500);
  }
});

// Asignar entrenador a usuario
app.post("/make-server-104060a1/users/:id/assign-trainer", async (c) => {
  try {
    const userId = c.req.param('id');
    const { trainer_id } = await c.req.json();
    
    console.log('👤 Asignando entrenador:', { userId, trainer_id });
    
    // Verificar que el trainer_id sea un entrenador válido si no es null
    if (trainer_id) {
      const { data: trainer, error: trainerError } = await supabase
        .from('staff')
        .select('id, name, role')
        .eq('id', trainer_id)
        .eq('role', 'Entrenador')
        .single();
      
      if (trainerError || !trainer) {
        return c.json({ error: 'Entrenador no encontrado o inválido' }, 400);
      }
    }
    
    // Actualizar usuario con el assigned_trainer (null para "Entrenamiento Libre")
    const { data, error } = await supabase
      .from('users')
      .update({ assigned_trainer: trainer_id || null })
      .eq('id', userId)
      .select(`
        *,
        trainer:staff!users_assigned_trainer_fkey (
          id,
          name,
          role
        )
      `)
      .single();
    
    if (error) throw error;
    
    // Formatear respuesta
    const formattedData = {
      ...data,
      trainer_name: data.trainer?.name || null,
      trainer: undefined
    };
    
    console.log('✅ Entrenador asignado exitosamente');
    
    return c.json(formattedData);
  } catch (error) {
    console.error('Error asignando entrenador:', error);
    return c.json({ error: 'Error asignando entrenador' }, 500);
  }
});

// Obtener entrenadores disponibles
app.get("/make-server-104060a1/trainers", async (c) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, email, phone, shift, status')
      .eq('role', 'Entrenador')
      .eq('status', 'Activo')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo entrenadores:', error);
    return c.json({ error: 'Error obteniendo entrenadores' }, 500);
  }
});

// Obtener usuarios sin entrenador (para que los entrenadores se auto-asignen)
app.get("/make-server-104060a1/users/without-trainer", async (c) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, member_number, status, plan')
      .is('assigned_trainer', null)
      .eq('status', 'Activo')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo usuarios sin entrenador:', error);
    return c.json({ error: 'Error obteniendo usuarios sin entrenador' }, 500);
  }
});

// =============================================
// CRUD: PAYMENTS (Pagos)
// =============================================

app.get("/make-server-104060a1/payments", async (c) => {
  try {
    const { user_id } = c.req.query();
    
    console.log('📊 GET /payments - user_id param:', user_id);
    
    let query = supabase
      .from('payments')
      .select(`
        *,
        users (name, member_number)
      `)
      .order('date', { ascending: false });
    
    // Filtrar por usuario si se proporciona el parámetro
    if (user_id) {
      console.log('🔍 Filtering payments by user_id:', user_id);
      query = query.eq('user_id', user_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log('✅ Payments returned:', data?.length || 0, 'records');
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    return c.json({ error: 'Error obteniendo pagos' }, 500);
  }
});

// Endpoint específico para pagos de un usuario
app.get("/make-server-104060a1/users/:userId/payments", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    console.log('📊 GET /users/:userId/payments - userId:', userId);
    
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        users (name, member_number)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching user payments:', error);
      throw error;
    }
    
    console.log('✅ User payments returned:', data?.length || 0, 'records for user:', userId);
    
    return c.json(data || []);
  } catch (error) {
    console.error('Error obteniendo pagos del usuario:', error);
    return c.json({ error: 'Error obteniendo pagos del usuario' }, 500);
  }
});

app.post("/make-server-104060a1/payments", async (c) => {
  try {
    const paymentData = await c.req.json();
    
    const { data, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Actualizar next_payment del usuario
    if (paymentData.user_id && paymentData.next_payment) {
      await supabase
        .from('users')
        .update({ 
          next_payment: paymentData.next_payment,
          status: 'Activo'
        })
        .eq('id', paymentData.user_id);
    }
    
    return c.json(data);
  } catch (error) {
    console.error('Error creando pago:', error);
    return c.json({ error: 'Error creando pago' }, 500);
  }
});

// =============================================
// CRUD: STAFF (Personal)
// =============================================

app.get("/make-server-104060a1/staff", async (c) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo staff:', error);
    return c.json({ error: 'Error obteniendo staff' }, 500);
  }
});

app.get("/make-server-104060a1/staff/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo staff:', error);
    return c.json({ error: 'Error obteniendo staff' }, 500);
  }
});

app.post("/make-server-104060a1/staff", async (c) => {
  try {
    const { email, password, name, role, phone, shift } = await c.req.json();
    
    console.log('📝 Creando nuevo empleado:', { email, name, role });
    
    // Verificar que quien crea el usuario sea administrador
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
    
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });
    
    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return c.json({ error: authError.message }, 400);
    }
    
    // Crear registro en tabla staff
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .insert({
        auth_user_id: authData.user.id,
        name,
        role,
        email,
        phone,
        shift: shift || 'No asignado',
        status: 'Activo'
      })
      .select()
      .single();
    
    if (staffError) {
      console.error('Error creando registro de staff:', staffError);
      // Eliminar usuario de auth si falla la creación en staff
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: staffError.message }, 400);
    }
    
    console.log('✅ Empleado creado exitosamente:', staffData.id);
    
    return c.json(staffData);
  } catch (error) {
    console.error('Error creando staff:', error);
    return c.json({ error: 'Error creando staff' }, 500);
  }
});

app.put("/make-server-104060a1/staff/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const staffData = await c.req.json();
    
    const { data, error } = await supabase
      .from('staff')
      .update(staffData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error actualizando staff:', error);
    return c.json({ error: 'Error actualizando staff' }, 500);
  }
});

app.delete("/make-server-104060a1/staff/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    console.log('🗑️ Eliminando empleado:', id);
    
    // Obtener el auth_user_id antes de eliminar
    const { data: staffMember, error: getError } = await supabase
      .from('staff')
      .select('auth_user_id')
      .eq('id', id)
      .single();
    
    if (getError) throw getError;
    
    // Eliminar de la tabla staff
    const { error: deleteError } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    // Eliminar el usuario de auth si existe
    if (staffMember?.auth_user_id) {
      await supabase.auth.admin.deleteUser(staffMember.auth_user_id);
      console.log('✅ Usuario de auth eliminado:', staffMember.auth_user_id);
    }
    
    console.log('✅ Empleado eliminado exitosamente');
    
    return c.json({ message: 'Empleado eliminado' });
  } catch (error) {
    console.error('Error eliminando staff:', error);
    return c.json({ error: 'Error eliminando staff' }, 500);
  }
});

// =============================================
// CRUD: ATTENDANCE (Asistencia)
// =============================================

app.get("/make-server-104060a1/attendance", async (c) => {
  try {
    const { date } = c.req.query();
    
    let query = supabase
      .from('attendance')
      .select(`
        *,
        users (name, member_number)
      `)
      .order('created_at', { ascending: false });
    
    if (date) {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo asistencia:', error);
    return c.json({ error: 'Error obteniendo asistencia' }, 500);
  }
});

app.post("/make-server-104060a1/attendance", async (c) => {
  try {
    const attendanceData = await c.req.json();
    
    const { data, error } = await supabase
      .from('attendance')
      .insert(attendanceData)
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error registrando asistencia:', error);
    return c.json({ error: 'Error registrando asistencia' }, 500);
  }
});

// =============================================
// CRUD: ROUTINE TEMPLATES (Rutinas)
// =============================================

app.get("/make-server-104060a1/routines", async (c) => {
  try {
    const { data, error } = await supabase
      .from('routine_templates')
      .select(`
        *,
        creator:staff!created_by (id, name),
        exercises:routine_exercises (
          id,
          exercise_name,
          day_of_week,
          order_index,
          sets,
          reps,
          rest_seconds,
          notes
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo rutinas:', error);
    return c.json({ error: 'Error obteniendo rutinas' }, 500);
  }
});

// Obtener una rutina por ID
app.get("/make-server-104060a1/routines/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    const { data, error } = await supabase
      .from('routine_templates')
      .select(`
        *,
        creator:staff!created_by (id, name),
        exercises:routine_exercises (
          id,
          exercise_name,
          day_of_week,
          order_index,
          sets,
          reps,
          rest_seconds,
          notes
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Ordenar ejercicios
    if (data.exercises) {
      data.exercises.sort((a: any, b: any) => {
        if (a.day_of_week !== b.day_of_week) {
          return a.day_of_week - b.day_of_week;
        }
        return a.order_index - b.order_index;
      });
    }
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo rutina:', error);
    return c.json({ error: 'Error obteniendo rutina' }, 500);
  }
});

app.post("/make-server-104060a1/routines", async (c) => {
  try {
    const { exercises, ...routineData } = await c.req.json();
    
    console.log('📝 Creando rutina con datos:', JSON.stringify(routineData, null, 2));
    
    // Crear rutina
    const { data: routine, error: routineError } = await supabase
      .from('routine_templates')
      .insert({
        ...routineData,
        is_active: true,
      })
      .select()
      .single();
    
    if (routineError) {
      console.error('❌ Error creando rutina:', routineError);
      throw routineError;
    }
    
    console.log('✅ Rutina creada:', routine.id);
    
    // Crear ejercicios asociados
    if (exercises && exercises.length > 0) {
      console.log(`📋 Insertando ${exercises.length} ejercicios...`);
      
      const exercisesWithRoutineId = exercises.map((ex: any) => ({
        routine_id: routine.id,
        exercise_name: ex.exercise_name,
        day_of_week: ex.day_of_week,
        order_index: ex.order_index,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes || null,
      }));
      
      const { error: exercisesError } = await supabase
        .from('routine_exercises')
        .insert(exercisesWithRoutineId);
      
      if (exercisesError) {
        console.error('❌ Error insertando ejercicios:', exercisesError);
        throw exercisesError;
      }
      
      console.log('✅ Ejercicios insertados correctamente');
    }
    
    return c.json(routine);
  } catch (error) {
    console.error('❌ Error creando rutina:', error);
    return c.json({ 
      error: 'Error creando rutina',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
// =============================================
// ACTUALIZAR RUTINA (Y SUS EJERCICIOS)
// =============================================

app.put("/routines/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    // 1. Separar los ejercicios y adaptar campos
    const { exercises, duration_weeks, ...routineData } = body;

    // Adaptamos la duración al formato de tu base de datos
    if (duration_weeks) {
      routineData.duration = `${duration_weeks} semanas`;
    }

    // 2. Actualizar la tabla principal (routine_templates)
    const { data: updatedRoutine, error: routineError } = await supabase
      .from('routine_templates')
      .update(routineData)
      .eq('id', id)
      .select()
      .single();

    if (routineError) throw routineError;

    // 3. Manejar los ejercicios (Estrategia: Borrar viejos e insertar nuevos)
    if (exercises && Array.isArray(exercises)) {
      
      // Borramos los ejercicios anteriores vinculados a esta rutina
      const { error: deleteError } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('routine_id', id);

      if (deleteError) throw deleteError;

      // Si el arreglo no está vacío, preparamos y guardamos los nuevos
      if (exercises.length > 0) {
        const exercisesToInsert = exercises.map((ex: any) => ({
          ...ex,
          routine_id: id // Le inyectamos el ID de la rutina actual
        }));

        const { error: insertError } = await supabase
          .from('routine_exercises')
          .insert(exercisesToInsert);

        if (insertError) throw insertError;
      }
    }

    return c.json({ success: true, message: "Rutina actualizada correctamente", routine: updatedRoutine });

  } catch (error) {
    console.error('Error actualizando rutina:', error);
    return c.json({ error: 'Error actualizando la rutina y sus ejercicios' }, 500);
  }
});
// Eliminar rutina
app.delete("/make-server-104060a1/routines/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    console.log('🗑️ Eliminando rutina:', id);
    
    // Primero eliminar ejercicios relacionados
    const { error: exercisesError } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('routine_id', id);
    
    if (exercisesError) {
      console.error('❌ Error eliminando ejercicios:', exercisesError);
      throw exercisesError;
    }
    
    // Luego eliminar la rutina
    const { error: routineError } = await supabase
      .from('routine_templates')
      .delete()
      .eq('id', id);
    
    if (routineError) {
      console.error('❌ Error eliminando rutina:', routineError);
      throw routineError;
    }
    
    console.log('✅ Rutina eliminada exitosamente');
    
    return c.json({ message: 'Rutina eliminada' });
  } catch (error) {
    console.error('Error eliminando rutina:', error);
    return c.json({ error: 'Error eliminando rutina' }, 500);
  }
});

// =============================================
// CRUD: USER ROUTINE ASSIGNMENTS (Asignaciones)
// =============================================

// =============================================
// CRUD: EXERCISES (Biblioteca de Ejercicios)
// =============================================

// Obtener todos los ejercicios
app.get("/make-server-104060a1/exercises", async (c) => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo ejercicios:', error);
    return c.json({ error: 'Error obteniendo ejercicios' }, 500);
  }
});

// Obtener un ejercicio por ID
app.get("/make-server-104060a1/exercises/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo ejercicio:', error);
    return c.json({ error: 'Error obteniendo ejercicio' }, 500);
  }
});

// Crear nuevo ejercicio
app.post("/make-server-104060a1/exercises", async (c) => {
  try {
    const exerciseData = await c.req.json();
    
    console.log('📝 Creando ejercicio:', exerciseData.name);
    
    const { data, error } = await supabase
      .from('exercises')
      .insert(exerciseData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creando ejercicio:', error);
      throw error;
    }
    
    console.log('✅ Ejercicio creado:', data.id);
    
    return c.json(data);
  } catch (error) {
    console.error('Error creando ejercicio:', error);
    return c.json({ 
      error: 'Error creando ejercicio',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Actualizar ejercicio
app.put("/make-server-104060a1/exercises/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const exerciseData = await c.req.json();
    
    const { data, error } = await supabase
      .from('exercises')
      .update(exerciseData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error actualizando ejercicio:', error);
    return c.json({ error: 'Error actualizando ejercicio' }, 500);
  }
});

// Eliminar ejercicio
app.delete("/make-server-104060a1/exercises/:id", async (c) => {
  try {
    const { id } = c.req.param();
    
    console.log('🗑️ Eliminando ejercicio:', id);
    
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Error eliminando ejercicio:', error);
      throw error;
    }
    
    console.log('✅ Ejercicio eliminado exitosamente');
    
    return c.json({ message: 'Ejercicio eliminado' });
  } catch (error) {
    console.error('Error eliminando ejercicio:', error);
    return c.json({ error: 'Error eliminando ejercicio. Puede estar en uso en rutinas activas.' }, 500);
  }
});

// =============================================
// CRUD: USER ROUTINE ASSIGNMENTS (Asignaciones)
// =============================================

app.get("/make-server-104060a1/routine-assignments", async (c) => {
  try {
    const { user_id } = c.req.query();
    
    let query = supabase
      .from('user_routine_assignments')
      .select(`
        *,
        users (name, member_number),
        routine_templates (name, description, routine_exercises (*)),
        staff (name)
      `)
      .order('created_at', { ascending: false });
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error obteniendo asignaciones:', error);
    return c.json({ error: 'Error obteniendo asignaciones' }, 500);
  }
});

app.post("/make-server-104060a1/routine-assignments", async (c) => {
  try {
    const assignmentData = await c.req.json();
    
    // Desactivar asignaciones anteriores del mismo usuario
    await supabase
      .from('user_routine_assignments')
      .update({ is_active: false })
      .eq('user_id', assignmentData.user_id)
      .eq('is_active', true);
    
    // Crear nueva asignación
    const { data, error } = await supabase
      .from('user_routine_assignments')
      .insert(assignmentData)
      .select()
      .single();
    
    if (error) throw error;
    
    return c.json(data);
  } catch (error) {
    console.error('Error creando asignación:', error);
    return c.json({ error: 'Error creando asignación' }, 500);
  }
});

// =============================================
// ESTADÍSTICAS DEL DASHBOARD
// =============================================

app.get("/make-server-104060a1/stats", async (c) => {
  try {
    // Total usuarios
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    // Usuarios activos
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Activo');
    
    // Usuarios morosos
    const { count: delinquentUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Moroso');
    
    // Ingresos del mes
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const { data: monthlyPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'Pagado')
      .gte('date', firstDayOfMonth.toISOString());
    
    const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    
    // Asistencia de hoy
    const today = new Date().toISOString().split('T')[0];
    const { count: todayAttendance } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .eq('type', 'Entrada');
    
    // Total staff
    const { count: totalStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Activo');
    
    return c.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      delinquentUsers: delinquentUsers || 0,
      monthlyRevenue,
      todayAttendance: todayAttendance || 0,
      totalStaff: totalStaff || 0
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return c.json({ error: 'Error obteniendo estadísticas' }, 500);
  }
});

// =============================================
// SEED: Crear datos de prueba
// =============================================

app.post("/make-server-104060a1/seed", async (c) => {
  try {
    console.log('🌱 Iniciando seed de datos de prueba...');
    
    // 1. Crear usuarios de staff
    const staffUsers = [
      {
        email: 'admin@gymteques.com',
        password: 'Admin123!',
        name: 'Roberto Administrador',
        role: 'Administrador',
        phone: '0414-9999999',
        shift: 'Tiempo Completo'
      },
      {
        email: 'trainer@gymteques.com',
        password: 'Trainer123!',
        name: 'Laura Entrenadora',
        role: 'Entrenador',
        phone: '0424-8888888',
        shift: 'Mañana (6am - 2pm)'
      },
      {
        email: 'recepcion@gymteques.com',
        password: 'Recepcion123!',
        name: 'Pedro Recepcionista',
        role: 'Recepción',
        phone: '0412-7777777',
        shift: 'Tarde (2pm - 10pm)'
      }
    ];
    
    const createdStaff = [];
    
    for (const staffData of staffUsers) {
      // Verificar si ya existe
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('email')
        .eq('email', staffData.email)
        .single();
      
      if (!existingStaff) {
        // Crear usuario en auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: staffData.email,
          password: staffData.password,
          email_confirm: true,
          user_metadata: { name: staffData.name, role: staffData.role }
        });
        
        if (authError) {
          console.error(`Error creando ${staffData.email}:`, authError);
          continue;
        }
        
        // Crear registro en staff
        const { data: newStaff, error: staffError } = await supabase
          .from('staff')
          .insert({
            auth_user_id: authData.user.id,
            name: staffData.name,
            role: staffData.role,
            email: staffData.email,
            phone: staffData.phone,
            shift: staffData.shift,
            status: 'Activo'
          })
          .select()
          .single();
        
        if (!staffError) {
          createdStaff.push(newStaff);
          console.log(`✅ Staff creado: ${staffData.email}`);
        }
      } else {
        console.log(`⏭️  Staff ya existe: ${staffData.email}`);
      }
    }
    
    // 2. Crear miembros de prueba
    const members = [
      {
        member_number: 'GYM-001',
        name: 'Carlos Rodríguez',
        email: 'carlos@example.com',
        phone: '0414-1234567',
        status: 'Activo',
        plan: 'Plan Mensual',
        start_date: '2025-02-01',
        next_payment: '2025-03-01',
        weight: 75.5,
        height: 1.75,
        imc: 24.65
      },
      {
        member_number: 'GYM-002',
        name: 'María González',
        email: 'maria@example.com',
        phone: '0424-2345678',
        status: 'Activo',
        plan: 'Plan Trimestral',
        start_date: '2025-01-15',
        next_payment: '2025-04-15',
        weight: 62.0,
        height: 1.65,
        imc: 22.77
      },
      {
        member_number: 'GYM-003',
        name: 'José Pérez',
        email: 'jose@example.com',
        phone: '0412-3456789',
        status: 'Moroso',
        plan: 'Plan Mensual',
        start_date: '2024-12-01',
        next_payment: '2025-02-01',
        weight: 80.0,
        height: 1.80,
        imc: 24.69
      },
      {
        member_number: 'GYM-004',
        name: 'Ana Martínez',
        email: 'ana@example.com',
        phone: '0426-4567890',
        status: 'Activo',
        plan: 'Plan Anual',
        start_date: '2025-01-01',
        next_payment: '2026-01-01',
        weight: 58.5,
        height: 1.62,
        imc: 22.30
      },
      {
        member_number: 'GYM-005',
        name: 'Luis Hernández',
        email: 'luis@example.com',
        phone: '0414-5678901',
        status: 'Inactivo',
        plan: 'Plan Mensual',
        start_date: '2024-11-15',
        next_payment: '2024-12-15',
        weight: 88.0,
        height: 1.78,
        imc: 27.76
      }
    ];
    
    const createdMembers = [];
    
    for (const memberData of members) {
      const { data: existingMember } = await supabase
        .from('users')
        .select('member_number')
        .eq('member_number', memberData.member_number)
        .single();
      
      if (!existingMember) {
        const { data: newMember, error } = await supabase
          .from('users')
          .insert(memberData)
          .select()
          .single();
        
        if (!error) {
          createdMembers.push(newMember);
          console.log(`✅ Miembro creado: ${memberData.name}`);
        }
      } else {
        console.log(`⏭️  Miembro ya existe: ${memberData.name}`);
      }
    }
    
    // 3. Crear algunos pagos de ejemplo
    if (createdMembers.length > 0) {
      const payments = [
        {
          user_id: createdMembers[0]?.id,
          amount: 50.00,
          date: '2025-02-01',
          next_payment: '2025-03-01',
          status: 'Pagado',
          method: 'Efectivo'
        },
        {
          user_id: createdMembers[1]?.id,
          amount: 135.00,
          date: '2025-01-15',
          next_payment: '2025-04-15',
          status: 'Pagado',
          method: 'Transferencia'
        }
      ];
      
      for (const payment of payments) {
        if (payment.user_id) {
          await supabase.from('payments').insert(payment);
        }
      }
      
      console.log('✅ Pagos de ejemplo creados');
    }
    
    return c.json({
      success: true,
      message: 'Seed completado exitosamente',
      created: {
        staff: createdStaff.length,
        members: createdMembers.length
      },
      credentials: {
        admin: 'admin@gymteques.com / Admin123!',
        trainer: 'trainer@gymteques.com / Trainer123!',
        reception: 'recepcion@gymteques.com / Recepcion123!'
      }
    });
    
  } catch (error) {
    console.error('Error en seed:', error);
    return c.json({ error: 'Error ejecutando seed' }, 500);
  }
});

Deno.serve(app.fetch);