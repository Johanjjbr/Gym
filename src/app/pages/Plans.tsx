/**
 * Planes de membresía
 *  - Tarjetas con precio por período, socios que lo pagan e ingreso mensual estimado
 *  - Un solo formulario (crear/editar) con duración por botones y vista previa de la facturación
 *  - Desactivar = dejar de ofrecerlo a socios nuevos (los actuales lo siguen pagando)
 *  - Al cambiar el precio, pregunta si actualizar las facturas pendientes
 *  - Eliminar solo si ningún socio lo usa
 */
import { useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, MoreHorizontal, Pencil, Plus, Power, Tag, Trash2, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { useCreatePlan, useDeletePlan, usePlansOverview, useRepricePendingInvoices, useUpdatePlan } from '../hooks/usePlans';
import {
  billingDescription, billingPeriod, deriveType, DURATION_PRESETS, presetFor, priceLabel,
  type DurationPreset, type PlanRecord, type PlanStats,
} from '../lib/plans';
import { formatMoney } from '../lib/dashboardHelpers';
import { formatBs, toBs } from '../lib/currency';
import { useCurrentRate } from '../hooks/useExchangeRates';

const EMPTY_STATS: PlanStats = { members: 0, paying: 0, suspended: 0, monthlyRevenue: 0, pendingInvoices: 0 };

export function Plans() {
  const { canAccess } = useModulePermissions();
  const canCreate = canAccess('/planes', 'create');
  const canEdit = canAccess('/planes', 'edit');
  const canDelete = canAccess('/planes', 'delete');

  const { data, isLoading, error, refetch } = usePlansOverview();
  const update = useUpdatePlan();
  const del = useDeletePlan();

  const [formFor, setFormFor] = useState<PlanRecord | null | undefined>(undefined); // undefined = cerrado, null = nuevo
  const [toToggle, setToToggle] = useState<PlanRecord | null>(null);
  const [toDelete, setToDelete] = useState<PlanRecord | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const plans = data?.plans ?? [];
  const stats = (id: string) => data?.stats.get(id) ?? EMPTY_STATS;
  // Más usados primero; a igualdad, más baratos primero
  const byUse = (a: PlanRecord, b: PlanRecord) => stats(b.id).members - stats(a.id).members || Number(a.price) - Number(b.price);
  const active = plans.filter((p) => p.is_active).sort(byUse);
  const inactive = plans.filter((p) => !p.is_active);
  const totalRevenue = active.concat(inactive).reduce((s, p) => s + stats(p.id).monthlyRevenue, 0);

  const setActive = async (plan: PlanRecord, is_active: boolean) => {
    try {
      await update.mutateAsync({ id: plan.id, data: { is_active } as any });
      toast.success(is_active ? `${plan.name} vuelve a ofrecerse` : `${plan.name} desactivado`);
    } catch (e: any) {
      toast.error('No se pudo cambiar el plan', { description: e.message });
    }
  };

  return (
    <div className="space-y-6" data-testid="plans-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl mb-1">Planes</h1>
          <p className="text-muted-foreground">
            {data
              ? `${active.length} plan${active.length === 1 ? '' : 'es'} activo${active.length === 1 ? '' : 's'} · ingreso mensual estimado ${formatMoney(Math.round(totalRevenue))}`
              : 'Planes de membresía del gimnasio'}
          </p>
        </div>
        {canCreate && (
          <Button className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-semibold" onClick={() => setFormFor(null)} data-testid="btn-new-plan">
            <Plus className="mr-2 h-4 w-4" /> Nuevo plan
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-[#ff3b5c]/30">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-[#ff3b5c]" /> {(error as Error).message}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-xl bg-muted/50" />)}
        </div>
      ) : active.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-14 text-center text-muted-foreground">
            <Tag className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>No hay planes activos. Sin un plan, a los socios no se les puede facturar.</p>
            {canCreate && <Button className="mt-4" variant="outline" onClick={() => setFormFor(null)}>Crear un plan</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              stats={stats(p.id)}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => setFormFor(p)}
              onToggle={() => setToToggle(p)}
              onDelete={() => setToDelete(p)}
            />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <section className="space-y-3">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setShowInactive((v) => !v)} aria-expanded={showInactive}>
            <ChevronDown className={`h-4 w-4 transition-transform ${showInactive ? 'rotate-180' : ''}`} />
            Planes inactivos ({inactive.length})
          </button>
          {showInactive && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {inactive.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  stats={stats(p.id)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => setFormFor(p)}
                  onToggle={() => setActive(p, true)}
                  onDelete={() => setToDelete(p)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <PlanFormDialog
        open={formFor !== undefined}
        plan={formFor ?? null}
        plans={plans}
        pendingInvoices={formFor ? stats(formFor.id).pendingInvoices : 0}
        onClose={() => setFormFor(undefined)}
      />

      {/* Desactivar */}
      <AlertDialog open={!!toToggle} onOpenChange={(o) => !o && setToToggle(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar {toToggle?.name}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Dejará de aparecer al crear o editar socios.</p>
                {toToggle && stats(toToggle.id).members > 0 && (
                  <p>
                    Los <strong>{stats(toToggle.id).members} socios</strong> que ya lo tienen lo seguirán pagando hasta que les cambies el plan.
                    No se borra ninguna factura.
                  </p>
                )}
                {active.length === 1 && <p className="text-[#eab308]">Es el único plan activo: los socios nuevos no tendrán plan para elegir.</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toToggle && setActive(toToggle, false)}>Desactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Eliminar */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          {toDelete && stats(toDelete.id).members > 0 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>No se puede eliminar {toDelete.name}</AlertDialogTitle>
                <AlertDialogDescription>
                  Lo tienen {stats(toDelete.id).members} socio{stats(toDelete.id).members === 1 ? '' : 's'}. Cámbialos de plan primero, o desactívalo
                  para que no se ofrezca a socios nuevos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cerrar</AlertDialogCancel>
                {toDelete.is_active && (
                  <AlertDialogAction onClick={() => { const p = toDelete; setToDelete(null); setToToggle(p); }}>Desactivar</AlertDialogAction>
                )}
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar {toDelete?.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ningún socio lo usa. Las facturas antiguas de este plan se conservan, pero quedan sin plan asociado. No se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white"
                  disabled={del.isPending}
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!toDelete) return;
                    try {
                      await del.mutateAsync(toDelete.id);
                      toast.success('Plan eliminado');
                      setToDelete(null);
                    } catch (err: any) {
                      toast.error('No se pudo eliminar', { description: err.message });
                    }
                  }}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PlanCard({ plan, stats, canEdit, canDelete, onEdit, onToggle, onDelete }: {
  plan: PlanRecord; stats: PlanStats; canEdit: boolean; canDelete: boolean;
  onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const price = Number(plan.price);
  const [amount, period] = priceLabel(price, plan.duration_days, plan.type).split(/ (?=[/·])/);
  const p = billingPeriod(plan.duration_days, plan.type);
  return (
    <Card className={`bg-card border-border ${plan.is_active ? '' : 'opacity-70'}`} data-testid="plan-card">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">{plan.name}</h2>
              {plan.type === 'Promoción' && <span className="rounded-full bg-[#a855f7]/15 px-2 py-0.5 text-xs text-[#c084fc]">Promoción</span>}
              {!plan.is_active && <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">Inactivo</span>}
            </div>
            <p className="text-sm text-muted-foreground">
              {p.once ? 'Pago único' : p.months === 1 ? 'Mensual' : p.months === 12 ? 'Anual' : p.months ? `Cada ${p.months} meses` : `Cada ${p.days} días`}
            </p>
          </div>
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Acciones de ${plan.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <>
                    <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onSelect={onToggle}>
                      <Power className="mr-2 h-4 w-4" /> {plan.is_active ? 'Desactivar' : 'Volver a ofrecer'}
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onDelete} className="text-[#ff3b5c] focus:text-[#ff3b5c]">
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tabular-nums">{amount}</span>
          <span className="text-muted-foreground">{period}</span>
        </p>

        {plan.description && <p className="line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>}

        <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
          <div>
            <dt className="flex items-center gap-1 text-xs text-muted-foreground"><UsersIcon className="h-3 w-3" /> Socios</dt>
            <dd>
              <span className="font-medium tabular-nums">{stats.paying}</span>
              <span className="text-muted-foreground"> pagando</span>
              {stats.members > stats.paying && (
                <span className="block text-xs text-muted-foreground">
                  {stats.members} en total{stats.suspended ? ` · ${stats.suspended} suspendido${stats.suspended === 1 ? '' : 's'}` : ''}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ingreso estimado</dt>
            <dd className="font-medium tabular-nums">{p.once ? '—' : `${formatMoney(Math.round(stats.monthlyRevenue))} / mes`}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function PlanFormDialog({ open, plan, plans, pendingInvoices, onClose }: {
  open: boolean; plan: PlanRecord | null; plans: PlanRecord[]; pendingInvoices: number; onClose: () => void;
}) {
  const isEdit = !!plan;
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const reprice = useRepricePendingInvoices();

  const initial = useMemo(() => {
    const preset = plan ? presetFor(plan.duration_days, plan.type) : 'mensual';
    return {
      name: plan?.name ?? '',
      description: plan?.description ?? '',
      preset,
      customDays: plan && preset === 'custom' ? String(plan.duration_days) : '',
      promo: plan?.type === 'Promoción',
      price: plan ? String(Number(plan.price)) : '',
      is_active: plan?.is_active ?? true,
    };
  }, [plan]);

  const [form, setForm] = useState(initial);
  const curRate = useCurrentRate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [repriceAsk, setRepriceAsk] = useState<{ id: string; price: number; old: number } | null>(null);
  const [lastOpen, setLastOpen] = useState(false);

  // Reiniciar al abrir
  if (open && !lastOpen) {
    setLastOpen(true);
    setForm(initial);
    setErrors({});
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const presetDays = DURATION_PRESETS.find((d) => d.key === form.preset)?.days;
  const days = form.preset === 'custom' ? Number(form.customDays) : presetDays ?? 30;
  const type = deriveType(form.preset as DurationPreset, days || 1, form.promo);
  const price = Number(form.price);

  const validate = () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    if (name.length < 2) e.name = 'Escribe un nombre';
    else if (plans.some((p) => p.id !== plan?.id && p.name.trim().toLowerCase() === name.toLowerCase())) e.name = 'Ya existe un plan con ese nombre';
    if (form.preset === 'custom' && (!Number.isInteger(days) || days < 1 || days > 730)) e.days = 'Entre 1 y 730 días';
    if (!(price > 0)) e.price = 'El precio debe ser mayor a 0; con 0 no se le factura al socio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      duration_days: form.preset === 'visita' ? 1 : days,
      price,
      type,
      is_active: form.is_active,
    };
    try {
      if (plan) {
        await update.mutateAsync({ id: plan.id, data: payload as any });
        const old = Number(plan.price);
        if (old !== price && pendingInvoices > 0) {
          setRepriceAsk({ id: plan.id, price, old });
          setSaving(false);
          return;
        }
        toast.success('Plan actualizado');
      } else {
        await create.mutateAsync(payload as any);
        toast.success('Plan creado');
      }
      onClose();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg.includes('plans_name_key') || msg.toLowerCase().includes('ya existe')) setErrors({ name: 'Ya existe un plan con ese nombre' });
      else toast.error('No se pudo guardar el plan', { description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open && !repriceAsk} onOpenChange={(o) => !o && !saving && onClose()}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[92vh] overflow-y-auto" data-testid="plan-form">
          <DialogHeader>
            <DialogTitle>{isEdit ? `Editar ${plan!.name}` : 'Nuevo plan'}</DialogTitle>
            <DialogDescription>Define cuánto paga el socio y cada cuánto se le factura.</DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Nombre</Label>
              <Input id="plan-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Mensual, Estudiante, Pareja" autoFocus />
              {errors.name && <p className="text-xs text-[#ff3b5c]" role="alert">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Duración</Label>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Duración">
                {DURATION_PRESETS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    role="radio"
                    aria-checked={form.preset === d.key}
                    onClick={() => set('preset', d.key)}
                    className={`rounded-lg border px-2 py-2 text-left text-sm transition-colors ${
                      form.preset === d.key ? 'border-[#10f94e] bg-[#10f94e]/10' : 'border-border hover:bg-muted/50'
                    }`}
                    data-testid={`duration-${d.key}`}
                  >
                    <span className="block font-medium">{d.label}</span>
                    <span className="block text-xs text-muted-foreground">{d.hint}</span>
                  </button>
                ))}
              </div>
              {form.preset === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <Input type="number" min={1} max={730} inputMode="numeric" className="w-28" value={form.customDays} onChange={(e) => set('customDays', e.target.value)} placeholder="15" aria-label="Días" />
                  <span className="text-sm text-muted-foreground">días</span>
                </div>
              )}
              {errors.days && <p className="text-xs text-[#ff3b5c]" role="alert">{errors.days}</p>}
              {form.preset === 'custom' && !errors.days && type === 'Promoción' && !form.promo && (
                <p className="text-xs text-muted-foreground">Las duraciones personalizadas se muestran con la etiqueta Promoción.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Precio (USD)</Label>
              <Input id="plan-price" type="number" min={0} step="0.01" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="20" className="max-w-40" />
              {errors.price && <p className="text-xs text-[#ff3b5c]" role="alert">{errors.price}</p>}
              {price > 0 && curRate.rate && (
                <p className="text-xs text-muted-foreground">≈ {formatBs(toBs(price, curRate.rate))} a tasa BCV {curRate.state === 'today' ? 'de hoy' : 'vigente'} · se cobra en Bs al cambio del día.</p>
              )}
              {isEdit && price > 0 && Number(plan!.price) !== price && pendingInvoices > 0 && (
                <p className="text-xs text-[#eab308]">Hay {pendingInvoices} factura{pendingInvoices === 1 ? '' : 's'} pendiente{pendingInvoices === 1 ? '' : 's'} con el precio anterior; al guardar te preguntaré qué hacer con ellas.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-desc">Descripción <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <Textarea id="plan-desc" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Qué incluye, horarios, condiciones…" />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              {form.preset !== 'visita' && (
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    Es una promoción
                    <span className="block text-xs text-muted-foreground">Se destaca con una etiqueta en el plan.</span>
                  </span>
                  <Switch checked={form.promo} onCheckedChange={(v) => set('promo', v)} />
                </label>
              )}
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  Se ofrece a socios nuevos
                  <span className="block text-xs text-muted-foreground">Si lo desactivas, quienes ya lo tienen lo siguen pagando.</span>
                </span>
                <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
              </label>
            </div>

            {price > 0 && days >= 1 && (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm" data-testid="plan-preview">
                {billingDescription(price, form.preset === 'visita' ? 1 : days, type)}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="min-w-32 bg-[#10f94e] font-semibold text-black hover:bg-[#0ed145]" data-testid="btn-save-plan">
                {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ¿Actualizar facturas pendientes al precio nuevo? */}
      <AlertDialog open={!!repriceAsk}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Precio actualizado</AlertDialogTitle>
            <AlertDialogDescription>
              Hay {pendingInvoices} factura{pendingInvoices === 1 ? '' : 's'} pendiente{pendingInvoices === 1 ? '' : 's'} de este plan emitida{pendingInvoices === 1 ? '' : 's'} a{' '}
              {repriceAsk && formatMoney(repriceAsk.old)}. ¿Las pasamos a {repriceAsk && formatMoney(repriceAsk.price)}? Las vencidas no se modifican.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRepriceAsk(null); toast.success('Plan actualizado', { description: 'Las facturas pendientes mantienen el precio anterior.' }); onClose(); }}>
              Mantener {repriceAsk && formatMoney(repriceAsk.old)}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={reprice.isPending}
              onClick={async (e) => {
                e.preventDefault();
                if (!repriceAsk) return;
                try {
                  const n = await reprice.mutateAsync({ planId: repriceAsk.id, price: repriceAsk.price });
                  toast.success('Plan actualizado', { description: `${n} factura${n === 1 ? '' : 's'} pasada${n === 1 ? '' : 's'} a ${formatMoney(repriceAsk.price)}.` });
                } catch (err: any) {
                  toast.error('El plan se guardó, pero no se pudieron actualizar las facturas', { description: err.message });
                }
                setRepriceAsk(null);
                onClose();
              }}
            >
              Actualizar a {repriceAsk && formatMoney(repriceAsk.price)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
