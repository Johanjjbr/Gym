/**
 * API Client para el Sistema de Gimnasio
 * 
 * Proporciona funciones helpers para interactuar con el backend de Supabase
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';

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
  const token = localStorage.getItem('access_token') || publicAnonKey;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error en la petición');
  }

  return data;
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
    
    // Guardar token en localStorage
    if (data.session?.access_token) {
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('user', JSON.stringify(data.staff));
    }
    
    return data;
  },

  /**
   * Verificar sesión activa
   */
  getSession: async (): Promise<{ user: any; staff: any }> => {
    return apiRequest('/auth/session');
  },

  /**
   * Cerrar sesión
   */
  logout: async (): Promise<void> => {
    await apiRequest('/auth/logout', { method: 'POST' });
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
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
// USUARIOS (Miembros)
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
    return apiRequest(`/users/${id}`);
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
// STAFF (Personal)
// =============================================

export const staff = {
  /**
   * Obtener todo el staff
   */
  getAll: async () => {
    return apiRequest('/staff');
  },

  /**
   * Actualizar staff
   */
  update: async (id: string, staffData: any) => {
    return apiRequest(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    });
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
// RUTINAS
// =============================================

export const routines = {
  /**
   * Obtener todas las rutinas
   */
  getAll: async () => {
    return apiRequest('/routines');
  },

  /**
   * Crear nueva rutina con ejercicios
   */
  create: async (routineData: {
    name: string;
    description: string;
    level: 'Principiante' | 'Intermedio' | 'Avanzado';
    category: string;
    duration: string;
    days_per_week: number;
    created_by: string;
    exercises: any[];
  }) => {
    return apiRequest('/routines', {
      method: 'POST',
      body: JSON.stringify(routineData),
    });
  },
};

// =============================================
// ASIGNACIONES DE RUTINAS
// =============================================

export const routineAssignments = {
  /**
   * Obtener asignaciones (opcionalmente filtradas por usuario)
   */
  getAll: async (userId?: string) => {
    const query = userId ? `?user_id=${userId}` : '';
    return apiRequest(`/routine-assignments${query}`);
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
  }) => {
    return apiRequest('/routine-assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
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
  stats,
  utils,
};
