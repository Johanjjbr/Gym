/**
 * Creador/Editor de Rutinas - Vista para Entrenadores
 * Formulario maestro-detalle para crear/editar plantillas de rutinas con ejercicios
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ExerciseCombobox } from '../components/ExerciseCombobox';
import { toast } from 'sonner';
import { useCreateRoutine, useUpdateRoutine, useRoutine } from '../hooks/useRoutines';
import { useAuth } from '../contexts/AuthContext';

const DAYS_MAP = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

interface Exercise {
  id: string;
  exercise_name: string;
  day_of_week: number;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string;
}

export function RoutineBuilder() {
  const navigate = useNavigate();
  const { id: routineId } = useParams(); // Para detectar si estamos editando
  const isEditMode = !!routineId;
  
  const createRoutineMutation = useCreateRoutine();
  const updateRoutineMutation = useUpdateRoutine();
  const { data: routineData, isLoading: isLoadingRoutine } = useRoutine(routineId || '');
  const { user } = useAuth();

  // Datos de la rutina (maestro)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<'Principiante' | 'Intermedio' | 'Avanzado'>('Principiante');
  const [category, setCategory] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);

  // Ejercicios (detalle)
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // Cargar datos si estamos en modo edición
  useEffect(() => {
    if (isEditMode && routineData) {
      setName(routineData.name || '');
      setDescription(routineData.description || '');
      setLevel(routineData.level || 'Principiante');
      setCategory(routineData.category || '');
      setDurationWeeks(routineData.duration_weeks || 4);
      setDaysPerWeek(routineData.days_per_week || 3);
      
      // Cargar ejercicios
      if (routineData.exercises && routineData.exercises.length > 0) {
        const loadedExercises = routineData.exercises.map((ex: any) => ({
          id: ex.id,
          exercise_name: ex.exercise_name || '',
          day_of_week: ex.day_of_week || 1,
          order_index: ex.order_index || 1,
          sets: ex.sets || 3,
          reps: ex.reps || '10',
          rest_seconds: ex.rest_seconds || 60,
          notes: ex.notes || '',
        }));
        setExercises(loadedExercises);
      }
    }
  }, [isEditMode, routineData]);

  const handleAddExercise = () => {
    const newExercise: Exercise = {
      id: `temp-${Date.now()}`,
      exercise_name: '',
      day_of_week: 1,
      order_index: exercises.length + 1,
      sets: 3,
      reps: '10',
      rest_seconds: 60,
      notes: '',
    };
    setExercises([...exercises, newExercise]);
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleExerciseChange = (id: string, field: keyof Exercise, value: any) => {
    setExercises(exercises.map(ex => 
      ex.id === id ? { ...ex, [field]: value } : ex
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!name.trim()) {
      toast.error('El nombre de la rutina es obligatorio');
      return;
    }
    
    if (!user?.id) {
      toast.error('No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (exercises.length === 0) {
      toast.error('Debes agregar al menos un ejercicio');
      return;
    }

    // Validar que todos los ejercicios tengan nombre
    const invalidExercises = exercises.filter(ex => !ex.exercise_name.trim());
    if (invalidExercises.length > 0) {
      toast.error('Todos los ejercicios deben tener un nombre');
      return;
    }

    // Preparar datos para enviar
    const routineDataToSend = {
      name: name.trim(),
      description: description.trim(),
      level,
      category: category.trim() || 'General',
      duration_weeks: durationWeeks,
      days_per_week: daysPerWeek,
      created_by: user.id,
      exercises: exercises.map(ex => ({
        exercise_name: ex.exercise_name.trim(),
        day_of_week: ex.day_of_week,
        order_index: ex.order_index,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes.trim(),
      })),
    };

    try {
      if (isEditMode && routineId) {
        // Actualizar rutina existente
        // Primero eliminar todos los ejercicios antiguos
        await updateRoutineMutation.mutateAsync({
          id: routineId,
          data: routineDataToSend,
        });
      } else {
        // Crear nueva rutina
        await createRoutineMutation.mutateAsync(routineDataToSend);
      }
      navigate('/rutinas');
    } catch (error) {
      // El error ya se muestra en el hook
      console.error('Error al guardar rutina:', error);
    }
  };

  // Agrupar ejercicios por día para mejor visualización
  const exercisesByDay = exercises.reduce((acc, ex) => {
    if (!acc[ex.day_of_week]) {
      acc[ex.day_of_week] = [];
    }
    acc[ex.day_of_week].push(ex);
    return acc;
  }, {} as Record<number, Exercise[]>);

  if (isEditMode && isLoadingRoutine) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#10f94e]" />
            <p className="text-muted-foreground">Cargando rutina...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/rutinas')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Editar Rutina' : 'Crear Nueva Rutina'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode 
              ? 'Modifica la plantilla de rutina y sus ejercicios' 
              : 'Diseña una plantilla de rutina con ejercicios detallados'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información General */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-[#10f94e]">Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Rutina *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Fuerza Total 3 Días"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Nivel *</Label>
                <Select value={level} onValueChange={(value: any) => setLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Principiante">Principiante</SelectItem>
                    <SelectItem value="Intermedio">Intermedio</SelectItem>
                    <SelectItem value="Avanzado">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="ej: Hipertrofia, Fuerza, Resistencia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duración (semanas)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="52"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(parseInt(e.target.value) || 4)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="days">Días por semana</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  max="7"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(parseInt(e.target.value) || 3)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe los objetivos y características de esta rutina..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ejercicios */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#10f94e]">Ejercicios</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''} agregado{exercises.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleAddExercise}
              className="bg-[#10f94e] text-black hover:bg-[#0ed145]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir Ejercicio
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {exercises.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No hay ejercicios agregados</p>
                <p className="text-sm mt-2">Haz clic en "Añadir Ejercicio" para comenzar</p>
              </div>
            ) : (
              <>
                {/* Vista agrupada por día */}
                {DAYS_MAP.map(day => {
                  const dayExercises = exercisesByDay[day.value] || [];
                  if (dayExercises.length === 0) return null;

                  return (
                    <div key={day.value} className="space-y-3">
                      <h3 className="font-semibold text-lg border-b border-gray-800 pb-2">
                        {day.label} ({dayExercises.length})
                      </h3>
                      <div className="space-y-3">
                        {dayExercises.map((exercise, idx) => (
                          <div
                            key={exercise.id}
                            className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3"
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-sm font-mono text-[#10f94e] mt-2">
                                #{idx + 1}
                              </span>
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div className="lg:col-span-2 space-y-2">
                                  <Label className="text-xs">Nombre del Ejercicio *</Label>
                                  <ExerciseCombobox
                                    value={exercise.exercise_name}
                                    onValueChange={(value) => handleExerciseChange(exercise.id, 'exercise_name', value)}
                                    placeholder="Seleccionar o crear ejercicio"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">Día</Label>
                                  <Select 
                                    value={exercise.day_of_week.toString()} 
                                    onValueChange={(value) => handleExerciseChange(exercise.id, 'day_of_week', parseInt(value))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DAYS_MAP.map(d => (
                                        <SelectItem key={d.value} value={d.value.toString()}>
                                          {d.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">Series</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={exercise.sets}
                                    onChange={(e) => handleExerciseChange(exercise.id, 'sets', parseInt(e.target.value) || 3)}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">Repeticiones</Label>
                                  <Input
                                    value={exercise.reps}
                                    onChange={(e) => handleExerciseChange(exercise.id, 'reps', e.target.value)}
                                    placeholder="ej: 10, 8-12, etc"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">Descanso (seg)</Label>
                                  <Input
                                    type="number"
                                    min="30"
                                    max="300"
                                    step="15"
                                    value={exercise.rest_seconds}
                                    onChange={(e) => handleExerciseChange(exercise.id, 'rest_seconds', parseInt(e.target.value) || 60)}
                                  />
                                </div>

                                <div className="lg:col-span-3 space-y-2">
                                  <Label className="text-xs">Notas (opcional)</Label>
                                  <Input
                                    value={exercise.notes}
                                    onChange={(e) => handleExerciseChange(exercise.id, 'notes', e.target.value)}
                                    placeholder="ej: Técnica estricta, enfocarse en la fase excéntrica..."
                                  />
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveExercise(exercise.id)}
                                className="text-[#ff3b5c] hover:text-[#ff3b5c] hover:bg-[#ff3b5c]/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/rutinas')}
            disabled={createRoutineMutation.isPending || updateRoutineMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-[#10f94e] text-black hover:bg-[#0ed145]"
            disabled={createRoutineMutation.isPending || updateRoutineMutation.isPending}
          >
            {(createRoutineMutation.isPending || updateRoutineMutation.isPending) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Actualizar Rutina' : 'Guardar Rutina'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
