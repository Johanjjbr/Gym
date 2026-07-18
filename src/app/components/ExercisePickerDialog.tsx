import { useState, useMemo } from 'react';
import { Search, Dumbbell, Loader2, Filter, Target, Wrench, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useExercises, type Exercise } from '../hooks/useExercises';
import {
  translateTarget,
  translateEquipment,
  translateMuscleGroup,
  getAllTargetOptions,
  getAllEquipmentOptions,
} from '../lib/exerciseTranslations';

const MUSCLE_GROUPS = [
  'Todos', 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
  'Piernas', 'Pantorrillas', 'Core', 'Glúteos', 'General'
];

const MUSCLE_GROUP_MAP: Record<string, string[]> = {
  'Pecho': ['Pecho', 'chest'],
  'Espalda': ['Espalda', 'back'],
  'Hombros': ['Hombros', 'shoulders'],
  'Bíceps': ['Brazos', 'Bíceps', 'upper arms', 'biceps'],
  'Tríceps': ['Brazos', 'Tríceps', 'upper arms', 'triceps'],
  'Piernas': ['Piernas', 'upper legs', 'lower legs'],
  'Pantorrillas': ['Pantorrillas', 'lower legs', 'calves'],
  'Core': ['Core', 'waist'],
  'Glúteos': ['Glúteos', 'glutes'],
  'General': ['General', 'Cuello', 'Antebrazos', 'Cardio', 'neck', 'lower arms', 'cardio'],
};

const TARGET_OPTIONS = getAllTargetOptions();
const TARGET_MAP: Record<string, string[]> = TARGET_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = [opt.value, opt.label.toLowerCase()];
  return acc;
}, {} as Record<string, string[]>);

const EQUIPMENT_OPTIONS = getAllEquipmentOptions();
const EQUIPMENT_MAP: Record<string, string[]> = EQUIPMENT_OPTIONS.reduce((acc, opt) => {
  const key = opt.value;
  const aliases = [key, opt.label.toLowerCase()];
  const normalized = key.toLowerCase();
  if (normalized !== key) aliases.push(normalized);
  acc[opt.value] = aliases;
  return acc;
}, {} as Record<string, string[]>);

const ITEMS_PER_PAGE = 12;

interface ExercisePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayLabel: string;
  defaultSets?: number;
  defaultReps?: string;
  defaultRestSeconds?: number;
  onConfirm: (exercises: Array<{ name: string; sets: number; reps: string; rest_seconds: number; image_url?: string | null; gif_url?: string | null; instructions?: string | null }>) => void;
}

