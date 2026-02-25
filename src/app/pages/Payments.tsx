import { useState } from 'react';
import { Search, Plus, DollarSign, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { mockPayments, mockUsers } from '../lib/mockData';
import { Payment } from '../types';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

type PaymentFormData = {
  userId: string;
  amount: number;
  date: string;
  method: 'Efectivo' | 'Transferencia' | 'Tarjeta';
  nextPayment: string;
};

export function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PaymentFormData>();

  const filteredPayments = payments.filter(payment =>
    payment.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = filteredPayments.filter(p => p.status === 'Pagado').reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = filteredPayments.filter(p => p.status === 'Vencido').reduce((sum, payment) => sum + payment.amount, 0);

  // Register Payment
  const onRegisterPayment = (data: PaymentFormData) => {
    const user = mockUsers.find(u => u.id === data.userId);
    if (!user) return;

    const newPayment: Payment = {
      id: String(Date.now()),
      userId: data.userId,
      userName: user.name,
      amount: Number(data.amount),
      date: data.date,
      nextPayment: data.nextPayment,
      status: 'Pagado',
      method: data.method,
    };

    setPayments([newPayment, ...payments]);
    toast.success('Pago registrado exitosamente', {
      description: `Se registró el pago de ${user.name} por Bs ${data.amount}`,
    });
    reset();
    setIsRegisterOpen(false);
  };

  const viewPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Control de Pagos</h1>
          <p className="text-muted-foreground">Gestión de mensualidades y cobros</p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
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
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cobrado</p>
                <p className="text-2xl">Bs {paidAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <DollarSign className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por Cobrar</p>
                <p className="text-2xl">Bs {pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <DollarSign className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl">Bs {totalAmount.toLocaleString()}</p>
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
          <CardTitle>Historial de Pagos ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">{payment.userName}</td>
                    <td className="py-4 px-4">
                      <span className="text-primary">Bs {payment.amount.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4">{new Date(payment.date).toLocaleDateString('es-ES')}</td>
                    <td className="py-4 px-4">
                      <span className={payment.status === 'Vencido' ? 'text-destructive' : ''}>
                        {new Date(payment.nextPayment).toLocaleDateString('es-ES')}
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
                          className="hover:bg-primary/10 hover:text-primary"
                          onClick={() => viewPaymentDetails(payment)}
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
        </CardContent>
      </Card>

      {/* Register Payment Dialog */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registra un nuevo pago de mensualidad
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onRegisterPayment)} className="space-y-4">
            <div>
              <Label htmlFor="userId">Usuario *</Label>
              <Select onValueChange={(value) => setValue('userId', value)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.memberNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.userId && <p className="text-xs text-[#ff3b5c] mt-1">El usuario es requerido</p>}
            </div>

            <div>
              <Label htmlFor="amount">Monto (Bs) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { 
                  required: 'El monto es requerido',
                  min: { value: 0.01, message: 'El monto debe ser mayor a 0' }
                })}
                className="bg-input border-border"
                placeholder="300"
              />
              {errors.amount && <p className="text-xs text-[#ff3b5c] mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <Label htmlFor="date">Fecha de Pago *</Label>
              <Input
                id="date"
                type="date"
                {...register('date', { required: 'La fecha es requerida' })}
                className="bg-input border-border"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
              {errors.date && <p className="text-xs text-[#ff3b5c] mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <Label htmlFor="nextPayment">Próximo Pago *</Label>
              <Input
                id="nextPayment"
                type="date"
                {...register('nextPayment', { required: 'La fecha de próximo pago es requerida' })}
                className="bg-input border-border"
              />
              {errors.nextPayment && <p className="text-xs text-[#ff3b5c] mt-1">{errors.nextPayment.message}</p>}
            </div>

            <div>
              <Label htmlFor="method">Método de Pago *</Label>
              <Select onValueChange={(value) => setValue('method', value as PaymentFormData['method'])}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
              {errors.method && <p className="text-xs text-[#ff3b5c] mt-1">El método de pago es requerido</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setIsRegisterOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Registrar Pago
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles del Pago</DialogTitle>
            <DialogDescription>
              Información completa del pago registrado
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Usuario</p>
                  <p>{selectedPayment.userName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <Badge variant="outline" className={getStatusColor(selectedPayment.status)}>
                    {selectedPayment.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">Monto</p>
                  <p className="text-3xl text-primary">Bs {selectedPayment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Fecha de Pago</p>
                  <p>{new Date(selectedPayment.date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Próximo Pago</p>
                  <p className={selectedPayment.status === 'Vencido' ? 'text-destructive' : ''}>
                    {new Date(selectedPayment.nextPayment).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Método de Pago</p>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <p>{selectedPayment.method}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">ID de Transacción</p>
                  <p className="text-xs text-muted-foreground font-mono">#{selectedPayment.id}</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Cerrar
                </Button>
                <Button className="bg-primary hover:bg-primary/90">
                  Imprimir Recibo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
