/**
 * Schemas de validación con Zod
 * Evita datos corruptos en la base de datos
 */

import { z } from 'zod';

// =============================================
// USUARIOS (Miembros del Gimnasio)
// =============================================

export const userSchema = z.object({
  member_number: z.string()
    .min(1, 'Número de miembro es requerido')
    .max(50, 'Número de miembro demasiado largo')
    .optional(), // Opcional en creación, se puede generar automáticamente
  
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email demasiado largo'),
  
  phone: z.string()
    .min(1, 'El teléfono es requerido')
    .max(20, 'Teléfono demasiado largo'),
  
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  
  gender: z.string()
    .max(20, 'Género demasiado largo')
    .optional()
    .or(z.literal('')),
  
  address: z.string()
    .max(500, 'Dirección demasiado larga')
    .optional()
    .or(z.literal('')),
  
  emergency_contact: z.string()
    .max(200, 'Contacto de emergencia demasiado largo')
    .optional()
    .or(z.literal('')),
  
  plan: z.string()
    .max(100, 'Plan demasiado largo')
    .optional()
    .or(z.literal('')),
  
  status: z.enum(['Activo', 'Inactivo', 'Moroso', 'Suspendido'], {
    errorMap: () => ({ message: 'Estado debe ser Activo, Inactivo, Moroso o Suspendido' })
  }),
  
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
    .optional(),
  
  next_payment: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  
  weight: z.string()
    .optional()
    .transform((val) => val === '' || !val ? undefined : parseFloat(val))
    .pipe(z.number().positive('El peso debe ser positivo').max(500, 'Peso fuera de rango').optional()),
  
  height: z.string()
    .optional()
    .transform((val) => val === '' || !val ? undefined : parseFloat(val))
    .pipe(z.number().positive('La altura debe ser positiva').min(50, 'Altura mínima: 50cm').max(300, 'Altura máxima: 300cm').optional()),
  
  bmi: z.union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (!val || val === '') return undefined;
      return typeof val === 'string' ? parseFloat(val) : val;
    })
    .pipe(z.number().positive('El IMC debe ser positivo').optional()),
  
  notes: z.string()
    .max(1000, 'Notas demasiado largas')
    .optional()
    .or(z.literal('')),
  
  medical_notes: z.string()
    .max(1000, 'Notas médicas demasiado largas')
    .optional()
    .or(z.literal('')),
});

export type UserFormData = z.infer<typeof userSchema>;

// =============================================
// DATOS FÍSICOS
// =============================================

export const physicalDataSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
  
  weight: z.number()
    .positive('El peso debe ser positivo')
    .max(500, 'Peso fuera de rango')
    .optional(),
  
  height: z.number()
    .positive('La altura debe ser positiva')
    .min(50, 'Altura mínima: 50cm')
    .max(300, 'Altura máxima: 300cm')
    .optional(),
  
  bmi: z.number()
    .positive('El IMC debe ser positivo')
    .max(100, 'IMC fuera de rango')
    .optional(),
  
  body_fat: z.number()
    .min(0, 'Grasa corporal mínima: 0%')
    .max(100, 'Grasa corporal máxima: 100%')
    .optional(),
  
  muscle_mass: z.number()
    .min(0, 'Masa muscular mínima: 0%')
    .max(100, 'Masa muscular máxima: 100%')
    .optional(),
  
  measurement_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD'),
  
  notes: z.string()
    .max(500, 'Notas demasiado largas')
    .optional()
    .or(z.literal('')),
});

export type PhysicalDataFormData = z.infer<typeof physicalDataSchema>;

// =============================================
// PAGOS
// =============================================

export const paymentSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
  
  amount: z.number()
    .positive('El monto debe ser positivo')
    .max(1000000, 'Monto demasiado alto'),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD'),
  
  next_payment: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD'),
  
  status: z.enum(['Pagado', 'Pendiente', 'Vencido'], {
    errorMap: () => ({ message: 'Estado debe ser Pagado, Pendiente o Vencido' })
  }),
  
  method: z.enum(['Efectivo', 'Transferencia', 'Tarjeta', 'Pago Móvil'], {
    errorMap: () => ({ message: 'Método de pago inválido' })
  }),
  
  reference: z.string()
    .max(100, 'Referencia demasiado larga')
    .optional()
    .or(z.literal('')),
  
  notes: z.string()
    .max(500, 'Notas demasiado largas')
    .optional()
    .or(z.literal('')),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// =============================================