export function ExercisePickerDialog({
  open, onOpenChange, dayLabel, onConfirm,
  defaultSets: propDefaultSets = 3,
  defaultReps: propDefaultReps = '10',
  defaultRestSeconds: propDefaultRest = 60,
}: ExercisePickerDialogProps) {
  const { data: exercises = [], isLoading } = useExercises();
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('Todos');
  const [targetFilter, setTargetFilter] = useState('Todos');
  const [equipmentFilter, setEquipmentFilter] = useState('Todos');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [defaultSets, setDefaultSets] = useState(String(propDefaultSets));
  const [defaultReps, setDefaultReps] = useState(propDefaultReps);
  const [defaultRest, setDefaultRest] = useState(String(propDefaultRest));

  const filtered = useMemo(() => {
    let result = exercises;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (e.muscle_group ?? '').toLowerCase().includes(q) ||
        (e.equipment ?? '').toLowerCase().includes(q) ||
        (e.target ?? '').toLowerCase().includes(q)
      );
    }
    if (muscleFilter !== 'Todos') {
      const allowed = MUSCLE_GROUP_MAP[muscleFilter] || [muscleFilter];
      result = result.filter((e) => allowed.includes(e.muscle_group));
    }
    if (targetFilter !== 'Todos') {
      const allowed = TARGET_MAP[targetFilter] || [targetFilter];
      result = result.filter((e) => e.target && allowed.includes(e.target.toLowerCase()));
    }
    if (equipmentFilter !== 'Todos') {
      const allowed = EQUIPMENT_MAP[equipmentFilter] || [equipmentFilter];
      result = result.filter((e) => e.equipment && allowed.includes(e.equipment.toLowerCase()));
    }
    return result;
  }, [exercises, search, muscleFilter, targetFilter, equipmentFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageExercises = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedExercises = exercises.filter(e => selected.has(e.id));

  const handleConfirm = () => {
    const list = selectedExercises.map(e => ({
      name: e.name,
      sets: parseInt(defaultSets) || 3,
      reps: defaultReps || '10',
      rest_seconds: parseInt(defaultRest) || 60,
      image_url: e.image_url,
      gif_url: e.gif_url,
      instructions: e.instructions_es || e.instructions_en,
    }));
    onConfirm(list);
    setSelected(new Set());
    setSearch('');
    setPage(1);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.nextElementSibling;
    if (fallback) (fallback as HTMLElement).style.display = 'flex';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelected(new Set()); setSearch(''); setPage(1); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Catálogo de Ejercicios
            <Badge variant="outline" className="ml-2 text-xs">{filtered.length} disponibles</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Default values config */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
            <span className="text-sm font-medium text-muted-foreground">Valores por defecto:</span>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Series</Label>
              <Input
                type="number"
                min={1}
                value={defaultSets}
                onChange={(e) => setDefaultSets(e.target.value)}
                className="w-16 h-8 text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Reps</Label>
              <Input
                value={defaultReps}
                onChange={(e) => setDefaultReps(e.target.value)}
                className="w-20 h-8 text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Descanso (s)</Label>
              <Input
                type="number"
                min={0}
                value={defaultRest}
                onChange={(e) => setDefaultRest(e.target.value)}
                className="w-16 h-8 text-center"
              />
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, grupo muscular..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="w-36">
                <Select value={muscleFilter} onValueChange={(v) => { setMuscleFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-1 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={targetFilter} onValueChange={(v) => { setTargetFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <Target className="w-4 h-4 mr-1 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Objetivo</SelectItem>
                    {TARGET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={equipmentFilter} onValueChange={(v) => { setEquipmentFilter(v); setPage(1); }}>
                  <SelectTrigger>
                    <Wrench className="w-4 h-4 mr-1 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Equipamiento</SelectItem>
                    {EQUIPMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Exercise Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : pageExercises.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron ejercicios con esos filtros</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pageExercises.map((exercise) => {
                const isSelected = selected.has(exercise.id);
                return (
                  <Card
                    key={exercise.id}
                    className={`bg-card border-border transition-all duration-200 cursor-pointer group
                      ${isSelected
                        ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/20'
                        : 'hover:border-primary/50'
                      }`}
                    onClick={() => toggleSelect(exercise.id)}
                  >
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted rounded-t-lg overflow-hidden relative">
                        {(exercise.gif_url || exercise.image_url) ? (
                          <img
                            src={exercise.gif_url || exercise.image_url}
                            alt={exercise.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={handleImageError}
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex items-center justify-center text-muted-foreground"
                          style={{ display: (exercise.gif_url || exercise.image_url) ? 'none' : 'flex' }}
                        >
                          <Dumbbell className="w-8 h-8" />
                        </div>
                        {exercise.gif_url && (
                          <div className="absolute top-1 right-1">
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-black/50 text-white border-none">
                              GIF
                            </Badge>
                          </div>
                        )}
                        <div className={`absolute top-1 left-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${isSelected ? 'bg-primary border-primary' : 'bg-background/80 border-muted-foreground'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-xs font-medium leading-tight line-clamp-2">{exercise.name}</p>
                        <div className="flex flex-wrap gap-1">
                          {exercise.muscle_group && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {translateMuscleGroup(exercise.muscle_group)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border sticky bottom-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selected.size} ejercicio{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}
              </span>
              {selected.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-muted-foreground"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              Agregar a {dayLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
