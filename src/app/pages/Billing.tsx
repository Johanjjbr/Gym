/**
 * Página de Facturación unificada
 * Combina: Facturas + Registrar Cobro + Resumen/Morosos
 * Incluye impresión de facturas con window.print() nativo
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, DollarSign, Loader2, AlertCircle, Eye, Calendar,
  Filter, Printer, X, Users, FileText, CreditCard, CheckCircle, Trash2, Clock,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { addMonths, format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from 'date-fns';

import { useInvoices, useCreateInvoice, usePayInvoice, useDeleteInvoice } from '../hooks/useInvoices';
import { useUsers } from '../hooks/useUsers';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { PrintInvoice } from '../../components/PrintInvoice';

type TabType = 'facturas' | 'cobrar' | 'resumen';
type FilterStatus = 'all' | 'Pagada' | 'Pendiente' | 'Vencida';
type TimeFilter = 'all' | 'thisMonth' | 'lastMonth';

interface GymInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export function Billing() {
  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('facturas');

  // Filtros facturas
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // Modal pagar
  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  const [payMethod, setPayMethod] = useState('Efectivo');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Modal eliminar
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);

  // Modal detalles
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Modal imprimir
  const [printInvoice, setPrintInvoice] = useState<any>(null);

  // Vista morosos
  const [showOverdueUsers, setShowOverdueUsers] = useState(false);

  // Gym info para impresión
  const [gymInfo, setGymInfo] = useState<GymInfo>({ name: 'Gimnasio' });

  // Data
  const { data: invoicesData, isLoading: loadingInvoices, error: invoicesError } = useInvoices();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const createInvoice = useCreateInvoice();
  const payInvoice = usePayInvoice();
  const deleteInvoice = useDeleteInvoice();

  // Cargar info del gimnasio
  useEffect(() => {
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
    loadGymInfo();
  }, []);

  // Form registro de cobro
  const [cobroUserId, setCobroUserId] = useState('');
  const [cobroAmount, setCobroAmount] = useState('');
  const [cobroDate, setCobroDate] = useState(new Date().toISOString().split('T')[0]);
  const [cobroDueDate, setCobroDueDate] = useState('');
  const [cobroMethod, setCobroMethod] = useState('Efectivo');
  const [cobroReference, setCobroReference] = useState('');
  const [cobroConcept, setCobroConcept] = useState('');
  const [cobroNotes, setCobroNotes] = useState('');
  const [cobroErrors, setCobroErrors] = useState<Record<string, string>>({});
  const [selectedUserPlan, setSelectedUserPlan] = useState('');

  // Calcular próximo vencimiento (+1 mes)
  useEffect(() => {
    if (cobroDate) {
      const next = addMonths(new Date(cobroDate), 1);
      setCobroDueDate(format(next, 'yyyy-MM-dd'));
    }
  }, [cobroDate]);

  // Auto-sugerir monto según plan
  useEffect(() => {
    if (cobroUserId && users) {
      const user = users.find((u: any) => u.id === cobroUserId);
      if (user) {
        const plan = user.plan || user.membership_type || 'Mensual';
        setSelectedUserPlan(plan);
        const amounts: Record<string, number> = {
          'Mensual': 300, 'Trimestral': 800, 'Semestral': 1500, 'Anual': 2800,
        };
        setCobroAmount(String(amounts[plan] || 300));
        if (!cobroConcept) {
          setCobroConcept(`Mensualidad ${plan}`);
        }
      }
    }
  }, [cobroUserId, users]);

  // Helpers
  const getUserName = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    return user?.name || 'Usuario desconocido';
  };

  const getUserById = (userId: string) => {
    return users?.find((u: any) => u.id === userId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pagada': return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Pendiente': return 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30';
      case 'Vencida': return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      case 'Activo': return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Moroso': return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const fmtDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-ES');
  };

  // Usuarios morosos
  const overdueUsers = useMemo(() => {
    if (!users) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return users.filter((user: any) => {
      if (!user.next_payment) return false;
      const np = new Date(user.next_payment);
      np.setHours(0, 0, 0, 0);
      return np < today;
    });
  }, [users]);

  // Filtrado de facturas
  const filteredInvoices = useMemo(() => {
    if (!invoicesData) return [];
    return invoicesData.filter((inv: any) => {
      const user = users?.find((u: any) => u.id === inv.user_id);
      const matchesSearch = !searchTerm || user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        || inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;

      let matchesTime = true;
      if (timeFilter === 'thisMonth') {
        const d = parseISO(inv.due_date || inv.created_at);
        matchesTime = isWithinInterval(d, { start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
      } else if (timeFilter === 'lastMonth') {
        const lastMonth = subMonths(new Date(), 1);
        const d = parseISO(inv.due_date || inv.created_at);
        matchesTime = isWithinInterval(d, { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
      }
      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [invoicesData, users, searchTerm, filterStatus, timeFilter]);

  // Totales
  const totals = useMemo(() => {
    if (!invoicesData) return { total: 0, paid: 0, pending: 0, overdue: 0 };
    const sum = (arr: any[]) => arr.reduce((s, i) => s + Number(i.amount), 0);
    return {
      total: sum(invoicesData),
      paid: sum(invoicesData.filter((i: any) => i.status === 'Pagada')),
      pending: sum(invoicesData.filter((i: any) => i.status === 'Pendiente')),
      overdue: sum(invoicesData.filter((i: any) => i.status === 'Vencida')),
    };
  }, [invoicesData]);

  const hasActiveFilters = filterStatus !== 'all' || timeFilter !== 'all' || searchTerm !== '';

  // Acciones
  const openPayDialog = (inv: any) => {
    setPayingInvoice(inv);
    setPayMethod('Efectivo');
    setPayReference('');
    setPayNotes('');
  };

  const handlePay = () => {
    if (!payingInvoice) return;
    payInvoice.mutate({
      id: payingInvoice.id,
      data: { method: payMethod, reference: payReference || undefined, notes: payNotes || undefined },
    }, {
      onSuccess: () => setPayingInvoice(null),
    });
  };

  const handleDelete = () => {
    if (!invoiceToDelete) return;
    deleteInvoice.mutate(invoiceToDelete.id, {
      onSuccess: () => setInvoiceToDelete(null),
    });
  };

  const openPrint = (inv: any) => {
    const user = getUserById(inv.user_id);
    setPrintInvoice({
      invoice: {
        id: inv.id,
        invoice_number: inv.invoice_number || 'S/N',
        date: inv.created_at || inv.due_date,
        due_date: inv.due_date,
        status: inv.status,
        amount: Number(inv.amount),
        method: inv.method,
        reference: inv.reference,
        notes: inv.notes || inv.concept,
        paid_at: inv.paid_at,
      },
      userInfo: {
        name: user?.name || 'Usuario',
        cedula: user?.cedula,
        member_number: user?.member_number,
        plan: user?.plan || user?.membership_type,
        email: user?.email,
        phone: user?.phone,
      },
    });
  };

  // Registrar cobro (crea factura + la paga)
  const handleRegisterCobro = async () => {
    const errors: Record<string, string> = {};
    if (!cobroUserId) errors.user_id = 'Selecciona un usuario';
    if (!cobroAmount || Number(cobroAmount) <= 0) errors.amount = 'Monto requerido';
    if (!cobroDate) errors.date = 'Fecha requerida';
    if (!cobroConcept.trim()) errors.concept = 'Concepto requerido';

    setCobroErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      // 1. Crear factura pendiente
      const invoice = await createInvoice.mutateAsync({
        user_id: cobroUserId,
        source: 'other',
        concept: cobroConcept,
        amount: Number(cobroAmount),
        due_date: cobroDueDate,
        notes: cobroNotes || undefined,
      });

      // 2. Marcar como pagada
      const invoiceId = invoice?.id || invoice?.[0]?.id;
      if (invoiceId) {
        await payInvoice.mutateAsync({
          id: invoiceId,
          data: {
            method: cobroMethod,
            reference: cobroReference || undefined,
          },
        });
      }

      toast.success('Cobro registrado y factura generada');

      // Reset form
      setCobroUserId('');
      setCobroAmount('');
      setCobroConcept('');
      setCobroNotes('');
      setCobroReference('');
      setSelectedUserPlan('');
      setCobroErrors({});

      // Cambiar a pestaña facturas
      setActiveTab('facturas');
    } catch (error: any) {
      toast.error('Error al registrar cobro', { description: error.message });
    }
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setTimeFilter('all');
    setSearchTerm('');
  };

  // Loading
  if (loadingInvoices || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando facturación...</p>
        </div>
      </div>
    );
  }

  // Error
  if (invoicesError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl mb-2">Facturación</h1>
          <p className="text-muted-foreground">Gestión de cobros y mensualidades</p>
        </div>
        <Card className="bg-card border-[#ff3b5c]/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#ff3b5c] mt-0.5" />
              <div>
                <p className="font-semibold text-[#ff3b5c]">Error al cargar facturas</p>
                <p className="text-sm text-gray-400 mt-1">{invoicesError.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="billing-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Facturación</h1>
          <p className="text-muted-foreground">Gestión de cobros y mensualidades</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={`border-[#ff3b5c] text-[#ff3b5c] hover:bg-[#ff3b5c]/10 ${showOverdueUsers ? 'bg-[#ff3b5c]/10' : ''}`}
            onClick={() => { setShowOverdueUsers(!showOverdueUsers); if (!showOverdueUsers) setActiveTab('resumen'); }}
            data-testid="btn-morosos"
          >
            <Users className="w-4 h-4 mr-2" />
            Morosos ({overdueUsers.length})
          </Button>
          <Button
            className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-bold"
            onClick={() => setActiveTab('cobrar')}
            data-testid="btn-registrar-cobro"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Cobro
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit" role="tablist">
        {([
          { key: 'facturas', label: 'Facturas', icon: FileText },
          { key: 'cobrar', label: 'Cobrar', icon: CreditCard },
          { key: 'resumen', label: 'Resumen', icon: DollarSign },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            data-testid={`tab-${key}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-[#10f94e] text-black'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(key)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ============ TAB: FACTURAS ============ */}
      {activeTab === 'facturas' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#10f94e]/10">
                    <DollarSign className="w-5 h-5 text-[#10f94e]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cobrado</p>
                    <p className="text-xl font-bold text-[#10f94e]">Bs {totals.paid.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#eab308]/10">
                    <Clock className="w-5 h-5 text-[#eab308]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pendiente</p>
                    <p className="text-xl font-bold text-[#eab308]">Bs {totals.pending.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#ff3b5c]/10">
                    <AlertCircle className="w-5 h-5 text-[#ff3b5c]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencido</p>
                    <p className="text-xl font-bold text-[#ff3b5c]">Bs {totals.overdue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">Bs {totals.total.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar por nombre o N° factura..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-input border-border"
                    data-testid="search-invoices"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Estado</Label>
                    <div className="flex gap-2 flex-wrap">
                      {([
                        { key: 'all', label: 'Todas', active: 'bg-[#10f94e] text-black' },
                        { key: 'Pagada', label: 'Pagadas', active: 'bg-[#10f94e] text-black' },
                        { key: 'Pendiente', label: 'Pendientes', active: 'bg-[#eab308] text-black' },
                        { key: 'Vencida', label: 'Vencidas', active: 'bg-[#ff3b5c] text-white' },
                      ] as const).map(({ key, label, active }) => (
                        <Button
                          key={key}
                          size="sm"
                          variant={filterStatus === key ? 'default' : 'outline'}
                          onClick={() => setFilterStatus(key as FilterStatus)}
                          className={filterStatus === key ? active : ''}
                          data-testid={`filter-${key}`}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Período</Label>
                    <div className="flex gap-2">
                      {([
                        { key: 'all', label: 'Todos' },
                        { key: 'thisMonth', label: 'Este Mes' },
                        { key: 'lastMonth', label: 'Mes Pasado' },
                      ] as const).map(({ key, label }) => (
                        <Button
                          key={key}
                          size="sm"
                          variant={timeFilter === key ? 'default' : 'outline'}
                          onClick={() => setTimeFilter(key as TimeFilter)}
                          className={timeFilter === key ? 'bg-[#10f94e] text-black' : ''}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end">
                    {hasActiveFilters && (
                      <Button size="sm" variant="outline" onClick={clearFilters} className="w-full">
                        <X className="w-4 h-4 mr-2" />
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="w-4 h-4" />
                    <span>Mostrando {filteredInvoices.length} de {invoicesData?.length || 0} facturas</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabla facturas */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Facturas ({filteredInvoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {hasActiveFilters ? 'No se encontraron facturas con los filtros aplicados' : 'No hay facturas registradas'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="invoices-table">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-muted-foreground">Factura</th>
                        <th className="text-left py-3 px-4 text-muted-foreground">Usuario</th>
                        <th className="text-left py-3 px-4 text-muted-foreground">Concepto</th>
                        <th className="text-left py-3 px-4 text-muted-foreground">Monto</th>
                        <th className="text-left py-3 px-4 text-muted-foreground">Vencimiento</th>
                        <th className="text-left py-3 px-4 text-muted-foreground">Estado</th>
                        <th className="text-right py-3 px-4 text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv: any) => (
                        <tr key={inv.id} className="border-b border-border hover:bg-muted/50 transition-colors" data-testid="invoice-row">
                          <td className="py-4 px-4 font-mono text-sm">{inv.invoice_number}</td>
                          <td className="py-4 px-4">{getUserName(inv.user_id)}</td>
                          <td className="py-4 px-4">{inv.concept || inv.plans?.name || '-'}</td>
                          <td className="py-4 px-4">
                            <span className="text-[#10f94e] font-semibold">Bs {Number(inv.amount).toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-4">{fmtDate(inv.due_date)}</td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={getStatusColor(inv.status)}>
                              {inv.status === 'Pagada' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-1">
                              {inv.status !== 'Pagada' && (
                                <Button
                                  size="sm"
                                  className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-bold"
                                  onClick={() => openPayDialog(inv)}
                                  data-testid={`pay-${inv.invoice_number}`}
                                >
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  Pagar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-blue-500/10 hover:text-blue-400"
                                onClick={() => openPrint(inv)}
                                aria-label="Imprimir factura"
                                title="Imprimir factura"
                                data-testid={`print-${inv.invoice_number}`}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-[#10f94e]/10 hover:text-[#10f94e]"
                                onClick={() => { setSelectedInvoice(inv); setIsDetailsOpen(true); }}
                                aria-label="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-[#ff3b5c]/10 hover:text-[#ff3b5c]"
                                onClick={() => setInvoiceToDelete(inv)}
                                aria-label="Eliminar factura"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </>
      )}

      {/* ============ TAB: COBRAR ============ */}
      {activeTab === 'cobrar' && (
        <Card className="bg-card border-border max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#10f94e]" />
              Registrar Cobro de Mensualidad
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Registra un cobro y genera la factura automáticamente. El próximo vencimiento se calcula +1 mes.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); handleRegisterCobro(); }}
              data-testid="cobro-form"
            >
              {/* Usuario */}
              <div className="space-y-2">
                <Label htmlFor="cobro-user">Usuario <span className="text-[#ff3b5c]">*</span></Label>
                <select
                  id="cobro-user"
                  value={cobroUserId}
                  onChange={(e) => setCobroUserId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
                  data-testid="select-user"
                >
                  <option value="">Seleccionar usuario</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.plan || user.membership_type || 'Sin plan'}
                    </option>
                  ))}
                </select>
                {cobroErrors.user_id && <p className="text-xs text-[#ff3b5c]">{cobroErrors.user_id}</p>}
              </div>

              {/* Info plan */}
              {selectedUserPlan && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-400">
                    Membresía: <strong>{selectedUserPlan}</strong>
                  </p>
                </div>
              )}

              {/* Monto */}
              <div className="space-y-2">
                <Label htmlFor="cobro-amount">Monto (Bs) <span className="text-[#ff3b5c]">*</span></Label>
                <Input
                  id="cobro-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cobroAmount}
                  onChange={(e) => setCobroAmount(e.target.value)}
                  placeholder="300.00"
                  data-testid="input-amount"
                />
                {cobroErrors.amount && <p className="text-xs text-[#ff3b5c]">{cobroErrors.amount}</p>}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cobro-date">Fecha de Pago <span className="text-[#ff3b5c]">*</span></Label>
                  <Input
                    id="cobro-date"
                    type="date"
                    value={cobroDate}
                    onChange={(e) => setCobroDate(e.target.value)}
                    data-testid="input-date"
                  />
                  {cobroErrors.date && <p className="text-xs text-[#ff3b5c]">{cobroErrors.date}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cobro-due" className="flex items-center gap-2">
                    Próximo Vencimiento <Calendar className="h-3 w-3 text-[#10f94e]" />
                  </Label>
                  <Input
                    id="cobro-due"
                    type="date"
                    value={cobroDueDate}
                    readOnly
                    className="opacity-70"
                    data-testid="input-due-date"
                  />
                </div>
              </div>

              {/* Concepto */}
              <div className="space-y-2">
                <Label htmlFor="cobro-concept">Concepto <span className="text-[#ff3b5c]">*</span></Label>
                <Input
                  id="cobro-concept"
                  value={cobroConcept}
                  onChange={(e) => setCobroConcept(e.target.value)}
                  placeholder="Mensualidad Mensual"
                  data-testid="input-concept"
                />
                {cobroErrors.concept && <p className="text-xs text-[#ff3b5c]">{cobroErrors.concept}</p>}
              </div>

              {/* Método */}
              <div className="space-y-2">
                <Label htmlFor="cobro-method">Método de Pago <span className="text-[#ff3b5c]">*</span></Label>
                <select
                  id="cobro-method"
                  value={cobroMethod}
                  onChange={(e) => setCobroMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-input border border-border text-foreground"
                  data-testid="select-method"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                </select>
              </div>

              {/* Referencia */}
              <div className="space-y-2">
                <Label htmlFor="cobro-ref">Referencia (opcional)</Label>
                <Input
                  id="cobro-ref"
                  value={cobroReference}
                  onChange={(e) => setCobroReference(e.target.value)}
                  placeholder="Nro. de referencia"
                />
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="cobro-notes">Notas (opcional)</Label>
                <Textarea
                  id="cobro-notes"
                  value={cobroNotes}
                  onChange={(e) => setCobroNotes(e.target.value)}
                  rows={2}
                  placeholder="Información adicional..."
                />
              </div>

              <Button
                type="submit"
                disabled={createInvoice.isPending || payInvoice.isPending}
                className="w-full bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold"
                data-testid="btn-submit-cobro"
              >
                {createInvoice.isPending || payInvoice.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" />Registrar Cobro y Generar Factura</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ============ TAB: RESUMEN ============ */}
      {activeTab === 'resumen' && (
        <>
          {/* Usuarios morosos */}
          <Card className="bg-card border-[#ff3b5c]/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#ff3b5c]">
                <AlertCircle className="w-5 h-5" />
                Usuarios con Pagos Vencidos ({overdueUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueUsers.length > 0 ? (
                <div className="space-y-3" data-testid="overdue-users">
                  {overdueUsers.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-[#ff3b5c]/5 border border-[#ff3b5c]/20 rounded-lg hover:bg-[#ff3b5c]/10 transition-colors cursor-pointer"
                      onClick={() => navigate(`/usuarios/${user.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold">{user.name}</p>
                          <Badge variant="outline" className={getStatusColor('Moroso')}>
                            Moroso
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
                              {fmtDate(user.next_payment)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#10f94e] text-black hover:bg-[#0ed145]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCobroUserId(user.id);
                          setActiveTab('cobrar');
                        }}
                      >
                        Registrar Cobro
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-[#10f94e]" />
                  <p>No hay usuarios con pagos vencidos</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen general */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 text-[#10f94e] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Total Cobrado</p>
                <p className="text-3xl font-bold text-[#10f94e]">Bs {totals.paid.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-[#ff3b5c] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-3xl font-bold text-[#ff3b5c]">Bs {totals.overdue.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Total General</p>
                <p className="text-3xl font-bold">Bs {totals.total.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ============ DIALOGS ============ */}

      {/* Pagar Factura */}
      <Dialog open={!!payingInvoice} onOpenChange={() => setPayingInvoice(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Pagar Factura</DialogTitle>
            <DialogDescription className="text-gray-400">
              {payingInvoice?.invoice_number} — {getUserName(payingInvoice?.user_id)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Monto (Bs)</Label>
              <div className="text-2xl font-bold text-[#10f94e]">
                Bs {Number(payingInvoice?.amount || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Método de Pago <span className="text-[#ff3b5c]">*</span></Label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
                data-testid="select-pay-method"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Pago Móvil">Pago Móvil</option>
              </select>
            </div>
            <div>
              <Label className="text-gray-300">Referencia (opcional)</Label>
              <Input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Nro. de referencia"
              />
            </div>
            <div>
              <Label className="text-gray-300">Notas (opcional)</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                rows={2}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPayingInvoice(null)} className="border-gray-700 hover:bg-gray-800">
                Cancelar
              </Button>
              <Button onClick={handlePay} disabled={payInvoice.isPending} className="bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold">
                {payInvoice.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" />Confirmar Pago</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalles Factura */}
      {selectedInvoice && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Detalles de Factura</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedInvoice.invoice_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Usuario</p>
                  <p className="text-white">{getUserName(selectedInvoice.user_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Estado</p>
                  <Badge variant="outline" className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Monto</p>
                  <p className="text-3xl text-[#10f94e] font-bold">
                    Bs {Number(selectedInvoice.amount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Concepto</p>
                  <p className="text-white">{selectedInvoice.concept || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Vencimiento</p>
                  <p className="text-white">{fmtDate(selectedInvoice.due_date)}</p>
                </div>
                {selectedInvoice.method && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Método</p>
                    <p className="text-white">{selectedInvoice.method}</p>
                  </div>
                )}
                {selectedInvoice.paid_at && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Pagado el</p>
                    <p className="text-white">{fmtDate(selectedInvoice.paid_at)}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                <Button onClick={() => openPrint(selectedInvoice)} className="bg-[#10f94e] hover:bg-[#0ed145] text-black">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="border-gray-700 hover:bg-gray-800">
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Eliminar Factura */}
      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Factura</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              ¿Estás seguro de eliminar la factura {invoiceToDelete?.invoice_number}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-gray-700 hover:bg-gray-800 text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
              className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white font-bold"
            >
              {deleteInvoice.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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