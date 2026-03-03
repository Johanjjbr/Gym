import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface ProgressRecord {
  id: string;
  date: string;
  weight: number;
  body_fat: number | null;
  muscle_mass: number | null;
  notes: string | null;
}

export function MyProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('physical_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;

      setProgress(data || []);
    } catch (error: any) {
      console.error('Error cargando progreso:', error);
      toast.error('Error al cargar el progreso físico');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit',
      month: 'short'
    });
  };

  const getLatestRecord = () => {
    if (progress.length === 0) return null;
    return progress[progress.length - 1];
  };

  const getFirstRecord = () => {
    if (progress.length === 0) return null;
    return progress[0];
  };

  const calculateChange = (latest: number | null, first: number | null) => {
    if (!latest || !first) return null;
    return latest - first;
  };

  const latest = getLatestRecord();
  const first = getFirstRecord();
  const weightChange = calculateChange(latest?.weight || null, first?.weight || null);
  const bodyFatChange = calculateChange(latest?.body_fat || null, first?.body_fat || null);
  const muscleChange = calculateChange(latest?.muscle_mass || null, first?.muscle_mass || null);

  const chartData = progress.map(record => ({
    date: formatDate(record.date),
    peso: record.weight,
    grasa: record.body_fat || 0,
    musculo: record.muscle_mass || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Mi Progreso Físico</h1>
        <p className="text-muted-foreground">
          Seguimiento de tu evolución y métricas corporales
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Cargando...</p>
          </CardContent>
        </Card>
      ) : progress.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Aún no tienes registros de progreso físico.<br />
              Tu entrenador registrará tus mediciones periódicamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Peso Actual</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {latest?.weight || 'N/A'} kg
                </div>
                {weightChange !== null && (
                  <div className={`flex items-center gap-1 text-sm ${
                    weightChange > 0 ? 'text-orange-500' : 'text-green-500'
                  }`}>
                    {weightChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(weightChange).toFixed(1)} kg</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grasa Corporal</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {latest?.body_fat ? `${latest.body_fat}%` : 'N/A'}
                </div>
                {bodyFatChange !== null && (
                  <div className={`flex items-center gap-1 text-sm ${
                    bodyFatChange < 0 ? 'text-green-500' : 'text-orange-500'
                  }`}>
                    {bodyFatChange < 0 ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    <span>{Math.abs(bodyFatChange).toFixed(1)}%</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Masa Muscular</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {latest?.muscle_mass ? `${latest.muscle_mass} kg` : 'N/A'}
                </div>
                {muscleChange !== null && (
                  <div className={`flex items-center gap-1 text-sm ${
                    muscleChange > 0 ? 'text-green-500' : 'text-orange-500'
                  }`}>
                    {muscleChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(muscleChange).toFixed(1)} kg</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Evolución */}
          <Card>
            <CardHeader>
              <CardTitle>Evolución del Peso</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a24', 
                      border: '1px solid #2a2a3a',
                      borderRadius: '8px',
                      color: '#f0f0f5'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="peso" 
                    stroke="#10f94e" 
                    strokeWidth={2}
                    name="Peso (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Historial Detallado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Historial de Mediciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progress.slice().reverse().map((record) => (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {new Date(record.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Peso:</span>
                        <p className="font-semibold">{record.weight} kg</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Grasa:</span>
                        <p className="font-semibold">
                          {record.body_fat ? `${record.body_fat}%` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Músculo:</span>
                        <p className="font-semibold">
                          {record.muscle_mass ? `${record.muscle_mass} kg` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Notas:</span>
                        <p className="text-sm mt-1">{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
