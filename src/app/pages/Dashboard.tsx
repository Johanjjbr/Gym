import { useState } from 'react';
import { Users, UserCheck, UserX, DollarSign, UserCog, Activity, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Database, ExternalLink } from 'lucide-react';
import { useDashboardStats } from '../hooks/useStats';
import { useUsers } from '../hooks/useUsers';
import { useInvoices } from '../hooks/useInvoices';
import { useAdminGyms } from '../hooks/useAdminGyms';
import { useGyms } from '../hooks/useGyms';
import { formatDate } from '../lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

// Mock data para los gráficos
const monthlyRevenueData = [
  { month: 'Ene', revenue: 12000 },
  { month: 'Feb', revenue: 15000 },
  { month: 'Mar', revenue: 18000 },
  { month: 'Abr', revenue: 16000 },
  { month: 'May', revenue: 20000 },
  { month: 'Jun', revenue: 22000 },
];

const attendanceData = [
  { day: 'Lun', count: 45 },
  { day: 'Mar', count: 52 },
  { day: 'Mie', count: 48 },
  { day: 'Jue', count: 61 },
  { day: 'Vie', count: 55 },
  { day: 'Sab', count: 38 },
  { day: 'Dom', count: 25 },
];

export function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrador' || user?.is_super_admin;

  const { data: adminGyms } = useAdminGyms();
  const { data: allGyms } = useGyms();

  const [selectedGymId, setSelectedGymId] = useState<string>('');

  const gymFilter = selectedGymId || undefined;

  const availableGyms = user?.is_super_admin
    ? (allGyms || [])
    : (adminGyms || []).map((ag: any) => ({ id: ag.gym_id, name: ag.gym_name }));

  // Usar React Query para obtener datos reales
  const { data: stats, isLoading: loadingStats, error: statsError } = useDashboardStats(gymFilter);
  const { data: users, isLoading: loadingUsers } = useUsers(gymFilter);
  const { data: invoicesData, isLoading: loadingPayments } = useInvoices({ gym_id: gymFilter });

  const isLoading = loadingStats || loadingUsers || loadingPayments;

  // Calcular estadísticas desde los datos reales
  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter((u: any) => u.status === 'Activo').length || 0;
  const inactiveUsers = users?.filter((u: any) => u.status === 'Inactivo').length || 0;
  const suspendedUsers = users?.filter((u: any) => u.status === 'Suspendido').length || 0;
  
  const monthlyRevenue = invoicesData?.filter((i: any) => i.status === 'Pagada').reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
  const totalStaff = stats?.totalStaff || 0;
  const todayAttendance = stats?.todayAttendance || 0;

  // Datos para el gráfico de estado de usuarios
  const userStatusData = [
    { name: 'Activos', value: activeUsers, color: '#10f94e' },
    { name: 'Inactivos', value: inactiveUsers, color: '#6b7280' },
    { name: 'Suspendidos', value: suspendedUsers, color: '#ff3b5c' },
  ];

  // Mostrar loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Resumen general del gimnasio</p>
        </div>
        {isAdmin && (
          <div className="w-full sm:w-64">
            <Select value={selectedGymId} onValueChange={setSelectedGymId}>
              <SelectTrigger>
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Todos los gimnasios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los gimnasios</SelectItem>
                {availableGyms.filter(Boolean).map((gym: any) => (
                  <SelectItem key={gym.id} value={gym.id}>{gym.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Bienvenida */}
      {statsError ? (
        <Alert className="border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertDescription className="text-foreground/80 ml-2">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">
                ⚠️ No se pudo conectar con Supabase
              </p>
              <p className="text-sm">
                {statsError?.message || 'Error de conexión'}. El sistema está mostrando <strong>datos de demostración</strong>.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <a 
                  href="/test-supabase" 
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  🧪 Ejecutar pruebas de conexión <ExternalLink className="h-3 w-3 inline" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                📖 Consulta <code className="bg-muted px-1 py-0.5 rounded">ARQUITECTURA_SUPABASE.md</code> para instrucciones de configuración
              </p>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-primary/30 bg-primary/5">
          <Database className="h-5 w-5 text-primary" />
          <AlertDescription className="text-foreground/80 ml-2">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                ✅ ¡Bienvenido, {user?.name}!
              </p>
              <p className="text-sm">
                Sistema conectado correctamente a Supabase. Mostrando datos en tiempo real.
                {selectedGymId && availableGyms.find((g: any) => g.id === selectedGymId)?.name && (
                  <span className="font-semibold ml-1">
                    — {availableGyms.find((g: any) => g.id === selectedGymId)?.name}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-muted-foreground">
                  📊 <strong>{totalUsers}</strong> usuarios registrados
                </span>
                <span className="text-xs text-muted-foreground">
                  💰 <strong>Bs {monthlyRevenue.toLocaleString()}</strong> cobrados
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Usuarios"
          value={totalUsers}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          color="blue"
        />
        <StatCard
          title="Usuarios Activos"
          value={activeUsers}
          icon={UserCheck}
          trend={{ value: 8, isPositive: true }}
          color="green"
        />
        <StatCard
          title="Usuarios Inactivos"
          value={inactiveUsers + suspendedUsers}
          icon={UserX}
          trend={{ value: 15, isPositive: false }}
          color="red"
        />
        <StatCard
          title="Ingresos del Mes"
          value={`Bs ${monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 6, isPositive: true }}
          color="green"
        />
        <StatCard
          title="Asistencia Hoy"
          value={todayAttendance}
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="Personal Activo"
          value={totalStaff}
          icon={UserCog}
          color="blue"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Ingresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="month" stroke="#9494a8" />
                <YAxis stroke="#9494a8" />
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
                  dataKey="revenue" 
                  stroke="#10f94e" 
                  strokeWidth={3}
                  dot={{ fill: '#10f94e', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Asistencia Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="day" stroke="#9494a8" />
                <YAxis stroke="#9494a8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a24', 
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                    color: '#f0f0f5'
                  }}
                />
                <Bar dataKey="count" fill="#10f94e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Status Pie Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Estado de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a24', 
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                    color: '#f0f0f5'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payments Summary */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Pagos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoicesData?.filter((inv: any) => inv.status === 'Pagada').slice(0, 6).map((inv: any) => {
                const paymentUser = users?.find((u: any) => u.id === inv.user_id);
                return (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{paymentUser?.name || 'Usuario'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.paid_at || inv.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-primary font-semibold">
                        Bs {inv.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{inv.method}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}