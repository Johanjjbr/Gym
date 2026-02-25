import { Users, UserCheck, UserX, DollarSign, UserCog, Activity } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { mockDashboardStats, monthlyRevenueData, attendanceData, userStatusData, mockAttendance } from '../lib/mockData';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del gimnasio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Usuarios"
          value={mockDashboardStats.totalUsers}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          color="blue"
        />
        <StatCard
          title="Usuarios Activos"
          value={mockDashboardStats.activeUsers}
          icon={UserCheck}
          trend={{ value: 8, isPositive: true }}
          color="green"
        />
        <StatCard
          title="Usuarios Morosos"
          value={mockDashboardStats.delinquentUsers}
          icon={UserX}
          trend={{ value: 15, isPositive: false }}
          color="red"
        />
        <StatCard
          title="Ingresos del Mes"
          value={`Bs ${mockDashboardStats.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 6, isPositive: true }}
          color="green"
        />
        <StatCard
          title="Asistencia Hoy"
          value={mockDashboardStats.todayAttendance}
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="Personal Activo"
          value={mockDashboardStats.totalStaff}
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

        {/* Recent Attendance */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Asistencia Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAttendance.slice(0, 6).map((attendance) => (
                <div key={attendance.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm">{attendance.userName}</p>
                    <p className="text-xs text-muted-foreground">{attendance.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-primary">{attendance.time}</p>
                    <p className="text-xs text-muted-foreground">{attendance.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
