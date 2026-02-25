import { useState } from 'react';
import { Play, Pause, Check, X, Plus, Timer, Weight, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { mockUserRoutineAssignments, mockRoutineTemplates, mockWorkoutSessions } from '../lib/mockData';
import { WorkoutSession, WorkoutExerciseLog, SetLog, ExerciseTemplate } from '../types';

// Simular usuario actual (en producción vendría de contexto/auth)
const CURRENT_USER_ID = '1';

export function MyWorkout() {
  // Estado principal
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>(mockWorkoutSessions);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);

  // Obtener la rutina asignada al usuario
  const userAssignment = mockUserRoutineAssignments.find(
    a => a.userId === CURRENT_USER_ID && a.isActive
  );
  const userRoutine = userAssignment 
    ? mockRoutineTemplates.find(r => r.id === userAssignment.routineId)
    : null;

  // Obtener sesiones del usuario
  const userSessions = workoutSessions.filter(s => s.userId === CURRENT_USER_ID);
  const todaySession = userSessions.find(s => s.date === new Date().toISOString().split('T')[0]);

  // Iniciar nueva sesión
  const startNewSession = () => {
    if (!userRoutine) return;

    const now = new Date();
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newSession: WorkoutSession = {
      id: String(Date.now()),
      userId: CURRENT_USER_ID,
      routineId: userRoutine.id,
      routineName: userRoutine.name,
      date: now.toISOString().split('T')[0],
      startTime,
      isCompleted: false,
      exercises: userRoutine.exercises.map(ex => ({
        id: `log-${ex.id}-${Date.now()}`,
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup,
        isCompleted: false,
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          id: `set-${i}-${Date.now()}`,
          setNumber: i + 1,
          reps: 0,
          weight: 0,
          isCompleted: false,
        })),
      })),
    };

    setActiveSession(newSession);
    setSessionStartTime(startTime);
    setIsStartDialogOpen(false);
    toast.success('¡Entrenamiento iniciado!', {
      description: 'Completa cada ejercicio y registra tus series',
    });
  };

  // Finalizar sesión
  const finishSession = () => {
    if (!activeSession) return;

    const now = new Date();
    const endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const completedSession: WorkoutSession = {
      ...activeSession,
      endTime,
      isCompleted: true,
    };

    setWorkoutSessions([completedSession, ...workoutSessions]);
    toast.success('¡Entrenamiento completado!', {
      description: `Sesión guardada exitosamente`,
    });
    setActiveSession(null);
    setSessionStartTime(null);
  };

  // Cancelar sesión
  const cancelSession = () => {
    setActiveSession(null);
    setSessionStartTime(null);
    toast.info('Entrenamiento cancelado');
  };

  // Actualizar set
  const updateSet = (exerciseId: string, setId: string, field: 'reps' | 'weight', value: number) => {
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      exercises: activeSession.exercises.map(ex =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map(set =>
                set.id === setId ? { ...set, [field]: value } : set
              ),
            }
          : ex
      ),
    };

    setActiveSession(updatedSession);
  };

  // Completar set
  const toggleSetComplete = (exerciseId: string, setId: string) => {
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      exercises: activeSession.exercises.map(ex =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map(set =>
                set.id === setId ? { ...set, isCompleted: !set.isCompleted } : set
              ),
            }
          : ex
      ),
    };

    setActiveSession(updatedSession);
  };

  // Completar ejercicio
  const toggleExerciseComplete = (exerciseId: string) => {
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      exercises: activeSession.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, isCompleted: !ex.isCompleted } : ex
      ),
    };

    setActiveSession(updatedSession);
  };

  // Calcular progreso
  const calculateProgress = () => {
    if (!activeSession) return 0;
    const totalSets = activeSession.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completedSets = activeSession.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.isCompleted).length,
      0
    );
    return totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  };

  // Calcular duración
  const calculateDuration = () => {
    if (!sessionStartTime) return '00:00';
    const [startHour, startMin] = sessionStartTime.split(':').map(Number);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const duration = currentMinutes - startMinutes;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  if (!userRoutine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Calendar className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl">No tienes rutina asignada</h2>
          <p className="text-muted-foreground max-w-md">
            Contacta con tu entrenador para que te asigne una rutina personalizada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Mi Entrenamiento</h1>
          <p className="text-muted-foreground">
            Rutina: <span className="text-primary">{userRoutine.name}</span>
          </p>
        </div>
        {!activeSession && (
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setIsStartDialogOpen(true)}
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Entrenamiento
          </Button>
        )}
      </div>

      {/* Active Session */}
      {activeSession && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Sesión en Progreso
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Duración</p>
                  <p className="text-2xl text-primary">{calculateDuration()}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Progreso</p>
                <p className="text-sm text-primary">{Math.round(calculateProgress())}%</p>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>

            {/* Exercises */}
            <div className="space-y-4">
              {activeSession.exercises.map((exercise, exerciseIndex) => {
                const template = userRoutine.exercises.find(e => e.id === exercise.exerciseId);
                return (
                  <Card
                    key={exercise.id}
                    className={`${
                      exercise.isCompleted
                        ? 'bg-[#10f94e]/10 border-[#10f94e]/30'
                        : 'bg-card border-border'
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg">
                              {exerciseIndex + 1}. {exercise.exerciseName}
                            </h3>
                            <Badge variant="outline">{exercise.muscleGroup}</Badge>
                          </div>
                          {template && (
                            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                              <div>
                                <p>Series: {template.sets}</p>
                              </div>
                              <div>
                                <p>Reps: {template.reps}</p>
                              </div>
                              <div>
                                <p>Descanso: {template.restTime}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={exercise.isCompleted ? 'default' : 'outline'}
                          className={
                            exercise.isCompleted
                              ? 'bg-[#10f94e] hover:bg-[#10f94e]/90'
                              : ''
                          }
                          onClick={() => toggleExerciseComplete(exercise.id)}
                        >
                          {exercise.isCompleted ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Completado
                            </>
                          ) : (
                            'Marcar Completado'
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {exercise.sets.map((set, setIndex) => (
                          <div
                            key={set.id}
                            className={`flex items-center gap-3 p-3 rounded-lg ${
                              set.isCompleted ? 'bg-[#10f94e]/20' : 'bg-muted'
                            }`}
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary">
                              <span className="text-sm">{set.setNumber}</span>
                            </div>

                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Repeticiones
                                </Label>
                                <Input
                                  type="number"
                                  value={set.reps || ''}
                                  onChange={(e) =>
                                    updateSet(
                                      exercise.id,
                                      set.id,
                                      'reps',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="bg-input border-border h-8"
                                  placeholder="0"
                                  disabled={set.isCompleted}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Peso (kg)
                                </Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={set.weight || ''}
                                  onChange={(e) =>
                                    updateSet(
                                      exercise.id,
                                      set.id,
                                      'weight',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="bg-input border-border h-8"
                                  placeholder="0"
                                  disabled={set.isCompleted}
                                />
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={set.isCompleted ? 'default' : 'outline'}
                              className={
                                set.isCompleted
                                  ? 'bg-[#10f94e] hover:bg-[#10f94e]/90'
                                  : ''
                              }
                              onClick={() => toggleSetComplete(exercise.id, set.id)}
                            >
                              {set.isCompleted ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>

                      {template?.instructions && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            💡 {template.instructions}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1 hover:bg-destructive/10 hover:text-destructive"
                onClick={cancelSession}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={finishSession}
              >
                <Check className="w-4 h-4 mr-2" />
                Finalizar Entrenamiento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="routine" className="space-y-6">
        <TabsList>
          <TabsTrigger value="routine">Mi Rutina</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Routine Info */}
        <TabsContent value="routine" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Información de la Rutina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{userRoutine.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nivel</p>
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                    {userRoutine.level}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Categoría</p>
                  <Badge variant="outline">{userRoutine.category}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duración</p>
                  <p>{userRoutine.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Días/Semana</p>
                  <p>{userRoutine.daysPerWeek} días</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Ejercicios ({userRoutine.exercises.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userRoutine.exercises.map((exercise, index) => (
                  <Card key={exercise.id} className="bg-muted border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="mb-1">
                            {index + 1}. {exercise.name}
                          </h4>
                          <div className="flex gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {exercise.muscleGroup}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Series</p>
                              <p>{exercise.sets}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Reps</p>
                              <p>{exercise.reps}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Descanso</p>
                              <p>{exercise.restTime}</p>
                            </div>
                            {exercise.weight && (
                              <div>
                                <p className="text-muted-foreground">Peso</p>
                                <p>{exercise.weight}</p>
                              </div>
                            )}
                          </div>
                          {exercise.instructions && (
                            <p className="text-sm text-muted-foreground mt-3">
                              {exercise.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Historial de Entrenamientos</CardTitle>
            </CardHeader>
            <CardContent>
              {userSessions.length > 0 ? (
                <div className="space-y-4">
                  {userSessions.map((session) => {
                    const completedExercises = session.exercises.filter(e => e.isCompleted).length;
                    const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
                    const completedSets = session.exercises.reduce(
                      (sum, ex) => sum + ex.sets.filter(s => s.isCompleted).length,
                      0
                    );

                    return (
                      <Card key={session.id} className="bg-muted border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-lg mb-1">{session.routineName}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(session.date).toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            {session.isCompleted && (
                              <Badge variant="outline" className="bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30">
                                Completado
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Hora</p>
                              <p>
                                {session.startTime} - {session.endTime || 'En progreso'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ejercicios</p>
                              <p>
                                {completedExercises}/{session.exercises.length}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Series</p>
                              <p>
                                {completedSets}/{totalSets}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No hay entrenamientos registrados</p>
                  <p className="text-sm">Inicia tu primer entrenamiento para ver el historial</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start Dialog */}
      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Entrenamiento</DialogTitle>
            <DialogDescription>
              ¿Estás listo para comenzar tu sesión de entrenamiento?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Rutina</p>
              <p className="text-lg">{userRoutine?.name}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {userRoutine?.exercises.length} ejercicios
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsStartDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={startNewSession}>
                <Play className="w-4 h-4 mr-2" />
                Comenzar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
