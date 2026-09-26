import { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock, DollarSign, Printer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { PrintInvoice } from '../../components/PrintInvoice';
import { PaymentCalendar } from '../components/PaymentCalendar';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: 'Pagada' | 'Pendiente' | 'Vencida';
  method: string | null;
  concept: string | null;
  notes: string | null;
  reference: string | null;
  created_at: string;
  plans?: { name: string } | null;
}

interface GymInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export function MyPayments() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPaymentDate, setNextPaymentDate] = useState<string | null>(null);
  const [gymInfo, setGymInfo] = useState<GymInfo>({ name: 'Gimnasio' });
  const [printInvoice, setPrintInvoice] = useState<{
    invoice: any;
    userInfo: any;
  } | null>(null);

  useEffect(() => {
    loadInvoices();
    loadUserData();
    loadGymInfo();
  }, [user]);

  const loadInvoices = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('invoices')
        .select('*, plans(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error cargando facturas:', error);
      toast.error('Error al cargar el historial de facturas');
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

  const loadGymInfo = async () => {
    try {
      const { data } = await supabase
        .from('gyms')
        .select('name, address, phone, email, logo_url')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (data) setGymInfo(data);
    } catch {
      // fallback silencioso
    }
  };

  const handlePrint = (inv: Invoice) => {
    setPrintInvoice({
      invoice: {
        id: inv.id,
        invoice_number: inv.invoice_number || 'S/N',
        date: inv.created_at,
        due_date: inv.due_date,
        status: inv.status,
        amount: Number(inv.amount),
        method: inv.method || undefined,
        reference: inv.reference || undefined,
        notes: inv.notes || inv.concept || undefined,
        paid_at: inv.paid_at || undefined,
      },
      userInfo: {
        name: user?.name || 'Usuario',
        member_number: user?.memberNumber,
        plan: inv.plans?.name,
        email: user?.email,
        phone: user?.phone,
      },
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'Pagada': 'default',
      'Pendiente': 'secondary',
      'Vencida': 'destructive',
    };
    return variants[status] || 'secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pagada':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Pendiente':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Vencida':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Efectivo': return '💵';
      case 'Transferencia': return '🏦';
      case 'Tarjeta': return '💳';
      default: return '💰';
    }
  };

  const totalPaid = invoices
    .filter((p) => p.status === 'Pagada')
    .reduce((sum, p) => sum + Number(p.amount), 0);

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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const days = daysUntilPayment();

  return (
    <div className="space-y-6" data-testid="my-payments-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Mis Pagos</h1>
        <p className="text-muted-foreground">
          Historial de facturas y próximo vencimiento
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
                  <p className="text-2xl font-bold">{formatDate(nextPaymentDate)}</p>
                  {days !== null && (
                    <p className={`text-sm mt-1 ${
                      days < 0 ? 'text-destructive' : days <= 7 ? 'text-yellow-500' : 'text-muted-foreground'
                    }`}>
                      {days < 0 ? `Vencido hace ${Math.abs(days)} días` : days === 0 ? 'Vence hoy' : `Faltan ${days} días`}
                    </p>
                  )}
                </div>
                {isPaymentDue() && <Badge variant="destructive">Pago Vencido</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Recuerda realizar tu pago antes de la fecha de vencimiento para mantener tu membresía activa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendario de Pagos */}
      <PaymentCalendar invoices={invoices} />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              en {invoices.filter((p) => p.status === 'Pagada').length} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Factura</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {invoices.length > 0 ? formatCurrency(Number(invoices[0].amount)) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {invoices.length > 0 ? invoices[0].invoice_number : 'Sin facturas'}
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
            <p className="text-xs text-muted-foreground">{user?.status || 'Inactivo'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aún no tienes facturas registradas
            </p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(inv.status)}
                    <div>
                      <p className="font-medium">{inv.invoice_number}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatDate(inv.due_date)}</span>
                        {inv.method && (
                          <>
                            <span>•</span>
                            <span>{getMethodIcon(inv.method)} {inv.method}</span>
                          </>
                        )}
                        {inv.plans?.name && <span>• {inv.plans.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(Number(inv.amount))}</p>
                      <Badge variant={getStatusBadge(inv.status)} className="mt-1">
                        {inv.status}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrint(inv)}
                      aria-label="Imprimir factura"
                      title="Imprimir factura"
                      data-testid={`print-my-invoice-${inv.invoice_number}`}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Impresión */}
      {printInvoice && (
        <PrintInvoice
          invoice={printInvoice.invoice}
          gymInfo={gymInfo}
          userInfo={printInvoice.userInfo}
          isOpen={!!printInvoice}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
}