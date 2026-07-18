import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { Exercise } from '../hooks/useExercises';
import {
  translateTarget,
  translateEquipment,
  translateCategory,
  translateMuscleGroup,
} from '../lib/exerciseTranslations';

interface Props {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseDetailModal({ exercise, open, onOpenChange }: Props) {
  const [gifLoaded, setGifLoaded] = useState(false);
  const [gifError, setGifError] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!exercise) return null;

  const showGif = exercise.gif_url && !gifError;
  const showImage = !showGif && exercise.image_url && !imageError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{exercise.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-card rounded-lg overflow-hidden border border-border">
            {showGif && !gifLoaded && (
              <div className="flex items-center justify-center h-64 bg-muted">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {showGif && (
              <img
                src={exercise.gif_url!}
                alt={`${exercise.name} - GIF`}
                className="w-full max-h-80 object-contain bg-card"
                onLoad={() => setGifLoaded(true)}
                onError={() => setGifError(true)}
                style={gifLoaded ? {} : { display: 'none' }}
              />
            )}
            {showImage && (
              <img
                src={exercise.image_url!}
                alt={exercise.name}
                className="w-full max-h-80 object-contain bg-card"
                onError={() => setImageError(true)}
              />
            )}
            {!showGif && !showImage && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">Sin imagen disponible</p>
              </div>
            )}
            {exercise.gif_url && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs bg-black/60 text-white border-none">
                  {gifError ? 'GIF no disponible' : 'GIF animado'}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {exercise.muscle_group && (
              <Badge variant="outline" className="bg-primary/10">
                {translateMuscleGroup(exercise.muscle_group)}
              </Badge>
            )}
            {exercise.target && (
              <Badge variant="outline" className="bg-secondary/10">
                {translateTarget(exercise.target)}
              </Badge>
            )}
            {exercise.equipment && (
              <Badge variant="outline" className="bg-accent/10">
                {translateEquipment(exercise.equipment)}
              </Badge>
            )}
            {exercise.category && (
              <Badge variant="outline" className="bg-muted">
                {translateCategory(exercise.category)}
              </Badge>
            )}
            {exercise.body_part && exercise.body_part !== exercise.category && (
              <Badge variant="outline" className="bg-muted">
                {translateCategory(exercise.body_part)}
              </Badge>
            )}
          </div>

          {exercise.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Descripción</h4>
              <p className="text-sm">{exercise.description}</p>
            </div>
          )}

          {exercise.instructions_es && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Instrucciones</h4>
              <p className="text-sm whitespace-pre-line">{exercise.instructions_es}</p>
            </div>
          )}

          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Músculos secundarios</h4>
              <div className="flex flex-wrap gap-1">
                {exercise.secondary_muscles.map((m, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
