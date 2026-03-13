import { useTodaysAthletes, Athlete } from '../hooks/useTodaysAthletes';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { UserCheck, Dumbbell, AlertTriangle } from 'lucide-react';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const AthleteCard = ({ athlete }: { athlete: Athlete }) => (
  <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
    <Avatar className="w-12 h-12">
      <AvatarImage src={athlete.photo} alt={athlete.name} />
      <AvatarFallback>{getInitials(athlete.name)}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <h4 className="font-semibold text-lg">{athlete.name}</h4>
      {athlete.routine ? (
        <div className="text-sm text-muted-foreground">
          <span>{athlete.routine.name}</span>
          <Badge variant="outline" className="ml-2">
            Día {athlete.routine.currentDay}
          </Badge>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin rutina asignada</p>
      )}
    </div>
    {athlete.progress !== undefined && (
      <div className="w-1/4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted-foreground">Progreso</span>
          <span className="text-xs font-semibold">{athlete.progress}%</span>
        </div>
        <Progress value={athlete.progress} className="h-2" />
      </div>
    )}
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="w-1/4">
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    ))}
  </div>
);

export function MyWorkout() {
  const { data: athletes, isLoading, error } = useTodaysAthletes();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atletas de Hoy</h1>
          <p className="text-muted-foreground">
            Usuarios activos con asistencia registrada para hoy.
          </p>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <UserCheck className="w-6 h-6" />
          <span className="text-2xl font-bold">
            {athletes ? athletes.length : 0}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Entrenamiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error al Cargar Datos</AlertTitle>
              <AlertDescription>
                No se pudo obtener la lista de atletas. Inténtalo de nuevo más tarde.
              </AlertDescription>
            </Alert>
          ) : athletes && athletes.length > 0 ? (
            <div className="space-y-4">
              {athletes.map((athlete) => (
                <AthleteCard key={athlete.id} athlete={athlete} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Dumbbell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nadie ha venido a entrenar hoy</h3>
              <p className="text-muted-foreground">
                Cuando un usuario con rutina activa registre su asistencia, aparecerá aquí.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
