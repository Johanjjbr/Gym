import { useState, useEffect } from 'react';
import { Calendar, Clock, Filter, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { attendance } from '../lib/api';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  time: string;
  type: 'Entrada' | 'Salida';
  source?: string;
  session_number?: number;
  created_at: string;
}

interface UserStatus {
  inside: boolean;
  last_entry_time: string | null;
  session_count_today: number;
  can_enter: boolean;
  can_exit: boolean;
}

export function MyAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadAttendance();
    loadUserStatus();
  }, [user, filterMonth, filterYear]);

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

  const loadUserStatus = async () => {
    if (!user?.id) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await attendance.getStatus(user.id, today);
      setUserStatus(result);
    } catch (error) {
      console.warn('Error cargando estado de asistencia:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
  };

  const getMonthStats = () => {
    const uniqueDates = new Set(attendance.map(a => a.date));
    const entryCount = attendance.filter(a => a.type === 'Entrada').length;
    const exitCount = attendance.filter(a => a.type === 'Salida').length;
    const completeSessions = Math.min(entryCount, exitCount); // Sesiones completas (pares entrada+salida)
    
    return {
      totalDays: uniqueDates.size,
      totalVisits: completeSessions,
      totalEntries: entryCount,
      totalExits: exitCount,
    };
  };

  const stats = getMonthStats();

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6" data-testid="my-attendance-page">
      {/* Header con estado actual */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl mb-2">Mi Asistencia</h1>
            <p className="text-muted-foreground">
              Historial completo de tus visitas al gimnasio
            </p>
          </div>
          {/* Badge "Dentro del gimnasio" */}
          {userStatus?.inside && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#10f94e]/10 border border-[#10f94e]/30 rounded-lg animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#10f94e] animate-pulse" />
              <span className="text-sm font-medium text-[#10f94e]">
                🟢 Dentro del gimnasio desde {userStatus.last_entry_time || '--:--'}
              </span>
              <span className="text-xs text-muted-foreground">
                (Sesión #{userStatus.session_count_today})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Sin racha, solo días y visitas completas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Días Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground">
              días con asistencia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas Completas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">
              sesiones (entrada + salida)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros Totales</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{attendance.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEntries} entradas · {stats.totalExits} salidas
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
            <select 
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            <select 
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
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
                  data-testid={`attendance-record-${record.id}`}
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
                        {record.session_number && record.session_number > 1 && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            Sesión #{record.session_number}
                          </span>
                        )}
                        {record.source && record.source !== 'manual' && (
                          <Badge variant="secondary" className="text-xs">
                            {record.source}
                          </Badge>
                        )}
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