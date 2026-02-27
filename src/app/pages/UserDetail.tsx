import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Download, Calendar, Activity, Dumbbell, User as UserIcon, CreditCard, TrendingUp, FileText, Loader2, AlertCircle, Printer, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { mockAttendance, mockPhysicalProgress, mockInvoices } from '../lib/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useUser } from '../hooks/useUsers';
import { useUserPayments } from '../hooks/usePayments';
import { useRoutines, useRoutineAssignments, useAssignRoutine } from '../hooks/useRoutines';
import { PrintPayment } from '../components/PrintPayment';
import { auth } from '../lib/api';

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isAssignRoutineDialogOpen, setIsAssignRoutineDialogOpen] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  
  // Usar React Query en lugar de mockData
  const { data: user, isLoading, error } = useUser(id || '');
  
  // Obtener pagos reales del usuario
  const { data: userPayments, isLoading: loadingPayments } = useUserPayments(id || '');
  
  // Obtener rutinas disponibles y asignaciones del usuario
  const { data: availableRoutines, isLoading: loadingRoutines } = useRoutines();
  const { data: userRoutineAssignments, isLoading: loadingAssignments } = useRoutineAssignments(id);
  const assignRoutineMutation = useAssignRoutine();
  
  // Obtener usuario actual del staff
  const currentStaff = auth.getCurrentUser();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  // Error o usuario no encontrado
  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-[#ff3b5c]" />
        <h2 className="text-2xl">Usuario no encontrado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error 
            ? 'Ocurrió un error al cargar los datos del usuario. Verifica tu conexión a Supabase.' 
            : 'No se encontró un usuario con este ID en la base de datos.'}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/usuarios')} variant="outline">
            Volver a Usuarios
          </Button>
          {error && (
            <Button onClick={() => navigate('/test-supabase')} className="bg-[#10f94e] text-black hover:bg-[#0ed145]">
              Probar Conexión
            </Button>
          )}
        </div>
      </div>
    );
  }

  const userAttendance = mockAttendance.filter(a => a.userId === id);
  const userProgress = mockPhysicalProgress.filter(p => p.userId === id);
  const userInvoices = mockInvoices.filter(i => i.userId === id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Activo':
        return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Moroso':
        return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Pagado':
        return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Pendiente':
        return 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30';
      case 'Vencido':
        return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const generateInvoice = (payment: any) => {
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(mockInvoices.length + 1).padStart(3, '0')}`;
    toast.success('Factura generada exitosamente', {
      description: `Factura ${invoiceNumber} lista para descargar`,
    });
    setIsInvoiceDialogOpen(false);
  };

  const assignRoutine = () => {
    if (!selectedRoutineId || !startDate) {
      toast.error('Por favor selecciona una rutina y fecha de inicio');
      return;
    }
    
    if (!currentStaff?.id) {
      toast.error('No se pudo identificar al usuario actual');
      return;
    }

    assignRoutineMutation.mutate({
      user_id: id || '',
      routine_id: selectedRoutineId,
      assigned_by: currentStaff.id,
      start_date: startDate,
      end_date: endDate || undefined,
      notes: assignmentNotes || undefined,
    }, {
      onSuccess: () => {
        setIsAssignRoutineDialogOpen(false);
        setSelectedRoutineId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setAssignmentNotes('');
      },
    });
  };

  // Prepare chart data
  const weightChartData = userProgress.map(p => ({
    date: new Date(p.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    peso: p.weight,
    grasa: p.bodyFat,
    musculo: p.muscleMass,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/usuarios')}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl mb-2">{user.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>ID: {user.id}</span>
              {user.email && (
                <>
                  <span>•</span>
                  <span>{user.email}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setIsInvoiceDialogOpen(true)}
        >
          <Download className="w-4 h-4 mr-2" />
          Generar Factura
        </Button>
      </div>

      {/* User Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <UserIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant="outline" className={getStatusColor(user.status)}>
                  {user.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <CreditCard className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan Actual</p>
                <p className="text-lg">{user.plan || 'No definido'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Activity className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IMC</p>
                <p className="text-2xl text-primary">
                  {user.imc ? user.imc.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximo Pago</p>
                <p className="text-lg">
                  {user.next_payment 
                    ? new Date(user.next_payment).toLocaleDateString('es-ES')
                    : 'No definido'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with Details */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
          <TabsTrigger value="progress">Progreso Físico</TabsTrigger>
          <TabsTrigger value="routines">Rutinas</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Teléfono</p>
                    <p>{user.phone || 'No definido'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="text-sm">{user.email || 'No definido'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Peso</p>
                    <p>{user.weight ? `${user.weight} kg` : 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Estatura</p>
                    <p>{user.height ? `${user.height} cm` : 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fecha de Inicio</p>
                    <p>
                      {user.start_date 
                        ? new Date(user.start_date).toLocaleDateString('es-ES')
                        : 'No definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Miembro #</p>
                    <p className="text-primary">{user.member_number || user.id || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trainer Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5" />
                  Rutinas Asignadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAssignments ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 text-[#10f94e] animate-spin mx-auto" />
                  </div>
                ) : userRoutineAssignments && userRoutineAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {userRoutineAssignments.slice(0, 2).map((assignment: any) => (
                      <div key={assignment.id} className="p-3 bg-muted rounded-lg">
                        <p className="mb-1">{assignment.routine_templates?.name || 'Rutina'}</p>
                        <p className="text-sm text-muted-foreground">
                          Asignada por: {assignment.staff?.name || 'Entrenador'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Dumbbell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay rutinas asignadas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Historial de Asistencia</CardTitle>
            </CardHeader>
            <CardContent>
              {userAttendance.length > 0 ? (
                <div className="space-y-3">
                  {userAttendance.map((attendance) => (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p>{new Date(attendance.date).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</p>
                          <p className="text-sm text-muted-foreground">{attendance.time}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                        {attendance.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No hay registros de asistencia</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Evolución de Peso y Composición
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weightChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weightChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="peso" 
                      stroke="#10f94e" 
                      strokeWidth={2}
                      name="Peso (kg)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="grasa" 
                      stroke="#ff3b5c" 
                      strokeWidth={2}
                      name="Grasa (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="musculo" 
                      stroke="#00d4ff" 
                      strokeWidth={2}
                      name="Músculo (kg)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No hay datos de progreso físico</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Registro de Mediciones</CardTitle>
            </CardHeader>
            <CardContent>
              {userProgress.length > 0 ? (
                <div className="space-y-4">
                  {userProgress.map((progress) => (
                    <div
                      key={progress.id}
                      className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fecha</p>
                        <p>{new Date(progress.date).toLocaleDateString('es-ES')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Peso</p>
                        <p className="text-primary">{progress.weight} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Grasa</p>
                        <p>{progress.bodyFat}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Músculo</p>
                        <p>{progress.muscleMass} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay registros de mediciones</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routines Tab */}
        <TabsContent value="routines" className="space-y-6">
          {loadingAssignments ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Cargando rutinas...</p>
                </div>
              </CardContent>
            </Card>
          ) : userRoutineAssignments && userRoutineAssignments.length > 0 ? (
            userRoutineAssignments.map((assignment: any) => (
              <Card key={assignment.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Dumbbell className="w-5 h-5" />
                      {assignment.routine_templates?.name || 'Rutina'}
                    </CardTitle>
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                      {assignment.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{assignment.routine_templates?.description || ''}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Asignada por</p>
                      <p>{assignment.staff?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Fecha de Inicio</p>
                      <p>{assignment.start_date ? new Date(assignment.start_date).toLocaleDateString('es-ES') : 'N/A'}</p>
                    </div>
                  </div>
                  
                  {assignment.routine_templates?.exercise_templates && assignment.routine_templates.exercise_templates.length > 0 && (
                    <div>
                      <h4 className="mb-3">Ejercicios</h4>
                      <div className="space-y-3">
                        {assignment.routine_templates.exercise_templates.map((exercise: any) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex-1">
                              <p>{exercise.name}</p>
                              {exercise.notes && (
                                <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-primary">{exercise.sets} x {exercise.reps}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Dumbbell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No hay rutinas asignadas</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setIsAssignRoutineDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Asignar Rutina
          </Button>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Historial de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-[#10f94e] animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Cargando pagos...</p>
                </div>
              ) : userPayments && userPayments.length > 0 ? (
                <div className="space-y-3">
                  {userPayments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <p className="text-2xl text-primary">Bs {payment.amount.toLocaleString()}</p>
                          <Badge variant="outline" className={getPaymentStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Fecha de Pago</p>
                            <p>{new Date(payment.date).toLocaleDateString('es-ES')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Método</p>
                            <p>{payment.method}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Próximo Pago</p>
                            <p>{new Date(payment.next_payment).toLocaleDateString('es-ES')}</p>
                          </div>
                        </div>
                      </div>
                      <PrintPayment
                        payment={payment}
                        userName={user.name}
                        userMemberNumber={user.member_number}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No hay registros de pagos</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Facturas Generadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userInvoices.length > 0 ? (
                <div className="space-y-3">
                  {userInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <p className="text-primary">{invoice.invoiceNumber}</p>
                          <Badge variant="outline" className="bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30">
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{invoice.concept}</p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Fecha</p>
                            <p>{new Date(invoice.date).toLocaleDateString('es-ES')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Monto</p>
                            <p className="text-lg">Bs {invoice.amount.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay facturas generadas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Factura</DialogTitle>
            <DialogDescription>
              Crear una nueva factura para {user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Concepto</Label>
              <Input
                placeholder="Ej: Mensualidad Premium - Marzo 2026"
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Monto (Bs)</Label>
              <Input
                type="number"
                placeholder="450"
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Notas (Opcional)</Label>
              <Textarea
                placeholder="Información adicional..."
                className="bg-input border-border"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsInvoiceDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => generateInvoice(user)}
              >
                <Download className="w-4 h-4 mr-2" />
                Generar y Descargar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Routine Dialog */}
      <Dialog open={isAssignRoutineDialogOpen} onOpenChange={setIsAssignRoutineDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Rutina</DialogTitle>
            <DialogDescription>
              Asignar una rutina a {user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rutina</Label>
              <Select
                value={selectedRoutineId}
                onValueChange={setSelectedRoutineId}
                className="bg-input border-border"
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecciona una rutina" />
                </SelectTrigger>
                <SelectContent className="bg-input border-border">
                  {availableRoutines && availableRoutines.length > 0 ? (
                    availableRoutines.map((routine: any) => (
                      <SelectItem key={routine.id} value={routine.id}>
                        {routine.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No hay rutinas disponibles</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de Inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Fecha de Fin (Opcional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Notas (Opcional)</Label>
              <Textarea
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Información adicional..."
                className="bg-input border-border"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAssignRoutineDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={assignRoutine}
              >
                <Plus className="w-4 h-4 mr-2" />
                Asignar Rutina
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}