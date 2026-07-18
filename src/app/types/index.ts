export type UserRole = 'Administrador' | 'Entrenador' | 'Recepción' | 'Usuario';

export interface User {
  id: string;
  cedula: string;
  name: string;
  email: string;
  phone: string;
  memberNumber: string;
  status: 'Activo' | 'Inactivo' | 'Moroso' | 'Suspendido';
  plan: string;
  startDate: string;
  nextPayment: string;
  weight: number;
  height: number;
  imc: number;
  photo?: string;
  trainer_id?: string;
  trainer_name?: string;
  gym_id?: string;
  is_free_user?: boolean;
  can_share_routines?: boolean;
}

export interface Gym {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  code: string;
  description?: string;
  logo_url?: string;
  schedule?: Record<string, { abre: string; cierra: string }>;
  social_links?: {
    instagram?: string;
    whatsapp?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  };
  latitude?: number;
  longitude?: number;
  rating?: number;
  staff_count?: number;
  users_count?: number;
  review_count?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GymReview {
  id: string;
  gym_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface GymFormData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  code: string;
  description?: string;
  logo_url?: string;
  schedule?: Record<string, { abre: string; cierra: string }>;
  social_links?: {
    instagram?: string;
    whatsapp?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  };
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: string;
  nextPayment: string;
  status: 'Pagado' | 'Pendiente' | 'Vencido';
  method: 'Efectivo' | 'Transferencia' | 'Tarjeta';
}

export interface Staff {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  shift: string;
  status: 'Activo' | 'Inactivo';
  photo?: string;
  gym_id?: string;
  gym_name?: string;
  is_super_admin?: boolean;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  date: string;
  time: string;
  type: 'Entrada' | 'Salida';
}

export interface PhysicalProgress {
  id: string;
  userId: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  notes?: string;
  bodyMeasurements?: Record<string, number>;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  description: string;
  trainerId: string;
  trainerName: string;
  startDate: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export type RoutineLevel = 'Principiante' | 'Intermedio' | 'Avanzado';
export type RoutineCategory = 'Fuerza' | 'Cardio' | 'Funcional' | 'Hipertrofia' | 'Pérdida de Peso' | 'Resistencia';
export type MuscleGroup = 'Pecho' | 'Espalda' | 'Piernas' | 'Hombros' | 'Brazos' | 'Core' | 'Cardio' | 'Cuerpo Completo';

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  level: RoutineLevel;
  category: RoutineCategory;
  duration: string; // ej: "4 semanas", "8 semanas"
  daysPerWeek: number;
  createdBy: string; // trainer ID
  createdByName: string;
  exercises: ExerciseTemplate[];
  isActive: boolean;
  createdAt: string;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: string;
  restTime: string; // ej: "60s", "90s"
  weight?: string; // ej: "Peso corporal", "5kg"
  instructions?: string;
  videoUrl?: string;
  imageUrl?: string;
  gifUrl?: string;
  target?: string;
  equipment?: string;
  order: number;
}

export interface UserRoutineAssignment {
  id: string;
  userId: string;
  userName: string;
  routineId: string;
  routineName: string;
  assignedBy: string;
  assignedByName: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  routineId: string;
  routineName: string;
  date: string;
  startTime: string;
  endTime?: string;
  isCompleted: boolean;
  exercises: WorkoutExerciseLog[];
  notes?: string;
}

export interface WorkoutExerciseLog {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: SetLog[];
  isCompleted: boolean;
  notes?: string;
}

export interface SetLog {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  isCompleted: boolean;
  durationSeconds?: number;
  distanceKm?: number;
}

export interface Invoice {
  id: string;
  userId: string;
  userName: string;
  paymentId: string;
  amount: number;
  date: string;
  invoiceNumber: string;
  concept: string;
  status: 'Pagada' | 'Pendiente';
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  delinquentUsers: number;
  monthlyRevenue: number;
  todayAttendance: number;
  totalStaff: number;
}