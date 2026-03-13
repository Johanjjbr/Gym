import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

// Tipos de datos que esperamos de la base de datos
interface AttendanceRecord {
  user_id: string;
}

interface UserRoutineAssignment {
  user_id: string;
  routine_id: string;
  start_date: string;
  assigned_by: string; // ID del entrenador que asignó la rutina
}

interface WorkoutSession {
  user_id: string;
  date: string;
  is_completed: boolean;
}

// Tipo de dato combinado para el atleta
export interface Athlete {
  id: string;
  name: string;
  photo?: string;
  routine?: {
    id: string;
    name: string;
    currentDay: number;
  };
  progress?: number; // Porcentaje de completitud
}

// Función para obtener la fecha actual en formato YYYY-MM-DD
const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Hook principal
export const useTodaysAthletes = () => {
  const { user: loggedInUser } = useAuth(); // Obtener el usuario logueado

  return useQuery<Athlete[], Error>({
    // La query key debe ser única para cada usuario si los datos dependen de él
    queryKey: ['todays_athletes', loggedInUser?.id],
    queryFn: async () => {
      if (!loggedInUser) return []; // Si no hay usuario, no hay datos

      const today = getToday();

      // 1. Obtener todos los datos necesarios en paralelo
      const [
        { data: users, error: usersError },
        { data: attendance, error: attendanceError },
        { data: assignments, error: assignmentsError },
        { data: sessions, error: sessionsError },
        { data: routines, error: routinesError },
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('attendance').select('user_id').eq('date', today),
        supabase.from('user_routine_assignments').select('*').eq('is_active', true),
        supabase.from('workout_sessions').select('*'),
        supabase.from('routine_templates').select('id, name'),
      ]);

      if (usersError) throw new Error(`Error fetching users: ${usersError.message}`);
      if (attendanceError) throw new Error(`Error fetching attendance: ${attendanceError.message}`);
      if (assignmentsError) throw new Error(`Error fetching assignments: ${assignmentsError.message}`);
      if (sessionsError) throw new Error(`Error fetching sessions: ${sessionsError.message}`);
      if (routinesError) throw new Error(`Error fetching routines: ${routinesError.message}`);

      // 2. Filtrar usuarios activos que asistieron hoy
      const attendedUserIds = new Set(attendance.map((a: AttendanceRecord) => a.user_id));
      
      let activeAndAttendedUsers = users.filter((user: User) => {
        const hasAttended = attendedUserIds.has(user.id);
        const isActive = user.status === 'Activo';
        const hasValidSubscription = new Date(user.next_payment) >= new Date();
        return hasAttended && (isActive || hasValidSubscription);
      });

      // 3. Si el rol es 'Entrenador', filtrar por los usuarios que le fueron asignados
      if (loggedInUser.role === 'Entrenador') {
        const trainerAssignedUserIds = new Set(
          assignments
            .filter((a: UserRoutineAssignment) => a.assigned_by === loggedInUser.id)
            .map((a: UserRoutineAssignment) => a.user_id)
        );
        
        activeAndAttendedUsers = activeAndAttendedUsers.filter((user: User) => 
          trainerAssignedUserIds.has(user.id)
        );
      }

      // 4. Mapear los datos para obtener la información del atleta
      const athletes = activeAndAttendedUsers.map((user: User): Athlete => {
        const assignment = assignments.find((a: UserRoutineAssignment) => a.user_id === user.id);
        
        if (!assignment) {
          return { id: user.id, name: user.name, photo: user.photo };
        }

        const routine = routines.find(r => r.id === assignment.routine_id);
        const routineStartDate = new Date(assignment.start_date);
        
        // Calcular en qué día de la rutina está el usuario
        const todayDate = new Date();
        const diffTime = Math.abs(todayDate.getTime() - routineStartDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const currentDay = (diffDays % 7) + 1; // Asumiendo ciclo semanal

        // Calcular progreso basado en sesiones completadas
        const userSessions = sessions.filter((s: WorkoutSession) => s.user_id === user.id);
        const completedSessions = userSessions.filter(s => s.is_completed).length;
        const totalSessions = 28; // Asumiendo 4 semanas, 7 días
        const progress = (completedSessions / totalSessions) * 100;

        return {
          id: user.id,
          name: user.name,
          photo: user.photo,
          routine: routine ? {
            id: routine.id,
            name: routine.name,
            currentDay: currentDay,
          } : undefined,
          progress: Math.round(progress),
        };
      });

      return athletes;
    },
    // Opciones de react-query
    enabled: !!loggedInUser, // La query solo se ejecutará si hay un usuario logueado
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  });
};