import { useState } from 'react';
import { Star, Send, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../contexts/AuthContext';
import { useMyReview, useCreateReview, useUpdateReview, useDeleteReview } from '../hooks/useGymReviews';
import { useGyms } from '../hooks/useGyms';
import { useGymById } from '../hooks/useGyms';

export function GymRating() {
  const { user } = useAuth();
  const { data: gyms, isLoading: loadingGyms } = useGyms();
  const myGymId = user?.gym_id;
  const userGym = gyms?.find((g: any) => g.id === myGymId);

  if (user?.role !== 'Usuario' || !myGymId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl">No disponible</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Solo los usuarios pueden calificar su gimnasio.
        </p>
      </div>
    );
  }

  return <GymRatingForm gymId={myGymId} gymName={userGym?.name || 'tu gimnasio'} />;
}

function GymRatingForm({ gymId, gymName }: { gymId: string; gymName: string }) {
  const { data: myReview, isLoading: loadingReview } = useMyReview(gymId);
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();

  const [rating, setRating] = useState(myReview?.rating || 0);
  const [comment, setComment] = useState(myReview?.comment || '');
  const [hoveredStar, setHoveredStar] = useState(0);

  const isSubmitting = createReview.isPending || updateReview.isPending;
  const error = createReview.error || updateReview.error;

  const handleSubmit = () => {
    if (rating === 0) return;
    if (myReview) {
      updateReview.mutate({ id: myReview.id, data: { rating, comment }, gymId });
    } else {
      createReview.mutate({ gym_id: gymId, rating, comment });
    }
  };

  const handleDelete = () => {
    if (!myReview) return;
    deleteReview.mutate({ id: myReview.id, gymId });
  };

  if (loadingReview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8 space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Valorar {gymName}</h1>
        <p className="text-muted-foreground">
          {myReview
            ? 'Tu calificación actual. Puedes modificarla cuando quieras.'
            : 'Comparte tu experiencia para ayudar a mejorar el gimnasio.'}
        </p>
      </div>

      {error && (
        <Alert className="border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card border-border">
        <CardContent className="pt-6 space-y-6">
          <div className="text-center">
            <CardTitle className="mb-2">Tu calificación</CardTitle>
            <CardDescription>Selecciona de 1 a 5 estrellas</CardDescription>
            <div className="flex justify-center gap-2 mt-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`size-10 ${
                      star <= (hoveredStar || rating)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'][rating]}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Comentario (opcional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos tu experiencia..."
              className="bg-input border-border mt-1 min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              {myReview ? 'Actualizar reseña' : 'Enviar reseña'}
            </Button>
            {myReview && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteReview.isPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                Eliminar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
