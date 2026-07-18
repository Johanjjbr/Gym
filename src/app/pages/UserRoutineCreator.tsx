import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Dumbbell, Plus, Trash2, ChevronLeft, ChevronRight, Loader2, LayoutGrid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateUserRoutine } from '../hooks/useUserRoutines';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ExercisePickerDialog } from '../components/ExercisePickerDialog';

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado'] as const;
const CATEGORIES = ['Fuerza', 'Cardio', 'Funcional', 'Hipertrofia', 'Pérdida de Peso', 'Resistencia'] as const;

interface DayExercise {
  day_of_week: number;
  exercises: Array<{
    exercise_name: string;
    order_index: number;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes?: string;
    image_url?: string | null;
    gif_url?: string | null;
    instructions?: string | null;
  }>;
}

export function UserRoutineCreator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createRoutine = useCreateUserRoutine();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<string>('Principiante');
  const [category, setCategory] = useState<string>('Fuerza');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [dayExercises, setDayExercises] = useState<DayExercise[]>([]);
  const [pickerDay, setPickerDay] = useState<number | null>(null);

  const updateDayExercises = (days: number[]) => {
    setDayExercises(prev => {
      const existing = prev.filter(de => days.includes(de.day_of_week));
      const newDays = days.filter(d => !prev.find(de => de.day_of_week === d));
      return [...existing, ...newDays.map(d => ({ day_of_week: d, exercises: [] }))];
    });
  };

  const toggleDay = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day].sort((a, b) => a - b);
    setSelectedDays(newDays);
    updateDayExercises(newDays);
  };

  const addExercisesToDay = (dayIdx: number, newExercises: Array<{ name: string; sets: number; reps: string; rest_seconds: number; image_url?: string | null; gif_url?: string | null; instructions?: string | null }>) => {
    setDayExercises(prev => prev.map((de, i) => {
      if (i !== dayIdx) return de;
      return {
        ...de,
        exercises: [
          ...de.exercises,
          ...newExercises.map((ex, idx) => ({
            exercise_name: ex.name,
            order_index: de.exercises.length + idx + 1,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds,
            image_url: ex.image_url,
            gif_url: ex.gif_url,
            instructions: ex.instructions,
          })),
        ],
      };
    }));
  };

  const removeExerciseFromDay = (dayIdx: number, exIdx: number) => {
    setDayExercises(prev => prev.map((de, i) => {
      if (i !== dayIdx) return de;
      return {
        ...de,
        exercises: de.exercises.filter((_, j) => j !== exIdx),
      };
    }));
  };

  const updateExerciseField = (dayIdx: number, exIdx: number, field: string, value: any) => {
    setDayExercises(prev => prev.map((de, i) => {
      if (i !== dayIdx) return de;
      return {
        ...de,
        exercises: de.exercises.map((ex, j) => {
          if (j !== exIdx) return ex;
          return { ...ex, [field]: value };
        }),
      };
    }));
  };

  const handleCreate = async () => {
    if (!user?.id || !name.trim()) return;

    const allExercisesFlat = dayExercises.flatMap(de =>
      de.exercises.map(ex => ({ ...ex, day_of_week: de.day_of_week }))
    );

    try {
      await createRoutine.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        level,
        category,
        duration_weeks: durationWeeks,
        days_per_week: daysPerWeek,
        created_by_user: user.id,
        exercises: allExercisesFlat,
      });
      navigate('/usuario/rutinas');
    } catch {
      // error handled in hook
    }
  };

  const canGoNext = () => {
    if (step === 1) return name.trim().length > 0 && selectedDays.length > 0;
    if (step === 2) {
      return dayExercises.some(de => de.exercises.length > 0);
    }
    return true;
  };

  const getDayLabel = (day: number) => DAYS.find(d => d.value === day)?.label || '';

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card><CardContent className="py-12 text-center text-muted-foreground">Debes iniciar sesión</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Dumbbell className="w-8 h-8 text-primary" />
          CREAR RUTINA
        </h1>
        <p className="text-muted-foreground">Diseña tu propia rutina de entrenamiento personalizada</p>
      </div>

      {/* Steps Indicator */}
      <div className="flex gap-2">
        {[1, 2].map(s => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Nombre de la Rutina *</Label>
              <Input
                placeholder="Ej: Full Body Principiante"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Describe el objetivo de esta rutina..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nivel</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={`p-2 text-xs rounded-lg border-2 transition-all ${
                        level === l
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border-2 border-muted bg-background text-foreground"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duración (semanas)</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(parseInt(e.target.value) || 4)}
                />
              </div>
              <div className="space-y-2">
                <Label>Días por Semana</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(parseInt(e.target.value) || 3)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Días de Entrenamiento</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                      selectedDays.includes(day.value)
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-muted hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  updateDayExercises(selectedDays);
                  setStep(2);
                }}
                disabled={!canGoNext()}
                className="bg-primary hover:bg-primary/90"
              >
                Siguiente: Ejercicios
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Exercises per Day */}
      {step === 2 && (
        <div className="space-y-6">
          {selectedDays.map((day, dayIdx) => {
            const dayEx = dayExercises.find(de => de.day_of_week === day);
            const exercises = dayEx?.exercises || [];

            return (
              <Card key={day} className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    {getDayLabel(day)}
                    <Badge variant="outline" className="ml-2">{exercises.length} ejercicios</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exercises.map((ex, exIdx) => (
                    <div
                      key={exIdx}
                      className="p-4 bg-muted/30 border rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {(ex.image_url || ex.gif_url) && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                            <img
                              src={ex.gif_url || ex.image_url}
                              alt={ex.exercise_name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {ex.gif_url && (
                              <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white font-bold">GIF</span>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{ex.exercise_name}</span>
                            <button
                              type="button"
                              onClick={() => removeExerciseFromDay(dayIdx, exIdx)}
                              className="text-destructive hover:bg-destructive/10 p-1 rounded flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Series</Label>
                          <Input
                            type="number"
                            value={ex.sets}
                            onChange={(e) => updateExerciseField(dayIdx, exIdx, 'sets', parseInt(e.target.value) || 1)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Reps</Label>
                          <Input
                            value={ex.reps}
                            onChange={(e) => updateExerciseField(dayIdx, exIdx, 'reps', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Descanso (s)</Label>
                          <Input
                            type="number"
                            value={ex.rest_seconds}
                            onChange={(e) => updateExerciseField(dayIdx, exIdx, 'rest_seconds', parseInt(e.target.value) || 60)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      {ex.instructions && (
                        <details className="group">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                            Instrucciones
                          </summary>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                            {ex.instructions}
                          </p>
                        </details>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setPickerDay(dayIdx)}
                      className="w-full border-dashed border-2 hover:border-primary hover:text-primary"
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Abrir Catálogo de Ejercicios
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Atrás
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canGoNext() || createRoutine.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createRoutine.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Crear Rutina
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <ExercisePickerDialog
        open={pickerDay !== null}
        onOpenChange={(open) => { if (!open) setPickerDay(null); }}
        dayLabel={pickerDay !== null ? getDayLabel(selectedDays[pickerDay]) : ''}
        onConfirm={(exercises) => {
          if (pickerDay !== null) {
            addExercisesToDay(pickerDay, exercises);
            setPickerDay(null);
          }
        }}
        defaultSets={3}
        defaultReps="10"
        defaultRestSeconds={60}
      />
    </div>
  );
}
