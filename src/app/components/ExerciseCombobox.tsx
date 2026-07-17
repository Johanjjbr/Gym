/**
 * ExerciseCombobox - Selector de ejercicios con autocomplete
 * Permite seleccionar ejercicios existentes de la biblioteca o crear nuevos
 */

import { useState, useRef } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, Image, FileVideo } from 'lucide-react';
import { uploadFile } from '../lib/upload';
import { Button } from './ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useExercises, useCreateExercise, type Exercise } from '../hooks/useExercises';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ExerciseComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Piernas',
  'Pantorrillas',
  'Core',
  'Glúteos',
  'General'
];

export function ExerciseCombobox({ value, onValueChange, placeholder = "Seleccionar ejercicio..." }: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  
  // Nuevo ejercicio
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('General');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState('');
  const [newExerciseDescription, setNewExerciseDescription] = useState('');
  const [newExerciseImage, setNewExerciseImage] = useState('');
  const [newExerciseGif, setNewExerciseGif] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const url = await uploadFile(file, 'exercise-media', 'images');
      setNewExerciseImage(url);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleUploadGif = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const url = await uploadFile(file, 'exercise-media', 'gifs');
      setNewExerciseGif(url);
    } finally {
      setUploadingMedia(false);
    }
  };

  const { data: exercises = [], isLoading } = useExercises();
  const createExerciseMutation = useCreateExercise();

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      toast.error('El nombre del ejercicio es obligatorio');
      return;
    }

    try {
      const newExercise = await createExerciseMutation.mutateAsync({
        name: newExerciseName.trim(),
        muscle_group: newExerciseMuscleGroup,
        equipment: newExerciseEquipment.trim() || undefined,
        description: newExerciseDescription.trim() || undefined,
        image_url: newExerciseImage || undefined,
        gif_url: newExerciseGif || undefined,
      });

      // Seleccionar el ejercicio recién creado
      onValueChange(newExercise.name);
      
      // Cerrar diálogos
      setShowNewDialog(false);
      setOpen(false);
      
      // Limpiar formulario
      setNewExerciseName('');
      setNewExerciseMuscleGroup('General');
      setNewExerciseEquipment('');
      setNewExerciseDescription('');
      setNewExerciseImage('');
      setNewExerciseGif('');
      setSearchValue('');
    } catch (error) {
      // El error ya se muestra en el hook
    }
  };

  const handleOpenNewDialog = () => {
    setShowNewDialog(true);
    setNewExerciseName(searchValue); // Pre-rellenar con lo que buscó el usuario
  };

  // Filtrar ejercicios según búsqueda
  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    ex.muscle_group.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar ejercicio..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Cargando ejercicios...
                </div>
              ) : filteredExercises.length === 0 ? (
                <CommandEmpty>
                  <div className="text-center py-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      No se encontró "{searchValue}"
                    </p>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleOpenNewDialog}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear nuevo ejercicio
                    </Button>
                  </div>
                </CommandEmpty>
              ) : (
                <>
                  <CommandGroup heading="Ejercicios disponibles">
                    {filteredExercises.map((exercise) => (
                      <CommandItem
                        key={exercise.id}
                        value={exercise.name}
                        onSelect={(currentValue) => {
                          onValueChange(currentValue === value ? '' : currentValue);
                          setOpen(false);
                          setSearchValue('');
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === exercise.name ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {exercise.image_url ? (
                          <img
                            src={exercise.image_url}
                            alt={exercise.name}
                            className="mr-2 h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="mr-2 h-8 w-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            💪
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{exercise.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {exercise.muscle_group}
                            {exercise.equipment && ` • ${exercise.equipment}`}
                            {exercise.target && ` • ${exercise.target}`}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <div className="border-t p-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={handleOpenNewDialog}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear nuevo ejercicio
                    </Button>
                  </div>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog para crear nuevo ejercicio */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Ejercicio</DialogTitle>
            <DialogDescription>
              Añade un nuevo ejercicio a la biblioteca para reutilizarlo en futuras rutinas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exercise-name">Nombre del Ejercicio *</Label>
              <Input
                id="exercise-name"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="ej: Press de Banca"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="muscle-group">Grupo Muscular *</Label>
              <Select value={newExerciseMuscleGroup} onValueChange={setNewExerciseMuscleGroup}>
                <SelectTrigger id="muscle-group" className="w-full border-border bg-background">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {MUSCLE_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment">Equipamiento (opcional)</Label>
              <Input
                id="equipment"
                value={newExerciseEquipment}
                onChange={(e) => setNewExerciseEquipment(e.target.value)}
                placeholder="ej: Barra, Mancuernas, Máquina"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={newExerciseDescription}
                onChange={(e) => setNewExerciseDescription(e.target.value)}
                placeholder="Descripción breve del ejercicio..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Imagen</Label>
                <div className="flex items-center gap-2">
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleUploadImage} className="hidden" id="exercise-image-upload" />
                  <Label htmlFor="exercise-image-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent">
                      <Image className="w-4 h-4" />
                      {uploadingMedia ? 'Subiendo...' : (newExerciseImage ? 'Cambiar' : 'Subir')}
                    </div>
                  </Label>
                </div>
                {newExerciseImage && (
                  <img src={newExerciseImage} alt="Preview" className="mt-2 w-20 h-20 rounded object-cover" />
                )}
              </div>
              <div className="space-y-2">
                <Label>GIF animado</Label>
                <div className="flex items-center gap-2">
                  <input ref={gifInputRef} type="file" accept="image/gif,image/webp,video/mp4" onChange={handleUploadGif} className="hidden" id="exercise-gif-upload" />
                  <Label htmlFor="exercise-gif-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent">
                      <FileVideo className="w-4 h-4" />
                      {uploadingMedia ? 'Subiendo...' : (newExerciseGif ? 'Cambiar' : 'Subir')}
                    </div>
                  </Label>
                </div>
                {newExerciseGif && (
                  <img src={newExerciseGif} alt="Preview" className="mt-2 w-20 h-20 rounded object-cover" />
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewDialog(false)}
              disabled={createExerciseMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreateExercise}
              disabled={createExerciseMutation.isPending}
            >
              {createExerciseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Ejercicio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
