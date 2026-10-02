import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Calendar, Activity, Dumbbell, User as UserIcon, CreditCard, TrendingUp, FileText, Loader2, AlertCircle, Printer, Plus, Users, LogIn, LogOut, Trash2, CheckCircle, Shield, MapPin, HeartPulse, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth } from 'date-fns';
import { useUser, useAssignTrainer, useTrainers } from '../hooks/useUsers';
import { useUserInvoices } from '../hooks/useInvoices';
import { MemberPaymentsTab } from '../components/member/MemberPaymentsTab';
import { MemberProfileHeader, type ProfileTab } from '../components/member/MemberProfileHeader';
import { MemberInfoTab } from '../components/member/MemberInfoTab';
import { MemberAttendanceTab } from '../components/member/MemberAttendanceTab';
import { CollectPaymentDialog } from '../components/billing/CollectPaymentDialog';
import { UserFormDialog } from '../components/UserFormDialog';
import { useMemberAccount } from '../hooks/useMemberAccount';
import { useMemberAttendance } from '../hooks/useAttendance';
import { groupVisits, summarizeAttendance } from '../lib/attendanceStats';
import type { InvoiceRow } from '../lib/billing';
import { useRoutines, useRoutineAssignments, useAssignRoutine } from '../hooks/useRoutines';
import { usePhysicalProgress, useCreatePhysicalProgress, useDeletePhysicalProgress } from '../hooks/usePhysicalProgress';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isAssignRoutineDialogOpen, setIsAssignRoutineDialogOpen] = useState(false);
  const [isAssignTrainerDialogOpen, setIsAssignTrainerDialogOpen] = useState(false);
  const [isCreatePaymentDialogOpen, setIsCreatePaymentDialogOpen] = useState(false);
  const [isAddProgressDialogOpen, setIsAddProgressDialogOpen] = useState(false);
  const [isGenerateInvoiceDialogOpen, setIsGenerateInvoiceDialogOpen] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState('');
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  
  const [progressWeight, setProgressWeight] = useState('');
  const [progressBodyFat, setProgressBodyFat] = useState('');
  const [progressMuscleMass, setProgressMuscleMass] = useState('');
  const [progressDate, setProgressDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressNotes, setProgressNotes] = useState('');
  
  // Usar React Query en lugar de mockData
  const { data: user, isLoading, error } = useUser(id || '');
  const queryClient = useQueryClient();
  
  // Obtener pagos reales del usuario
  const { data: userPayments, isLoading: loadingPayments } = useUserInvoices(id || '');
  
  // Obtener rutinas disponibles y asignaciones del usuario
  const { data: availableRoutines, isLoading: loadingRoutines } = useRoutines();
  const { data: userRoutineAssignments, isLoading: loadingAssignments } = useRoutineAssignments(id);
  const assignRoutineMutation = useAssignRoutine();
  
  // Obtener entrenadores disponibles
  const { data: trainers, isLoading: loadingTrainers } = useTrainers();
  const assignTrainerMutation = useAssignTrainer();
  
  // Hook para crear pagos
  
  // Obtener usuario actual del staff usando el contexto de autenticación
  const { user: currentUser } = useAuth();
  
  // Pestaña activa en la URL (?tab=pagos) para poder enlazar y volver con "atrás"
  const [params, setParams] = useSearchParams();
  const TABS: ProfileTab[] = ['info', 'pagos', 'asistencia', 'rutinas', 'progreso'];
  const tab: ProfileTab = TABS.includes(params.get('tab') as ProfileTab) ? (params.get('tab') as ProfileTab) : 'info';
  const setTab = (t: ProfileTab) => {
    const next = new URLSearchParams(params);
    if (t === 'info') next.delete('tab');
    else next.set('tab', t);
    setParams(next, { replace: true });
  };
  const [collectOpen, setCollectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Facturación y asistencia (prioridades del perfil)
  const invoices = (userPayments ?? []) as InvoiceRow[];
  const account = useMemberAccount(id, invoices);
  const { data: attendanceRecords, isLoading: loadingVisits } = useMemberAttendance(id);
  const visits = useMemo(() => groupVisits(attendanceRecords ?? []), [attendanceRecords]);
  const attendanceSummary = useMemo(() => summarizeAttendance(visits, account.today), [visits, account.today]);
  
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
  const userProgress = userPhysicalProgress || [];

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
      <MemberProfileHeader
        user={user}
        account={account}
        attendance={{ summary: attendanceSummary, visits, loading: loadingVisits }}
        onBack={() => navigate('/usuarios')}
        onTab={setTab}
        onCollect={() => setCollectOpen(true)}
        onEdit={() => setEditOpen(true)}
        onAssignRoutine={() => setIsAssignRoutineDialogOpen(true)}
        onAssignTrainer={() => setIsAssignTrainerDialogOpen(true)}
        onAddMeasurement={() => { setTab('progreso'); setIsAddProgressDialogOpen(true); }}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProfileTab)} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto lg:w-auto">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="pagos" className="gap-1.5">
            Pagos
            {account.state === 'overdue' && <span className="h-2 w-2 rounded-full bg-[#ff3b5c]" aria-label="con deuda" />}
            {account.state === 'due-soon' && <span className="h-2 w-2 rounded-full bg-[#eab308]" aria-label="vence pronto" />}
          </TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="rutinas">Rutinas</TabsTrigger>
          <TabsTrigger value="progreso">Progreso físico</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <MemberInfoTab
            user={user}
            routines={userRoutineAssignments as any[] | undefined}
            loadingRoutines={loadingAssignments}
            onEdit={() => setEditOpen(true)}
            onAssignTrainer={() => setIsAssignTrainerDialogOpen(true)}
            onRemoveTrainer={() => id && assignTrainerMutation.mutate({ userId: id, trainerId: null })}
            onOpenRoutines={() => setTab('rutinas')}
          />
        </TabsContent>

        <TabsContent value="pagos">
          <MemberPaymentsTab account={account} invoices={invoices} loading={loadingPayments} />
        </TabsContent>

        <TabsContent value="asistencia">
          <MemberAttendanceTab visits={visits} summary={attendanceSummary} loading={loadingVisits} today={account.today} />
        </TabsContent>

        <TabsContent value="rutinas" className="space-y-6">
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

        <TabsContent value="progreso" className="space-y-6">
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
      </Tabs>

      {account.member && (
        <CollectPaymentDialog
          open={collectOpen}
          onOpenChange={setCollectOpen}
          members={[account.member]}
          invoices={invoices}
          initialUserId={account.member.id}
        />
      )}
      <UserFormDialog open={editOpen} onOpenChange={setEditOpen} user={user} />

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
