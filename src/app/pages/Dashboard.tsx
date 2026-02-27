import { Users, UserCheck, UserX, DollarSign, UserCog, Activity, Loader2, AlertCircle } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { monthlyRevenueData, attendanceData } from '../lib/mockData';
import { useAuth } from '../contexts/AuthContext';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Database, ExternalLink } from 'lucide-react';
import { useDashboardStats } from '../hooks/useStats';
import { useUsers } from '../hooks/useUsers';
import { usePayments } from '../hooks/usePayments';

export function Dashboard() {
  const { user } = useAuth();
  
  // Usar React Query para obtener datos reales
  const { data: stats, isLoading: loadingStats, error: statsError } = useDashboardStats();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: payments, isLoading: loadingPayments } = usePayments();

  const isLoading = loadingStats || loadingUsers || loadingPayments;

  // Calcular estadísticas desde los datos reales
  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter((u: any) => u.status === 'Activo').length || 0;
  const inactiveUsers = users?.filter((u: any) => u.status === 'Inactivo').length || 0;
  const suspendedUsers = users?.filter((u: any) => u.status === 'Suspendido').length || 0;
  
  const monthlyRevenue = payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
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
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del gimnasio</p>
      </div>

      {/* Bienvenida */}
      {statsError ? (
        <Alert className="border-[#ff3b5c]/30 bg-[#ff3b5c]/5">
          <AlertCircle className="h-5 w-5 text-[#ff3b5c]" />
          <AlertDescription className="text-gray-300 ml-2">
            <div className="space-y-2">
              <p className="font-semibold text-white">
                ⚠️ No se pudo conectar con Supabase
              </p>
              <p className="text-sm">
                {statsError?.message || 'Error de conexión'}. El sistema está mostrando <strong>datos de demostración</strong>.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <a 
                  href="/test-supabase" 
                  className="text-[#10f94e] hover:underline inline-flex items-center gap-1 text-sm"
                >
                  🧪 Ejecutar pruebas de conexión <ExternalLink className="h-3 w-3 inline" />
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                📖 Consulta <code className="bg-gray-800 px-1 py-0.5 rounded">ARQUITECTURA_SUPABASE.md</code> para instrucciones de configuración
              </p>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-[#10f94e]/30 bg-[#10f94e]/5">
          <Database className="h-5 w-5 text-[#10f94e]" />
          <AlertDescription className="text-gray-300 ml-2">
            <div className="space-y-1">
              <p className="font-semibold text-white">
                ✅ ¡Bienvenido, {user?.name}!
              </p>
              <p className="text-sm">
                Sistema conectado correctamente a Supabase. Mostrando datos en tiempo real.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-gray-400">
                  📊 <strong>{totalUsers}</strong> usuarios registrados
                </span>
                <span className="text-xs text-gray-400">
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
              {payments?.slice(0, 6).map((payment: any) => {
                const paymentUser = users?.find((u: any) => u.id === payment.user_id);
                return (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{paymentUser?.name || 'Usuario'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#10f94e] font-semibold">
                        Bs {payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{payment.method}</p>
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