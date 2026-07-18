import { useState, useEffect } from 'react';
import { User, Scale, Ruler, Loader2, Lock, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useUpdateOwnProfile } from '../hooks/useUserRoutines';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    phone?: string;
    weight?: number;
    height?: number;
  };
  isFreeUser?: boolean;
  lastProgressDate?: string | null;
}

export function EditProfileDialog({ open, onOpenChange, user, isFreeUser, lastProgressDate }: EditProfileDialogProps) {
  const daysSinceLastProgress = lastProgressDate
    ? Math.floor((Date.now() - new Date(lastProgressDate).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
  const canEditWeight = !isFreeUser || daysSinceLastProgress >= 7;
  const daysUntilNext = Math.max(0, 7 - daysSinceLastProgress);
  const updateProfile = useUpdateOwnProfile();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [weight, setWeight] = useState(user.weight?.toString() || '');
  const [height, setHeight] = useState(user.height?.toString() || '');

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone || '');
    setWeight(user.weight?.toString() || '');
    setHeight(user.height?.toString() || '');
  }, [user]);

  const handleSave = async () => {
    const w = weight ? parseFloat(weight) : undefined;
    const h = height ? parseFloat(height) : undefined;
    await updateProfile.mutateAsync({
      userId: user.id,
      phone: phone || undefined,
      weight: w,
      height: h,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Perfil
          </DialogTitle>
          <DialogDescription>
            Actualiza tus datos personales. Al cambiar tu peso se registrará automáticamente en tu historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} disabled />
            <p className="text-xs text-muted-foreground">El nombre no puede modificarse</p>
          </div>

          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              placeholder="+58 412 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                Peso (kg)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="70.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={!canEditWeight}
                />
                {!canEditWeight && (
                  <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
              {!canEditWeight ? (
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                  <Lock className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Como usuario libre, puedes actualizar tu peso cada 7 días.
                    </p>
                    <p className="text-xs font-medium text-yellow-500 mt-1">
                      Próximo registro disponible en {daysUntilNext} día{daysUntilNext !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Se registrará automáticamente en tu historial de progreso.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                Altura (cm)
              </Label>
              <Input
                type="number"
                step="0.5"
                placeholder="170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
