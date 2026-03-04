import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { RefreshCw, Calendar, Dumbbell, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export function RoutineDiagnostic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const today = new Date();
  const dayOfWeek = today.getDay();

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
  };

  const loadData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // 1. Obtener asignación de rutina activa del usuario
      const { data: assignment, error: assignmentError } = await supabase
        .from('user_routine_assignments')
        .select(`
          id,
          user_id,
          routine_id,
          start_date,
          end_date,
          is_active,
          created_at,
          routine_templates (
            id,
            name,
            description,
            days_per_week,
            created_by,
            staff (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assignmentError) {
        console.error('Error assignment:', assignmentError);
      }

      // 2. Si hay asignación, obtener ejercicios de la rutina
      let exercisesData: any[] = [];
      
      if (assignment?.routine_templates?.id) {
        const { data: exercises, error: exError } = await supabase
          .from('routine_exercises')
          .select('*')
          .eq('routine_id', assignment.routine_templates.id)
          .order('day_of_week')
          .order('order_index');

        if (exError) {
          console.error('Error exercises:', exError);
        } else {
          exercisesData = exercises || [];
        }
      }

      // 3. Obtener últimas sesiones de entrenamiento del usuario
      const { data: recentSessions, error: recentSessError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);

      if (recentSessError) {
        console.error('Error recent sessions:', recentSessError);
      }

      setData({
        assignment: assignment,
        activeRoutine: assignment,
        exercises: exercisesData,
        recentSessions: recentSessions || [],
        currentDay: dayOfWeek,
        currentDayName: getDayName(dayOfWeek),
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando diagnóstico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Diagnóstico de Rutinas</h1>
          <p className="text-muted-foreground">
            Información detallada del sistema de rutinas
          </p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Información Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">ID de Usuario</p>
              <p className="font-mono text-sm">{user?.id || 'No disponible'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Día Actual</p>
              <p className="font-semibold">
                {data?.currentDayName} (día {data?.currentDay})
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-semibold">
                {today.toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Rutina Activa
            </span>
            <Badge variant={data?.activeRoutine ? 'default' : 'secondary'}>
              {data?.activeRoutine ? 'Encontrada' : 'Sin rutina'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.activeRoutine ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <XCircle className="w-12 h-12 mx-auto mb-3 text-destructive" />
                <p className="text-muted-foreground mb-4">No se encontró rutina asignada</p>
                
                {data?.recentSessions?.length > 0 && data.recentSessions.some((s: any) => s.routine_id) && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-left">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold mb-2">
                      ⚠️ Problema Detectado
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Tienes sesiones de entrenamiento con rutinas asignadas, pero están en el sistema antiguo.
                      Necesitas migrar las asignaciones a la tabla correcta.
                    </p>
                    <Button
                      onClick={() => navigate('/migrar-rutinas')}
                      className="w-full"
                      variant="outline"
                    >
                      Ir a Migración de Rutinas
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-primary/5 border-primary">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {data.activeRoutine.routine_templates?.name || 'Sin nombre'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {data.activeRoutine.routine_templates?.description || 'Sin descripción'}
                  </p>
                </div>
                <Badge variant="default">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Activa
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">ID Asignación</p>
                  <p className="font-mono text-xs truncate">{data.activeRoutine.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ID Rutina</p>
                  <p className="font-mono text-xs truncate">
                    {data.activeRoutine.routine_templates?.id || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha de Inicio</p>
                  <p className="font-medium">
                    {new Date(data.activeRoutine.start_date).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Días por Semana</p>
                  <p className="font-medium">
                    {data.activeRoutine.routine_templates?.days_per_week || 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entrenador</p>
                  <p className="font-medium">
                    {data.activeRoutine.routine_templates?.staff?.name || 'No asignado'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Creado por</p>
                  <p className="font-mono text-xs truncate">
                    {data.activeRoutine.routine_templates?.created_by || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ejercicios de la Rutina Activa</span>
            <Badge variant={data?.exercises?.length > 0 ? 'default' : 'secondary'}>
              {data?.exercises?.length || 0} ejercicios
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.exercises || data.exercises.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 mx-auto mb-3 text-destructive" />
              <p className="text-muted-foreground">
                No se encontraron ejercicios para esta rutina
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Agrupar por día */}
              {[1, 2, 3, 4, 5, 6, 7].map((dbDay) => {
                const dayExercises = data.exercises?.filter(
                  (ex: any) => ex.day_of_week === dbDay
                ) || [];
                if (dayExercises.length === 0) return null;

                // Convertir DB day (1=Monday,...,7=Sunday) a JS day (0=Sunday,1=Monday)
                const jsDay = dbDay === 7 ? 0 : dbDay;

                return (
                  <div key={dbDay} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        {jsDay === data?.currentDay && (
                          <Badge variant="default" className="text-xs">
                            HOY
                          </Badge>
                        )}
                        {getDayName(jsDay)}
                      </h4>
                      <Badge variant="outline">{dayExercises.length} ejercicios</Badge>
                    </div>

                    <div className="space-y-2">
                      {dayExercises.map((exercise: any, idx: number) => (
                        <div
                          key={exercise.id}
                          className="flex items-start gap-3 p-3 bg-muted/30 rounded"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                            {exercise.order_index || idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{exercise.exercise_name}</p>
                            <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                              <span>{exercise.sets} series</span>
                              <span>×</span>
                              <span>{exercise.reps} reps</span>
                              {exercise.rest_seconds > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{exercise.rest_seconds}s descanso</span>
                                </>
                              )}
                            </div>
                            {exercise.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {exercise.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sesiones Recientes</span>
            <Badge variant={data?.recentSessions?.length > 0 ? 'default' : 'secondary'}>
              {data?.recentSessions?.length || 0} sesiones
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentSessions?.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No hay sesiones registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.recentSessions?.map((session: any) => (
                <div key={session.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {new Date(session.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        ID: {session.id}
                      </p>
                    </div>
                    <Badge variant={session.is_completed ? 'default' : 'secondary'}>
                      {session.is_completed ? 'Completada' : 'En progreso'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw JSON Data */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Completos (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}