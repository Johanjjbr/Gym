/**
 * Página de Pagos con CRUD completo, cálculo automático de fechas y alertas de morosidad
 */

import { useState, useEffect } from 'react';
import { Search, Plus, DollarSign, Loader2, AlertCircle, Eye, Calendar } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { addMonths, format } from 'date-fns';

export function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');

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
        setSelectedUser(user.membership_type);
        // Establecer monto sugerido según membresía
        const amounts: Record<string, number> = {
          'Mensual': 300,
          'Trimestral': 800,
          'Semestral': 1500,
          'Anual': 2800,
        };
        const suggestedAmount = amounts[user.membership_type] || 300;
        setValue('amount', suggestedAmount);
      }
    }
  }, [watchUserId, users, setValue]);

  // Filtrado de pagos
  const filteredPayments = payments?.filter((payment: any) => {
    const user = users?.find((u: any) => u.id === payment.user_id);
    return user?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calcular totales
  const totalAmount = payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  const paidAmount = payments?.filter((p: any) => p.status === 'Pagado')
    .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
  const overdueAmount = payments?.filter((p: any) => p.status === 'Vencido')
    .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

  const getStatusColor = (status: string) => {
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

  const getUserName = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    return user?.name || 'Usuario desconocido';
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
        <Button
          className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-bold"
          onClick={() => setIsRegisterOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

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
                  Bs {paidAmount.toLocaleString()}
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
                  Bs {overdueAmount.toLocaleString()}
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
                <p className="text-2xl font-bold">Bs {totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre de usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Historial de Pagos ({filteredPayments?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay pagos registrados</p>
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
                  {filteredPayments?.map((payment: any) => (
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
                    {user.name} - {user.membership_type}
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
