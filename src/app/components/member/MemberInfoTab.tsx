/**
 * Pestaña "Información" del perfil: datos agrupados por tema, con aviso de
 * datos faltantes (p. ej. contacto de emergencia) y acceso directo a Editar.
 */
import type { ReactNode } from 'react';
import { AlertCircle, ChevronRight, Dumbbell, HeartPulse, IdCard, Pencil, Phone, StickyNote, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { fmtDate } from '../../lib/billing';

interface Props {
  user: any;
  routines: any[] | undefined;
  loadingRoutines: boolean;
  onEdit: () => void;
  onAssignTrainer: () => void;
  onRemoveTrainer: () => void;
  onOpenRoutines: () => void;
}

function age(birth?: string | null): number | null {
  if (!birth) return null;
  const [y, m, d] = String(birth).slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const now = new Date();
  let a = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
  return a >= 0 && a < 120 ? a : null;
}

const IMPORTANT_FIELDS: [string, string][] = [
  ['phone', 'teléfono'],
  ['emergency_contact', 'contacto de emergencia'],
  ['cedula', 'cédula'],
  ['birth_date', 'fecha de nacimiento'],
];

export function MemberInfoTab({ user, routines, loadingRoutines, onEdit, onAssignTrainer, onRemoveTrainer, onOpenRoutines }: Props) {
  const missing = IMPORTANT_FIELDS.filter(([k]) => !user[k]).map(([, label]) => label);
  const years = age(user.birth_date);
  const imc = user.imc ? Number(user.imc) : user.weight && user.height ? Number(user.weight) / (Number(user.height) / 100) ** 2 : null;
  const activeRoutine = routines?.find((r: any) => r.is_active) ?? routines?.[0];

  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#eab308]/30 bg-[#eab308]/10 px-4 py-3 text-sm" role="status">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#eab308]" aria-hidden />
            Falta{missing.length === 1 ? '' : 'n'}: {missing.join(', ')}.
          </span>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Completar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section icon={Phone} title="Contacto">
          <Field label="Teléfono" value={user.phone} href={user.phone ? `tel:${user.phone}` : undefined} />
          <Field label="Email" value={user.email} href={user.email ? `mailto:${user.email}` : undefined} />
          <Field label="Dirección" value={user.address} wide />
          <Field label="Contacto de emergencia" value={user.emergency_contact} wide />
        </Section>

        <Section icon={IdCard} title="Datos personales">
          <Field label="Cédula" value={user.cedula} mono />
          <Field label="N° de socio" value={user.member_number} mono />
          <Field label="Nacimiento" value={user.birth_date ? `${fmtDate(String(user.birth_date))}${years !== null ? ` · ${years} años` : ''}` : null} />
          <Field label="Género" value={user.gender} />
        </Section>

        <Section
          icon={UserRound}
          title="Membresía"
          action={
            <Button variant="ghost" size="sm" onClick={onAssignTrainer}>
              {user.trainer_name ? 'Cambiar entrenador' : 'Asignar entrenador'}
            </Button>
          }
        >
          <Field label="Plan" value={user.plans?.name || user.plan} />
          <Field label="Estado" value={user.status} />
          <Field label="Socio desde" value={user.start_date ? fmtDate(String(user.start_date)) : null} />
          <div>
            <dt className="text-xs text-muted-foreground">Entrenador</dt>
            <dd className="flex items-center gap-2">
              {user.trainer_name || <span className="text-muted-foreground">Entrenamiento libre</span>}
              {user.trainer_name && (
                <button className="text-xs text-muted-foreground underline-offset-2 hover:text-[#ff3b5c] hover:underline" onClick={onRemoveTrainer}>
                  Quitar
                </button>
              )}
            </dd>
          </div>
        </Section>

        <Section icon={HeartPulse} title="Salud">
          <Field label="Peso" value={user.weight ? `${user.weight} kg` : null} />
          <Field label="Estatura" value={user.height ? `${user.height} cm` : null} />
          <Field label="IMC" value={imc ? imc.toFixed(1) : null} />
          <div />
          <Field label="Notas médicas" value={user.medical_notes} wide highlight={!!user.medical_notes} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section
          icon={Dumbbell}
          title="Rutina actual"
          action={
            <Button variant="ghost" size="sm" onClick={onOpenRoutines}>
              Ver rutinas <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          }
        >
          {loadingRoutines ? (
            <div className="col-span-2 h-10 animate-pulse rounded bg-muted/60" />
          ) : activeRoutine ? (
            <>
              <Field label="Rutina" value={activeRoutine.routine_templates?.name || 'Rutina'} />
              <Field label="Asignada por" value={activeRoutine.staff?.name} />
              <Field label="Desde" value={activeRoutine.start_date ? fmtDate(String(activeRoutine.start_date)) : null} />
              <Field label="Hasta" value={activeRoutine.end_date ? fmtDate(String(activeRoutine.end_date)) : 'Sin fecha de fin'} />
            </>
          ) : (
            <p className="col-span-2 text-sm text-muted-foreground">Sin rutina asignada.</p>
          )}
        </Section>

        <Section icon={StickyNote} title="Notas">
          <p className="col-span-2 whitespace-pre-line text-sm">
            {user.notes || <span className="text-muted-foreground">Sin notas.</span>}
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, action, children }: { icon: typeof Phone; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">{children}</dl>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, href, wide, mono, highlight }: {
  label: string; value?: string | null; href?: string; wide?: boolean; mono?: boolean; highlight?: boolean;
}) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`${mono ? 'font-mono' : ''} ${highlight ? 'mt-1 rounded-md border border-[#eab308]/30 bg-[#eab308]/10 px-2 py-1' : ''} break-words`}>
        {empty ? <span className="text-muted-foreground">—</span> : href ? <a href={href} className="hover:underline">{value}</a> : value}
      </dd>
    </div>
  );
}
