import { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
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
} from '../hooks/useRoutineAssignments';
import { toast } from 'sonner';

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

  // Estado local - PRIMERO (antes de cualquier hook que use estos valores)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exerciseData, setExerciseData] = useState<Record<string, { weight: string; reps: string; notes: string }>>({});
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<number>(dayOfWeek);

  // Queries - TODOS los hooks deben estar al principio
  const { data: assignment, isLoading: loadingAssignment, error: assignmentError } = useRoutineAssignment(user?.id || '');
  
  // Ejercicios del día actual (para hoy)
  const { data: exercises = [], isLoading: loadingExercises } = useRoutineExercises(
    assignment?.routine_templates?.id || '',
    dayOfWeek
  );
  
  // Ejercicios del día seleccionado
  const { data: selectedDayExercises = [] } = useRoutineExercises(
    assignment?.routine_templates?.id || '',
    selectedDay
  );
  
  const { data: session, refetch: refetchSession } = useWorkoutSession(
    user?.id || '',
    assignment?.routine_templates?.id || '',
    today
  );
  const { data: exerciseLogs = [] } = useExerciseLogs(session?.id || '');
  const { data: workoutHistory = [] } = useWorkoutHistory(user?.id || '', 5);
  
  // Mutations
  const createSession = useCreateSession();
  const saveExercise = useSaveExerciseLog();
  const toggleComplete = useToggleExerciseComplete();
  
  // Debug: Log session info
  console.log('🏋️ [Session Debug]', {
    hasUser: !!user?.id,
    hasRoutine: !!assignment?.routine_templates?.id,
    exercisesCount: exercises.length,
    hasSession: !!session,
    sessionId: session?.id,
    today,
    todayDate: new Date().toLocaleDateString('es-ES'),
    dayOfWeek,
    selectedDay,
    isPending: createSession.isPending,
  });

  // Crear sesión automáticamente si no existe (solo para el día actual)
  useEffect(() => {
    // Solo crear sesión si estamos viendo el día actual
    if (selectedDay !== dayOfWeek) {
      console.log('⚠️ No se crea sesión porque el día seleccionado no es hoy');
      return;
    }

    if (user?.id && assignment?.routine_templates?.id && exercises.length > 0 && !session && !createSession.isPending) {
      console.log('✅ Creando sesión automáticamente...');
      createSession.mutate({
        user_id: user.id,
        routine_id: assignment.routine_templates.id,
        date: today,
      }, {
        onSuccess: (newSession) => {
          console.log('✅ Sesión creada:', newSession);
          refetchSession();
        },
        onError: (error) => {
          console.error('❌ Error creando sesión:', error);
        }
      });
    }
  }, [user?.id, assignment?.routine_templates?.id, exercises.length, session, today, selectedDay, dayOfWeek]);

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

  const handleSaveExercise = async (exerciseId: string, exerciseName: string, muscleGroup: string) => {
    console.log('💾 Intentando guardar ejercicio:', { session, selectedDay, dayOfWeek });
    
    if (selectedDay !== dayOfWeek) {
      toast.error('Solo puedes registrar ejercicios del día actual');
      return;
    }
    
    if (!session?.id) {
      toast.error('No hay sesión activa. Espera un momento...');
      console.error('❌ No hay sesión activa:', { session, user, assignment });
      return;
    }

    const data = getExerciseData(exerciseId, '');
    if (!data.weight || !data.reps) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    // Validar que muscle_group no sea null/undefined
    const validMuscleGroup = muscleGroup || 'General';
    console.log('💾 Guardando ejercicio con muscle_group:', validMuscleGroup);

    try {
      await saveExercise.mutateAsync({
        session_id: session.id,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        muscle_group: validMuscleGroup,
        weight: parseFloat(data.weight),
        reps: parseInt(data.reps),
        notes: data.notes || null,
      });

      toast.success('Ejercicio registrado correctamente');
      setSelectedExercise(null);
      setExerciseData(prev => ({
        ...prev,
        [exerciseId]: { weight: '', reps: '', notes: '' }
      }));
    } catch (error: any) {
      console.error('Error guardando ejercicio:', error);
      toast.error('Error al guardar el ejercicio');
    }
  };

  const handleMarkComplete = async (exerciseId: string, exerciseName: string, muscleGroup: string) => {
    if (!session?.id) {
      toast.error('No hay sesión activa');
      return;
    }

    const log = getExerciseLog(exerciseId);
    const newStatus = !log?.is_completed;
    
    // Validar que muscle_group no sea null/undefined
    const validMuscleGroup = muscleGroup || 'General';
    
    try {
      await toggleComplete.mutateAsync({
        session_id: session.id,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        muscle_group: validMuscleGroup,
        is_completed: newStatus,
      });

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
            <div className="w-20 h-20 border-4 border-[#10f94e]/20 border-t-[#10f94e] rounded-full animate-spin mx-auto"></div>
            <Dumbbell className="w-8 h-8 text-[#10f94e] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
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
        
        <Card className="border-[#ff3b5c]/30 bg-[#ff3b5c]/5">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-[#ff3b5c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bug className="w-10 h-10 text-[#ff3b5c]" />
            </div>
            <h3 className="text-xl font-['Rajdhani'] font-bold mb-2">Error de Conexión</h3>
            <p className="text-muted-foreground font-['Inter'] mb-4">
              {(assignmentError as any)?.message || 'No se pudo conectar con la base de datos'}
            </p>
            <Button
              variant="outline"
              className="border-[#ff3b5c] text-[#ff3b5c] hover:bg-[#ff3b5c] hover:text-white"
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
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-['Rajdhani'] font-bold tracking-tight mb-2 flex items-center gap-3">
          <span className="text-[#10f94e]">●</span>
          MI ENTRENAMIENTO
        </h1>
        <p className="text-muted-foreground font-['Inter']">
          Sigue tu rutina y registra tu progreso diario
        </p>
      </div>

      {/* Routine Info Card */}
      <Card className="border-[#10f94e]/20 bg-gradient-to-br from-[#10f94e]/5 to-transparent">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#10f94e] rounded-full animate-pulse"></div>
                <span className="text-xs font-['Inter'] text-[#10f94e] uppercase tracking-wider">
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
                <div className="w-8 h-8 bg-[#10f94e]/20 rounded-full flex items-center justify-center">
                  <Award className="w-4 h-4 text-[#10f94e]" />
                </div>
                <span className="font-['Rajdhani'] font-bold text-lg">
                  {assignment.routine_templates.staff?.name || 'No asignado'}
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
                <div className="w-10 h-10 rounded-lg bg-[#10f94e]/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#10f94e]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-['Inter'] text-muted-foreground uppercase">Inicio</p>
                  <p className="font-['Rajdhani'] font-bold text-lg">
                    {new Date(assignment.start_date).toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Frecuencia */}
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-muted">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#10f94e]/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-[#10f94e]" />
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
                <div className="w-10 h-10 rounded-lg bg-[#10f94e]/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#10f94e]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-['Inter'] text-muted-foreground uppercase">Hoy</p>
                  <p className="font-['Rajdhani'] font-bold text-lg text-[#10f94e]">
                    {completedCount}/{exercises.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Total completado */}
            <div className="bg-background/50 backdrop-blur-sm rounded-lg p-4 border border-muted">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#10f94e]/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#10f94e]" />
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
              <span className="text-[#10f94e] font-bold">{completedCount} de {exercises.length} completados</span>
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
          <Calendar className="w-5 h-5 text-[#10f94e]" />
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
                    ? 'border-[#10f94e] bg-[#10f94e]/10 shadow-lg shadow-[#10f94e]/20' 
                    : 'border-muted hover:border-[#10f94e]/50 bg-background/50'
                  }
                `}
              >
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff3b5c] rounded-full border-2 border-background"></div>
                )}
                <div className="text-center">
                  <p className={`text-xs uppercase tracking-wide mb-1 ${
                    isSelected ? 'text-[#10f94e]' : 'text-muted-foreground'
                  }`}>
                    {getDayShortName(day)}
                  </p>
                  <p className={`text-lg font-['Rajdhani'] font-bold ${
                    isSelected ? 'text-[#10f94e]' : 'text-foreground'
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
      {selectedDayExercises.length === 0 ? (
        <Card className="border-muted bg-card/50">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-['Rajdhani'] font-bold mb-2">Día de Descanso</h3>
            <p className="text-muted-foreground font-['Inter'] max-w-md mx-auto">
              {getDayName(selectedDay)} no tienes ejercicios programados.<br />
              ¡Aprovecha para recuperarte y volver más fuerte!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-['Rajdhani'] font-bold flex items-center gap-2">
                  <Dumbbell className="w-6 h-6 text-[#10f94e]" />
                  Entrenamiento - {getDayName(selectedDay)}
                </CardTitle>
                <p className="text-sm font-['Inter'] text-muted-foreground mt-1">
                  {selectedDay === dayOfWeek 
                    ? `Hoy, ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : getDayName(selectedDay)
                  }
                </p>
              </div>
              <Badge 
                variant="outline" 
                className="border-[#10f94e] text-[#10f94e] font-['Rajdhani'] text-lg px-3 py-1"
              >
                {selectedDayExercises.length} ejercicios
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Advertencia si no es el día actual */}
            {selectedDay !== dayOfWeek && (
              <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="font-['Inter'] text-sm">
                    <p className="font-semibold">Estás viendo {getDayName(selectedDay)}</p>
                    <p className="text-xs mt-1 opacity-90">
                      Solo puedes registrar ejercicios del día actual. Selecciona "{getDayName(dayOfWeek)}" para entrenar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje si no hay sesión activa en el día actual */}
            {selectedDay === dayOfWeek && !session && exercises.length > 0 && (
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
              {selectedDayExercises.map((exercise, index) => {
                const log = selectedDay === dayOfWeek ? getExerciseLog(exercise.id) : null;
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
                        ? 'bg-[#10f94e]/5 border-[#10f94e]/30 shadow-lg shadow-[#10f94e]/10' 
                        : 'border-muted bg-background/50 hover:border-[#10f94e]/20'
                      }
                    `}
                  >
                    {/* Exercise Header */}
                    <button
                      onClick={() => handleToggleExercise(exercise.id, exercise.reps)}
                      className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors rounded-xl"
                      disabled={selectedDay !== dayOfWeek}
                    >
                      <div className="flex items-center gap-4 flex-1 text-left">
                        {/* Número de ejercicio */}
                        <div className={`
                          w-12 h-12 rounded-lg flex items-center justify-center font-['Rajdhani'] font-bold text-xl
                          ${isCompleted 
                            ? 'bg-[#10f94e] text-black' 
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          {isCompleted ? <CheckCircle className="w-6 h-6" /> : index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className={`
                            font-['Rajdhani'] font-bold text-lg mb-1
                            ${isCompleted ? 'text-[#10f94e]' : 'text-foreground'}
                          `}>
                            {exercise.exercise_name}
                          </h4>
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
                            className="bg-[#10f94e]/10 text-[#10f94e] border-[#10f94e]/20 font-['Rajdhani'] text-base px-3"
                          >
                            {lastSet.weight} kg
                          </Badge>
                        )}
                        {selectedDay === dayOfWeek && (
                          isExpanded ? (
                            <ChevronUp className="w-6 h-6 text-[#10f94e]" />
                          ) : (
                            <ChevronDown className="w-6 h-6 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </button>

                    {/* Exercise Details (Expanded) */}
                    {isExpanded && selectedDay === dayOfWeek && (
                      <div className="px-4 pb-4 space-y-4 border-t border-muted">
                        {exercise.notes && (
                          <div className="pt-4">
                            <p className="text-xs font-['Inter'] text-muted-foreground mb-2 uppercase tracking-wide">
                              Notas del entrenador
                            </p>
                            <div className="bg-[#10f94e]/5 border border-[#10f94e]/20 p-3 rounded-lg">
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
                                className="h-12 font-['Rajdhani'] text-lg font-bold border-2 focus:border-[#10f94e]"
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
                                className="h-12 font-['Rajdhani'] text-lg font-bold border-2 focus:border-[#10f94e]"
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
                              className="font-['Inter'] border-2 focus:border-[#10f94e] resize-none"
                              rows={2}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleSaveExercise(exercise.id, exercise.exercise_name, exercise.muscle_group)}
                            disabled={saveExercise.isPending}
                            className="flex-1 bg-[#10f94e] hover:bg-[#0dd943] text-black font-['Rajdhani'] font-bold text-lg h-12"
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
                            onClick={() => handleMarkComplete(exercise.id, exercise.exercise_name, exercise.muscle_group)}
                            variant="outline"
                            className="border-2 border-[#10f94e] text-[#10f94e] hover:bg-[#10f94e] hover:text-black font-['Rajdhani'] font-bold text-lg h-12"
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

      {/* Workout History */}
      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-['Rajdhani'] font-bold flex items-center gap-2">
                <History className="w-6 h-6 text-[#10f94e]" />
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
                const formattedDate = date.toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                });
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
                          <p className="text-sm font-['Rajdhani'] font-bold text-[#10f94e]">
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

                          return (
                            <div
                              key={exercise.id}
                              className={`
                                p-3 rounded-lg border-2 transition-all
                                ${exercise.is_completed 
                                  ? 'bg-[#10f94e]/5 border-[#10f94e]/20' 
                                  : 'bg-muted/30 border-muted'
                                }
                              `}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                  {exercise.is_completed ? (
                                    <CheckCircle className="w-5 h-5 text-[#10f94e]" />
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

                                  {lastSet && (
                                    <div className="flex items-center gap-3 font-['Inter'] text-sm">
                                      <span className="text-[#10f94e] font-bold">
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
  );
}