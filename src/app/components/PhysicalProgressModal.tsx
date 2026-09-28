import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { physicalDataSchema, type PhysicalDataFormData } from '../lib/validations';
import { useCreatePhysicalProgress } from '../hooks/usePhysicalProgress';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Loader2 } from 'lucide-react';

interface PhysicalProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PhysicalProgressModal({ open, onOpenChange, onSuccess }: PhysicalProgressModalProps) {
  const { user } = useAuth();
  const createProgress = useCreatePhysicalProgress();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PhysicalDataFormData>({
    resolver: zodResolver(physicalDataSchema),
    defaultValues: {
      user_id: user?.id || '',
      weight: undefined,
      body_fat: undefined,
      muscle_mass: undefined,
      measurement_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  useEffect(() => {
    if (open && user?.id) {
      reset({
        user_id: user.id,
        weight: undefined,
        body_fat: undefined,
        muscle_mass: undefined,
        measurement_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [open, user?.id, reset]);

  const onSubmit = async (data: PhysicalDataFormData) => {
    try {
      await createProgress.mutateAsync(data);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error registrando progreso:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">Registrar Medición</DialogTitle>
          <DialogDescription className="text-gray-400">
            Ingresa tus datos físicos actuales. El peso es obligatorio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-gray-300">
              Peso (kg) <span className="text-[#ff3b5c]">*</span>
            </Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="1"
              max="500"
              {...register('weight', { valueAsNumber: true })}
              disabled={isSubmitting}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="70.5"
              required
            />
            {errors.weight && (
              <p className="text-xs text-[#ff3b5c]">{errors.weight.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body_fat" className="text-gray-300">
              Grasa Corporal (%)
            </Label>
            <Input
              id="body_fat"
              type="number"
              step="0.1"
              min="0"
              max="100"
              {...register('body_fat', { valueAsNumber: true })}
              disabled={isSubmitting}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="15.5"
            />
            {errors.body_fat && (
              <p className="text-xs text-[#ff3b5c]">{errors.body_fat.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="muscle_mass" className="text-gray-300">
              Masa Muscular (kg)
            </Label>
            <Input
              id="muscle_mass"
              type="number"
              step="0.1"
              min="0"
              max="200"
              {...register('muscle_mass', { valueAsNumber: true })}
              disabled={isSubmitting}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="55.0"
            />
            {errors.muscle_mass && (
              <p className="text-xs text-[#ff3b5c]">{errors.muscle_mass.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="measurement_date" className="text-gray-300">
              Fecha <span className="text-[#ff3b5c]">*</span>
            </Label>
            <Input
              id="measurement_date"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              {...register('measurement_date')}
              disabled={isSubmitting}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
            {errors.measurement_date && (
              <p className="text-xs text-[#ff3b5c]">{errors.measurement_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-300">
              Notas
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              disabled={isSubmitting}
              className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
              placeholder="Observaciones, cómo te sentiste, etc."
            />
            {errors.notes && (
              <p className="text-xs text-[#ff3b5c]">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
              className="border-gray-700 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Registrar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}