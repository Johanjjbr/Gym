import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Download, Calendar, Activity, Dumbbell, User as UserIcon, CreditCard, TrendingUp, FileText, Loader2, AlertCircle, Printer, Plus, Users, LogIn, LogOut, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useUser, useAssignTrainer, useTrainers } from '../hooks/useUsers';
import { useUserPayments, useCreatePayment } from '../hooks/usePayments';
import { useRoutines, useRoutineAssignments, useAssignRoutine } from '../hooks/useRoutines';
import { useUserAttendance } from '../hooks/useAttendance';
import { usePhysicalProgress, useCreatePhysicalProgress, useDeletePhysicalProgress } from '../hooks/usePhysicalProgress';
import { PrintPayment } from '../components/PrintPayment';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isAssignRoutineDialogOpen, setIsAssignRoutineDialogOpen] = useState(false);
  const [isAssignTrainerDialogOpen, setIsAssignTrainerDialogOpen] = useState(false);
  const [isCreatePaymentDialogOpen, setIsCreatePaymentDialogOpen] = useState(false);
  const [isAddProgressDialogOpen, setIsAddProgressDialogOpen] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState('');
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  
  // Estados para el formulario de pago
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNextDate, setPaymentNextDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  });
  const [paymentStatus, setPaymentStatus] = useState<'Pagado' | 'Pendiente' | 'Vencido'>('Pagado');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Pago Móvil'>('Efectivo');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Estados para el formulario de progreso físico
  const [progressWeight, setProgressWeight] = useState('');
  const [progressBodyFat, setProgressBodyFat] = useState('');
  const [progressMuscleMass, setProgressMuscleMass] = useState('');
  const [progressDate, setProgressDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressNotes, setProgressNotes] = useState('');
  
  // Usar React Query en lugar de mockData
  const { data: user, isLoading, error } = useUser(id || '');
  
  // Obtener pagos reales del usuario
  const { data: userPayments, isLoading: loadingPayments } = useUserPayments(id || '');
  
  // Obtener rutinas disponibles y asignaciones del usuario
  const { data: availableRoutines, isLoading: loadingRoutines } = useRoutines();
  const { data: userRoutineAssignments, isLoading: loadingAssignments } = useRoutineAssignments(id);
  const assignRoutineMutation = useAssignRoutine();
  
  // Obtener entrenadores disponibles
  const { data: trainers, isLoading: loadingTrainers } = useTrainers();
  const assignTrainerMutation = useAssignTrainer();
  
  // Hook para crear pagos
  const createPaymentMutation = useCreatePayment();
  
  // Obtener usuario actual del staff usando el contexto de autenticación
  const { user: currentUser } = useAuth();
  
  // Obtener asistencia del usuario
  const { data: userAttendanceData, isLoading: loadingAttendance } = useUserAttendance(id || '');
  
  // Obtener progreso físico del usuario
  const { data: userPhysicalProgress, isLoading: loadingPhysicalProgress } = usePhysicalProgress(id || '');
  const createPhysicalProgressMutation = useCreatePhysicalProgress();
  const deletePhysicalProgressMutation = useDeletePhysicalProgress();

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

  // Datos reales obtenidos de los hooks
  const userProgress = physicalProgress || [];
  const userInvoices: any[] = []; // Facturas se manejan desde payments

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
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(payments?.length || 0 + 1).padStart(3, '0')}`;
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
    
    if (!currentUser?.id) {
      toast.error('No se pudo identificar al usuario actual');
      return;
    }

    assignRoutineMutation.mutate({
      user_id: id || '',
      routine_id: selectedRoutineId,
      assigned_by: currentUser.id,
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

  const assignTrainer = () => {
    if (!id) {
      toast.error('ID de usuario no válido');
      return;
    }

    assignTrainerMutation.mutate({
      userId: id,
      trainerId: selectedTrainerId,
    }, {
      onSuccess: () => {
        setIsAssignTrainerDialogOpen(false);
        setSelectedTrainerId(null);
      },
    });
  };

  const createPayment = () => {
    if (!id || !paymentAmount || !paymentDate || !paymentNextDate || !paymentStatus || !paymentMethod) {
      toast.error('Por favor completa todos los campos del pago');
      return;
    }

    createPaymentMutation.mutate({
      user_id: id,
      amount: parseFloat(paymentAmount),
      date: paymentDate,
      next_payment: paymentNextDate,
      status: paymentStatus,
      method: paymentMethod,
      reference: paymentReference,
      notes: paymentNotes,
    }, {
      onSuccess: () => {
        setIsCreatePaymentDialogOpen(false);
        setPaymentAmount('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentNextDate(() => {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return nextMonth.toISOString().split('T')[0];
        });
        setPaymentStatus('Pagado');
        setPaymentMethod('Efectivo');
        setPaymentReference('');
        setPaymentNotes('');
      },
    });
  };
  
  const createProgress = () => {
    if (!id || !progressWeight) {
      toast.error('El peso es obligatorio');
      return;
    }

    createPhysicalProgressMutation.mutate({
      user_id: id,
      weight: parseFloat(progressWeight),
      body_fat: progressBodyFat ? parseFloat(progressBodyFat) : undefined,
      muscle_mass: progressMuscleMass ? parseFloat(progressMuscleMass) : undefined,
      date: progressDate,
      notes: progressNotes || undefined,
    }, {
      onSuccess: () => {
        setIsAddProgressDialogOpen(false);
        setProgressWeight('');
        setProgressBodyFat('');
        setProgressMuscleMass('');
        setProgressDate(new Date().toISOString().split('T')[0]);
        setProgressNotes('');
      },
    });
  };
  
  const deleteProgress = (progressId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      return;
    }
    
    deletePhysicalProgressMutation.mutate(progressId);
  };

  // Prepare chart data - usar datos reales
  const weightChartData = (userPhysicalProgress || []).map((p: any) => ({
    date: new Date(p.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    peso: p.weight,
    grasa: p.body_fat || 0,
    musculo: p.muscle_mass || 0,
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

            {/* Trainer Assignment Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Entrenador Asignado
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary/10"
                    onClick={() => setIsAssignTrainerDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {user.trainer_name ? 'Cambiar' : 'Asignar'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.trainer_name ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Dumbbell className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-lg mb-1">{user.trainer_name}</p>
                          <p className="text-sm text-muted-foreground">Entrenador Personal</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-[#ff3b5c] text-[#ff3b5c] hover:bg-[#ff3b5c]/10"
                      onClick={() => {
                        if (!id) return;
                        assignTrainerMutation.mutate({
                          userId: id,
                          trainerId: null,
                        });
                      }}
                    >
                      Cambiar a Entrenamiento Libre
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-3 rounded-lg bg-muted/50 w-fit mx-auto mb-3">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-1">Entrenamiento Libre</p>
                    <p className="text-sm text-muted-foreground">Sin entrenador asignado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rutinas Asignadas */}
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

            {/* Último Pago */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Último Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 text-[#10f94e] animate-spin mx-auto" />
                  </div>
                ) : userPayments && userPayments.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-4 mb-2">
                        <p className="text-2xl text-primary">Bs {userPayments[0].amount.toLocaleString()}</p>
                        <Badge variant="outline" className={getPaymentStatusColor(userPayments[0].status)}>
                          {userPayments[0].status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Fecha</p>
                          <p>{new Date(userPayments[0].date).toLocaleDateString('es-ES')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Método</p>
                          <p>{userPayments[0].method}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay pagos registrados</p>
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
              {loadingAttendance ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-[#10f94e] animate-spin mx-auto" />
                </div>
              ) : userAttendanceData && userAttendanceData.length > 0 ? (
                <div className="space-y-3">
                  {userAttendanceData.map((attendance) => (
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
              <CardTitle className="flex items-center justify-between">
                <span>Registro de Mediciones</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary/10"
                  onClick={() => setIsAddProgressDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Medición
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPhysicalProgress ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-[#10f94e] animate-spin mx-auto" />
                </div>
              ) : userPhysicalProgress && userPhysicalProgress.length > 0 ? (
                <div className="space-y-4">
                  {userPhysicalProgress.map((progress: any) => (
                    <div
                      key={progress.id}
                      className="flex items-start justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="grid grid-cols-4 gap-4 flex-1">
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
                          <p>{progress.body_fat ? `${progress.body_fat}%` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Músculo</p>
                          <p>{progress.muscle_mass ? `${progress.muscle_mass} kg` : 'N/A'}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#ff3b5c] hover:text-[#ff3b5c] hover:bg-[#ff3b5c]/10"
                        onClick={() => deleteProgress(progress.id)}
                        disabled={deletePhysicalProgressMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Historial de Pagos
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary/10"
                  onClick={() => setIsCreatePaymentDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Registrar Pago
                </Button>
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

      {/* Assign Trainer Dialog */}
      <Dialog open={isAssignTrainerDialogOpen} onOpenChange={setIsAssignTrainerDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Entrenador</DialogTitle>
            <DialogDescription>
              Asignar un entrenador a {user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Entrenador</Label>
              {loadingTrainers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando entrenadores...</span>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedTrainerId || 'libre'}
                    onValueChange={(value) => setSelectedTrainerId(value === 'libre' ? null : value)}
                    className="bg-input border-border"
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecciona un entrenador" />
                    </SelectTrigger>
                    <SelectContent className="bg-input border-border">
                      <SelectItem value="libre">Entrenamiento Libre</SelectItem>
                      {trainers && trainers.length > 0 ? (
                        trainers.map((trainer: any) => (
                          <SelectItem key={trainer.id} value={trainer.id}>
                            {trainer.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-trainers" disabled>
                          No hay entrenadores disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {trainers && trainers.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      No hay entrenadores activos. Ve a la sección de Personal para crear uno.
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAssignTrainerDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={assignTrainer}
                disabled={assignTrainerMutation.isPending || loadingTrainers}
              >
                {assignTrainerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Asignar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Dialog */}
      <Dialog open={isCreatePaymentDialogOpen} onOpenChange={setIsCreatePaymentDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registrar un nuevo pago para {user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monto (Bs)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="450"
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Fecha de Pago</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Próximo Pago</Label>
              <Input
                type="date"
                value={paymentNextDate}
                onChange={(e) => setPaymentNextDate(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={paymentStatus}
                onValueChange={setPaymentStatus}
                className="bg-input border-border"
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent className="bg-input border-border">
                  <SelectItem value="Pagado">Pagado</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método de Pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="bg-input border-border"
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecciona un método" />
                </SelectTrigger>
                <SelectContent className="bg-input border-border">
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia (Opcional)</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Nro. de transferencia, etc."
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Notas (Opcional)</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Información adicional..."
                className="bg-input border-border"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreatePaymentDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={createPayment}
                disabled={createPaymentMutation.isPending}
              >
                {createPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Pago
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Physical Progress Dialog */}
      <Dialog open={isAddProgressDialogOpen} onOpenChange={setIsAddProgressDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Medición</DialogTitle>
            <DialogDescription>
              Registrar nuevas medidas físicas de {user.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Peso (kg) *</Label>
              <Input
                type="number"
                step="0.1"
                value={progressWeight}
                onChange={(e) => setProgressWeight(e.target.value)}
                placeholder="75.5"
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Porcentaje de Grasa Corporal (%) <span className="text-muted-foreground">(Opcional)</span></Label>
              <Input
                type="number"
                step="0.1"
                value={progressBodyFat}
                onChange={(e) => setProgressBodyFat(e.target.value)}
                placeholder="15.5"
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Masa Muscular (kg) <span className="text-muted-foreground">(Opcional)</span></Label>
              <Input
                type="number"
                step="0.1"
                value={progressMuscleMass}
                onChange={(e) => setProgressMuscleMass(e.target.value)}
                placeholder="55.5"
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Fecha de Medición</Label>
              <Input
                type="date"
                value={progressDate}
                onChange={(e) => setProgressDate(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div>
              <Label>Notas (Opcional)</Label>
              <Textarea
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Observaciones, condiciones físicas, etc..."
                className="bg-input border-border"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddProgressDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={createProgress}
                disabled={createPhysicalProgressMutation.isPending || !progressWeight}
              >
                {createPhysicalProgressMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Medición
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}