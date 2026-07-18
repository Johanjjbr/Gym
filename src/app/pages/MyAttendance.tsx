import { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { formatDate } from '../lib/format';
import { useNavigate } from 'react-router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  type: 'Entrada' | 'Salida';
}

export function MyAttendance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user && !user.gym_id) {
      toast.error('Esta sección requiere un gimnasio asignado');
      navigate('/usuario/mi-entrenamiento', { replace: true });
      return;
    }
    loadAttendance();
  }, [user, filterMonth, filterYear, navigate]);

  const loadAttendance = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const startDate = new Date(filterYear, filterMonth, 1).toISOString();
      const endDate = new Date(filterYear, filterMonth + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;

      setAttendance(data || []);
    } catch (error: any) {
      console.error('Error cargando asistencia:', error);
      toast.error('Error al cargar el historial de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
  };

  const getMonthStats = () => {
    const uniqueDates = new Set(attendance.map(a => a.date));
    return {
      totalDays: uniqueDates.size,
      totalVisits: attendance.length / 2, // Entrada + Salida = 1 visita
      currentStreak: calculateStreak(),
    };
  };

  const calculateStreak = () => {
    // Simplificado - contar días únicos recientes
    const today = new Date();
    let streak = 0;
    const dates = Array.from(new Set(attendance.map(a => a.date))).sort().reverse();
    
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const stats = getMonthStats();

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Mi Asistencia</h1>
        <p className="text-muted-foreground">
          Historial completo de tus visitas al gimnasio
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Días Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground">
              días entrenados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">
              sesiones completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Racha Actual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.currentStreak}</div>
            <p className="text-xs text-muted-foreground">
              días consecutivos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtrar por Mes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select value={String(filterMonth)} onValueChange={(v) => setFilterMonth(Number(v))}>
              <SelectTrigger className="flex-1 border-border bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {months.map((month, index) => (
                  <SelectItem key={index} value={String(index)}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
              <SelectTrigger className="w-32 border-border bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {[2024, 2025, 2026, 2027].map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Asistencia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : attendance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay registros de asistencia para este período
            </p>
          ) : (
            <div className="space-y-3">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      record.type === 'Entrada' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="font-medium capitalize">{formatDate(record.date)}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatTime(record.time)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={record.type === 'Entrada' ? 'default' : 'secondary'}>
                    {record.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
