/**
 * Página de Pagos con filtros avanzados, impresión y vista de usuarios morosos
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, DollarSign, Loader2, AlertCircle, Eye, Calendar, Filter, Printer, X, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema, type PaymentFormData } from '../lib/validations';
import { usePayments, useCreatePayment } from '../hooks/usePayments';
import { useUsers } from '../hooks/useUsers';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { addMonths, format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';
import { PrintPayment } from '../components/PrintPayment';
import { useNavigate } from 'react-router';

type FilterType = 'all' | 'paid' | 'pending' | 'overdue';
type TimeFilter = 'all' | 'thisMonth' | 'lastMonth';

export function Payments() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showOverdueUsers, setShowOverdueUsers] = useState(false);

  // React Query hooks
  const { data: payments, isLoading: loadingPayments, error: paymentsError } = usePayments();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const createPayment = useCreatePayment();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: 'Pagado',
      method: 'Efectivo',
    },
  });

  const watchDate = watch('date');
  const watchUserId = watch('user_id');

  // Calcular próximo pago automáticamente (1 mes después)
  useEffect(() => {
    if (watchDate) {
      const nextPaymentDate = addMonths(new Date(watchDate), 1);
      setValue('next_payment', format(nextPaymentDate, 'yyyy-MM-dd'));
    }
  }, [watchDate, setValue]);

  // Obtener tipo de membresía del usuario seleccionado
  useEffect(() => {
    if (watchUserId && users) {
      const user = users.find((u: any) => u.id === watchUserId);
      if (user) {
        setSelectedUser(user.plan || user.membership_type || 'Mensual');
        // Establecer monto sugerido según membresía
        const amounts: Record<string, number> = {
          'Mensual': 300,
          'Trimestral': 800,
          'Semestral': 1500,
          'Anual': 2800,
        };
        const planKey = user.plan || user.membership_type || 'Mensual';
        const suggestedAmount = amounts[planKey] || 300;
        setValue('amount', suggestedAmount);
      }
    }
  }, [watchUserId, users, setValue]);

  // Usuarios morosos (usuarios cuyo next_payment es anterior a hoy)
  const overdueUsers = useMemo(() => {
    if (!users) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return users.filter((user: any) => {
      if (!user.next_payment) return false;
      const nextPayment = new Date(user.next_payment);
      nextPayment.setHours(0, 0, 0, 0);
      return nextPayment < today;
    });
  }, [users]);

  // Filtrado avanzado de pagos
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    return payments.filter((payment: any) => {
      // Filtro de búsqueda por nombre
      const user = users?.find((u: any) => u.id === payment.user_id);
      const matchesSearch = !searchTerm || user?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por estado
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'paid' && payment.status === 'Pagado') ||
        (filterStatus === 'pending' && payment.status === 'Pendiente') ||
        (filterStatus === 'overdue' && payment.status === 'Vencido');
      
      // Filtro por tiempo
      let matchesTime = true;
      if (timeFilter === 'thisMonth') {
        const paymentDate = parseISO(payment.date);
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        matchesTime = isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
      } else if (timeFilter === 'lastMonth') {
        const lastMonth = subMonths(new Date(), 1);
        const paymentDate = parseISO(payment.date);
        const monthStart = startOfMonth(lastMonth);
        const monthEnd = endOfMonth(lastMonth);
        matchesTime = isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
      }
      
      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [payments, users, searchTerm, filterStatus, timeFilter]);

  // Calcular totales con filtros aplicados
  const filteredTotals = useMemo(() => {
    const total = filteredPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const paid = filteredPayments
      .filter((p: any) => p.status === 'Pagado')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const overdue = filteredPayments
      .filter((p: any) => p.status === 'Vencido')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    
    return { total, paid, overdue };
  }, [filteredPayments]);

  // Totales generales (sin filtros)
  const generalTotals = useMemo(() => {
    if (!payments) return { total: 0, paid: 0, overdue: 0 };
    
    const total = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const paid = payments
      .filter((p: any) => p.status === 'Pagado')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const overdue = payments
      .filter((p: any) => p.status === 'Vencido')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    
    return { total, paid, overdue };
  }, [payments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pagado':
        return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Pendiente':
        return 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30';
      case 'Vencido':
        return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      case 'Activo':
        return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Moroso':
        return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getUserName = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    return user?.name || 'Usuario desconocido';
  };

  const getUserMemberNumber = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    return user?.member_number || undefined;
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await createPayment.mutateAsync(data);
      reset();
      setIsRegisterOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setTimeFilter('all');
    setSearchTerm('');
  };

  const hasActiveFilters = filterStatus !== 'all' || timeFilter !== 'all' || searchTerm !== '';

  // Estado de carga
  if (loadingPayments || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando pagos...</p>
        </div>
      </div>
    );
  }

  // Estado de error
  if (paymentsError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl mb-2">Control de Pagos</h1>
            <p className="text-muted-foreground">Gestión de mensualidades y cobros</p>
          </div>
        </div>

        <Card className="bg-card border-[#ff3b5c]/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#ff3b5c] mt-0.5" />
              <div>
                <p className="font-semibold text-[#ff3b5c]">Error al cargar pagos</p>
                <p className="text-sm text-gray-400 mt-1">{paymentsError.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Control de Pagos</h1>
          <p className="text-muted-foreground">Gestión de mensualidades y cobros</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={`border-[#ff3b5c] text-[#ff3b5c] hover:bg-[#ff3b5c]/10 ${showOverdueUsers ? 'bg-[#ff3b5c]/10' : ''}`}
            onClick={() => setShowOverdueUsers(!showOverdueUsers)}
          >
            <Users className="w-4 h-4 mr-2" />
            Usuarios Morosos ({overdueUsers.length})
          </Button>
          <Button
            className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-bold"
            onClick={() => setIsRegisterOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Pago
          </Button>
        </div>
      </div>

      {/* Vista de Usuarios Morosos */}
      {showOverdueUsers && (
        <Card className="bg-card border-[#ff3b5c]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#ff3b5c]">
              <AlertCircle className="w-5 h-5" />
              Usuarios con Pagos Vencidos ({overdueUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueUsers.length > 0 ? (
              <div className="space-y-3">
                {overdueUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-[#ff3b5c]/5 border border-[#ff3b5c]/20 rounded-lg hover:bg-[#ff3b5c]/10 transition-colors cursor-pointer"
                    onClick={() => navigate(`/usuarios/${user.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">{user.name}</p>
                        <Badge variant="outline" className={getStatusColor(user.status || 'Moroso')}>
                          {user.status || 'Moroso'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="block text-xs">Plan</span>
                          <span className="text-white">{user.plan || user.membership_type || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-xs">Teléfono</span>
                          <span className="text-white">{user.phone || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-xs">Vencimiento</span>
                          <span className="text-[#ff3b5c] font-semibold">
                            {user.next_payment 
                              ? new Date(user.next_payment).toLocaleDateString('es-ES')
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#10f94e] text-black hover:bg-[#0ed145]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setValue('user_id', user.id);
                        setIsRegisterOpen(true);
                      }}
                    >
                      Registrar Pago
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay usuarios con pagos vencidos</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#10f94e]/10">
                <DollarSign className="w-6 h-6 text-[#10f94e]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cobrado</p>
                <p className="text-2xl font-bold text-[#10f94e]">
                  Bs {(hasActiveFilters ? filteredTotals.paid : generalTotals.paid).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#ff3b5c]/10">
                <DollarSign className="w-6 h-6 text-[#ff3b5c]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-[#ff3b5c]">
                  Bs {(hasActiveFilters ? filteredTotals.overdue : generalTotals.overdue).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total General</p>
                <p className="text-2xl font-bold">
                  Bs {(hasActiveFilters ? filteredTotals.total : generalTotals.total).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre de usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>

            {/* Filtros de Estado y Tiempo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Estado</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('all')}
                    className={filterStatus === 'all' ? 'bg-[#10f94e] text-black hover:bg-[#0ed145]' : ''}
                  >
                    Todos
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'paid' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('paid')}
                    className={filterStatus === 'paid' ? 'bg-[#10f94e] text-black hover:bg-[#0ed145]' : ''}
                  >
                    Pagados
                  </Button>
                  <Button
                    size="sm"
                    variant={filterStatus === 'overdue' ? 'default' : 'outline'}
                    onClick={() => setFilterStatus('overdue')}
                    className={filterStatus === 'overdue' ? 'bg-[#ff3b5c] text-white hover:bg-[#ff3b5c]/90' : ''}
                  >
                    Vencidos
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Período</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={timeFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setTimeFilter('all')}
                    className={timeFilter === 'all' ? 'bg-[#10f94e] text-black hover:bg-[#0ed145]' : ''}
                  >
                    Todos
                  </Button>
                  <Button
                    size="sm"
                    variant={timeFilter === 'thisMonth' ? 'default' : 'outline'}
                    onClick={() => setTimeFilter('thisMonth')}
                    className={timeFilter === 'thisMonth' ? 'bg-[#10f94e] text-black hover:bg-[#0ed145]' : ''}
                  >
                    Este Mes
                  </Button>
                  <Button
                    size="sm"
                    variant={timeFilter === 'lastMonth' ? 'default' : 'outline'}
                    onClick={() => setTimeFilter('lastMonth')}
                    className={timeFilter === 'lastMonth' ? 'bg-[#10f94e] text-black hover:bg-[#0ed145]' : ''}
                  >
                    Mes Pasado
                  </Button>
                </div>
              </div>

              <div className="flex items-end">
                {hasActiveFilters && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpiar Filtros
                  </Button>
                )}
              </div>
            </div>

            {/* Indicador de filtros activos */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span>Mostrando {filteredPayments.length} de {payments?.length || 0} pagos</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Historial de Pagos ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? 'No se encontraron pagos con los filtros aplicados'
                  : 'No hay pagos registrados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground">Usuario</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Monto</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Fecha de Pago</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Próximo Pago</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Método</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Estado</th>
                    <th className="text-right py-3 px-4 text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment: any) => (
                    <tr
                      key={payment.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4">{getUserName(payment.user_id)}</td>
                      <td className="py-4 px-4">
                        <span className="text-[#10f94e] font-semibold">
                          Bs {payment.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {new Date(payment.date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={
                            payment.status === 'Vencido' ? 'text-[#ff3b5c] font-semibold' : ''
                          }
                        >
                          {new Date(payment.next_payment).toLocaleDateString('es-ES')}
                        </span>
                      </td>
                      <td className="py-4 px-4">{payment.method}</td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <PrintPayment
                            payment={payment}
                            userName={getUserName(payment.user_id)}
                            userMemberNumber={getUserMemberNumber(payment.user_id)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-[#10f94e]/10 hover:text-[#10f94e]"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Payment Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar Pago</DialogTitle>
            <DialogDescription className="text-gray-400">
              Registra un nuevo pago de mensualidad. El próximo pago se calcula automáticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user_id" className="text-gray-300">
                Usuario <span className="text-[#ff3b5c]">*</span>
              </Label>
              <select
                {...register('user_id')}
                className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
              >
                <option value="">Seleccionar usuario</option>
                {users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.plan || user.membership_type || 'Sin plan'}
                  </option>
                ))}
              </select>
              {errors.user_id && (
                <p className="text-xs text-[#ff3b5c]">{errors.user_id.message}</p>
              )}
            </div>

            {selectedUser && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400">
                  Membresía: <strong>{selectedUser}</strong>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-300">
                Monto (Bs) <span className="text-[#ff3b5c]">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="300.00"
              />
              {errors.amount && (
                <p className="text-xs text-[#ff3b5c]">{errors.amount.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-gray-300">
                  Fecha de Pago <span className="text-[#ff3b5c]">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                {errors.date && (
                  <p className="text-xs text-[#ff3b5c]">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_payment" className="text-gray-300 flex items-center gap-2">
                  Próximo Pago <Calendar className="h-3 w-3 text-[#10f94e]" />
                </Label>
                <Input
                  id="next_payment"
                  type="date"
                  {...register('next_payment')}
                  className="bg-gray-800 border-gray-700 text-white"
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method" className="text-gray-300">
                Método de Pago <span className="text-[#ff3b5c]">*</span>
              </Label>
              <select
                {...register('method')}
                className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Pago Móvil">Pago Móvil</option>
              </select>
              {errors.method && (
                <p className="text-xs text-[#ff3b5c]">{errors.method.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference" className="text-gray-300">
                Referencia (opcional)
              </Label>
              <Input
                id="reference"
                {...register('reference')}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Nro. de referencia"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setIsRegisterOpen(false);
                }}
                className="border-gray-700 hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar Pago'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      {selectedPayment && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Detalles del Pago</DialogTitle>
              <DialogDescription className="text-gray-400">
                Información completa del pago registrado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Usuario</p>
                  <p className="text-white">{getUserName(selectedPayment.user_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Estado</p>
                  <Badge variant="outline" className={getStatusColor(selectedPayment.status)}>
                    {selectedPayment.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Monto</p>
                  <p className="text-3xl text-[#10f94e] font-bold">
                    Bs {selectedPayment.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Fecha de Pago</p>
                  <p className="text-white">
                    {new Date(selectedPayment.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Próximo Pago</p>
                  <p
                    className={
                      selectedPayment.status === 'Vencido'
                        ? 'text-[#ff3b5c] font-semibold'
                        : 'text-white'
                    }
                  >
                    {new Date(selectedPayment.next_payment).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Método de Pago</p>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[#10f94e]/10">
                      <DollarSign className="w-4 h-4 text-[#10f94e]" />
                    </div>
                    <p className="text-white">{selectedPayment.method}</p>
                  </div>
                </div>
                {selectedPayment.reference && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Referencia</p>
                    <p className="text-white font-mono text-sm">{selectedPayment.reference}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                <PrintPayment
                  payment={selectedPayment}
                  userName={getUserName(selectedPayment.user_id)}
                  userMemberNumber={getUserMemberNumber(selectedPayment.user_id)}
                />
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}