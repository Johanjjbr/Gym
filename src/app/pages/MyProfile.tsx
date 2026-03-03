import { User, Mail, Phone, Calendar, CreditCard, TrendingUp, Activity, Hash, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUsers';
import { usePhysicalProgress } from '../hooks/usePhysicalProgress';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function MyProfile() {
  const { user: authUser } = useAuth();
  const { data: user, isLoading: userLoading } = useUser(authUser?.id || '');
  const { data: progressData = [], isLoading: progressLoading } = usePhysicalProgress(authUser?.id || '');

  if (userLoading || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Preparar datos para el gráfico de peso
  const weightChartData = progressData
    .map(p => ({
      date: new Date(p.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      peso: p.weight,
    }))
    .reverse();

  // Calcular estadísticas
  const lastProgress = progressData[0];
  const weightChange = progressData.length >= 2 
    ? progressData[0].weight - progressData[progressData.length - 1].weight 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Información personal y estadísticas
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar */}
            <div className="flex justify-center lg:justify-start">
              <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
                {user.photo ? (
                  <img src={user.photo} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-primary" />
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <User className="w-4 h-4" />
                  <span>Nombre Completo</span>
                </div>
                <p className="font-medium">{user.name}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Mail className="w-4 h-4" />
                  <span>Correo Electrónico</span>
                </div>
                <p className="font-medium">{user.email}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Phone className="w-4 h-4" />
                  <span>Teléfono</span>
                </div>
                <p className="font-medium">{user.phone}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <CreditCard className="w-4 h-4" />
                  <span>N° Miembro</span>
                </div>
                <p className="font-medium">{user.memberNumber}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Fecha de Inicio</span>
                </div>
                <p className="font-medium">
                  {new Date(user.startDate).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Activity className="w-4 h-4" />
                  <span>Estado</span>
                </div>
                <div>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'Activo' 
                      ? 'bg-primary/10 text-primary' 
                      : user.status === 'Moroso'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Membership Card */}
      <Card>
        <CardHeader>
          <CardTitle>Plan de Membresía</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Plan Actual</p>
              <p className="text-lg font-medium">{user.plan}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Próximo Pago</p>
              <p className="text-lg font-medium">
                {new Date(user.nextPayment).toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            {user.trainer_name && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Entrenador Asignado</p>
                <p className="text-lg font-medium">{user.trainer_name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Physical Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peso Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{lastProgress?.weight || user.weight} kg</p>
              {weightChange !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${
                  weightChange < 0 ? 'text-primary' : 'text-destructive'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                  <span>{Math.abs(weightChange).toFixed(1)} kg</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estatura</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{user.height} cm</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">IMC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{user.imc ? user.imc.toFixed(1) : 'N/A'}</p>
              <p className="text-sm text-muted-foreground">
                {user.imc ? (
                  user.imc < 18.5 ? 'Bajo peso' : 
                  user.imc < 25 ? 'Normal' : 
                  user.imc < 30 ? 'Sobrepeso' : 'Obesidad'
                ) : 'Sin datos'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weight Progress Chart */}
      {weightChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución del Peso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="peso" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Stats */}
      {lastProgress && (lastProgress.bodyFat || lastProgress.muscleMass) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lastProgress.bodyFat && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">% Grasa Corporal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{lastProgress.bodyFat}%</p>
              </CardContent>
            </Card>
          )}
          
          {lastProgress.muscleMass && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Masa Muscular</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{lastProgress.muscleMass} kg</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}