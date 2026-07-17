import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  History, 
  Bug,
  Clock,
  Target,
  Zap,
  Timer,
  BarChart3,
  Award,
  X,
  AlertCircle,
  Play
} from 'lucide-react';
import { ExerciseDetailModal } from '../components/ExerciseDetailModal';
import { useExercises, type Exercise } from '../hooks/useExercises';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  useRoutineAssignment, 
  useRoutineExercises, 
  useWorkoutSession,
  useExerciseLogs,
  useCreateSession,
  useSaveExerciseLog,
  useToggleExerciseComplete,
  useWorkoutHistory,
  usePendingExercises,
} from '../hooks/useRoutineAssignments';
import { toast } from 'sonner';
import { formatDate } from '../lib/format';

export function MyTraining() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Obtener fecha local en formato YYYY-MM-DD (no UTC para evitar problemas de zona horaria)
  const getTodayLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Parsear fecha en zona local (evitar que "2026-03-06" se interprete como UTC)
  const parseLocalDate = (dateString: string) => {
    // dateString viene como "2026-03-06" desde la base de datos
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    // Crear fecha en hora local, no UTC
    return new Date(year, month - 1, day);
  };
  
  const today = getTodayLocal();
  const dayOfWeek = new Date().getDay(); // 0 = Domingo, 1 = Lunes, etc.

  // Obtener la fecha correspondiente a un día de la semana (dentro de la semana actual)
  const getDateForDay = (targetDay: number) => {
    const now = new Date();
    const diff = targetDay - now.getDay();
    const d = new Date(now);
    d.setDate(now.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Estado local - PRIMERO (antes de cualquier hook que use estos valores)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exerciseData, setExerciseData] = useState<Record<string, { weight: string; reps: string; notes: string }>>({});
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const getStoredDay = () => {
    const stored = localStorage.getItem('selectedDay');
    if (stored !== null) return parseInt(stored, 10);
    return dayOfWeek;
  };
  const [selectedDay, setSelectedDay] = useState<number>(getStoredDay);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  // Queries - TODOS los hooks deben estar al principio
  const { data: assignment, isLoading: loadingAssignment, error: assignmentError } = useRoutineAssignment(user?.id || '');
  
  // Ejercicios del día seleccionado
  const { data: exercises = [], isLoading: loadingExercises } = useRoutineExercises(
    assignment?.routine_templates?.id || '',
    selectedDay
  );
  
  const selectedDayDate = getDateForDay(selectedDay);
  const { data: session, refetch: refetchSession } = useWorkoutSession(
    user?.id || '',
    assignment?.routine_templates?.id || '',
    selectedDayDate
  );
  const { data: exerciseLogs = [] } = useExerciseLogs(activeSessionId || session?.id || '');
  const { data: workoutHistory = [], refetch: refetchHistory } = useWorkoutHistory(user?.id || '', 5);
  const { data: pendingExercises = [] } = usePendingExercises(
    user?.id || '',
    assignment?.routine_templates?.id || ''
  );
  const { data: allExercises = [] } = useExercises();
  
  // Mutations
  const createSession = useCreateSession();
  const saveExercise = useSaveExerciseLog();
  const toggleComplete = useToggleExerciseComplete();
  const queryClient = useQueryClient();

  // Persistir día seleccionado al recargar
  useEffect(() => {
    localStorage.setItem('selectedDay', selectedDay.toString());
  }, [selectedDay]);

  // Debug: Log session info
  console.log('🏋️ [Session Debug]', {
    hasUser: !!user?.id,
    hasRoutine: !!assignment?.routine_templates?.id,
    exercisesCount: exercises.length,
    hasSession: !!session,
    sessionId: session?.id,
    today,
    todayDate: formatDate(new Date()),
    dayOfWeek,
    selectedDay,
    isPending: createSession.isPending,
  });

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
  };

  const getDayShortName = (day: number) => {
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    return days[day];
  };

  const getExerciseLog = (exerciseId: string) => {
    return exerciseLogs.find(log => log.exercise_id === exerciseId);
  };

  const getExerciseData = (exerciseId: string, defaultReps: string) => {
    const log = getExerciseLog(exerciseId);
    const sets = log?.set_logs || [];
    const lastSet = sets.length > 0 ? sets[0] : null;
    
    return exerciseData[exerciseId] || {
      weight: lastSet?.weight?.toString() || '',
      reps: lastSet?.reps?.toString() || defaultReps.split('-')[0] || '',
      notes: log?.notes || ''
    };
  };

  const handleToggleExercise = (exerciseId: string, defaultReps: string) => {
    if (selectedExercise === exerciseId) {
      setSelectedExercise(null);
    } else {
      setSelectedExercise(exerciseId);
      // Cargar datos existentes
      const data = getExerciseData(exerciseId, defaultReps);
      setExerciseData(prev => ({
        ...prev,
        [exerciseId]: data
      }));
    }
  };

  const handleSaveExercise = async (exerciseId: string, exerciseName: string) => {
    console.log('💾 Intentando guardar ejercicio:', { session, selectedDay, dayOfWeek });

    let currentSession = session;

    if (!currentSession?.id) {
      try {
        currentSession = await createSession.mutateAsync({
          user_id: user!.id,
          routine_id: assignment!.routine_templates!.id,
          date: selectedDayDate,
        });
        setActiveSessionId(currentSession.id);
        refetchSession();
        toast.success('Sesión iniciada correctamente');
      } catch (error: any) {
        console.error('❌ Error creando sesión:', error);
        toast.error('Error al iniciar la sesión de entrenamiento');
        return;
      }
    }

    const data = getExerciseData(exerciseId, '');
    if (!data.weight || !data.reps) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    // Buscar el ejercicio para conocer su día asignado
    const exercise = exercises.find(e => e.id === exerciseId);
    const assignedDayOfWeek = exercise?.day_of_week;

    try {
      await saveExercise.mutateAsync({
        session_id: currentSession.id,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        weight: parseFloat(data.weight),
        reps: parseInt(data.reps),
        notes: data.notes || null,
        assigned_day_of_week: assignedDayOfWeek,
      });

      queryClient.invalidateQueries({ queryKey: ['exerciseLogs', currentSession.id] });
      queryClient.invalidateQueries({ queryKey: ['pendingExercises'] });
      await refetchHistory();

      toast.success('Ejercicio registrado correctamente');
      setSelectedExercise(null);
      setExerciseData(prev => {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      });
    } catch (error: any) {
      console.error('Error guardando ejercicio:', error);
      toast.error('Error al guardar el ejercicio');
    }
  };

  const handleMarkComplete = async (exerciseId: string, exerciseName: string) => {
    let currentSession = session;

    if (!currentSession?.id) {
      try {
        currentSession = await createSession.mutateAsync({
          user_id: user!.id,
          routine_id: assignment!.routine_templates!.id,
          date: selectedDayDate,
        });
        setActiveSessionId(currentSession.id);
        refetchSession();
      } catch (error: any) {
        console.error('❌ Error creando sesión:', error);
        toast.error('Error al iniciar la sesión de entrenamiento');
        return;
      }
    }

    const log = getExerciseLog(exerciseId);
    const newStatus = !log?.is_completed;
    
    try {
      await toggleComplete.mutateAsync({
        session_id: currentSession.id,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        is_completed: newStatus,
      });

      queryClient.invalidateQueries({ queryKey: ['exerciseLogs', currentSession.id] });
      queryClient.invalidateQueries({ queryKey: ['pendingExercises'] });
      await refetchHistory();

      toast.success(newStatus ? '✅ Completado' : '⚪ Desmarcado');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`❌ Error: ${error.message}`);
    }
  };

  const completedCount = exerciseLogs.filter(log => log.is_completed).length;
  const completionPercentage = exercises.length > 0 
    ? (completedCount / exercises.length) * 100 
    : 0;

  // Calcular días de la semana para el selector
  const weekDays = [1, 2, 3, 4, 5, 6, 0]; // Lun-Dom

  // Loading state
  if (loadingAssignment || loadingExercises) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-[#10f94e] rounded-full animate-spin mx-auto"></div>
            <Dumbbell className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground font-['Inter']">Cargando entrenamiento...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (assignmentError) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-['Rajdhani'] font-bold tracking-tight mb-2">
            MI ENTRENAMIENTO
          </h1>
          <p className="text-muted-foreground font-['Inter']">
            Ocurrió un error al cargar tu rutina
          </p>
        </div>
        
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bug className="w-10 h-10 text-destructive" />
            </div>
            <h3 className="text-xl font-['Rajdhani'] font-bold mb-2">Error de Conexión</h3>
            <p className="text-muted-foreground font-['Inter'] mb-4">
              {(assignmentError as any)?.message || 'No se pudo conectar con la base de datos'}
            </p>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={() => navigate('/diagnostico-rutinas')}
            >
              <Bug className="w-4 h-4 mr-2" />
              Ver Diagnóstico
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No assignment
  if (!assignment) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-['Rajdhani'] font-bold tracking-tight mb-2">
            MI ENTRENAMIENTO
          </h1>
          <p className="text-muted-foreground font-['Inter']">
            Tu plan de entrenamiento personalizado
          </p>
        </div>

        <Card className="border-muted bg-card/50 backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Dumbbell className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-['Rajdhani'] font-bold mb-3">Sin Rutina Asignada</h3>
            <p className="text-muted-foreground font-['Inter'] max-w-md mx-auto mb-6">
              Tu entrenador aún no te ha asignado una rutina de entrenamiento.<br />
              Consulta con el personal del gimnasio para obtener tu plan personalizado.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-['Inter']">
              <Clock className="w-4 h-4" />
              <span>Ubicación: Los Teques, sector Lagunetica</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-['Rajdhani'] font-bold tracking-tight mb-2 flex items-center gap-3">
          <span className="text-primary">●</span>
          MI ENTRENAMIENTO
        </h1>
        <p className="text-muted-foreground font-['Inter']">
          Sigue tu rutina y registra tu progreso diario
        </p>
      </div>

      {/* Routine Info Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-[#10f94e]/5 to-transparent">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-xs font-['Inter'] text-primary uppercase tracking-wider">
                  Activa
                </span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-['Rajdhani'] font-bold">
                {assignment.routine_templates.name}
              </CardTitle>
              <p className="text-sm font-['Inter'] text-muted-foreground mt-2">
                {assignment.routine_templates.description}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="text-xs font-['Inter'] text-muted-foreground uppercase tracking-wide">
                Entrenador
              </span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <span className="font-['Rajdhani'] font-bold text-lg">
                  Entrenador asignado
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Fecha de inicio */}
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-muted">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-['Inter'] text-muted-foreground uppercase">Inicio</p>
                  <p className="font-['Rajdhani'] font-bold text-lg">
                    {formatDate(assignment.start_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Frecuencia */}
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-muted">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-['Inter'] text-muted-foreground uppercase">Frecuencia</p>
                  <p className="font-['Rajdhani'] font-bold text-lg">
                    {assignment.routine_templates.days_per_week}x semana
                  </p>
                </div>
              </div>
            </div>

            {/* Progreso Hoy */}
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-muted">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-['Inter'] text-muted-foreground uppercase">Hoy</p>
                  <p className="font-['Rajdhani'] font-bold text-lg text-primary">
                    {completedCount}/{exercises.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Total completado */}
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-muted">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-['Inter'] text-muted-foreground uppercase">Progreso</p>
                  <p className="font-['Rajdhani'] font-bold text-lg">
                    {completionPercentage.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-['Inter']">
              <span className="text-muted-foreground">Progreso del día</span>
              <span className="text-primary font-bold">{completedCount} de {exercises.length} completados</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-[#10f94e] to-[#0dd943] transition-all duration-500 ease-out relative"
                style={{ width: `${completionPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Selector */}
      <div className="space-y-3">
        <h2 className="text-xl font-['Rajdhani'] font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Selecciona el Día
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isSelected = selectedDay === day;
            const isToday = dayOfWeek === day;
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`
                  relative p-3 rounded-lg border-2 transition-all duration-200 font-['Inter']
                  ${isSelected 
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                    : 'border-muted hover:border-primary/50 bg-background/50'
                  }
                `}
              >
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-background"></div>
                )}
                <div className="text-center">
                  <p className={`text-xs uppercase tracking-wide mb-1 ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {getDayShortName(day)}
                  </p>
                  <p className={`text-lg font-['Rajdhani'] font-bold ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}>
                    {day === dayOfWeek ? 'HOY' : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Workout */}
      {exercises.length === 0 ? (
        <Card className="border-muted bg-card/50">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-['Rajdhani'] font-bold mb-2">Día de Descanso</h3>
            <p className="text-muted-foreground font-['Inter'] max-w-md mx-auto">
              {getDayName(selectedDay)} no tienes ejercicios programados.
              {assignment && (
                <> Tu rutina tiene una frecuencia de <strong>{assignment.routine_templates.days_per_week} días</strong> por semana. Selecciona otro día en el calendario para entrenar o ponerte al día.</>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-['Rajdhani'] font-bold flex items-center gap-2">
                  <Dumbbell className="w-6 h-6 text-primary" />
                  Entrenamiento - {getDayName(selectedDay)}
                </CardTitle>
                <p className="text-sm font-['Inter'] text-muted-foreground mt-1">
                  {selectedDay === dayOfWeek 
                    ? `Hoy, ${formatDate(new Date())}`
                    : getDayName(selectedDay)
                  }
                </p>
              </div>
              <Badge 
                variant="outline" 
                className="border-primary text-primary font-['Rajdhani'] text-lg px-3 py-1"
              >
                {exercises.length} ejercicios
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Indicador de día */}
            {selectedDay !== dayOfWeek && (
              <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="font-['Inter'] text-sm">
                    <p className="font-semibold">Poniéndote al día - {getDayName(selectedDay)}</p>
                    <p className="text-xs mt-1 opacity-90">
                      Estás registrando ejercicios de un día anterior. ¡Bien hecho por ponerte al día!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje si no hay sesión activa */}
            {!session && exercises.length > 0 && (
              <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Clock className="w-5 h-5 flex-shrink-0 animate-pulse" />
                  <div className="font-['Inter'] text-sm">
                    <p className="font-semibold">Iniciando sesión de entrenamiento...</p>
                    <p className="text-xs mt-1 opacity-90">
                      Espera un momento mientras preparamos tu entrenamiento del día.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {exercises.map((exercise, index) => {
                const log = getExerciseLog(exercise.id);
                const isCompleted = log?.is_completed || false;
                const isExpanded = selectedExercise === exercise.id;
                const data = getExerciseData(exercise.id, exercise.reps);
                const lastSet = log?.set_logs?.[0];

                return (
                  <div
                    key={exercise.id}
                    className={`
                      border-2 rounded-xl transition-all duration-200
                      ${isCompleted 
                        ? 'bg-primary/5 border-primary/30 shadow-lg shadow-primary/10' 
                        : 'border-muted bg-background/50 hover:border-primary/20'
                      }
                    `}
                  >
                    {/* Exercise Header */}
                    <button
                      onClick={() => handleToggleExercise(exercise.id, exercise.reps)}
                      className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors rounded-xl"
                    >
                      <div className="flex items-center gap-4 flex-1 text-left">
                        {/* Número de ejercicio */}
                        <div className={`
                          w-12 h-12 rounded-lg flex items-center justify-center font-['Rajdhani'] font-bold text-xl
                          ${isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          {isCompleted ? <CheckCircle className="w-6 h-6" /> : index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`
                              font-['Rajdhani'] font-bold text-lg
                              ${isCompleted ? 'text-primary' : 'text-foreground'}
                            `}>
                              {exercise.exercise_name}
                            </h4>
                            {(() => {
                              const found = allExercises.find((e) => e.name === exercise.exercise_name);
                              return found ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {found.image_url && (
                                    <img src={found.image_url} alt="" className="w-7 h-7 rounded object-cover border border-border" />
                                  )}
                                  {found.gif_url && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setDetailExercise(found); }}
                                      className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                      title="Ver GIF animado"
                                    >
                                      <Play className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ) : null;
                            })()}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm font-['Inter'] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-4 h-4" />
                              {exercise.sets} series
                            </span>
                            <span>×</span>
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {exercise.reps} reps
                            </span>
                            {exercise.rest_seconds > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Timer className="w-4 h-4" />
                                  {exercise.rest_seconds}s
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {lastSet?.weight && (
                          <Badge 
                            variant="secondary" 
                            className="bg-primary/10 text-primary border-primary/20 font-['Rajdhani'] text-base px-3"
                          >
                            {lastSet.weight} kg
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-primary" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Exercise Details (Expanded) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-muted">
                        {exercise.notes && (
                          <div className="pt-4">
                            <p className="text-xs font-['Inter'] text-muted-foreground mb-2 uppercase tracking-wide">
                              Notas del entrenador
                            </p>
                            <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                              <p className="text-sm font-['Inter'] text-foreground">{exercise.notes}</p>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-['Inter'] text-muted-foreground mb-2 block uppercase tracking-wide">
                                Peso (kg) *
                              </label>
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="0.0"
                                value={data.weight}
                                onChange={(e) => setExerciseData(prev => ({
                                  ...prev,
                                  [exercise.id]: { ...data, weight: e.target.value }
                                }))}
                                className="h-12 font-['Rajdhani'] text-lg font-bold border-2 focus:border-primary"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-['Inter'] text-muted-foreground mb-2 block uppercase tracking-wide">
                                Repeticiones *
                              </label>
                              <Input
                                type="number"
                                placeholder={exercise.reps}
                                value={data.reps}
                                onChange={(e) => setExerciseData(prev => ({
                                  ...prev,
                                  [exercise.id]: { ...data, reps: e.target.value }
                                }))}
                                className="h-12 font-['Rajdhani'] text-lg font-bold border-2 focus:border-primary"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-['Inter'] text-muted-foreground mb-2 block uppercase tracking-wide">
                              Comentarios (Opcional)
                            </label>
                            <Textarea
                              placeholder="¿Cómo te sentiste? ¿Alguna observación?..."
                              value={data.notes}
                              onChange={(e) => setExerciseData(prev => ({
                                ...prev,
                                [exercise.id]: { ...data, notes: e.target.value }
                              }))}
                              className="font-['Inter'] border-2 focus:border-primary resize-none"
                              rows={2}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleSaveExercise(exercise.id, exercise.exercise_name)}
                            disabled={saveExercise.isPending}
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-['Rajdhani'] font-bold text-lg h-12"
                          >
                            {saveExercise.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2"></div>
                                Guardando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Guardar Registro
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleMarkComplete(exercise.id, exercise.exercise_name)}
                            variant="outline"
                            className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-['Rajdhani'] font-bold text-lg h-12"
                          >
                            {isCompleted ? 'Desmarcar' : 'Marcar'}
                          </Button>
                          <Button
                            onClick={() => setSelectedExercise(null)}
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ejercicios Pendientes */}
      {pendingExercises.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-['Rajdhani'] font-bold flex items-center gap-2">
                  <Clock className="w-6 h-6 text-amber-400" />
                  Ejercicios Pendientes
                </CardTitle>
                <p className="text-sm font-['Inter'] text-muted-foreground mt-1">
                  {pendingExercises.length} ejercicio{pendingExercises.length > 1 ? 's' : ''} de esta semana aún sin registrar
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingExercises.map((exercise) => {
                const suggestedDay = getDayName(exercise.day_of_week);
                return (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between p-3 rounded-lg border-2 border-amber-500/20 bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-['Rajdhani'] font-bold text-base">{exercise.exercise_name}</p>
                        <p className="text-xs font-['Inter'] text-muted-foreground">
                          Sugerido: {suggestedDay} · {exercise.sets}×{exercise.reps}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedDay(exercise.day_of_week)}
                      variant="outline"
                      size="sm"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-white font-['Rajdhani'] font-bold"
                    >
                      <Target className="w-4 h-4 mr-1" />
                      Ir
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout History */}
      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-['Rajdhani'] font-bold flex items-center gap-2">
                <History className="w-6 h-6 text-primary" />
                Historial Reciente
              </CardTitle>
              <p className="text-sm font-['Inter'] text-muted-foreground mt-1">
                Tus últimas 5 sesiones de entrenamiento
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {workoutHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-['Rajdhani'] font-bold mb-2">Sin Historial</h3>
              <p className="text-muted-foreground font-['Inter']">
                Completa tu primer entrenamiento para verlo aquí
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workoutHistory.map((sessionData: any) => {
                const date = parseLocalDate(sessionData.date);
                const dayName = getDayName(date.getDay());
                const formattedDate = formatDate(date);
                const isExpanded = expandedSessions.has(sessionData.id);
                const exercises = sessionData.exercises || [];
                const completedExercises = exercises.filter((ex: any) => ex.is_completed);
                const completionRate = exercises.length > 0 
                  ? (completedExercises.length / exercises.length) * 100 
                  : 0;

                return (
                  <div
                    key={sessionData.id}
                    className="border-2 border-muted rounded-xl transition-all duration-200 bg-background/50"
                  >
                    {/* Session Header */}
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedSessions);
                        if (isExpanded) {
                          newExpanded.delete(sessionData.id);
                        } else {
                          newExpanded.add(sessionData.id);
                        }
                        setExpandedSessions(newExpanded);
                      }}
                      className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors rounded-xl"
                    >
                      <div className="flex items-center gap-4 flex-1 text-left">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-muted-foreground" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-['Rajdhani'] font-bold text-lg">
                            {dayName}
                          </h4>
                          <p className="text-sm font-['Inter'] text-muted-foreground">
                            {formattedDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-['Rajdhani'] font-bold text-primary">
                            {completionRate.toFixed(0)}%
                          </p>
                          <p className="text-xs font-['Inter'] text-muted-foreground">
                            {completedExercises.length}/{exercises.length}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Session Details (Expanded) */}
                    {isExpanded && exercises.length > 0 && (
                      <div className="px-4 pb-4 space-y-2 border-t border-muted pt-4">
                        {exercises.map((exercise: any) => {
                          const sets = exercise.set_logs || [];
                          const lastSet = sets.length > 0 ? sets[0] : null;

                          const sessionDateObj = parseLocalDate(sessionData.date);
                          const sessionDBDay = sessionDateObj.getDay() === 0 ? 7 : sessionDateObj.getDay();
                          const isCompensated = exercise.assigned_day_of_week && exercise.assigned_day_of_week !== sessionDBDay;

                          return (
                            <div
                              key={exercise.id}
                              className={`
                                p-3 rounded-lg border-2 transition-all
                                ${exercise.is_completed 
                                  ? 'bg-primary/5 border-primary/20' 
                                  : 'bg-muted/30 border-muted'
                                }
                              `}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  {exercise.is_completed ? (
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h5 className={`
                                    font-['Rajdhani'] font-bold text-base mb-1
                                    ${exercise.is_completed ? 'text-foreground' : 'text-muted-foreground'}
                                  `}>
                                    {exercise.exercise_name}
                                  </h5>

                                  {isCompensated && (
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-['Inter'] border-amber-400/40 text-amber-500 bg-amber-500/5">
                                        Compensado
                                      </Badge>
                                      <span className="text-[10px] font-['Inter'] text-muted-foreground">
                                        (día original: {getDayName(exercise.assigned_day_of_week === 7 ? 0 : exercise.assigned_day_of_week)})
                                      </span>
                                    </div>
                                  )}

                                  {lastSet && (
                                    <div className="flex items-center gap-3 font-['Inter'] text-sm">
                                      <span className="text-primary font-bold">
                                        {lastSet.weight} kg
                                      </span>
                                      <span className="text-muted-foreground">×</span>
                                      <span className="text-foreground font-bold">
                                        {lastSet.reps} reps
                                      </span>
                                    </div>
                                  )}

                                  {exercise.notes && (
                                    <div className="mt-2 bg-muted/50 p-2 rounded text-xs font-['Inter'] text-muted-foreground italic">
                                      "{exercise.notes}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

      <ExerciseDetailModal
        exercise={detailExercise}
        open={!!detailExercise}
        onOpenChange={(open) => { if (!open) setDetailExercise(null); }}
      />
    </>
  );
}