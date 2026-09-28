import { useState, useEffect } from 'react';
import { Search, Plus, Dumbbell, Loader2, AlertCircle, Edit, Trash2, Dumbbell as MuscleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useModulePermissions } from '../hooks/useModulePermissions';

const MUSCLE_GROUPS = [
  'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cardio', 'Cuerpo Completo'
];

const EQUIPMENT_OPTIONS = [
  'Mancuernas', 'Barra', 'Máquina', 'Cable', 'Peso corporal', 'Kettlebell', 'Banda elástica', 'Otro'
];

type ExerciseFormData = {
  name: string;
  description?: string;
  muscle_group: string;
  equipment?: string;
  video_url?: string;
  image_url?: string;
  gif_url?: string;
  instructions?: string;
};

export function Exercises() {
  const { user } = useAuth();
  const { canAccess } = useModulePermissions();
  const canCreate = canAccess('/ejercicios', 'create');
  const canEdit = canAccess('/ejercicios', 'edit');
  const canDelete = canAccess('/ejercicios', 'delete');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<string | null>(null);

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate, watch: watchCreate, formState: { errors: errorsCreate } } = useForm<ExerciseFormData>();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit, formState: { errors: errorsEdit } } = useForm<ExerciseFormData>();

  // Mock data - en producción vendría de useExercises hook
  const [exercises, setExercises] = useState<any[]>([
    { id: '1', name: 'Press de Banca', muscle_group: 'Pecho', equipment: 'Barra', description: 'Ejercicio fundamental de pecho' },
    { id: '2', name: 'Sentadilla', muscle_group: 'Piernas', equipment: 'Barra', description: 'Ejercicio compuesto de piernas' },
    { id: '3', name: 'Dominadas', muscle_group: 'Espalda', equipment: 'Peso corporal', description: 'Ejercicio de tracción vertical' },
    { id: '4', name: 'Press Militar', muscle_group: 'Hombros', equipment: 'Mancuernas', description: 'Ejercicio de empuje vertical' },
    { id: '5', name: 'Curl de Bíceps', muscle_group: 'Brazos', equipment: 'Mancuernas', description: 'Ejercicio de aislamiento de bíceps' },
    { id: '6', name: 'Plancha', muscle_group: 'Core', equipment: 'Peso corporal', description: 'Ejercicio isométrico de core' },
  ]);
  
  const [isLoading] = useState(false);

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedMuscle === 'all' || ex.muscle_group === selectedMuscle)
  );

  const handleCreate = (data: ExerciseFormData) => {
    const newExercise = {
      id: Date.now().toString(),
      ...data,
    };
    setExercises(prev => [...prev, newExercise]);
    resetCreate();
    setIsCreateOpen(false);
    toast.success('Ejercicio creado exitosamente');
  };

  const handleEdit = (data: ExerciseFormData) => {
    if (!editingExercise) return;
    setExercises(prev => prev.map(ex => ex.id === editingExercise.id ? { ...ex, ...data } : ex));
    resetEdit();
    setIsEditOpen(false);
    setEditingExercise(null);
    toast.success('Ejercicio actualizado exitosamente');
  };

  const handleDelete = (id: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
    setDeletingExercise(null);
    toast.success('Ejercicio eliminado exitosamente');
  };

  const openEditDialog = (exercise: any) => {
    setEditingExercise(exercise);
    resetEdit(exercise);
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando ejercicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2 flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-primary" />
            Biblioteca de Ejercicios
          </h1>
          <p className="text-muted-foreground">
            Gestiona la base de datos de ejercicios para las rutinas
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetCreate(); setIsCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Ejercicio
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar ejercicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>
            <Select value={selectedMuscle} onValueChange={setSelectedMuscle}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Filtrar por grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {MUSCLE_GROUPS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exercises Grid */}
      {filteredExercises.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id} className="bg-card border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MuscleIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{exercise.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20">
                        {exercise.muscle_group}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button size="icon" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => openEditDialog(exercise)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10" onClick={() => setDeletingExercise(exercise.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {exercise.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{exercise.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Dumbbell className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{exercise.equipment || 'Sin equipamiento'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Dumbbell className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No se encontraron ejercicios</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Exercise Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nuevo Ejercicio</DialogTitle>
            <DialogDescription>
              Agrega un ejercicio a la biblioteca
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
            <div>
              <Label htmlFor="create-name">Nombre *</Label>
              <Input
                id="create-name"
                {...registerCreate('name', { required: 'El nombre es requerido' })}
                className="bg-input border-border mt-1"
                placeholder="Ej: Press de Banca"
              />
              {errorsCreate.name && <p className="text-xs text-destructive mt-1">{errorsCreate.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="create-muscle">Grupo Muscular *</Label>
              <Select onValueChange={(value) => setValueEdit('muscle_group', value)} defaultValue={watchCreate('muscle_group')}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar grupo muscular" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-equipment">Equipamiento</Label>
              <Select onValueChange={(value) => setValueEdit('equipment', value)} defaultValue={watchCreate('equipment')}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar equipamiento" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_OPTIONS.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-description">Descripción</Label>
              <Textarea
                id="create-description"
                {...registerCreate('description')}
                className="bg-input border-border mt-1"
                placeholder="Descripción del ejercicio..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="create-instructions">Instrucciones</Label>
              <Textarea
                id="create-instructions"
                {...registerCreate('instructions')}
                className="bg-input border-border mt-1"
                placeholder="Instrucciones de ejecución..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="create-video">URL Video (YouTube, etc.)</Label>
              <Input
                id="create-video"
                type="url"
                {...registerCreate('video_url')}
                className="bg-input border-border mt-1"
                placeholder="https://youtube.com/..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Crear Ejercicio
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Exercise Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Ejercicio</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del ejercicio
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEdit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                {...registerEdit('name', { required: 'El nombre es requerido' })}
                className="bg-input border-border mt-1"
              />
              {errorsEdit.name && <p className="text-xs text-destructive mt-1">{errorsEdit.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="edit-muscle">Grupo Muscular *</Label>
              <Select onValueChange={(value) => setValueEdit('muscle_group', value)} defaultValue={watchEdit('muscle_group')}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar grupo muscular" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-equipment">Equipamiento</Label>
              <Select onValueChange={(value) => setValueEdit('equipment', value)} defaultValue={watchEdit('equipment')}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar equipamiento" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_OPTIONS.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                {...registerEdit('description')}
                className="bg-input border-border mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-instructions">Instrucciones</Label>
              <Textarea
                id="edit-instructions"
                {...registerEdit('instructions')}
                className="bg-input border-border mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-video">URL Video</Label>
              <Input
                id="edit-video"
                type="url"
                {...registerEdit('video_url')}
                className="bg-input border-border mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <Edit className="w-4 h-4 mr-2" />
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingExercise} onOpenChange={(open) => !open && setDeletingExercise(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar ejercicio?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El ejercicio se eliminará permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogContent className="bg-card border-border">
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeletingExercise(null)}>
                Cancelar
              </Button>
              <Button 
                className="bg-red-500 hover:bg-red-600 text-red-500-foreground"
                onClick={() => { handleDelete(deletingExercise!); setDeletingExercise(null); }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </DialogContent>
      </Dialog>
    </div>
  );
}