import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Dumbbell, AlertCircle, Loader2, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { useExercise, type Exercise } from '../hooks/useExercises';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gifLoaded, setGifLoaded] = useState(false);
  const [gifError, setGifError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);

  const { data: exercise, isLoading, error, refetch } = useExercise(id || '', {
    enabled: !!id,
  });

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  const showGif = exercise?.gif_url && !gifError;
  const showImage = !showGif && exercise?.image_url && !imageError;

  const handleAddToRoutine = () => {
    if (!exercise) return;
    // Navegar al creador de rutinas con el ejercicio preseleccionado
    // Usar query param o localStorage para pasar el ejercicio
    localStorage.setItem('preselected_exercise', JSON.stringify({
      id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      equipment: exercise.equipment,
    }));
    navigate('/rutinas/crear');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando ejercicio...</p>
        </div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-[#ff3b5c]" />
        <h2 className="text-2xl">Ejercicio no encontrado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          No se pudo cargar el ejercicio solicitado.
        </p>
        <Button variant="outline" onClick={() => navigate('/ejercicios')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a la biblioteca
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header con botón volver */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ejercicios')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{exercise.name}</h1>
          <p className="text-muted-foreground">Biblioteca de ejercicios / {exercise.name}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal - Media + Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Media Section */}
          <Card className="bg-card border-border overflow-hidden">
            <div className="relative bg-muted rounded-t-lg overflow-hidden">
              {showGif && !gifLoaded && (
                <div className="flex items-center justify-center h-96 bg-muted">
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                </div>
              )}
              {showGif && (
                <img
                  src={exercise.gif_url!}
                  alt={`${exercise.name} - GIF animado`}
                  className="w-full max-h-[500px] object-contain bg-card"
                  onLoad={() => setGifLoaded(true)}
                  onError={() => { setGifError(true); setGifFailed(true); }}
                  style={gifLoaded ? {} : { display: 'none' }}
                />
              )}
              {showImage && (
                <img
                  src={exercise.image_url!}
                  alt={exercise.name}
                  className="w-full max-h-[500px] object-contain bg-card"
                  onError={() => setImageError(true)}
                />
              )}
              {!showGif && !showImage && (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-3">
                  <Dumbbell className="w-16 h-16 opacity-30" />
                  <p className="text-lg">Sin imagen disponible</p>
                </div>
              )}

              {/* Badge GIF + Atribución */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                {exercise.gif_url && (
                  <Badge 
                    variant={gifError ? 'destructive' : 'secondary'} 
                    className="text-xs bg-black/70 text-white border-none"
                  >
                    {gifError ? 'GIF no disponible' : 'GIF animado'}
                  </Badge>
                )}
                {exercise.attribution && (
                  <Badge variant="outline" className="text-xs bg-black/70 text-white border-white/20">
                    {exercise.attribution.replace('© ', '')}
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  <Dumbbell className="w-3 h-3 mr-1" />
                  {exercise.muscle_group}
                </Badge>
                {exercise.equipment && (
                  <Badge variant="outline" className="bg-secondary/10 px-3 py-1">{exercise.equipment}</Badge>
                )}
                {exercise.category && (
                  <Badge variant="outline" className="bg-accent/10 px-3 py-1">{exercise.category}</Badge>
                )}
                {exercise.body_part && (
                  <Badge variant="outline" className="bg-muted px-3 py-1">{exercise.body_part}</Badge>
                )}
                {exercise.target && (
                  <Badge variant="outline" className="bg-muted px-3 py-1">{exercise.target}</Badge>
                )}
              </div>

              {/* Description */}
              {exercise.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Descripción</h3>
                  <p className="text-base">{exercise.description}</p>
                </div>
              )}

              {/* Instructions Toggle */}
              {(exercise.instructions_es || exercise.instructions_en) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Instrucciones</h3>
                    {exercise.instructions_es && exercise.instructions_en && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEnglish(!showEnglish)}
                      >
                        {showEnglish ? 'Ver en Español' : 'View in English'}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                  <p className="text-base whitespace-pre-line leading-relaxed">
                    {showEnglish ? exercise.instructions_en : exercise.instructions_es}
                  </p>
                </div>
              )}

              {/* Secondary Muscles */}
              {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Músculos secundarios</h3>
                  <div className="flex flex-wrap gap-2">
                    {exercise.secondary_muscles.map((m, i) => (
                      <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Attribution */}
              {exercise.attribution && (
                <Separator />
              )}
              {exercise.attribution && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="w-4 h-4" />
                  <span>{exercise.attribution}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Actions + Meta */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">Acciones</h3>
              
              <Button 
                className="w-full bg-[#10f94e] text-black hover:bg-[#0ed145] h-12 text-lg"
                onClick={handleAddToRoutine}
              >
                <Dumbbell className="w-5 h-5 mr-2" />
                Agregar a mi rutina
              </Button>

              {user && (
                <Button 
                  variant="outline" 
                  className="w-full h-12"
                  onClick={() => navigator.clipboard.writeText(`/ejercicios/${exercise.id}`)}
                >
                  Copiar enlace
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold">Información</h3>
              <dl className="space-y-3 text-sm">
                {exercise.external_id && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>ID Externo</dt>
                    <dd className="font-mono">{exercise.external_id}</dd>
                  </div>
                )}
                {exercise.media_id && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Media ID</dt>
                    <dd className="font-mono">{exercise.media_id}</dd>
                  </div>
                )}
                {exercise.created_at && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Creado</dt>
                    <dd>{new Date(exercise.created_at).toLocaleDateString('es-ES')}</dd>
                  </div>
                )}
                {exercise.updated_at && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Actualizado</dt>
                    <dd>{new Date(exercise.updated_at).toLocaleDateString('es-ES')}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}