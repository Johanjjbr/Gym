import { Dumbbell } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

export function MyWorkout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Mi Entrenamiento</h1>
        <p className="text-muted-foreground">
          Funcionalidad en desarrollo para el personal
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Dumbbell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Próximamente</h3>
          <p className="text-muted-foreground">
            Esta funcionalidad estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
