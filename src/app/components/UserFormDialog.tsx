/**
 * Formulario de socio (crear / editar) en panel lateral, por secciones:
 *  1. Datos personales  2. Contacto  3. Membresía  4. Salud y notas (opcional)
 *
 * Reglas:
 *  - No envía next_payment / paid_until: los calcula la base a partir de las facturas.
 *  - "Suspendido" lo pone y lo quita el sistema según los pagos; aquí solo Activo / Inactivo.
 *  - Avisa antes de guardar si la cédula o el email ya pertenecen a otro socio.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, HeartPulse, IdCard, Info, Loader2, Phone, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { userSchema, type UserFormData, type UserFormInput } from '../lib/validations';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import { usePlans } from '../hooks/usePlans';
import { findDuplicateMember } from '../hooks/useMembers';
import { ActivationModal } from './ActivationModal';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { formatMoney, toDateOnly } from '../lib/dashboardHelpers';
import { ageOn, birthDateError, maskDate, normalizeHeight, parseDateInput, toDisplayDate } from '../lib/memberFields';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Socio a editar; sin él, se crea uno nuevo. */
  user?: any;
}

const GENDERS = ['Masculino', 'Femenino', 'Otro'] as const;

/** yyyy-MM-dd de un valor de la base (date, timestamp o dd/mm/yyyy). */
function toInputDate(v?: string | null): string {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  return '';
}

function bmi(weight?: unknown, height?: unknown): number | null {
  const w = Number(weight);
  const h = Number(height);
  if (!w || !h) return null;
  return Math.round((w / (h / 100) ** 2) * 10) / 10;
}

