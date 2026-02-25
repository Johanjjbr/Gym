import { useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { mockRoutineTemplates, mockStaff, mockUsers, mockUserRoutineAssignments } from '../lib/mockData';
import { RoutineTemplate, ExerciseTemplate, RoutineLevel, RoutineCategory, MuscleGroup, UserRoutineAssignment } from '../types';

type RoutineFormData = Omit<RoutineTemplate, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>;

export function Routines() {
  const [searchTerm, setSearchTerm] = useState('');
  const [routines, setRoutines] = useState<RoutineTemplate[]>(mockRoutineTemplates);
  const [assignments, setAssignments] = useState<UserRoutineAssignment[]>(mockUserRoutineAssignments);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineTemplate | null>(null);
  const [viewingRoutine, setViewingRoutine] = useState<RoutineTemplate | null>(null);
  const [assigningRoutine, setAssigningRoutine] = useState<RoutineTemplate | null>(null);

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate, control: controlCreate, setValue: setValueCreate, watch: watchCreate, formState: { errors: errorsCreate } } = useForm<RoutineFormData>({
    defaultValues: {
      exercises: [{ name: '', muscleGroup: 'Pecho', sets: 3, reps: '10-12', restTime: '60s', order: 1 }]
    }
  });

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, control: controlEdit, setValue: setValueEdit, watch: watchEdit, formState: { errors: errorsEdit } } = useForm<RoutineFormData>();

  const { fields: createExercises, append: appendCreateExercise, remove: removeCreateExercise } = useFieldArray({
    control: controlCreate,
    name: 'exercises'
  });

  const { fields: editExercises, append: appendEditExercise, remove: removeEditExercise } = useFieldArray({
    control: controlEdit,
    name: 'exercises'
  });

  const filteredRoutines = routines.filter(routine =>
    routine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    routine.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelColor = (level: RoutineLevel) => {
    switch (level) {
      case 'Principiante':
        return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Intermedio':
        return 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30';
      case 'Avanzado':
        return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
    }
  };

  const getCategoryColor = (category: RoutineCategory) => {
    const colors = {
      'Fuerza': 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      'Cardio': 'bg-red-500/20 text-red-500 border-red-500/30',
      'Funcional': 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      'Hipertrofia': 'bg-green-500/20 text-green-500 border-green-500/30',
      'Pérdida de Peso': 'bg-orange-500/20 text-orange-500 border-orange-500/30',
      'Resistencia': 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
    };
    return colors[category];
  };

  // Create Routine
  const onCreateRoutine = (data: RoutineFormData) => {
    const trainer = mockStaff.find(s => s.role === 'Entrenador');
    const newRoutine: RoutineTemplate = {
      ...data,
      id: String(Date.now()),
      createdBy: trainer?.id || '2',
      createdByName: trainer?.name || 'Laura Pérez',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setRoutines([newRoutine, ...routines]);
    toast.success('Rutina creada exitosamente', {
      description: `${newRoutine.name} está lista para ser asignada`,
    });
    resetCreate();
    setIsCreateOpen(false);
  };

  // Edit Routine
  const onEditRoutine = (data: RoutineFormData) => {
    if (!editingRoutine) return;
    const updatedRoutine: RoutineTemplate = {
      ...data,
      id: editingRoutine.id,
      createdBy: editingRoutine.createdBy,
      createdByName: editingRoutine.createdByName,
      createdAt: editingRoutine.createdAt,
    };
    setRoutines(routines.map(r => r.id === editingRoutine.id ? updatedRoutine : r));
    toast.success('Rutina actualizada', {
      description: `Los cambios en ${updatedRoutine.name} han sido guardados`,
    });
    resetEdit();
    setIsEditOpen(false);
    setEditingRoutine(null);
  };

  // Delete Routine
  const onDeleteRoutine = (routine: RoutineTemplate) => {
    setRoutines(routines.filter(r => r.id !== routine.id));
    toast.success('Rutina eliminada', {
      description: `${routine.name} ha sido eliminada`,
    });
  };

  // Assign Routine to User
  const onAssignRoutine = (userId: string) => {
    if (!assigningRoutine) return;
    const user = mockUsers.find(u => u.id === userId);
    const trainer = mockStaff.find(s => s.id === assigningRoutine.createdBy);
    if (!user || !trainer) return;

    const newAssignment: UserRoutineAssignment = {
      id: String(Date.now()),
      userId: user.id,
      userName: user.name,
      routineId: assigningRoutine.id,
      routineName: assigningRoutine.name,
      assignedBy: trainer.id,
      assignedByName: trainer.name,
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
    };

    setAssignments([newAssignment, ...assignments]);
    toast.success('Rutina asignada', {
      description: `${assigningRoutine.name} asignada a ${user.name}`,
    });
    setIsAssignOpen(false);
    setAssigningRoutine(null);
  };

  // Open dialogs
  const openEditDialog = (routine: RoutineTemplate) => {
    setEditingRoutine(routine);
    resetEdit(routine);
    setIsEditOpen(true);
  };

  const openViewDialog = (routine: RoutineTemplate) => {
    setViewingRoutine(routine);
    setIsViewOpen(true);
  };

  const openAssignDialog = (routine: RoutineTemplate) => {
    setAssigningRoutine(routine);
    setIsAssignOpen(true);
  };

  const RoutineForm = ({ type }: { type: 'create' | 'edit' }) => {
    const register = type === 'create' ? registerCreate : registerEdit;
    const errors = type === 'create' ? errorsCreate : errorsEdit;
    const setValue = type === 'create' ? setValueCreate : setValueEdit;
    const watch = type === 'create' ? watchCreate : watchEdit;
    const exercises = type === 'create' ? createExercises : editExercises;
    const appendExercise = type === 'create' ? appendCreateExercise : appendEditExercise;
    const removeExercise = type === 'create' ? removeCreateExercise : removeEditExercise;

    return (
      <form onSubmit={type === 'create' ? handleSubmitCreate(onCreateRoutine) : handleSubmitEdit(onEditRoutine)} className="space-y-6">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="exercises">Ejercicios</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div>
              <Label htmlFor={`${type}-name`}>Nombre de la Rutina *</Label>
              <Input
                id={`${type}-name`}
                {...register('name', { required: 'El nombre es requerido' })}
                className="bg-input border-border"
                placeholder="Ej: Rutina de Fuerza para Principiantes"
              />
              {errors.name && <p className="text-xs text-[#ff3b5c] mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor={`${type}-description`}>Descripción *</Label>
              <Textarea
                id={`${type}-description`}
                {...register('description', { required: 'La descripción es requerida' })}
                className="bg-input border-border"
                placeholder="Describe el objetivo y beneficios de esta rutina..."
                rows={3}
              />
              {errors.description && <p className="text-xs text-[#ff3b5c] mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${type}-level`}>Nivel *</Label>
                <Select onValueChange={(value) => setValue('level', value as RoutineLevel)} defaultValue={watch('level')}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Seleccionar nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Principiante">Principiante</SelectItem>
                    <SelectItem value="Intermedio">Intermedio</SelectItem>
                    <SelectItem value="Avanzado">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`${type}-category`}>Categoría *</Label>
                <Select onValueChange={(value) => setValue('category', value as RoutineCategory)} defaultValue={watch('category')}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fuerza">Fuerza</SelectItem>
                    <SelectItem value="Cardio">Cardio</SelectItem>
                    <SelectItem value="Funcional">Funcional</SelectItem>
                    <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="Pérdida de Peso">Pérdida de Peso</SelectItem>
                    <SelectItem value="Resistencia">Resistencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`${type}-duration`}>Duración *</Label>
                <Input
                  id={`${type}-duration`}
                  {...register('duration', { required: 'La duración es requerida' })}
                  className="bg-input border-border"
                  placeholder="Ej: 8 semanas"
                />
              </div>

              <div>
                <Label htmlFor={`${type}-daysPerWeek`}>Días por Semana *</Label>
                <Input
                  id={`${type}-daysPerWeek`}
                  type="number"
                  {...register('daysPerWeek', { 
                    required: 'Los días son requeridos',
                    min: { value: 1, message: 'Mínimo 1 día' },
                    max: { value: 7, message: 'Máximo 7 días' }
                  })}
                  className="bg-input border-border"
                  placeholder="3"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`${type}-isActive`}
                {...register('isActive')}
                className="w-4 h-4"
                defaultChecked={true}
              />
              <Label htmlFor={`${type}-isActive`}>Rutina activa (visible para asignar)</Label>
            </div>
          </TabsContent>

          <TabsContent value="exercises" className="space-y-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">Ejercicios de la Rutina</h3>
              <Button
                type="button"
                size="sm"
                onClick={() => appendExercise({ 
                  name: '', 
                  muscleGroup: 'Pecho', 
                  sets: 3, 
                  reps: '10-12', 
                  restTime: '60s', 
                  order: exercises.length + 1 
                } as ExerciseTemplate)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Ejercicio
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {exercises.map((field, index) => (
                <Card key={field.id} className="bg-muted border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-sm">Ejercicio {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(index)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Nombre del Ejercicio *</Label>
                        <Input
                          {...register(`exercises.${index}.name` as const, { required: true })}
                          className="bg-input border-border"
                          placeholder="Ej: Press de Banca"
                        />
                      </div>

                      <div>
                        <Label>Grupo Muscular *</Label>
                        <Select 
                          onValueChange={(value) => setValue(`exercises.${index}.muscleGroup` as const, value as MuscleGroup)}
                          defaultValue={field.muscleGroup}
                        >
                          <SelectTrigger className="bg-input border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pecho">Pecho</SelectItem>
                            <SelectItem value="Espalda">Espalda</SelectItem>
                            <SelectItem value="Piernas">Piernas</SelectItem>
                            <SelectItem value="Hombros">Hombros</SelectItem>
                            <SelectItem value="Brazos">Brazos</SelectItem>
                            <SelectItem value="Core">Core</SelectItem>
                            <SelectItem value="Cardio">Cardio</SelectItem>
                            <SelectItem value="Cuerpo Completo">Cuerpo Completo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Series *</Label>
                        <Input
                          type="number"
                          {...register(`exercises.${index}.sets` as const, { required: true, min: 1 })}
                          className="bg-input border-border"
                          placeholder="3"
                        />
                      </div>

                      <div>
                        <Label>Repeticiones *</Label>
                        <Input
                          {...register(`exercises.${index}.reps` as const, { required: true })}
                          className="bg-input border-border"
                          placeholder="10-12"
                        />
                      </div>

                      <div>
                        <Label>Descanso *</Label>
                        <Input
                          {...register(`exercises.${index}.restTime` as const, { required: true })}
                          className="bg-input border-border"
                          placeholder="90s"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Peso Recomendado</Label>
                        <Input
                          {...register(`exercises.${index}.weight` as const)}
                          className="bg-input border-border"
                          placeholder="Ej: Barra vacía, 10kg, Peso corporal"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Instrucciones</Label>
                        <Textarea
                          {...register(`exercises.${index}.instructions` as const)}
                          className="bg-input border-border"
                          placeholder="Técnica y recomendaciones..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {exercises.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No hay ejercicios agregados</p>
                <p className="text-sm">Haz clic en "Agregar Ejercicio" para comenzar</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => type === 'create' ? setIsCreateOpen(false) : setIsEditOpen(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            {type === 'create' ? 'Crear Rutina' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Gestión de Rutinas</h1>
          <p className="text-muted-foreground">Crea y administra rutinas de entrenamiento</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Rutina
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Rutinas</p>
            <p className="text-3xl text-primary">{routines.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Activas</p>
            <p className="text-3xl text-[#10f94e]">{routines.filter(r => r.isActive).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Asignadas</p>
            <p className="text-3xl text-secondary">{assignments.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Usuarios Activos</p>
            <p className="text-3xl text-accent">{assignments.filter(a => a.isActive).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar rutinas por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Routines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoutines.map((routine) => (
          <Card key={routine.id} className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg">{routine.name}</CardTitle>
                <div className="flex gap-1">
                  <Badge variant="outline" className={getLevelColor(routine.level)}>
                    {routine.level}
                  </Badge>
                </div>
              </div>
              <Badge variant="outline" className={getCategoryColor(routine.category)}>
                {routine.category}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">{routine.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Duración</p>
                  <p>{routine.duration}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Días/Semana</p>
                  <p>{routine.daysPerWeek} días</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ejercicios</p>
                  <p>{routine.exercises.length} ejercicios</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Creada por</p>
                  <p className="text-xs">{routine.createdByName}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary"
                  onClick={() => openViewDialog(routine)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-[#10f94e]/10 hover:text-[#10f94e] hover:border-[#10f94e]"
                  onClick={() => openAssignDialog(routine)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Asignar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(routine)}
                  className="hover:bg-primary/10 hover:text-primary"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar Rutina</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro de que quieres eliminar "{routine.name}"? Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteRoutine(routine)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRoutines.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">No se encontraron rutinas</p>
            <p className="text-sm">Crea una nueva rutina o ajusta tu búsqueda</p>
          </CardContent>
        </Card>
      )}

      {/* Create Routine Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Rutina</DialogTitle>
            <DialogDescription>
              Define una nueva rutina de entrenamiento para asignar a tus usuarios
            </DialogDescription>
          </DialogHeader>
          <RoutineForm type="create" />
        </DialogContent>
      </Dialog>

      {/* Edit Routine Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Rutina</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la rutina de entrenamiento
            </DialogDescription>
          </DialogHeader>
          <RoutineForm type="edit" />
        </DialogContent>
      </Dialog>

      {/* View Routine Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Rutina</DialogTitle>
          </DialogHeader>
          {viewingRoutine && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl">{viewingRoutine.name}</h2>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={getLevelColor(viewingRoutine.level)}>
                      {viewingRoutine.level}
                    </Badge>
                    <Badge variant="outline" className={getCategoryColor(viewingRoutine.category)}>
                      {viewingRoutine.category}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground">{viewingRoutine.description}</p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duración</p>
                  <p>{viewingRoutine.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Días por Semana</p>
                  <p>{viewingRoutine.daysPerWeek} días</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Creada por</p>
                  <p>{viewingRoutine.createdByName}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="mb-4">Ejercicios ({viewingRoutine.exercises.length})</h3>
                <div className="space-y-3">
                  {viewingRoutine.exercises.map((exercise, index) => (
                    <Card key={exercise.id} className="bg-muted border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-lg">{index + 1}. {exercise.name}</p>
                            <Badge variant="outline" className="mt-1">
                              {exercise.muscleGroup}
                            </Badge>
                          </div>
                          <p className="text-primary text-lg">{exercise.sets} x {exercise.reps}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
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
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-sm text-muted-foreground">{exercise.instructions}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Routine Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Rutina a Usuario</DialogTitle>
            <DialogDescription>
              Selecciona el usuario que seguirá esta rutina
            </DialogDescription>
          </DialogHeader>
          {assigningRoutine && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Rutina Seleccionada</p>
                <p className="text-lg">{assigningRoutine.name}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className={getLevelColor(assigningRoutine.level)}>
                    {assigningRoutine.level}
                  </Badge>
                  <Badge variant="outline" className={getCategoryColor(assigningRoutine.category)}>
                    {assigningRoutine.category}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Seleccionar Usuario *</Label>
                <Select onValueChange={(value) => onAssignRoutine(value)}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Seleccionar usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.memberNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
