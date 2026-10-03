/**
 * Plataforma (solo súper admin)
 *  - Resumen: cobrado este mes, ingreso mensual esperado, clientes por estado, últimos meses
 *  - Clientes: plan, sedes, socios, próximo pago, estado; registrar pago, editar,
 *    suspender/reactivar, entrar como soporte
 *  - Pagos recibidos y planes del sistema
 * La falta de pago solo genera avisos: nunca bloquea al cliente.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, Building2, CalendarClock, DollarSign, LifeBuoy, Loader2, MoreHorizontal, Pencil, Plus,
  Power, Receipt, Search, Users as UsersIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { useOrgContext, useSupportMode } from '../hooks/useOrgContext';
import {
  useCreateClient, usePlatformClients, usePlatformPayments, usePlatformPlans, usePlatformSummary,
  useRegisterPlatformPayment, useSavePlan, useUpdateClient,
  type PlatformClient, type PlatformPlan,
} from '../hooks/usePlatform';
import { coveredPeriod, STATE_LABEL, STATE_TONE, type SubscriptionState } from '../lib/orgContext';
import { formatMoney, toDateOnly, addDays } from '../lib/dashboardHelpers';
import { fmtDate } from '../lib/billing';

const METHODS = ['Zelle', 'Transferencia', 'Pago Móvil', 'Efectivo $', 'Binance', 'Otro'];
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const monthLabel = (ym: string) => `${MONTHS_ES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const orNull = (v: string) => (v.trim() ? v.trim() : null);
const num = (v: string) => Number(String(v).replace(',', '.'));

export function PlatformPage() {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) {
    return <p className="text-muted-foreground">Esta sección es solo para el proveedor del sistema.</p>;
  }
  return <PlatformContent />;
}

function PlatformContent() {
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-1">Plataforma</h1>
          <p className="text-muted-foreground">Clientes del sistema, sus pagos de suscripción y planes.</p>
        </div>
        <Button onClick={() => setNewOpen(true)} data-testid="new-client">
          <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
        </Button>
      </div>

      <SummaryRow />

      <Tabs defaultValue="clientes">
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="pagos">Pagos recibidos</TabsTrigger>
          <TabsTrigger value="planes">Planes</TabsTrigger>
        </TabsList>
        <TabsContent value="clientes" className="mt-4"><ClientsTab /></TabsContent>
        <TabsContent value="pagos" className="mt-4"><PaymentsTab /></TabsContent>
        <TabsContent value="planes" className="mt-4"><PlansTab /></TabsContent>
      </Tabs>

      <NewClientDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

/* ------------------------------ Resumen -------------------------------- */

