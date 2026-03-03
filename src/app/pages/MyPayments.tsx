import { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  date: string;
  next_payment: string;
  status: 'Pagado' | 'Pendiente' | 'Vencido';
  method: 'Efectivo' | 'Transferencia' | 'Tarjeta';
}

export function MyPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPaymentDate, setNextPaymentDate] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
    loadUserData();
  }, [user]);

  const loadPayments = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      setPayments(data || []);
    } catch (error: any) {
      console.error('Error cargando pagos:', error);
      toast.error('Error al cargar el historial de pagos');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('next_payment')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setNextPaymentDate(data?.next_payment || null);
    } catch (error: any) {
      console.error('Error cargando datos de usuario:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'Pagado': 'default',
      'Pendiente': 'secondary',
      'Vencido': 'destructive',
    };
    return variants[status] || 'secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pagado':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Pendiente':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Vencido':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Efectivo':
        return '💵';
      case 'Transferencia':
        return '🏦';
      case 'Tarjeta':
        return '💳';
      default:
        return '💰';
    }
  };

  const totalPaid = payments
    .filter(p => p.status === 'Pagado')
    .reduce((sum, p) => sum + p.amount, 0);

  const isPaymentDue = () => {
    if (!nextPaymentDate) return false;
    const dueDate = new Date(nextPaymentDate);
    const today = new Date();
    return dueDate <= today;
  };

  const daysUntilPayment = () => {
    if (!nextPaymentDate) return null;
    const dueDate = new Date(nextPaymentDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const days = daysUntilPayment();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Mis Pagos</h1>
        <p className="text-muted-foreground">
          Historial de pagos y próximo vencimiento
        </p>
      </div>

      {/* Próximo Pago */}
      {nextPaymentDate && (
        <Card className={isPaymentDue() ? 'border-destructive' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Próximo Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {formatDate(nextPaymentDate)}
                  </p>
                  {days !== null && (
                    <p className={`text-sm mt-1 ${
                      days < 0 
                        ? 'text-destructive' 
                        : days <= 7 
                        ? 'text-yellow-500' 
                        : 'text-muted-foreground'
                    }`}>
                      {days < 0 
                        ? `Vencido hace ${Math.abs(days)} días` 
                        : days === 0 
                        ? 'Vence hoy' 
                        : `Faltan ${days} días`}
                    </p>
                  )}
                </div>
                {isPaymentDue() && (
                  <Badge variant="destructive">Pago Vencido</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Recuerda realizar tu pago antes de la fecha de vencimiento para mantener tu membresía activa.
                Contacta a recepción para más información.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              en {payments.filter(p => p.status === 'Pagado').length} pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Pago</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {payments.length > 0 
                ? formatCurrency(payments[0].amount)
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.length > 0 
                ? formatDate(payments[0].date)
                : 'Sin pagos registrados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPaymentDue() ? (
                <span className="text-destructive">Vencido</span>
              ) : (
                <span className="text-green-500">Al Día</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.status || 'Inactivo'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aún no tienes pagos registrados
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(payment.status)}
                    <div>
                      <p className="font-medium">{formatDate(payment.date)}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{getMethodIcon(payment.method)}</span>
                        <span>{payment.method}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {formatCurrency(payment.amount)}
                    </p>
                    <Badge variant={getStatusBadge(payment.status)} className="mt-1">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
