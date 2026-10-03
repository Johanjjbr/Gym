/**
 * Mi empresa
 *  - Datos de la empresa (nombre, razón social, RIF, contacto, logo)
 *  - Sedes: crear, editar, activar/desactivar (hasta el límite del plan)
 *  - Suscripción al sistema: plan, próximo pago e historial (solo lectura)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarClock, Check, Dumbbell, ImageUp, Loader2, MapPin, Pencil, Phone, Plus, Power, Receipt, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { useOrgContext } from '../hooks/useOrgContext';
import {
  branchCode, useCompanyBranches, useSaveBranch, useSubscriptionPayments, useToggleBranch, useUpdateCompany,
  type BranchInput, type BranchRow, type CompanyInput,
} from '../hooks/useCompany';
import { STATE_LABEL, STATE_TONE } from '../lib/orgContext';
import { formatMoney } from '../lib/dashboardHelpers';
import { dataUrlKb, fileToLogoDataUrl, isLogoDataUrl, LOGO_ACCEPT } from '../lib/logoImage';
import { fmtDate } from '../lib/billing';

const orNull = (v: string) => (v.trim() ? v.trim() : null);

export function CompanyPage() {
  const { data: ctx } = useOrgContext();
  const { canAccess } = useModulePermissions();
  const canEdit = canAccess('/gimnasios', 'edit') || canAccess('/gimnasios', 'create');

  if (!ctx) {
    return <p className="text-muted-foreground">No se pudo cargar la información de la empresa.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl mb-1">Mi empresa</h1>
        <p className="text-muted-foreground">Datos de la empresa, sedes y suscripción al sistema.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CompanyCard canEdit={canEdit} />
        <SubscriptionCard />
      </div>
      <BranchesCard canEdit={canEdit} maxBranches={ctx.organization.max_branches} />
    </div>
  );
}

/* ----------------------------- Datos ----------------------------------- */

