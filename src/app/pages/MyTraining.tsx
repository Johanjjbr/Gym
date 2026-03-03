import { useState, useEffect } from 'react';
import { Calendar, Dumbbell, TrendingUp, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  useRoutineAssignment, 
  useRoutineExercises, 
  useWorkoutSession,
  useExerciseLogs,
  useCreateSession,
  useSaveExerciseLog,
  useToggleExerciseComplete,
} from '../hooks/useRoutineAssignments';
import { toast } from 'sonner';

export function MyTraining() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay(); // 0 = Domingo, 1 = Lunes, etc.

  // Queries
  const { data: assignment, isLoading: loadingAssignment } = useRoutineAssignment(user?.id || '');
  const { data: exercises = [], isLoading: loadingExercises } = useRoutineExercises(
    assignment?.routine_templates?.id || '',
    dayOfWeek
  );
  const { data: session, refetch: refetchSession } = useWorkoutSession(
    user?.id || '',
    assignment?.routine_templates?.id || '',
    today
  );
  const { data: exerciseLogs = [] } = useExerciseLogs(session?.id || '');
  
  // Mutations
  const createSession = useCreateSession();
  const saveExercise = useSaveExerciseLog();
  const toggleComplete = useToggleExerciseComplete();

  // Estado local
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exerciseData, setExerciseData] = useState<Record<string, { weight: string; reps: string; notes: string }>>({});

  // Crear sesión automáticamente si no existe
  useEffect(() => {
    if (user?.id && assignment?.routine_templates?.id && exercises.length > 0 && !session && !createSession.isPending) {
      createSession.mutate({
        user_id: user.id,
        routine_id: assignment.routine_templates.id,
        date: today,
      }, {
        onSuccess: () => {
          refetchSession();
        }
      });
    }
  }, [user?.id, assignment?.routine_templates?.id, exercises.length, session, today]);

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
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
    if (!session?.id) {
      toast.error('No hay sesión activa');
      return;
    }

    const data = exerciseData[exerciseId];
    if (!data || !data.weight || !data.reps) {
      toast.error('Por favor ingresa el peso y las repeticiones');
      return;
    }
    
    try {
      await saveExercise.mutateAsync({
        session_id: session.id,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        weight: parseFloat(data.weight),
        reps: parseInt(data.reps),
        notes: data.notes || null,
      });

      toast.success('Ejercicio registrado exitosamente');
      setSelectedExercise(null);
    } catch (error: any) {
      console.error('Error guardando ejercicio:', error);
      toast.error('Error al registrar el ejercicio');
    }
  };

  const handleMarkComplete = async (exerciseId: string, exerciseName: string) => {
    if (!session?.id) {
      toast.error('No hay sesión activa');
      return;
    }

    const log = getExerciseLog(exerciseId);
    const newStatus = !log?.is_completed;
    
    try {
      await toggleComplete.mutateAsync({
        session_id: session.id,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        is_completed: newStatus,
      });

      toast.success(newStatus ? 'Ejercicio completado' : 'Ejercicio desmarcado');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error al actualizar el ejercicio');
    }
  };

  const completedCount = exerciseLogs.filter(log => log.is_completed).length;
  const completionPercentage = exercises.length > 0 
    ? (completedCount / exercises.length) * 100 
    : 0;

  // Loading state
  if (loadingAssignment || loadingExercises) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Cargando entrenamiento...</p>
        </div>
      </div>
    );
  }

  // No assignment
  if (!assignment) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl mb-2">Mi Entrenamiento</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sigue tu rutina y registra tu progreso
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No tienes una rutina asignada</h3>
            <p className="text-muted-foreground">
              Tu entrenador aún no te ha asignado una rutina de entrenamiento.<br />
              Consulta con el personal del gimnasio para obtener tu plan personalizado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No exercises for today
  if (exercises.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl mb-2">Mi Entrenamiento</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sigue tu rutina y registra tu progreso
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">{assignment.routine_templates.name}</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {assignment.routine_templates.description}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Día de descanso</h3>
            <p className="text-muted-foreground">
              Hoy {getDayName(dayOfWeek)} no tienes ejercicios programados.<br />
              ¡Aprovecha para recuperarte y volver más fuerte!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl mb-2">Mi Entrenamiento</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Sigue tu rutina y registra tu progreso
        </p>
      </div>

      {/* Routine Info Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl">
                {assignment.routine_templates.name}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {assignment.routine_templates.description}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs sm:text-sm text-muted-foreground">Entrenador</div>
              <div className="text-sm sm:text-base font-medium">
                {assignment.routine_templates.staff?.name || 'No asignado'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Inicio</p>
                <p className="text-sm sm:text-base font-medium">
                  {new Date(assignment.start_date).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Frecuencia</p>
                <p className="text-sm sm:text-base font-medium">
                  {assignment.routine_templates.days_per_week} días/semana
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Progreso Hoy</p>
                <p className="text-sm sm:text-base font-medium">
                  {completionPercentage.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Workout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Entrenamiento de Hoy</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {getDayName(dayOfWeek)}, {new Date().toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-3">
            {exercises.map((exercise) => {
              const log = getExerciseLog(exercise.id);
              const isCompleted = log?.is_completed || false;
              const isExpanded = selectedExercise === exercise.id;
              const data = getExerciseData(exercise.id, exercise.reps);
              const lastSet = log?.set_logs?.[0];

              return (
                <div
                  key={exercise.id}
                  className={`border rounded-lg transition-all ${
                    isCompleted ? 'bg-primary/5 border-primary/20' : ''
                  }`}
                >
                  {/* Exercise Header */}
                  <button
                    onClick={() => handleToggleExercise(exercise.id, exercise.reps)}
                    className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkComplete(exercise.id, exercise.exercise_name);
                        }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isCompleted 
                            ? 'bg-primary border-primary' 
                            : 'border-muted-foreground hover:border-primary'
                        }`}
                      >
                        {isCompleted && <CheckCircle className="w-4 h-4 text-primary-foreground" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm sm:text-base ${
                          isCompleted ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {exercise.exercise_name}
                        </h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {exercise.sets} series × {exercise.reps} reps
                          {exercise.rest_seconds > 0 && ` • ${exercise.rest_seconds}s descanso`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lastSet?.weight && (
                        <Badge variant="secondary" className="text-xs">
                          {lastSet.weight} kg
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Exercise Details (Expanded) */}
                  {isExpanded && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 border-t">
                      {exercise.notes && (
                        <div className="pt-3">
                          <p className="text-xs text-muted-foreground mb-1">Notas del entrenador:</p>
                          <p className="text-sm bg-muted/50 p-2 rounded">{exercise.notes}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
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
                            className="h-9"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
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
                            className="h-9"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Comentarios
                          </label>
                          <Input
                            type="text"
                            placeholder="Opcional..."
                            value={data.notes}
                            onChange={(e) => setExerciseData(prev => ({
                              ...prev,
                              [exercise.id]: { ...data, notes: e.target.value }
                            }))}
                            className="h-9"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSaveExercise(exercise.id, exercise.exercise_name)}
                        disabled={saveExercise.isPending}
                        className="w-full"
                        size="sm"
                      >
                        {saveExercise.isPending ? 'Guardando...' : 'Guardar Registro'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
