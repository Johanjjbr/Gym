import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Plus, Eye, Trash2, Dumbbell, Calendar, Loader2, Edit, Users, Power, Play, Star, UserCircle, Building2, StickyNote, Trophy } from 'lucide-react';
import { ExerciseDetailModal } from '../components/ExerciseDetailModal';
import { useExercises, type Exercise } from '../hooks/useExercises';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { useRoutines, useDeleteRoutine, useRoutine, useRoutineAssignedUsers, useToggleRoutineActive, useRoutineStats, useRoutineRatings, useRateRoutine } from '../hooks/useRoutines';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/format';

type RoutineLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

interface Exercise {
  id: string;
  exercise_name: string;
  day_of_week: number;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

interface RoutineData {
  id: string;
  name: string;
  description: string;
  level: RoutineLevel;
  category: string;
  duration_weeks: number;
  days_per_week: number;
  is_active: boolean;
  created_by: string;
  created_by_user: string | null;
  created_at: string;
  notes: string | null;
  creator?: {
    id: string;
    name: string;
  };
  creator_user?: {
    id: string;
    name: string;
    gym_id: string | null;
    is_free_user: boolean;
    gym?: { name: string };
  };
  exercises?: Exercise[];
}

const DAYS_MAP: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

export function Routines() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingRoutineId, setViewingRoutineId] = useState<string | null>(null);
  const [viewingAssignedUsersRoutineId, setViewingAssignedUsersRoutineId] = useState<string | null>(null);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  // Auth context
  const { user } = useAuth();

  // React Query Hooks
  const { data: routines = [], isLoading, error } = useRoutines();
  const { data: allExercises = [] } = useExercises();
  const { data: viewingRoutine, isLoading: isLoadingRoutine } = useRoutine(viewingRoutineId || '');
  const { data: assignedUsers = [], isLoading: isLoadingAssignedUsers } = useRoutineAssignedUsers(viewingAssignedUsersRoutineId || '');
  const deleteRoutineMutation = useDeleteRoutine();
  const toggleRoutineActiveMutation = useToggleRoutineActive();
  const { data: routineStats } = useRoutineStats(viewingRoutineId || '');
  const { data: ratings } = useRoutineRatings(viewingRoutineId || '');
  const rateRoutineMutation = useRateRoutine();

  const filteredRoutines = routines.filter((routine: RoutineData) =>
    routine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    routine.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    routine.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelColor = (level: RoutineLevel) => {
    switch (level) {
      case 'Principiante':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'Intermedio':
        return 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30';
      case 'Avanzado':
        return 'bg-destructive/20 text-destructive border-destructive/30';
    }
  };

  // Delete Routine
  const onDeleteRoutine = async (routine: RoutineData) => {
    await deleteRoutineMutation.mutateAsync(routine.id);
  };

  // Agrupar ejercicios por día
  const getExercisesByDay = (exercises: Exercise[]) => {
    return exercises.reduce((acc, ex) => {
      if (!acc[ex.day_of_week]) {
        acc[ex.day_of_week] = [];
      }
      acc[ex.day_of_week].push(ex);
      return acc;
    }, {} as Record<number, Exercise[]>);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-2">Error al cargar las rutinas</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Gestión de Rutinas</h1>
          <p className="text-muted-foreground">Crea y administra plantillas de entrenamiento</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90" 
          onClick={() => navigate('/rutinas/crear')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Rutina
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Dumbbell className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rutinas</p>
                <p className="text-3xl font-bold text-primary">{routines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Activas</p>
                <p className="text-3xl font-bold text-blue-500">
                  {routines.filter((r: RoutineData) => r.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Principiante</p>
              <p className="text-3xl font-bold">
                {routines.filter((r: RoutineData) => r.level === 'Principiante').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avanzado</p>
              <p className="text-3xl font-bold text-destructive">
                {routines.filter((r: RoutineData) => r.level === 'Avanzado').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar rutinas por nombre, descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Cargando rutinas...</p>
          </CardContent>
        </Card>
      )}

      {/* Routines Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoutines.map((routine: RoutineData) => (
            <Card 
              key={routine.id} 
              className="bg-card border-border hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg">{routine.name}</CardTitle>
                  <Badge variant="outline" className={getLevelColor(routine.level)}>
                    {routine.level}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                    {routine.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{routine.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Duración</p>
                    <p className="font-semibold">{routine.duration_weeks} semanas</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Días/Semana</p>
                    <p className="font-semibold">{routine.days_per_week} días</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estado</p>
                    <p className={routine.is_active ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                      {routine.is_active ? 'Activa' : 'Inactiva'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Creada</p>
                    <p className="text-xs">{formatDate(routine.created_at)}</p>
                  </div>
                </div>

                {routine.creator && (
                  <div className="text-xs text-muted-foreground">
                    Por: {routine.creator.name}
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary"
                    onClick={() => setViewingRoutineId(routine.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title={routine.is_active ? 'Desactivar rutina' : 'Activar rutina'}
                    className={routine.is_active 
                      ? 'hover:bg-orange-500/10 hover:text-orange-500' 
                      : 'hover:bg-primary/10 hover:text-primary'
                    }
                    onClick={() => toggleRoutineActiveMutation.mutate({ 
                      id: routine.id, 
                      isActive: !routine.is_active 
                    })}
                    disabled={toggleRoutineActiveMutation.isPending}
                  >
                    <Power className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Editar rutina"
                    className="hover:bg-blue-500/10 hover:text-blue-500"
                    onClick={() => navigate(`/rutinas/${routine.id}/editar`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Ver usuarios asignados"
                    className="hover:bg-purple-500/10 hover:text-purple-500"
                    onClick={() => setViewingAssignedUsersRoutineId(routine.id)}
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Rutina</AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que quieres eliminar "{routine.name}"? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onDeleteRoutine(routine)} 
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredRoutines.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No se encontraron rutinas</p>
            <p className="text-sm">Crea una nueva rutina para comenzar</p>
            <Button 
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate('/rutinas/crear')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Rutina
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View Routine Dialog */}
      <Dialog open={!!viewingRoutineId} onOpenChange={() => setViewingRoutineId(null)}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Detalle de la Rutina</DialogTitle>
            <DialogDescription>
              Visualiza toda la información, ejercicios y estadísticas de esta plantilla
            </DialogDescription>
          </DialogHeader>
          {isLoadingRoutine && (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Cargando rutina...</p>
            </div>
          )}
          {viewingRoutine && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{viewingRoutine.name}</h2>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={getLevelColor(viewingRoutine.level)}>
                      {viewingRoutine.level}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                      {viewingRoutine.category}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground">{viewingRoutine.description}</p>

              {/* Información y Estadísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duración</p>
                  <p className="font-semibold">{viewingRoutine.duration_weeks} semanas</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Días/Semana</p>
                  <p className="font-semibold">{viewingRoutine.days_per_week} días</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <p className={viewingRoutine.is_active ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                    {viewingRoutine.is_active ? 'Activa' : 'Inactiva'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Asignada a</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Users className="w-4 h-4 text-primary" />
                    {routineStats?.assigned_count ?? 0} persona{routineStats?.assigned_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Creador */}
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <UserCircle className="w-10 h-10 text-primary opacity-70" />
                  <div>
                    <p className="text-sm text-muted-foreground">Creado por</p>
                    <p className="font-semibold">
                      {viewingRoutine.creator?.name || viewingRoutine.creator_user?.name || 'Desconocido'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {viewingRoutine.creator_user?.gym ? (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {viewingRoutine.creator_user.gym.name}
                          </p>
                        </>
                      ) : viewingRoutine.creator_user?.is_free_user ? (
                        <p className="text-xs text-muted-foreground italic">
                          Persona autónoma
                        </p>
                      ) : viewingRoutine.creator ? (
                        <p className="text-xs text-muted-foreground">
                          Staff del gimnasio
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Calificaciones */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#eab308]" />
                  Calificaciones
                </h3>
                <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 cursor-pointer transition-colors ${
                          star <= Math.round(routineStats?.avg_rating || 0)
                            ? 'fill-[#eab308] text-[#eab308]'
                            : 'text-muted-foreground hover:text-[#eab308]'
                        }`}
                        onClick={() => {
                          if (user?.id && viewingRoutineId) {
                            rateRoutineMutation.mutate({
                              routineId: viewingRoutineId,
                              userId: user.id,
                              rating: star,
                            });
                          }
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-lg">{routineStats?.avg_rating || 0}</span>
                    <span className="text-muted-foreground"> / 5</span>
                    <span className="text-muted-foreground ml-2">
                      ({routineStats?.ratings_count || 0} calificación{routineStats?.ratings_count !== 1 ? 'es' : ''})
                    </span>
                  </div>
                </div>
              </div>

              {/* Notas del creador */}
              {viewingRoutine.notes && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-1 mb-2">
                    <StickyNote className="w-4 h-4" />
                    Notas del creador
                  </h3>
                  <p className="text-sm whitespace-pre-line text-muted-foreground">
                    {viewingRoutine.notes}
                  </p>
                </div>
              )}

              {/* Ejercicios */}
              {viewingRoutine.exercises && viewingRoutine.exercises.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-primary">
                    Ejercicios ({viewingRoutine.exercises.length})
                  </h3>
                  {Object.entries(getExercisesByDay(viewingRoutine.exercises)).map(([day, exercises]) => (
                    <div key={day} className="space-y-2">
                      <h4 className="font-semibold text-lg border-b border-border pb-2">
                        {DAYS_MAP[parseInt(day)]} ({exercises.length} ejercicios)
                      </h4>
                      <div className="space-y-2">
                        {exercises.map((exercise, idx) => (
                          <div 
                            key={exercise.id}
                            className="p-3 bg-muted/50 rounded-lg border border-border"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-sm font-mono text-primary font-bold">
                                #{idx + 1}
                              </span>
                              <div className="flex-1">
                                <p className="font-semibold mb-1">{exercise.exercise_name}</p>
                                <div className="flex gap-4 text-sm text-muted-foreground">
                                  <span>{exercise.sets} series</span>
                                  <span>•</span>
                                  <span>{exercise.reps} reps</span>
                                  <span>•</span>
                                  <span>{exercise.rest_seconds}s descanso</span>
                                </div>
                                {exercise.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    💡 {exercise.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Esta rutina no tiene ejercicios definidos aún</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assigned Users Dialog */}
      <Dialog open={!!viewingAssignedUsersRoutineId} onOpenChange={() => setViewingAssignedUsersRoutineId(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-purple-500">Usuarios Asignados</DialogTitle>
            <DialogDescription>
              Listado de todos los usuarios que tienen esta rutina asignada actualmente
            </DialogDescription>
          </DialogHeader>
          {isLoadingAssignedUsers && (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-500" />
              <p className="text-muted-foreground">Cargando usuarios...</p>
            </div>
          )}
          {!isLoadingAssignedUsers && (
            <div className="space-y-4">
              {assignedUsers.length > 0 ? (
                <>
                  <p className="text-muted-foreground">
                    {assignedUsers.length} usuario{assignedUsers.length !== 1 ? 's' : ''} asignado{assignedUsers.length !== 1 ? 's' : ''} a esta rutina
                  </p>
                  <div className="space-y-3">
                    {assignedUsers.map((assignment: any) => (
                      <div 
                        key={assignment.id}
                        className="p-4 bg-muted/50 rounded-lg border border-border hover:border-purple-500/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {assignment.user?.name || 'Usuario sin nombre'}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={assignment.is_active 
                                  ? 'bg-primary/20 text-primary border-primary/30' 
                                  : 'bg-gray-500/20 text-gray-500 border-gray-500/30'
                                }
                              >
                                {assignment.is_active ? 'Activa' : 'Inactiva'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>📧 {assignment.user?.email || 'Sin email'}</p>
                              {assignment.user?.phone && <p>📱 {assignment.user.phone}</p>}
                              <p className="mt-2">
                                <span className="text-muted-foreground">Inicio:</span>{' '}
                                {formatDate(assignment.start_date)}
                              </p>
                              {assignment.end_date && (
                                <p>
                                  <span className="text-muted-foreground">Fin:</span>{' '}
                                  {formatDate(assignment.end_date)}
                                </p>
                              )}
                              {assignment.assigner && (
                                <p className="mt-2 text-xs">
                                  Asignada por: {assignment.assigner.name}
                                </p>
                              )}
                              {assignment.notes && (
                                <p className="mt-2 italic text-xs">
                                  💡 {assignment.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No hay usuarios asignados</p>
                  <p className="text-sm">Esta rutina aún no ha sido asignada a ningún usuario</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}