function bmiLabel(v: number) {
  if (v < 18.5) return { label: 'Bajo peso', cls: 'text-[#eab308]' };
  if (v < 25) return { label: 'Normal', cls: 'text-[#10f94e]' };
  if (v < 30) return { label: 'Sobrepeso', cls: 'text-[#eab308]' };
  return { label: 'Obesidad', cls: 'text-[#ff3b5c]' };
}

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: plansData, isLoading: loadingPlans } = usePlans();
  // Planes activos + el plan actual del socio aunque esté desactivado (si no, no se vería)
  const plans = ((plansData ?? []) as any[]).filter((p) => p.is_active || p.id === user?.plan_id);
  const [activationData, setActivationData] = useState<{ token: string; userName: string; userEmail: string } | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);
  const today = toDateOnly(new Date());
  const isSuspended = user?.status === 'Suspendido';

  const defaults = useMemo<Record<string, unknown>>(
    () =>
      user
        ? {
            name: user.name ?? '',
            email: user.email ?? '',
            cedula: user.cedula ?? '',
            phone: user.phone ?? '',
            birth_date: toDisplayDate(toInputDate(user.birth_date) || user.birth_date),
            gender: user.gender ?? '',
            address: user.address ?? '',
            emergency_contact: user.emergency_contact ?? '',
            plan: user.plan ?? '',
            plan_id: user.plan_id ?? '',
            status: user.status ?? 'Activo',
            start_date: toInputDate(user.start_date),
            weight: user.weight != null ? String(user.weight) : '',
            height: user.height != null ? String(user.height) : '',
            notes: user.notes ?? '',
            medical_notes: user.medical_notes ?? '',
            is_free_user: user.is_free_user === true,
          }
        : { status: 'Activo', start_date: today, is_free_user: false, gender: '', plan_id: '' },
    [user, today],
  );

  const {
    register, handleSubmit, reset, control, watch, setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormInput, unknown, UserFormData>({ resolver: zodResolver(userSchema), defaultValues: defaults as any, mode: 'onTouched' });

  // Cargar los datos cada vez que se abre (los Select ahora son controlados: se ven al editar)
  useEffect(() => {
    if (open) {
      reset(defaults as any);
      setHealthOpen(!!(user?.medical_notes || user?.notes || user?.weight || user?.height));
    }
  }, [open, defaults, reset, user]);

  const planId = watch('plan_id');
  const isFree = watch('is_free_user');
  const currentBmi = bmi(watch('weight'), normalizeHeight(Number(String(watch('height') ?? '').replace(',', '.')) || undefined));
  const birthText = watch('birth_date') as string | undefined;
  const birthIso = parseDateInput(birthText);
  const birthHint = birthIso && !birthDateError(birthText, today) ? `${ageOn(birthIso, today)} años` : 'Opcional';

  const onSubmit = async (data: UserFormData) => {
    // 1) Duplicados con mensaje claro
    try {
      const dup = await findDuplicateMember({ cedula: data.cedula, email: data.email }, user?.id);
      if (dup) {
        setError(dup.field, { message: `Ya pertenece a ${dup.name}` });
        return;
      }
    } catch {
      /* si falla la verificación, la base igual lo impide */
    }

    const plan = plans.find((p: any) => p.id === data.plan_id);
    const payload: Record<string, unknown> = {
      // El schema ya normaliza: espacios, email en minúsculas, cédula solo dígitos, teléfono 0414-1234567
      name: data.name,
      email: data.email,
      cedula: data.cedula,
      phone: data.phone,
      birth_date: emptyToNull(data.birth_date),
      gender: emptyToNull(data.gender), // '' violaría el CHECK de la base
      address: emptyToNull(data.address?.trim()),
      emergency_contact: emptyToNull(data.emergency_contact?.trim()),
      plan_id: emptyToNull(data.plan_id),
      plan: plan?.name ?? null,
      is_free_user: data.is_free_user === true,
      weight: data.weight ?? null,
      height: data.height ?? null,
      imc: bmi(data.weight, data.height),
      notes: emptyToNull(data.notes?.trim()),
      medical_notes: emptyToNull(data.medical_notes?.trim()),
    };
    // El estado Suspendido no se toca desde aquí
    if (!isSuspended) payload.status = data.status === 'Inactivo' ? 'Inactivo' : 'Activo';
    if (!isEdit) payload.start_date = data.start_date || today;

    try {
      if (isEdit) {
        await updateUser.mutateAsync({ id: user.id, data: payload as any });
        toast.success('Socio actualizado');
        onOpenChange(false);
      } else {
        const result = await createUser.mutateAsync(payload as any);
        onOpenChange(false);
        setActivationData({ token: result.activationToken, userName: data.name, userEmail: data.email });
      }
    } catch (error: any) {
      const msg = String(error?.message ?? '');
      if (msg.includes('users_cedula_key')) setError('cedula', { message: 'Ya existe un socio con esta cédula' });
      else if (msg.includes('users_email_key')) setError('email', { message: 'Ya existe un socio con este email' });
      // otros errores ya se muestran como toast en el hook
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
        <SheetContent side="right" className="w-full gap-0 bg-card p-0 sm:max-w-xl" data-testid="user-form">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="text-2xl">{isEdit ? `Editar ${user.name}` : 'Nuevo socio'}</SheetTitle>
            <SheetDescription>
              {isEdit ? 'Los cambios se guardan al presionar Guardar.' : 'Completa los datos básicos; lo demás se puede agregar después.'}
            </SheetDescription>
          </SheetHeader>

          <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-8 overflow-y-auto px-6 py-6" noValidate>
            <Section icon={IdCard} title="Datos personales">
              <Field label="Nombre completo" required error={errors.name?.message} className="sm:col-span-2">
                <Input {...register('name')} autoComplete="off" placeholder="Nombre y apellido" autoFocus={!isEdit} />
              </Field>
              <Field label="Cédula" required error={errors.cedula?.message} hint="Se guardan solo los números">
                <Input {...register('cedula')} inputMode="numeric" placeholder="V-12345678" autoComplete="off" />
              </Field>
              <Field label="Fecha de nacimiento" error={errors.birth_date?.message} hint={birthHint}>
                <Controller
                  control={control}
                  name="birth_date"
                  render={({ field }) => (
                    <Input
                      name={field.name}
                      ref={field.ref}
                      value={(field.value as string | undefined) ?? ''}
                      onChange={(e) => field.onChange(maskDate(e.target.value))}
                      onBlur={field.onBlur}
                      inputMode="numeric"
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      autoComplete="off"
                      aria-invalid={!!errors.birth_date}
                      data-testid="input-birth-date"
                    />
                  )}
                />
              </Field>
              <Field label="Género" className="sm:col-span-2">
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Segmented
                      options={GENDERS.map((g) => ({ value: g, label: g }))}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(field.value === v ? '' : v)}
                      ariaLabel="Género"
                    />
                  )}
                />
              </Field>
            </Section>

            <Section icon={Phone} title="Contacto">
              <Field label="Teléfono" required error={errors.phone?.message}>
                <Input {...register('phone')} inputMode="tel" placeholder="0414-1234567" autoComplete="off" />
              </Field>
              <Field label="Email" required error={errors.email?.message} hint="Para activar su cuenta en la app">
                <Input type="email" {...register('email')} placeholder="nombre@correo.com" autoComplete="off" />
              </Field>
              <Field label="Dirección" error={errors.address?.message} className="sm:col-span-2">
                <Input {...register('address')} placeholder="Sector, ciudad" />
              </Field>
              <Field label="Contacto de emergencia" error={errors.emergency_contact?.message} className="sm:col-span-2" hint="Nombre, parentesco y teléfono">
                <Input {...register('emergency_contact')} placeholder="María Pérez (madre) · 0412-9876543" />
              </Field>
            </Section>

            <Section icon={UserRound} title="Membresía">
              <Field label="Plan" className="sm:col-span-2" error={errors.plan_id?.message}>
                <Controller
                  control={control}
                  name="plan_id"
                  render={({ field }) =>
                    loadingPlans ? (
                      <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
                        {plans.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={field.value === p.id}
                            onClick={() => field.onChange(p.id)}
                            className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              field.value === p.id ? 'border-[#10f94e] bg-[#10f94e]/10' : 'border-border hover:bg-muted/50'
                            }`}
                            data-testid={`plan-${p.id}`}
                          >
                            <span className="block font-medium">
                              {p.name}
                              {!p.is_active && <span className="ml-1 text-xs font-normal text-muted-foreground">(ya no se ofrece)</span>}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {formatMoney(Number(p.price))} · {p.duration_days} días
                            </span>
                          </button>
                        ))}
                        {plans.length === 0 && <p className="text-sm text-muted-foreground">No hay planes activos. Créalos en Planes.</p>}
                      </div>
                    )
                  }
                />
                {!planId && !isFree && !loadingPlans && plans.length > 0 && (
                  <p className="mt-1 text-xs text-[#eab308]">Sin plan no se le genera factura.</p>
                )}
              </Field>

              {isEdit ? (
                <Field label="Socio desde">
                  <Input value={toInputDate(user.start_date) ? toInputDate(user.start_date).split('-').reverse().join('/') : '—'} disabled readOnly />
                </Field>
              ) : (
                <Field label="Fecha de inicio" error={errors.start_date?.message} hint="La primera factura es la del mes en curso">
                  <Input type="date" min="2000-01-01" {...register('start_date')} />
                </Field>
              )}

              <Field label="Estado">
                {isSuspended ? (
                  <div className="flex items-start gap-2 rounded-md border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 px-3 py-2 text-sm">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#ff3b5c]" aria-hidden />
                    <span>Suspendido por falta de pago. Se reactiva solo al cobrarle la deuda.</span>
                  </div>
                ) : (
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Segmented
                        options={[{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }]}
                        value={field.value}
                        onChange={field.onChange}
                        ariaLabel="Estado"
                      />
                    )}
                  />
                )}
              </Field>

              <Controller
                name="is_free_user"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-3 sm:col-span-2">
                    <div>
                      <Label htmlFor="is_free_user">Exento de pago</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {field.value
                          ? 'No se le generan facturas ni se le suspende por falta de pago.'
                          : 'Se le factura según su plan.'}
                      </p>
                    </div>
                    <Switch id="is_free_user" checked={field.value === true} onCheckedChange={field.onChange} data-testid="switch-free-user" />
                  </div>
                )}
              />
            </Section>

            <section className="rounded-lg border border-border">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setHealthOpen((v) => !v)}
                aria-expanded={healthOpen}
              >
                <span className="flex items-center gap-2 font-medium">
                  <HeartPulse className="h-4 w-4 text-muted-foreground" aria-hidden /> Salud y notas
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${healthOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {healthOpen && (
                <div className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-3">
                  <Field label="Peso (kg)" error={errors.weight?.message}>
                    <Input type="number" step="0.1" inputMode="decimal" {...register('weight')} placeholder="70" />
                  </Field>
                  <Field label="Estatura (cm)" error={errors.height?.message}>
                    <Input type="number" step="0.1" inputMode="decimal" {...register('height')} placeholder="175" title="En centímetros; si escribes 1.75 se convierte a 175" />
                  </Field>
                  <Field label="IMC">
                    <div className="flex h-9 items-center text-sm">
                      {currentBmi ? (
                        <>
                          <span className="font-medium tabular-nums">{currentBmi}</span>
                          <span className={`ml-2 text-xs ${bmiLabel(currentBmi).cls}`}>{bmiLabel(currentBmi).label}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Se calcula solo</span>
                      )}
                    </div>
                  </Field>
                  <Field label="Notas médicas" className="sm:col-span-3" hint="Lesiones, alergias, condiciones. Se muestran destacadas en el perfil.">
                    <Textarea rows={2} {...register('medical_notes')} placeholder="Ej.: lesión de rodilla izquierda, asma" />
                  </Field>
                  <Field label="Notas generales" className="sm:col-span-3">
                    <Textarea rows={2} {...register('notes')} placeholder="Ej.: prefiere entrenar en la mañana" />
                  </Field>
                </div>
              )}
            </section>
          </form>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-card px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="user-form"
              disabled={isSubmitting}
              className="min-w-36 bg-[#10f94e] font-semibold text-black hover:bg-[#0ed145]"
              data-testid="btn-save-user"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…
                </>
              ) : isEdit ? (
                'Guardar cambios'
              ) : (
                'Crear socio'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {activationData && (
        <ActivationModal
          open={!!activationData}
          onOpenChange={(o: boolean) => !o && setActivationData(null)}
          activationToken={activationData.token}
          userName={activationData.userName}
          userEmail={activationData.userEmail}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function Section({ icon: Icon, title, children }: { icon: typeof Phone; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden /> {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label, required, error, hint, className = '', children,
}: { label: string; required?: boolean; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className={error ? 'text-[#ff3b5c]' : ''}>
        {label}
        {required && <span className="ml-0.5 text-[#ff3b5c]" aria-hidden>*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-[#ff3b5c]" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Segmented({ options, value, onChange, ariaLabel }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; ariaLabel: string;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            value === o.value ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
