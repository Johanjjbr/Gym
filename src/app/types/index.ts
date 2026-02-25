export type UserRole = 'Administrador' | 'Entrenador' | 'Recepción';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberNumber: string;
  status: 'Activo' | 'Inactivo' | 'Moroso';
  plan: string;
  startDate: string;
  nextPayment: string;
  weight: number;
  height: number;
  imc: number;
  photo?: string;
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