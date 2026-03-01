/**
 * API Client para el Sistema de Gimnasio
 * 
 * Proporciona funciones helpers para interactuar con el backend de Supabase
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from './supabase';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-104060a1`;

// =============================================
// Tipos de respuesta
// =============================================

export interface AuthResponse {
  session: {
    access_token: string;
    refresh_token: string;
  };
  user: {
    id: string;
    email: string;
  };
  staff: {
    id: string;
    name: string;
    role: 'Administrador' | 'Entrenador' | 'Recepción';
    email: string;
    phone: string;
    shift: string;
    status: string;
  };
}

export interface ApiError {
  error: string;
}

// =============================================
// Helper para hacer requests
// =============================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
  if (options.body) {
    console.log('📤 Request body:', JSON.parse(options.body as string));
  }
  
  try {
    // Obtener el token actual de la sesión de Supabase
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token || publicAnonKey;
    
    console.log('🔑 Using token:', token ? `${token.substring(0, 20)}...` : 'anon key');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    // Para errores 404, lanzar inmediatamente para que el fallback funcione
    if (response.status === 404) {
      const error = new Error('Endpoint not found');
      (error as any).status = 404;
      throw error;
    }

    // Verificar si la respuesta es JSON válida
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log(`📥 Response (${response.status}):`, data);
    } else {
      const text = await response.text();
      console.error('❌ Response is not JSON:', text);
      
      // Si no es JSON, crear un error apropiado
      const error = new Error(`Invalid response from server (${response.status})`);
      (error as any).status = response.status;
      throw error;
    }

    if (!response.ok) {
      // Si es 401, limpiar la sesión
      if (response.status === 401) {
        console.warn('⚠️ Token inválido o expirado. Limpiando sesión...');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        await supabase.auth.signOut();
      }
      
      // Crear un error más descriptivo basado en el código de estado
      const errorMessage = data.error || data.message || data.details || `Error ${response.status}: ${response.statusText}`;
      console.error(`❌ API Error (${response.status}):`, data);
      
      const error = new Error(errorMessage);
      
      // Agregar información del status para mejor manejo de errores
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).details = data.details;
      
      throw error;
    }

    return data;
  } catch (error: any) {
    // Si ya es un error con status (procesado arriba), re-lanzarlo
    if (error.status) {
      throw error;
    }
    
    // Si es un error de red o el fetch falló
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ Network error - URL:', url);
      const networkError = new Error('Error de conexión. Verifica tu conexión a internet o la configuración de Supabase.');
      (networkError as any).status = 0;
      throw networkError;
    }
    
    // Re-lanzar cualquier otro error
    throw error;
  }
}

// =============================================
// AUTENTICACIÓN
// =============================================

export const auth = {
  /**
   * Iniciar sesión
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const data = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Guardar token en localStorage Y en Supabase Auth
    if (data.session?.access_token) {
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('user', JSON.stringify(data.staff));
      
      // Establecer la sesión en Supabase client
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }
    
    return data;
  },

  /**
   * Verificar sesión activa
   */
  getSession: async (): Promise<{ user: any; staff: any }> => {
    try {
      return await apiRequest('/auth/session');
    } catch (error: any) {
      // Si la función no está deployada o hay error 404, retornar null silenciosamente
      if (error.status === 404 || error.message.includes('404')) {
        console.warn('Edge Function no encontrada. Asegúrate de que esté deployada.');
        throw new Error('Función de autenticación no disponible');
      }
      throw error;
    }
  },

  /**
   * Cerrar sesión
   */
  logout: async (): Promise<void> => {
    // Limpiar primero el localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // Cerrar sesión en Supabase
    await supabase.auth.signOut();
    
    // Intentar llamar al endpoint de logout pero no fallar si hay error
    try {
      // Usar el anon key para el logout ya que el token de usuario puede estar inválido
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        console.warn('⚠️ Error al cerrar sesión en el servidor, pero la sesión local fue limpiada');
      }
    } catch (error: any) {
      console.warn('⚠️ No se pudo contactar al servidor para logout, pero la sesión local fue limpiada');
    }
  },

  /**
   * Crear nuevo usuario de staff
   */
  signup: async (data: {
    email: string;
    password: string;
    name: string;
    role: 'Administrador' | 'Entrenador' | 'Recepción';
    phone: string;
    shift: string;
  }): Promise<any> => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener usuario actual del localStorage
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Verificar si hay usuario autenticado
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};