// STAFF (Personal)
// =============================================

export const staffSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email demasiado largo'),
  
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .optional(),
  
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  
  role: z.enum(['Administrador', 'Entrenador', 'Recepción'], {
    errorMap: () => ({ message: 'Rol debe ser Administrador, Entrenador o Recepción' })
  }),
  
  phone: z.string()
    .regex(/^[0-9]{10,15}$/, 'Teléfono debe tener entre 10 y 15 dígitos'),
  
  shift: z.string()
    .max(50, 'Turno demasiado largo'),
  
  status: z.enum(['Activo', 'Inactivo', 'Vacaciones'], {
    errorMap: () => ({ message: 'Estado inválido' })
  }),
  
  hire_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
    .optional(),
});

export type StaffFormData = z.infer<typeof staffSchema>;

// Schema para actualización (sin password obligatorio)
export const staffUpdateSchema = staffSchema.extend({
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .optional()
    .or(z.literal('')),
});

export type StaffUpdateFormData = z.infer<typeof staffUpdateSchema>;

// =============================================
// RUTINAS
// =============================================

export const routineSchema = z.object({
  name: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'El nombre es demasiado largo'),
  
  description: z.string()
    .max(1000, 'La descripción es demasiado larga')
    .optional()
    .or(z.literal('')),
  
  level: z.enum(['Principiante', 'Intermedio', 'Avanzado'], {
    errorMap: () => ({ message: 'Nivel debe ser Principiante, Intermedio o Avanzado' })
  }),
  
  category: z.string()
    .max(100, 'Categoría demasiado larga'),
  
  duration: z.string()
    .max(50, 'Duración demasiado larga'),
  
  days_per_week: z.number()
    .int('Días por semana debe ser un número entero')
    .min(1, 'Mínimo 1 día por semana')
    .max(7, 'Máximo 7 días por semana'),
  
  created_by: z.string().uuid('ID de creador inválido'),
});

export type RoutineFormData = z.infer<typeof routineSchema>;

// =============================================
// EJERCICIOS DE RUTINA
// =============================================

export const exerciseSchema = z.object({
  routine_id: z.string().uuid('ID de rutina inválido'),
  
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(200, 'El nombre es demasiado largo'),
  
  sets: z.number()
    .int('Series debe ser un número entero')
    .positive('Series debe ser positivo')
    .max(100, 'Máximo 100 series'),
  
  reps: z.string()
    .max(50, 'Repeticiones demasiado largas'),
  
  rest_time: z.string()
    .max(50, 'Tiempo de descanso demasiado largo')
    .optional()
    .or(z.literal('')),
  
  notes: z.string()
    .max(500, 'Notas demasiado largas')
    .optional()
    .or(z.literal('')),
  
  order_index: z.number()
    .int('Orden debe ser un número entero')
    .min(0, 'Orden mínimo: 0')
    .optional(),
});

export type ExerciseFormData = z.infer<typeof exerciseSchema>;

// =============================================
// ASIGNACIONES DE RUTINAS
// =============================================

export const routineAssignmentSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
  routine_id: z.string().uuid('ID de rutina inválido'),
  assigned_by: z.string().uuid('ID de asignador inválido'),
  
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD'),
  
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  
  status: z.enum(['Activa', 'Completada', 'Cancelada'], {
    errorMap: () => ({ message: 'Estado inválido' })
  }).optional(),
  
  notes: z.string()
    .max(500, 'Notas demasiado largas')
    .optional()
    .or(z.literal('')),
});

export type RoutineAssignmentFormData = z.infer<typeof routineAssignmentSchema>;

// =============================================
// ASISTENCIA
// =============================================

export const attendanceSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
    .optional(),
  
  time: z.string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Hora debe estar en formato HH:MM o HH:MM:SS')
    .optional(),
  
  type: z.enum(['Entrada', 'Salida'], {
    errorMap: () => ({ message: 'Tipo debe ser Entrada o Salida' })
  }),
});

export type AttendanceFormData = z.infer<typeof attendanceSchema>;

// =============================================
// LOGIN
// =============================================

export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido'),
  
  password: z.string()
    .min(1, 'La contraseña es requerida'),
});

export type LoginFormData = z.infer<typeof loginSchema>;