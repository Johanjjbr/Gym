import { useState, useMemo } from 'react';
import { Search, DollarSign, Loader2, AlertCircle, CheckCircle, X, CreditCard, Users, Calendar, Filter } from 'lucide-react';
import { useInvoices, usePayInvoice } from '../hooks/useInvoices';
import { useUsers } from '../hooks/useUsers';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useNavigate } from 'react-router';
import { formatDate } from '../lib/format';
import { toast } from 'sonner';

type FilterStatus = 'all' | 'Pendiente' | 'Pagada' | 'Vencida';

export function Invoices() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  const [payMethod, setPayMethod] = useState('Efectivo');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payAmount, setPayAmount] = useState('');

  const { data: invoicesData, isLoading, error } = useInvoices();
  const { data: users } = useUsers();
  const payInvoice = usePayInvoice();

  const getUserName = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    return user?.name || 'Usuario desconocido';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pagada': return 'bg-primary/20 text-primary border-primary/30';
      case 'Pendiente': return 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/30';
      case 'Vencida': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!invoicesData) return [];
    return invoicesData.filter((inv: any) => {
      const user = users?.find((u: any) => u.id === inv.user_id);
      const matchesSearch = !searchTerm || user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoicesData, users, searchTerm, filterStatus]);

  const totals = useMemo(() => {
    if (!invoicesData) return { total: 0, paid: 0, pending: 0, overdue: 0 };
    return {
      total: invoicesData.reduce((s: number, i: any) => s + Number(i.amount), 0),
      paid: invoicesData.filter((i: any) => i.status === 'Pagada').reduce((s: number, i: any) => s + Number(i.amount), 0),
      pending: invoicesData.filter((i: any) => i.status === 'Pendiente').reduce((s: number, i: any) => s + Number(i.amount), 0),
      overdue: invoicesData.filter((i: any) => i.status === 'Vencida').reduce((s: number, i: any) => s + Number(i.amount), 0),
    };
  }, [invoicesData]);

  const openPayDialog = (invoice: any) => {
    setPayingInvoice(invoice);
    setPayAmount(String(invoice.amount));
    setPayMethod('Efectivo');
    setPayReference('');
    setPayNotes('');
  };

  const handlePay = async () => {
    if (!payingInvoice || !payAmount) {
      toast.error('El monto es requerido');
      return;
    }
    payInvoice.mutate({
      id: payingInvoice.id,
      data: {
        method: payMethod,
        reference: payReference || undefined,
        notes: payNotes || undefined,
      },
    }, {
      onSuccess: () => {
        setPayingInvoice(null);
      },
    });
  };

  const hasActiveFilters = filterStatus !== 'all' || searchTerm !== '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl mb-2">Control de Facturas</h1>
            <p className="text-muted-foreground">Gestión de cobros y mensualidades</p>
          </div>
        </div>
        <Card className="bg-card border-destructive/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Error al cargar facturas</p>
                <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
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
          <h1 className="text-4xl mb-2">Control de Facturas</h1>
          <p className="text-muted-foreground">Gestión de cobros y mensualidades</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cobrado</p>
                <p className="text-2xl font-bold text-primary">Bs {totals.paid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#eab308]/10">
                <DollarSign className="w-6 h-6 text-[#eab308]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente</p>
                <p className="text-2xl font-bold text-[#eab308]">Bs {totals.pending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <DollarSign className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencido</p>
                <p className="text-2xl font-bold text-destructive">Bs {totals.overdue.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">Bs {totals.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre de usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground mr-2">Estado:</Label>
              <Button size="sm" variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}>
                Todas
              </Button>
              <Button size="sm" variant={filterStatus === 'Pagada' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('Pagada')}
                className={filterStatus === 'Pagada' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}>
                Pagadas
              </Button>
              <Button size="sm" variant={filterStatus === 'Pendiente' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('Pendiente')}
                className={filterStatus === 'Pendiente' ? 'bg-[#eab308] text-black hover:bg-[#eab308]/90' : ''}>
                Pendientes
              </Button>
              <Button size="sm" variant={filterStatus === 'Vencida' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('Vencida')}
                className={filterStatus === 'Vencida' ? 'bg-destructive text-foreground hover:bg-destructive/90' : ''}>
                Vencidas
              </Button>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={() => { setFilterStatus('all'); setSearchTerm(''); }}>
                  <X className="w-4 h-4 mr-1" />Limpiar
                </Button>
              )}
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

      {/* Invoices Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Facturas ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {hasActiveFilters ? 'No se encontraron facturas con los filtros aplicados' : 'No hay facturas registradas'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell>{getUserName(inv.user_id)}</TableCell>
                    <TableCell><span className="text-primary font-semibold">Bs {Number(inv.amount).toLocaleString()}</span></TableCell>
                    <TableCell>{formatDate(inv.due_date)}</TableCell>
                    <TableCell>{inv.method || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(inv.status)}>
                        {inv.status === 'Pagada' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status !== 'Pagada' && (
                          <Button size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                            onClick={() => openPayDialog(inv)}>
                            <CreditCard className="w-4 h-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost"
                          className="hover:bg-primary/10 hover:text-primary"
                          onClick={() => navigate(`/usuarios/${inv.user_id}`)}>
                          <Users className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pay Invoice Dialog */}
      <Dialog open={!!payingInvoice} onOpenChange={() => setPayingInvoice(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Pagar Factura</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Factura: {payingInvoice?.invoice_number} — {getUserName(payingInvoice?.user_id)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Monto (Bs) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="bg-muted border-border text-foreground text-lg font-bold"
                placeholder="300" />
            </div>
            <div>
              <Label className="text-gray-300">Método de Pago <span className="text-destructive">*</span></Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="w-full bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Referencia (opcional)</Label>
              <Input value={payReference} onChange={(e) => setPayReference(e.target.value)}
                className="bg-muted border-border text-foreground"
                placeholder="Nro. de referencia" />
            </div>
            <div>
              <Label className="text-gray-300">Notas (opcional)</Label>
              <Textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)}
                className="bg-muted border-border text-foreground"
                rows={2} placeholder="Información adicional..." />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPayingInvoice(null)}
                className="border-border hover:bg-muted">Cancelar</Button>
              <Button onClick={handlePay} disabled={payInvoice.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
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
    </div>
  );
}