// =============================================
// USUARIOS
// =============================================

export const users = {
  /**
   * Obtener todos los usuarios
   */
  getAll: async () => {
    return apiRequest('/users');
  },

  /**
   * Obtener un usuario por ID
   */
  getById: async (id: string) => {
    try {
      // Intentar usar la API primero
      return await apiRequest(`/users/${id}`);
    } catch (error: any) {
      // Si falla, usar Supabase directamente
      console.log('⚠️ API no disponible, usando Supabase directamente para obtener usuario');
      
      // Primero obtener el usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (userError) {
        console.error('❌ Error de Supabase obteniendo usuario:', userError);
        throw new Error(userError.message || 'Error al obtener usuario');
      }
      
      console.log('📋 Usuario base obtenido:', userData);
      console.log('🔍 assigned_trainer ID:', userData.assigned_trainer);
      
      // Si tiene entrenador asignado, buscarlo en staff
      let trainerData = null;
      if (userData.assigned_trainer) {
        console.log('🔍 Buscando entrenador en staff con ID:', userData.assigned_trainer);
        
        const { data: trainer, error: trainerError } = await supabase
          .from('staff')
          .select('id, name, email, phone, role')
          .eq('id', userData.assigned_trainer)
          .maybeSingle();
        
        if (trainerError) {
          console.error('❌ Error obteniendo entrenador de staff:', trainerError);
        } else if (trainer) {
          console.log('✅ Entrenador encontrado en staff:', trainer);
          trainerData = trainer;
        } else {
          console.warn('⚠️ No se encontró entrenador en staff con ID:', userData.assigned_trainer);
        }
      } else {
        console.log('ℹ️ Usuario no tiene entrenador asignado (assigned_trainer es null)');
      }
      
      // Transformar datos para que coincidan con el formato esperado
      const transformedData = {
        ...userData,
        trainer_name: trainerData?.name || null,
        trainer_email: trainerData?.email || null,
        trainer_phone: trainerData?.phone || null,
        trainer: trainerData,
      };
      
      console.log('✅ Usuario transformado final:', transformedData);
      console.log('✅ trainer_name para mostrar:', transformedData.trainer_name);
      return transformedData;
    }
  },

  /**
   * Crear nuevo usuario
   */
  create: async (userData: any) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Actualizar usuario
   */
  update: async (id: string, userData: any) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Eliminar usuario
   */
  delete: async (id: string) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Asignar entrenador a usuario
   */
  assignTrainer: async (userId: string, trainerId: string | null) => {
    try {
      // Intentar usar la API primero
      return await apiRequest(`/users/${userId}/assign-trainer`, {
        method: 'POST',
        body: JSON.stringify({ trainer_id: trainerId }),
      });
    } catch (error: any) {
      // Si falla (404, 401, etc), usar Supabase directamente
      console.log('⚠️ API no disponible, usando Supabase directamente para asignar entrenador');
      
      const { data, error: supabaseError } = await supabase
        .from('users')
        .update({ 
          assigned_trainer: trainerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (supabaseError) {
        console.error('❌ Error de Supabase:', supabaseError);
        throw new Error(supabaseError.message || 'Error al asignar entrenador');
      }
      
      console.log('✅ Entrenador asignado via Supabase:', data);
      return data;
    }
  },

  /**
   * Obtener usuarios sin entrenador
   */
  getWithoutTrainer: async () => {
    return apiRequest('/users/without-trainer');
  },
};

// =============================================
// PAGOS
// =============================================

export const payments = {
  /**
   * Obtener todos los pagos
   */
  getAll: async () => {
    return apiRequest('/payments');
  },

  /**
   * Obtener pagos de un usuario específico
   */
  getByUser: async (userId: string) => {
    return apiRequest(`/users/${userId}/payments`);
  },

  /**
   * Registrar nuevo pago
   */
  create: async (paymentData: {
    user_id: string;
    amount: number;
    date: string;
    next_payment: string;
    status: 'Pagado' | 'Pendiente' | 'Vencido';
    method: 'Efectivo' | 'Transferencia' | 'Tarjeta';
  }) => {
    return apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },
};

// =============================================
// PERSONAL (STAFF)
// =============================================

export const staff = {
  /**
   * Obtener todo el personal
   */
  getAll: async () => {
    return apiRequest('/staff');
  },

  /**
   * Obtener un miembro del personal por ID
   */
  getById: async (id: string) => {
    return apiRequest(`/staff/${id}`);
  },

  /**
   * Obtener solo entrenadores activos
   */
  getTrainers: async () => {
    try {
      // Intentar usar la API primero
      return await apiRequest('/trainers');
    } catch (error: any) {
      // Si falla, usar Supabase directamente
      console.log('⚠️ API no disponible, usando Supabase directamente para obtener entrenadores');
      
      const { data, error: supabaseError } = await supabase
        .from('staff')
        .select('*')
        .eq('role', 'Entrenador')
        .eq('status', 'Activo')
        .order('name');
      
      if (supabaseError) {
        console.error('❌ Error de Supabase:', supabaseError);
        throw new Error(supabaseError.message || 'Error al obtener entrenadores');
      }
      
      console.log('✅ Entrenadores obtenidos via Supabase:', data);
      return data;
    }
  },

  /**
   * Crear nuevo empleado
   */
  create: async (staffData: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone: string;
    shift: string;
  }) => {
    return apiRequest('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  },

  /**
   * Actualizar empleado
   */
  update: async (id: string, staffData: any) => {
    return apiRequest(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    });
  },

  /**
   * Eliminar empleado
   */
  delete: async (id: string) => {
    return apiRequest(`/staff/${id}`, {
      method: 'DELETE',
    });
  },
};

// =============================================
// PROGRESO FÍSICO
// =============================================

export const physicalProgress = {
  /**
   * Obtener progreso físico por usuario
   */
  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('physical_progress')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Crear un nuevo registro de progreso
   */
  async create(progressData: {
    user_id: string;
    weight: number;
    body_fat?: number;
    muscle_mass?: number;
    notes?: string;
    date?: string;
  }) {
    const { data, error } = await supabase
      .from('physical_progress')
      .insert([{
        ...progressData,
        date: progressData.date || new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Eliminar un registro de progreso
   */
  async delete(id: string) {
    const { error } = await supabase
      .from('physical_progress')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// =============================================
// ASISTENCIA
// =============================================

export const attendance = {
  /**
   * Obtener asistencia (opcionalmente filtrada por fecha)
   */
  getAll: async (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return apiRequest(`/attendance${query}`);
  },

  /**
   * Registrar asistencia
   */
  create: async (attendanceData: {
    user_id: string;
    date?: string;
    time?: string;
    type: 'Entrada' | 'Salida';
  }) => {
    return apiRequest('/attendance', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  },
};

// =============================================
// EJERCICIOS (LIBRERÍA)
// =============================================

export const exercises = {
  /**
   * Obtener todos los ejercicios de la librería
   */
  getAll: async () => {
    try {
      return await apiRequest('/exercises');
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para obtener ejercicios');
      
      const { data, error: supabaseError } = await supabase
        .from('exercises')
        .select('*')
        .order('name');
      
      if (supabaseError) {
        console.error('❌ Error de Supabase al obtener ejercicios:', supabaseError);
        throw new Error(supabaseError.message);
      }
      return data;
    }
  },

  /**
   * Obtener un ejercicio por ID
   */
  getById: async (id: string) => {
    try {
      return await apiRequest(`/exercises/${id}`);
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para obtener ejercicio');
      
      const { data, error: supabaseError } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },

  /**
   * Crear nuevo ejercicio en la librería
   */
  create: async (exerciseData: {
    name: string;
    description?: string;
    muscle_group: string;
    equipment?: string;
  }) => {
    try {
      return await apiRequest('/exercises', {
        method: 'POST',
        body: JSON.stringify(exerciseData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para crear ejercicio');
      
      // Obtener el usuario actual
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      
      const { data, error: supabaseError } = await supabase
        .from('exercises')
        .insert([{
          name: exerciseData.name,
          description: exerciseData.description || null,
          muscle_group: exerciseData.muscle_group,
          equipment: exerciseData.equipment || null,
          created_by: userId || null,
        }])
        .select()
        .single();
      
      if (supabaseError) {
        // Manejar error de duplicado
        if (supabaseError.code === '23505') {
          throw new Error('Ya existe un ejercicio con ese nombre');
        }
        throw new Error(supabaseError.message);
      }
      return data;
    }
  },

  /**
   * Actualizar ejercicio
   */
  update: async (id: string, exerciseData: {
    name?: string;
    description?: string;
    muscle_group?: string;
    equipment?: string;
  }) => {
    try {
      return await apiRequest(`/exercises/${id}`, {
        method: 'PUT',
        body: JSON.stringify(exerciseData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para actualizar ejercicio');
      
      const { data, error: supabaseError } = await supabase
        .from('exercises')
        .update({
          ...exerciseData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },

  /**
   * Eliminar ejercicio
   */
  delete: async (id: string) => {
    try {
      return await apiRequest(`/exercises/${id}`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para eliminar ejercicio');
      
      const { error: supabaseError } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);
      
      if (supabaseError) throw new Error(supabaseError.message);
    }
  },
};

// =============================================
// RUTINAS
// =============================================

export const routines = {
  /**
   * Obtener todas las plantillas de rutinas
   */
  getAll: async () => {
    // FORZAR uso de Supabase directamente - API no disponible
    console.log('🔍 Obteniendo rutinas directamente de Supabase...');
    
    try {
      const { data: routines, error: routinesError } = await supabase
        .from('routine_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (routinesError) {
        console.error('❌ Error de Supabase al obtener rutinas:', routinesError);
        console.error('❌ Código:', routinesError.code);
        console.error('❌ Mensaje:', routinesError.message);
        
        // Si la tabla no existe, retornar array vacío
        if (routinesError.code === 'PGRST116' || routinesError.code === '42P01' || routinesError.code === '42501') {
          console.warn('⚠️ Tabla no disponible o sin permisos. Retornando array vacío.');
          return [];
        }
        
        throw new Error(routinesError.message);
      }
      
      if (!routines || routines.length === 0) {
        console.log('ℹ️ No hay rutinas creadas aún');
        return [];
      }
      
      console.log('✅ Rutinas básicas obtenidas:', routines.length);
      
      // Enriquecer cada rutina con ejercicios y creador
      const enrichedRoutines = await Promise.all(
        routines.map(async (routine) => {
          try {
            // Obtener ejercicios
            const { data: exercises, error: exercisesError } = await supabase
              .from('routine_exercises')
              .select('*')
              .eq('routine_id', routine.id)
              .order('day_of_week')
              .order('order_index');
            
            if (exercisesError) {
              console.warn(`⚠️ Error al obtener ejercicios de rutina ${routine.id}:`, exercisesError.message);
            }
            
            // Obtener creador
            const { data: creator, error: creatorError } = await supabase
              .from('staff')
              .select('id, name')
              .eq('id', routine.created_by)
              .maybeSingle();
            
            if (creatorError) {
              console.warn(`⚠️ Error al obtener creador de rutina ${routine.id}:`, creatorError.message);
            }
            
            return {
              ...routine,
              routine_exercises: exercises || [],
              staff: creator || null,
            };
          } catch (enrichError) {
            console.warn(`⚠️ Error enriqueciendo rutina ${routine.id}:`, enrichError);
            return {
              ...routine,
              routine_exercises: [],
              staff: null,
            };
          }
        })
      );
      
      console.log('✅ Rutinas enriquecidas:', enrichedRoutines.length);
      return enrichedRoutines;
      
    } catch (error: any) {
      console.error('❌ Error procesando rutinas:', error);
      console.error('❌ Stack:', error.stack);
      // Retornar array vacío para no romper la UI
      return [];
    }
  },

  /**
   * Obtener una rutina por ID con sus ejercicios
   */
  getById: async (id: string) => {
    try {
      return await apiRequest(`/routines/${id}`);
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para obtener rutina');
      
      const { data: routine, error: routineError } = await supabase
        .from('routine_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (routineError) throw new Error(routineError.message);
      
      // Obtener ejercicios
      const { data: exercises } = await supabase
        .from('routine_exercises')
        .select('*')
        .eq('routine_id', id)
        .order('day_of_week')
        .order('order_index');
      
      // Obtener creador
      const { data: creator } = await supabase
        .from('staff')
        .select('id, name')
        .eq('id', routine.created_by)
        .maybeSingle();
      
      return {
        ...routine,
        exercises: exercises || [],
        creator: creator,
      };
    }
  },

  /**
   * Crear nueva plantilla de rutina con ejercicios
   */
  create: async (routineData: {
    name: string;
    description: string;
    level: 'Principiante' | 'Intermedio' | 'Avanzado';
    category: string;
    duration_weeks: number;
    days_per_week: number;
    created_by: string;
    exercises: Array<{
      exercise_name: string;
      day_of_week: number;
      order_index: number;
      sets: number;
      reps: string;
      rest_seconds: number;
      notes?: string;
    }>;
  }) => {
    try {
      return await apiRequest('/routines', {
        method: 'POST',
        body: JSON.stringify(routineData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para crear rutina');
      
      // Crear la plantilla de rutina
      const { data: routine, error: routineError } = await supabase
        .from('routine_templates')
        .insert([{
          name: routineData.name,
          description: routineData.description,
          level: routineData.level,
          category: routineData.category,
          duration_weeks: routineData.duration_weeks,
          days_per_week: routineData.days_per_week,
          created_by: routineData.created_by,
          is_active: true,
        }])
        .select()
        .single();
      
      if (routineError) throw new Error(routineError.message);
      
      // Crear los ejercicios de la rutina
      if (routineData.exercises && routineData.exercises.length > 0) {
        const exercisesWithRoutineId = routineData.exercises.map(ex => ({
          ...ex,
          routine_id: routine.id,
        }));
        
        const { error: exercisesError } = await supabase
          .from('routine_exercises')
          .insert(exercisesWithRoutineId);
        
        if (exercisesError) throw new Error(exercisesError.message);
      }
      
      return routine;
    }
  },

  /**
   * Actualizar rutina
   */
  update: async (id: string, routineData: {
    name?: string;
    description?: string;
    level?: 'Principiante' | 'Intermedio' | 'Avanzado';
    category?: string;
    duration_weeks?: number;
    days_per_week?: number;
    is_active?: boolean;
    exercises?: Array<{
      exercise_name: string;
      day_of_week: number;
      order_index: number;
      sets: number;
      reps: string;
      rest_seconds: number;
      notes?: string;
    }>;
  }) => {
    try {
      return await apiRequest(`/routines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(routineData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para actualizar rutina');
      
      // Extraer ejercicios del routineData
      const { exercises, ...routineFields } = routineData;
      
      // Actualizar la rutina
      const { data, error: supabaseError } = await supabase
        .from('routine_templates')
        .update({
          ...routineFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      
      // Si se proporcionaron ejercicios, actualizar también
      if (exercises && exercises.length >= 0) {
        // Primero eliminar todos los ejercicios existentes
        await supabase
          .from('routine_exercises')
          .delete()
          .eq('routine_id', id);
        
        // Luego insertar los nuevos ejercicios
        if (exercises.length > 0) {
          const exercisesWithRoutineId = exercises.map(ex => ({
            ...ex,
            routine_id: id,
          }));
          
          const { error: exercisesError } = await supabase
            .from('routine_exercises')
            .insert(exercisesWithRoutineId);
          
          if (exercisesError) throw new Error(exercisesError.message);
        }
      }
      
      return data;
    }
  },

  /**
   * Eliminar rutina
   */
  delete: async (id: string) => {
    try {
      return await apiRequest(`/routines/${id}`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente para eliminar rutina');
      
      // Primero eliminar ejercicios relacionados
      await supabase
        .from('routine_exercises')
        .delete()
        .eq('routine_id', id);
      
      // Luego eliminar la rutina
      const { error: supabaseError } = await supabase
        .from('routine_templates')
        .delete()
        .eq('id', id);
      
      if (supabaseError) throw new Error(supabaseError.message);
    }
  },

  /**
   * Agregar ejercicio a una rutina
   */
  addExercise: async (routineId: string, exerciseData: {
    exercise_name: string;
    day_of_week: number;
    order_index: number;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes?: string;
  }) => {
    try {
      return await apiRequest(`/routines/${routineId}/exercises`, {
        method: 'POST',
        body: JSON.stringify(exerciseData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('routine_exercises')
        .insert([{
          ...exerciseData,
          routine_id: routineId,
        }])
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },

  /**
   * Eliminar ejercicio de una rutina
   */
  deleteExercise: async (exerciseId: string) => {
    try {
      return await apiRequest(`/routines/exercises/${exerciseId}`, {
        method: 'DELETE',
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { error: supabaseError } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('id', exerciseId);
      
      if (supabaseError) throw new Error(supabaseError.message);
    }
  },
};

// =============================================
// ASIGNACIONES DE RUTINAS
// =============================================

export const routineAssignments = {
  /**
   * Obtener todas las asignaciones de rutinas
   * Opcionalmente filtradas por usuario
   */
  getAll: async (userId?: string) => {
    try {
      const query = userId ? `?user_id=${userId}` : '';
      return await apiRequest(`/routine-assignments${query}`);
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      console.log('🔍 Obteniendo asignaciones para userId:', userId);
      
      try {
        // Primero, obtener las asignaciones básicas
        let assignmentsQuery = supabase
          .from('user_routine_assignments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (userId) {
          assignmentsQuery = assignmentsQuery.eq('user_id', userId);
        }
        
        const { data: assignments, error: assignmentsError } = await assignmentsQuery;
        
        if (assignmentsError) {
          console.error('❌ Error al obtener asignaciones básicas:', assignmentsError);
          throw new Error(assignmentsError.message);
        }
        
        console.log('✅ Asignaciones básicas obtenidas:', assignments?.length || 0);
        
        // Si no hay asignaciones, retornar array vacío
        if (!assignments || assignments.length === 0) {
          return [];
        }
        
        // Obtener datos relacionados para cada asignación
        const enrichedAssignments = await Promise.all(
          assignments.map(async (assignment) => {
            // Obtener rutina con ejercicios
            const { data: routine } = await supabase
              .from('routine_templates')
              .select(`
                id,
                name,
                description,
                level,
                category,
                routine_exercises (
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
              .eq('id', assignment.routine_id)
              .single();
            
            // Obtener usuario
            const { data: user } = await supabase
              .from('users')
              .select('id, name, email')
              .eq('id', assignment.user_id)
              .single();
            
            // Obtener staff que asignó
            const { data: staff } = await supabase
              .from('staff')
              .select('id, name')
              .eq('id', assignment.assigned_by)
              .maybeSingle();
            
            return {
              ...assignment,
              routine_templates: routine,
              users: user,
              staff: staff,
            };
          })
        );
        
        console.log('✅ Asignaciones enriquecidas:', enrichedAssignments.length);
        return enrichedAssignments;
        
      } catch (innerError: any) {
        console.error('❌ Error procesando asignaciones:', innerError);
        throw innerError;
      }
    }
  },

  /**
   * Obtener usuarios asignados a una rutina específica
   */
  getByRoutine: async (routineId: string) => {
    try {
      return await apiRequest(`/routine-assignments?routine_id=${routineId}`);
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('user_routine_assignments')
        .select(`
          *,
          user:users (
            id,
            name,
            email,
            phone
          ),
          assigner:staff!assigned_by (
            id,
            name
          )
        `)
        .eq('routine_id', routineId)
        .order('created_at', { ascending: false });
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },

  /**
   * Asignar rutina a usuario
   */
  create: async (assignmentData: {
    user_id: string;
    routine_id: string;
    assigned_by: string;
    start_date: string;
    end_date?: string;
    notes?: string;
  }) => {
    try {
      return await apiRequest('/routine-assignments', {
        method: 'POST',
        body: JSON.stringify(assignmentData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('user_routine_assignments')
        .insert([{
          ...assignmentData,
          is_active: true,
        }])
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },

  /**
   * Desactivar asignación
   */
  deactivate: async (id: string) => {
    try {
      return await apiRequest(`/routine-assignments/${id}/deactivate`, {
        method: 'PATCH',
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('user_routine_assignments')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },
};

// =============================================
// SESIONES DE ENTRENAMIENTO
// =============================================

export const workoutSessions = {
  /**
   * Obtener sesiones de un usuario
   */
  getByUser: async (userId: string) => {
    try {
      return await apiRequest(`/workout-sessions?user_id=${userId}`);
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          assignment:user_routine_assignments (
            id,
            routine:routine_templates (
              id,
              name
            )
          ),
          logs:workout_exercise_logs (
            id,
            exercise_name,
            sets_completed,
            reps_completed,
            weight_used,
            is_completed,
            notes
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },

  /**
   * Crear nueva sesión de entrenamiento
   */
  create: async (sessionData: {
    user_id: string;
    assignment_id: string;
    date: string;
    day_number: number;
  }) => {
    try {
      return await apiRequest('/workout-sessions', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('workout_sessions')
        .insert([{
          ...sessionData,
          status: 'En progreso',
        }])
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },

  /**
   * Completar sesión
   */
  complete: async (id: string) => {
    try {
      return await apiRequest(`/workout-sessions/${id}/complete`, {
        method: 'PATCH',
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('workout_sessions')
        .update({ 
          status: 'Completado',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },
};

// =============================================
// REGISTRO DE EJERCICIOS
// =============================================

export const exerciseLogs = {
  /**
   * Registrar ejercicio completado
   */
  create: async (logData: {
    session_id: string;
    exercise_name: string;
    sets_completed: number;
    reps_completed: string;
    weight_used?: number;
    notes?: string;
  }) => {
    try {
      return await apiRequest('/exercise-logs', {
        method: 'POST',
        body: JSON.stringify(logData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('workout_exercise_logs')
        .insert([{
          ...logData,
          is_completed: true,
        }])
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },

  /**
   * Actualizar log de ejercicio
   */
  update: async (id: string, logData: {
    sets_completed?: number;
    reps_completed?: string;
    weight_used?: number;
    is_completed?: boolean;
    notes?: string;
  }) => {
    try {
      return await apiRequest(`/exercise-logs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(logData),
      });
    } catch (error: any) {
      console.log('⚠️ API no disponible, usando Supabase directamente');
      
      const { data, error: supabaseError } = await supabase
        .from('workout_exercise_logs')
        .update(logData)
        .eq('id', id)
        .select()
        .single();
      
      if (supabaseError) throw new Error(supabaseError.message);
      return data;
    }
  },
};

// =============================================
// ESTADÍSTICAS
// =============================================

export const stats = {
  /**
   * Obtener estadísticas del dashboard
   */
  getDashboard: async () => {
    return apiRequest('/stats');
  },
};

// =============================================
// UTILIDADES
// =============================================

export const utils = {
  /**
   * Ejecutar seed de datos de prueba
   */
  runSeed: async () => {
    return apiRequest('/seed', { method: 'POST' });
  },

  /**
   * Health check
   */
  healthCheck: async () => {
    return apiRequest('/health');
  },
};

// =============================================
// Export default con todas las funciones
// =============================================

export default {
  auth,
  users,
  payments,
  staff,
  attendance,
  routines,
  routineAssignments,
  workoutSessions,
  exerciseLogs,
  stats,
  utils,
  physicalProgress,
  exercises,
};