function CompanyCard({ canEdit }: { canEdit: boolean }) {
  const { data: ctx } = useOrgContext();
  const save = useUpdateCompany();
  const org = ctx!.organization;
  const initial = useMemo(
    () => ({
      name: org.name ?? '', legal_name: org.legal_name ?? '', rif: org.rif ?? '',
      email: org.email ?? '', phone: org.phone ?? '', logo_url: org.logo_url ?? '',
    }),
    [org],
  );
  const [f, setF] = useState(initial);
  useEffect(() => setF(initial), [initial]);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const nameError = f.name.trim().length < 2 ? 'Escribe el nombre de la empresa' : null;
  const emailError = f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim()) ? 'Correo inválido' : null;
  const valid = !nameError && !emailError;

  const field = (key: keyof typeof f, label: string, props: React.ComponentProps<typeof Input> = {}, error?: string | null) => (
    <div className="space-y-1.5">
      <Label htmlFor={`org-${key}`}>{label}</Label>
      <Input
        id={`org-${key}`}
        value={f[key]}
        disabled={!canEdit}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        className="bg-input border-border"
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className="text-xs text-[#ff3b5c]">{error}</p>}
    </div>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-primary" /> Datos de la empresa</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid || !dirty) return;
            const data: CompanyInput = {
              name: f.name.trim(), legal_name: orNull(f.legal_name), rif: orNull(f.rif.toUpperCase()),
              email: orNull(f.email.toLowerCase()), phone: orNull(f.phone), logo_url: f.logo_url || null,
            };
            save.mutate({ id: org.id, data });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {field('name', 'Nombre comercial *', { placeholder: 'GYM Lagunetica' }, nameError)}
            {field('legal_name', 'Razón social', { placeholder: 'Inversiones Lagunetica, C.A.' })}
            {field('rif', 'RIF', { placeholder: 'J-12345678-9' })}
            {field('phone', 'Teléfono', { placeholder: '0414-1234567', inputMode: 'tel' })}
            {field('email', 'Correo', { placeholder: 'contacto@gimnasio.com', type: 'email' }, emailError)}
          </div>
          <LogoField value={f.logo_url} disabled={!canEdit} onChange={(v) => setF({ ...f, logo_url: v })} />
          <p className="text-xs text-muted-foreground">El nombre y el logo se muestran en el menú y en las facturas.</p>
          {canEdit && (
            <div className="flex justify-end gap-2">
              {dirty && <Button type="button" variant="outline" onClick={() => setF(initial)}>Descartar</Button>}
              <Button type="submit" disabled={!dirty || !valid || save.isPending}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Guardar cambios
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/** Subir / cambiar / quitar el logo. Se guarda al pulsar "Guardar cambios". */
function LogoField({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const has = isLogoDataUrl(value);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await fileToLogoDataUrl(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>Logo</Label>
      <div className="flex items-center gap-4 rounded-md border border-border bg-muted/20 p-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
          {has ? (
            <img src={value} alt="Logo de la empresa" className="h-full w-full object-contain" data-testid="logo-preview" />
          ) : (
            <Dumbbell className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">
            {has ? `Logo cargado · ${dataUrlKb(value)} KB` : 'PNG, JPG, WEBP o SVG. Se ajusta a 256 px.'}
          </p>
          {!disabled && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={input}
                type="file"
                accept={LOGO_ACCEPT}
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
                data-testid="logo-input"
              />
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
                {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImageUp className="mr-1.5 h-3.5 w-3.5" />}
                {has ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              {has && (
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onChange('')}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Quitar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-[#ff3b5c]">{error}</p>}
    </div>
  );
}

/* ---------------------------- Suscripción ------------------------------ */

function SubscriptionCard() {
  const { data: ctx } = useOrgContext();
  const sub = ctx?.subscription;
  const payments = useSubscriptionPayments(sub ? ctx?.organization.id : undefined);
  if (!sub) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Receipt className="h-5 w-5 text-primary" /> Suscripción al sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Info label="Plan" value={sub.plan ?? '—'} />
          <Info label="Mensualidad" value={sub.price ? formatMoney(Number(sub.price)) : 'Por definir'} />
          <Info label="Sedes" value={`hasta ${ctx!.organization.max_branches}`} />
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <Badge variant="outline" className={`mt-1 ${STATE_TONE[sub.state]}`} data-testid="sub-state">{STATE_LABEL[sub.state]}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          {sub.next_due_date ? (
            <span>
              Próximo pago: <strong>{fmtDate(sub.next_due_date)}</strong>
              {sub.days_left !== null && sub.days_left >= 0 && (
                <span className="text-muted-foreground"> · {sub.days_left === 0 ? 'hoy' : `en ${sub.days_left} día${sub.days_left === 1 ? '' : 's'}`}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Tu proveedor aún no ha fijado la fecha de pago.</span>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Pagos realizados</p>
          {payments.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : !payments.data?.length ? (
            <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {payments.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <div>
                    <p>{fmtDate(p.paid_at)} · {p.method}{p.reference ? ` · Ref. ${p.reference}` : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      Cubre {fmtDate(p.period_start)} – {fmtDate(p.period_end)} ({p.months} mes{p.months === 1 ? '' : 'es'})
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatMoney(Number(p.amount_usd))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 font-medium">{value}</p>
  </div>
);

/* ------------------------------ Sedes ---------------------------------- */

function BranchesCard({ canEdit, maxBranches }: { canEdit: boolean; maxBranches: number }) {
  const { data: branches = [], isLoading } = useCompanyBranches();
  const toggle = useToggleBranch();
  const [editing, setEditing] = useState<BranchRow | 'new' | null>(null);
  const active = branches.filter((b) => b.is_active !== false);
  const atLimit = active.length >= maxBranches;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="h-5 w-5 text-primary" /> Sedes</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground" data-testid="branch-usage">
            {active.length} de {maxBranches} sede{maxBranches === 1 ? '' : 's'} de tu plan
          </p>
        </div>
        {canEdit && (
          <div className="text-right">
            <Button onClick={() => setEditing('new')} disabled={atLimit} data-testid="new-branch">
              <Plus className="mr-2 h-4 w-4" /> Nueva sede
            </Button>
            {atLimit && <p className="mt-1 text-xs text-muted-foreground">Para más sedes, pide a tu proveedor ampliar el plan.</p>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando sedes…</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {branches.map((b) => {
              const isActive = b.is_active !== false;
              const lastActive = isActive && active.length === 1;
              return (
                <div key={b.id} className={`rounded-lg border border-border p-4 ${isActive ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.code}</p>
                    </div>
                    <Badge variant="outline" className={isActive ? STATE_TONE.al_dia : STATE_TONE.cancelada}>
                      {isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {b.address && <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {b.address}</p>}
                    {b.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {b.phone}</p>}
                  </div>
                  {canEdit && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={toggle.isPending || lastActive || (!isActive && atLimit)}
                        title={lastActive ? 'Debe quedar al menos una sede activa' : !isActive && atLimit ? 'Llegaste al límite de sedes de tu plan' : undefined}
                        onClick={() => toggle.mutate({ id: b.id, active: !isActive })}
                      >
                        <Power className="mr-1.5 h-3.5 w-3.5" /> {isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <BranchDialog
        branch={editing === 'new' ? null : editing}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </Card>
  );
}

function BranchDialog({ branch, open, onOpenChange }: { branch: BranchRow | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveBranch();
  const [f, setF] = useState({ name: '', code: '', address: '', phone: '', email: '' });
  const [codeTouched, setCodeTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      name: branch?.name ?? '', code: branch?.code ?? '', address: branch?.address ?? '',
      phone: branch?.phone ?? '', email: branch?.email ?? '',
    });
    setCodeTouched(!!branch);
  }, [open, branch]);

  const nameError = f.name.trim().length < 2 ? 'Escribe el nombre de la sede' : null;
  const code = (f.code.trim() || branchCode(f.name)).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{branch ? 'Editar sede' : 'Nueva sede'}</DialogTitle>
          <DialogDescription>Los socios de la empresa pueden entrenar en todas las sedes.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameError) return;
            const data: BranchInput = {
              name: f.name.trim(), code, address: orNull(f.address), phone: orNull(f.phone), email: orNull(f.email.toLowerCase()),
            };
            save.mutate({ id: branch?.id, data }, { onSuccess: () => onOpenChange(false) });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">Nombre *</Label>
            <Input
              id="branch-name"
              autoFocus
              value={f.name}
              placeholder="Sede Centro"
              onChange={(e) => setF({ ...f, name: e.target.value, code: codeTouched ? f.code : branchCode(e.target.value) })}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-code">Código</Label>
            <Input
              id="branch-code"
              value={f.code}
              placeholder={branchCode(f.name)}
              onChange={(e) => { setCodeTouched(true); setF({ ...f, code: e.target.value.toUpperCase() }); }}
              className="bg-input border-border uppercase"
            />
            <p className="text-xs text-muted-foreground">Identificador corto, único dentro de tu empresa.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-address">Dirección</Label>
            <Input id="branch-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="bg-input border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="branch-phone">Teléfono</Label>
              <Input id="branch-phone" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch-email">Correo</Label>
              <Input id="branch-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="bg-input border-border" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!!nameError || save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {branch ? 'Guardar' : 'Crear sede'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