function SummaryRow() {
  const { data: s, isLoading } = usePlatformSummary();
  if (isLoading || !s) return <div className="h-28 animate-pulse rounded-lg bg-card" />;
  const c = s.clients;
  const months = [...(s.by_month ?? [])].reverse();
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="grid grid-cols-2 gap-4">
      <StatCard title="Cobrado este mes" value={formatMoney(Number(s.this_month))} icon={DollarSign} color="green" />
      <StatCard
        title="Ingreso mensual esperado"
        value={formatMoney(Number(s.expected_monthly))}
        icon={Receipt}
        color="blue"
        subtitle="Suma de mensualidades de clientes activos"
      />
      <StatCard
        title="Clientes"
        value={c.total}
        icon={Building2}
        color="purple"
        subtitle={`${c.al_dia} al día${c.sin_fecha ? ` · ${c.sin_fecha} sin fecha` : ''}`}
      />
      <StatCard
        title="Por cobrar"
        value={c.por_vencer + c.vencida}
        icon={AlertTriangle}
        color={c.vencida ? 'red' : 'amber'}
        subtitle={`${c.por_vencer} por vencer · ${c.vencida} vencido${c.vencida === 1 ? '' : 's'}${c.suspendida ? ` · ${c.suspendida} suspendido${c.suspendida === 1 ? '' : 's'}` : ''}`}
      />
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <p className="mb-2 text-sm text-muted-foreground">Cobrado por mes</p>
          <ul className="space-y-1 text-sm" data-testid="revenue-by-month">
            {months.map((m) => (
              <li key={m.month} className="flex justify-between">
                <span className="capitalize text-muted-foreground">{monthLabel(m.month)}</span>
                <span className="tabular-nums">
                  {formatMoney(Number(m.total))}
                  <span className="ml-1 text-xs text-muted-foreground">({m.count})</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------ Clientes ------------------------------- */

const STATE_ORDER: Record<SubscriptionState, number> = {
  vencida: 0, suspendida: 1, por_vencer: 2, sin_fecha: 3, al_dia: 4, cancelada: 5,
};

function dueText(c: PlatformClient) {
  if (!c.next_due_date) return 'Sin fecha';
  const d = c.days_left ?? 0;
  const rel = d === 0 ? 'hoy' : d > 0 ? `en ${d} d` : `hace ${-d} d`;
  return `${fmtDate(c.next_due_date)} · ${rel}`;
}

function ClientsTab() {
  const { data: clients = [], isLoading } = usePlatformClients();
  const { data: ctx } = useOrgContext();
  const { enter } = useSupportMode();
  const update = useUpdateClient();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [paying, setPaying] = useState<PlatformClient | null>(null);
  const [editing, setEditing] = useState<PlatformClient | null>(null);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return clients
      .filter((c) => !t || [c.name, c.rif, c.owner?.email, c.owner?.name].some((v) => v?.toLowerCase().includes(t)))
      .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.name.localeCompare(b.name));
  }, [clients, q]);

  const ownOrgId = ctx && !ctx.support_mode ? ctx.organization.id : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-lg">Clientes</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, RIF o correo" className="bg-input border-border pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando clientes…</p>
        ) : !rows.length ? (
          <p className="text-sm text-muted-foreground">No hay clientes{q ? ' que coincidan' : ''}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="clients-table">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Cliente</th>
                  <th className="py-2 pr-3 font-medium">Plan</th>
                  <th className="py-2 pr-3 font-medium">Sedes</th>
                  <th className="py-2 pr-3 font-medium">Socios</th>
                  <th className="py-2 pr-3 font-medium">Próximo pago</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.owner ? `${c.owner.name} · ${c.owner.email}` : 'Sin Dueño'}{c.rif ? ` · ${c.rif}` : ''}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <p>{c.plan_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.price ? `${formatMoney(Number(c.price))}/mes` : 'Precio por definir'}
                        {c.monthly_price !== null && ' (especial)'}
                      </p>
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{c.branches} / {c.max_branches}</td>
                    <td className="py-3 pr-3 tabular-nums">
                      {c.active_members}
                      <span className="text-xs text-muted-foreground"> / {c.members}</span>
                    </td>
                    <td className={`py-3 pr-3 ${c.state === 'vencida' ? 'text-[#ff3b5c]' : c.state === 'por_vencer' ? 'text-[#eab308]' : ''}`}>
                      {dueText(c)}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={STATE_TONE[c.state]}>{STATE_LABEL[c.state]}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setPaying(c)}>
                          <DollarSign className="mr-1 h-3.5 w-3.5" /> Registrar pago
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={`Más acciones de ${c.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(c)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar plan y datos
                            </DropdownMenuItem>
                            {c.id !== ownOrgId && (
                              <DropdownMenuItem
                                disabled={enter.isPending}
                                onClick={() => enter.mutate(c.id, { onSuccess: () => navigate('/') })}
                              >
                                <LifeBuoy className="mr-2 h-4 w-4" /> Entrar como soporte
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {c.status === 'Suspendida' ? (
                              <DropdownMenuItem onClick={() => update.mutate({ id: c.id, data: { status: 'Activa' } })}>
                                <Power className="mr-2 h-4 w-4" /> Reactivar
                              </DropdownMenuItem>
                            ) : c.status === 'Activa' ? (
                              <DropdownMenuItem
                                className="text-[#ff3b5c]"
                                onClick={() => update.mutate({ id: c.id, data: { status: 'Suspendida' } })}
                              >
                                <Power className="mr-2 h-4 w-4" /> Suspender (solo aviso)
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <RegisterPaymentDialog client={paying} onClose={() => setPaying(null)} />
      <EditClientDialog client={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}

/* ---------------------------- Registrar pago --------------------------- */

function RegisterPaymentDialog({ client, onClose }: { client: PlatformClient | null; onClose: () => void }) {
  const register = useRegisterPlatformPayment();
  const today = toDateOnly(new Date());
  const [f, setF] = useState({ amount: '', method: 'Zelle', reference: '', paidAt: today, months: 1, notes: '' });

  useEffect(() => {
    if (client) {
      setF({ amount: client.price ? String(Number(client.price)) : '', method: 'Zelle', reference: '', paidAt: today, months: 1, notes: '' });
    }
  }, [client]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = num(f.amount);
  const valid = amount > 0 && !!f.method && f.paidAt <= today;
  const period = client ? coveredPeriod(client.next_due_date, f.paidAt, f.months) : null;

  return (
    <Dialog open={!!client} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>{client?.name} · {client?.plan_name ?? 'Sin plan'}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!client || !valid) return;
            register.mutate(
              { orgId: client.id, amount, method: f.method, reference: f.reference, paidAt: f.paidAt, months: f.months, notes: f.notes },
              { onSuccess: onClose },
            );
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pp-months">Meses</Label>
              <Select
                value={String(f.months)}
                onValueChange={(v) => {
                  const m = Number(v);
                  setF({ ...f, months: m, amount: client?.price ? String(Number(client.price) * m) : f.amount });
                }}
              >
                <SelectTrigger id="pp-months" className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map((m) => <SelectItem key={m} value={String(m)}>{m} {m === 1 ? 'mes' : 'meses'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-amount">Monto ($)</Label>
              <Input id="pp-amount" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="bg-input border-border tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-method">Método</Label>
              <Select value={f.method} onValueChange={(v) => setF({ ...f, method: v })}>
                <SelectTrigger id="pp-method" className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-date">Fecha del pago</Label>
              <Input id="pp-date" type="date" max={today} value={f.paidAt} onChange={(e) => e.target.value && setF({ ...f, paidAt: e.target.value })} className="bg-input border-border [color-scheme:dark]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-ref">Referencia</Label>
            <Input id="pp-ref" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pp-notes">Nota</Label>
            <Textarea id="pp-notes" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="bg-input border-border" />
          </div>
          {period && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm" data-testid="pp-preview">
              <p>Cubre del <strong>{fmtDate(period.start)}</strong> al <strong>{fmtDate(period.end)}</strong>.</p>
              <p className="text-muted-foreground">Próximo pago: {fmtDate(period.next)}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!valid || register.isPending}>
              {register.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar {amount > 0 ? formatMoney(amount) : ''}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- Editar cliente --------------------------- */

function EditClientDialog({ client, onClose }: { client: PlatformClient | null; onClose: () => void }) {
  const { data: plans = [] } = usePlatformPlans();
  const update = useUpdateClient();
  const [f, setF] = useState({
    name: '', rif: '', email: '', phone: '', plan_id: '', monthly_price: '', max_branches: '1',
    next_due_date: '', status: 'Activa' as PlatformClient['status'], notes: '',
  });

  useEffect(() => {
    if (!client) return;
    setF({
      name: client.name, rif: client.rif ?? '', email: client.email ?? '', phone: client.phone ?? '',
      plan_id: client.plan_id ?? '', monthly_price: client.monthly_price !== null ? String(client.monthly_price) : '',
      max_branches: String(client.max_branches), next_due_date: client.next_due_date ?? '',
      status: client.status, notes: client.notes ?? '',
    });
  }, [client]);

  const plan = plans.find((p) => p.id === f.plan_id);
  const maxBranches = Math.trunc(num(f.max_branches));
  const price = f.monthly_price.trim() ? num(f.monthly_price) : null;
  const errors = {
    name: f.name.trim().length < 2,
    max: !(maxBranches >= 1) || (client ? maxBranches < client.branches : false),
    price: price !== null && !(price >= 0),
  };
  const valid = !errors.name && !errors.max && !errors.price;

  return (
    <Dialog open={!!client} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>Plan, mensualidad, límite de sedes y fecha de pago.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!client || !valid) return;
            update.mutate(
              {
                id: client.id,
                data: {
                  name: f.name.trim(), rif: orNull(f.rif.toUpperCase()), email: orNull(f.email.toLowerCase()), phone: orNull(f.phone),
                  plan_id: f.plan_id || null, monthly_price: price, max_branches: maxBranches,
                  next_due_date: f.next_due_date || null, status: f.status, notes: orNull(f.notes),
                },
              },
              { onSuccess: onClose },
            );
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ec-name">Nombre *</Label>
              <Input id="ec-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-rif">RIF</Label>
              <Input id="ec-rif" value={f.rif} onChange={(e) => setF({ ...f, rif: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-phone">Teléfono</Label>
              <Input id="ec-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ec-email">Correo</Label>
              <Input id="ec-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-plan">Plan</Label>
              <Select
                value={f.plan_id || undefined}
                onValueChange={(v) => {
                  const p = plans.find((x) => x.id === v);
                  setF({ ...f, plan_id: v, max_branches: p ? String(Math.max(p.max_branches, client?.branches ?? 1)) : f.max_branches });
                }}
              >
                <SelectTrigger id="ec-plan" className="bg-input border-border"><SelectValue placeholder="Elegir plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} · {formatMoney(Number(p.price_usd))}{p.is_active ? '' : ' (inactivo)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-price">Mensualidad especial ($)</Label>
              <Input
                id="ec-price"
                inputMode="decimal"
                value={f.monthly_price}
                placeholder={plan ? `${Number(plan.price_usd)} (del plan)` : 'Del plan'}
                onChange={(e) => setF({ ...f, monthly_price: e.target.value })}
                className="bg-input border-border"
                aria-invalid={errors.price}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-max">Máximo de sedes</Label>
              <Input id="ec-max" inputMode="numeric" value={f.max_branches} onChange={(e) => setF({ ...f, max_branches: e.target.value })} className="bg-input border-border" aria-invalid={errors.max} />
              {errors.max && <p className="text-xs text-[#ff3b5c]">Mínimo {Math.max(1, client?.branches ?? 1)} (sedes activas)</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-due">Próximo pago</Label>
              <Input id="ec-due" type="date" value={f.next_due_date} onChange={(e) => setF({ ...f, next_due_date: e.target.value })} className="bg-input border-border [color-scheme:dark]" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ec-status">Estado</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as PlatformClient['status'] })}>
                <SelectTrigger id="ec-status" className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activa">Activa</SelectItem>
                  <SelectItem value="Suspendida">Suspendida (solo aviso)</SelectItem>
                  <SelectItem value="Cancelada">Cancelada (ya no es cliente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ec-notes">Notas internas</Label>
              <Textarea id="ec-notes" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="bg-input border-border" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!valid || update.isPending}>
              {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Nuevo cliente --------------------------- */

function NewClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: plans = [] } = usePlatformPlans();
  const create = useCreateClient();
  const today = toDateOnly(new Date());
  const empty = {
    company: '', rif: '', companyPhone: '', companyEmail: '',
    branch: 'Sede principal', address: '',
    owner: '', ownerEmail: '', ownerPhone: '', password: '',
    plan_id: '', price: '', due: addDays(today, 30),
  };
  const [f, setF] = useState(empty);
  useEffect(() => {
    if (open) setF({ ...empty, plan_id: plans.find((p) => p.is_active)?.id ?? '' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const errors = {
    company: f.company.trim().length < 2 ? 'Escribe el nombre de la empresa' : null,
    branch: f.branch.trim().length < 2 ? 'Escribe el nombre de la sede' : null,
    owner: f.owner.trim().length < 3 ? 'Escribe el nombre del Dueño' : null,
    ownerEmail: !/^\S+@\S+\.\S+$/.test(f.ownerEmail.trim()) ? 'Correo inválido' : null,
    password: f.password.length < 8 ? 'Mínimo 8 caracteres' : null,
    price: f.price.trim() && !(num(f.price) >= 0) ? 'Monto inválido' : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  const [touched, setTouched] = useState(false);
  const err = (k: keyof typeof errors) => touched && errors[k] ? <p className="text-xs text-[#ff3b5c]">{errors[k]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTouched(false); }}>
      <DialogContent className="bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>Crea la empresa, su primera sede y la cuenta del Dueño.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!valid) return;
            create.mutate(
              {
                company: { name: f.company.trim(), rif: orNull(f.rif.toUpperCase()), email: orNull(f.companyEmail.toLowerCase()), phone: orNull(f.companyPhone) },
                branch: { name: f.branch.trim(), address: orNull(f.address) },
                owner: { name: f.owner.trim(), email: f.ownerEmail.trim().toLowerCase(), password: f.password, phone: orNull(f.ownerPhone) },
                plan_id: f.plan_id || null,
                monthly_price: f.price.trim() ? num(f.price) : null,
                next_due_date: f.due || null,
              },
              { onSuccess: () => onOpenChange(false) },
            );
          }}
        >
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="nc-company">Nombre comercial *</Label><Input id="nc-company" value={f.company} onChange={set('company')} className="bg-input border-border" />{err('company')}</div>
              <div className="space-y-1.5"><Label htmlFor="nc-rif">RIF</Label><Input id="nc-rif" value={f.rif} onChange={set('rif')} className="bg-input border-border" /></div>
              <div className="space-y-1.5"><Label htmlFor="nc-phone">Teléfono</Label><Input id="nc-phone" value={f.companyPhone} onChange={set('companyPhone')} className="bg-input border-border" /></div>
              <div className="space-y-1.5"><Label htmlFor="nc-branch">Primera sede *</Label><Input id="nc-branch" value={f.branch} onChange={set('branch')} className="bg-input border-border" />{err('branch')}</div>
              <div className="space-y-1.5"><Label htmlFor="nc-address">Dirección</Label><Input id="nc-address" value={f.address} onChange={set('address')} className="bg-input border-border" /></div>
            </div>
          </section>
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Dueño (acceso al sistema)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="nc-owner">Nombre *</Label><Input id="nc-owner" value={f.owner} onChange={set('owner')} className="bg-input border-border" />{err('owner')}</div>
              <div className="space-y-1.5"><Label htmlFor="nc-owner-phone">Teléfono</Label><Input id="nc-owner-phone" value={f.ownerPhone} onChange={set('ownerPhone')} className="bg-input border-border" /></div>
              <div className="space-y-1.5"><Label htmlFor="nc-email">Correo *</Label><Input id="nc-email" type="email" autoComplete="off" value={f.ownerEmail} onChange={set('ownerEmail')} className="bg-input border-border" />{err('ownerEmail')}</div>
              <div className="space-y-1.5"><Label htmlFor="nc-pass">Contraseña inicial *</Label><Input id="nc-pass" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} className="bg-input border-border" />{err('password')}</div>
            </div>
          </section>
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Suscripción</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="nc-plan">Plan</Label>
                <Select value={f.plan_id || undefined} onValueChange={(v) => setF({ ...f, plan_id: v })}>
                  <SelectTrigger id="nc-plan" className="bg-input border-border"><SelectValue placeholder="Elegir plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.filter((p) => p.is_active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} · {formatMoney(Number(p.price_usd))} · {p.max_branches} sede{p.max_branches === 1 ? '' : 's'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="nc-price">Mensualidad especial ($)</Label><Input id="nc-price" inputMode="decimal" placeholder="Del plan" value={f.price} onChange={set('price')} className="bg-input border-border" />{err('price')}</div>
              <div className="space-y-1.5"><Label htmlFor="nc-due">Primer pago</Label><Input id="nc-due" type="date" value={f.due} onChange={set('due')} className="bg-input border-border [color-scheme:dark]" /></div>
            </div>
          </section>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear cliente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Pagos --------------------------------- */

function PaymentsTab() {
  const { data: payments = [], isLoading } = usePlatformPayments();
  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-lg">Pagos recibidos</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !payments.length ? (
          <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Cliente</th>
                  <th className="py-2 pr-3 font-medium">Método</th>
                  <th className="py-2 pr-3 font-medium">Cubre</th>
                  <th className="py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">{fmtDate(p.paid_at)}</td>
                    <td className="py-2 pr-3">{p.organizations?.name ?? '—'}</td>
                    <td className="py-2 pr-3">{p.method}{p.reference ? <span className="text-muted-foreground"> · {p.reference}</span> : null}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{fmtDate(p.period_start)} – {fmtDate(p.period_end)} ({p.months} m)</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{formatMoney(Number(p.amount_usd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------- Planes -------------------------------- */

function PlansTab() {
  const { data: plans = [], isLoading } = usePlatformPlans();
  const { data: clients = [] } = usePlatformClients();
  const [editing, setEditing] = useState<PlatformPlan | 'new' | null>(null);
  const usage = (id: string) => clients.filter((c) => c.plan_id === id).length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Planes del sistema</CardTitle>
        <Button size="sm" onClick={() => setEditing('new')}><Plus className="mr-1.5 h-4 w-4" /> Nuevo plan</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-lg border border-border p-4 ${p.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-2xl font-semibold tabular-nums">{formatMoney(Number(p.price_usd))}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Hasta {p.max_branches} sede{p.max_branches === 1 ? '' : 's'}</p>
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <UsersIcon className="h-3.5 w-3.5" /> {usage(p.id)} cliente{usage(p.id) === 1 ? '' : 's'}
                  {!p.is_active && ' · inactivo'}
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" /> Cambiar el precio de un plan afecta la mensualidad de los clientes que lo usan, salvo los que tienen precio especial.
        </p>
      </CardContent>
      <PlanDialog plan={editing === 'new' ? null : editing} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </Card>
  );
}

function PlanDialog({ plan, open, onOpenChange }: { plan: PlatformPlan | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSavePlan();
  const [f, setF] = useState({ name: '', price: '', max: '1', description: '', active: true });
  useEffect(() => {
    if (open) {
      setF({
        name: plan?.name ?? '', price: plan ? String(Number(plan.price_usd)) : '', max: String(plan?.max_branches ?? 1),
        description: plan?.description ?? '', active: plan?.is_active ?? true,
      });
    }
  }, [open, plan]);
  const price = num(f.price);
  const max = Math.trunc(num(f.max));
  const valid = f.name.trim().length >= 2 && price >= 0 && f.price.trim() !== '' && max >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar plan' : 'Nuevo plan'}</DialogTitle>
          <DialogDescription>Precio mensual en dólares y sedes incluidas.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            save.mutate(
              { id: plan?.id, data: { name: f.name.trim(), price_usd: price, max_branches: max, description: orNull(f.description), is_active: f.active } },
              { onSuccess: () => onOpenChange(false) },
            );
          }}
        >
          <div className="space-y-1.5"><Label htmlFor="pl-name">Nombre *</Label><Input id="pl-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="bg-input border-border" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="pl-price">Precio mensual ($) *</Label><Input id="pl-price" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="bg-input border-border" /></div>
            <div className="space-y-1.5"><Label htmlFor="pl-max">Sedes incluidas *</Label><Input id="pl-max" inputMode="numeric" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} className="bg-input border-border" /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="pl-desc">Descripción</Label><Textarea id="pl-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="bg-input border-border" /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /> Disponible para clientes nuevos</label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!valid || save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {plan ? 'Guardar' : 'Crear plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
