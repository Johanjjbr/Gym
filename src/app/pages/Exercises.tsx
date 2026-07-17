import { useState, useMemo } from 'react';
import { Search, Loader2, AlertCircle, Dumbbell, Filter } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useExercises, type Exercise } from '../hooks/useExercises';
import { ExerciseDetailModal } from '../components/ExerciseDetailModal';

const MUSCLE_GROUPS = [
  'Todos', 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
  'Piernas', 'Pantorrillas', 'Core', 'Glúteos', 'General'
];

const ITEMS_PER_PAGE = 24;

export function Exercises() {
  const { data: exercises = [], isLoading, error } = useExercises();
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('Todos');
  const [page, setPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const filtered = useMemo(() => {
    let result = exercises;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.muscle_group?.toLowerCase().includes(q) ||
        e.equipment?.toLowerCase().includes(q) ||
        e.target?.toLowerCase().includes(q)
      );
    }
    if (muscleFilter !== 'Todos') {
      result = result.filter((e) => e.muscle_group === muscleFilter);
    }
    return result;
  }, [exercises, search, muscleFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageExercises = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.nextElementSibling;
    if (fallback) (fallback as HTMLElement).style.display = 'flex';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando ejercicios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-[#ff3b5c]" />
        <h2 className="text-2xl">Error al cargar ejercicios</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Ocurrió un error al cargar la biblioteca de ejercicios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Biblioteca de Ejercicios</h1>
        <p className="text-muted-foreground">
          {filtered.length} ejercicios disponibles
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, grupo muscular..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={muscleFilter} onValueChange={(v) => { setMuscleFilter(v); setPage(1); }}>
            <SelectTrigger>
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {pageExercises.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron ejercicios con esos filtros</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pageExercises.map((exercise) => (
              <Card
                key={exercise.id}
                className="bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer group"
                onClick={() => setSelectedExercise(exercise)}
              >
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted rounded-t-lg overflow-hidden relative">
                    {exercise.image_url ? (
                      <img
                        src={exercise.image_url}
                        alt={exercise.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={handleImageError}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center text-muted-foreground"
                      style={{ display: exercise.image_url ? 'none' : 'flex' }}
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
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="text-sm font-medium leading-tight line-clamp-2">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{exercise.muscle_group}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <ExerciseDetailModal
        exercise={selectedExercise}
        open={!!selectedExercise}
        onOpenChange={(open) => { if (!open) setSelectedExercise(null); }}
      />
    </div>
  );
}
