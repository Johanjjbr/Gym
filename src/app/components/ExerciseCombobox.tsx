/**
 * ExerciseCombobox - Selector de ejercicios con autocomplete
 * Permite seleccionar ejercicios existentes de la biblioteca o crear nuevos
 */

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, Dumbbell } from 'lucide-react';
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

// Preview tooltip component for GIF/image on hover
function ExercisePreview({ exercise, position, onClose }: { 
  exercise: Exercise; 
  position: { top: number; left: number } | null;
  onClose: () => void;
}) {
  if (!position || (!exercise.gif_url && !exercise.image_url)) return null;

  const showGif = exercise.gif_url;
  const [gifError, setGifError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const mediaUrl = showGif && !gifError ? exercise.gif_url : (!imageError ? exercise.image_url : null);

  if (!mediaUrl) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ top: position.top, left: position.left + 200 }}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden w-64">
        {showGif && !gifError ? (
          <img
            src={exercise.gif_url!}
            alt={`${exercise.name} - GIF`}
            className="w-full h-auto object-contain max-h-48 bg-muted"
            onError={() => setGifError(true)}
          />
        ) : !gifError && exercise.image_url && !imageError ? (
          <img
            src={exercise.image_url!}
            alt={exercise.name}
            className="w-full h-auto object-contain max-h-48 bg-muted"
            onError={() => setImageError(true)}
          />
        ) : null}
        <div className="p-3 border-t border-border bg-card">
          <p className="font-medium text-sm">{exercise.name}</p>
          <p className="text-xs text-muted-foreground">
            {exercise.muscle_group}
            {exercise.equipment && ` • ${exercise.equipment}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ExerciseCombobox({ value, onValueChange, placeholder = "Seleccionar ejercicio..." }: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [hoveredExercise, setHoveredExercise] = useState<Exercise | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Nuevo ejercicio
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('General');
  const [newExerciseEquipment, setNewExerciseEquipment] = useState('');
  const [newExerciseDescription, setNewExerciseDescription] = useState('');

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
    ex.muscle_group.toLowerCase().includes(searchValue.toLowerCase()) ||
    ex.target?.toLowerCase().includes(searchValue.toLowerCase()) ||
    ex.category?.toLowerCase().includes(searchValue.toLowerCase()) ||
    ex.body_part?.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Handle mouse enter/leave for preview
  const handleMouseEnter = (exercise: Exercise, e: React.MouseEvent<HTMLElement>) => {
    if (exercise.gif_url || exercise.image_url) {
      setHoveredExercise(exercise);
      const rect = e.currentTarget.getBoundingClientRect();
      setHoverPosition({ top: rect.top, left: rect.right });
    }
  };

  const handleMouseLeave = () => {
    setHoveredExercise(null);
    setHoverPosition(null);
  };

  // Close preview when popover closes
  useEffect(() => {
    if (!open) {
      setHoveredExercise(null);
      setHoverPosition(null);
    }
  }, [open]);

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
        <PopoverContent className="w-[400px] p-0" align="start" sideOffset={5}>
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
                      className="bg-[#10f94e] text-black hover:bg-[#0ed145]"
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
                        onMouseEnter={(e) => handleMouseEnter(exercise, e)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === exercise.name ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex-1 flex items-center gap-3">
                          {(exercise.image_url || exercise.gif_url) && (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {exercise.image_url ? (
                                <img
                                  src={exercise.image_url}
                                  alt={exercise.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Dumbbell className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{exercise.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {exercise.muscle_group}
                              {exercise.equipment && ` • ${exercise.equipment}`}
                              {exercise.category && ` • ${exercise.category}`}
                            </div>
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

      {/* Preview tooltip for GIF/image on hover */}
      {hoveredExercise && hoverPosition && (
        <ExercisePreview 
          exercise={hoveredExercise} 
          position={hoverPosition}
          onClose={() => { setHoveredExercise(null); setHoverPosition(null); }}
        />
      )}

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
              <select
                id="muscle-group"
                value={newExerciseMuscleGroup}
                onChange={(e) => setNewExerciseMuscleGroup(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
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
              className="bg-[#10f94e] text-black hover:bg-[#0ed145]"
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