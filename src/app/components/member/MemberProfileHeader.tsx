/**
 * Cabecera del perfil del socio. Prioriza, de un vistazo:
 *  1. Quién es y cómo contactarlo (+ alerta médica si existe)
 *  2. Facturación: si debe, si vence pronto o hasta cuándo está al día
 *  3. Asistencia: visitas del mes y última visita
 * con las acciones principales (Cobrar, Avisar, Editar) siempre visibles.
 */
import type { ReactNode } from 'react';
import {
  AlertTriangle, ArrowLeft, CalendarCheck, CheckCircle2, ChevronRight, Clock, Dumbbell, Gift, HeartPulse, Mail,
  MoreHorizontal, Pencil, Phone, Ruler, UserRound, Users, Wallet,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { NotifyButton } from '../billing/shared';
import type { MemberAccount } from '../../hooks/useMemberAccount';
import { dueInWords, fmtDate, monthLabel } from '../../lib/billing';
import { formatMoney } from '../../lib/dashboardHelpers';
import { lastVisitInWords, type AttendanceSummary, type Visit } from '../../lib/attendanceStats';
import { addDays } from '../../lib/dashboardHelpers';

export type ProfileTab = 'info' | 'pagos' | 'asistencia' | 'rutinas' | 'progreso';

interface Props {
  user: any;
  account: MemberAccount;
  attendance: { summary: AttendanceSummary; visits: Visit[]; loading: boolean };
  onBack: () => void;
  onTab: (tab: ProfileTab) => void;
  onCollect: () => void;
  onEdit: () => void;
  onAssignRoutine: () => void;
  onAssignTrainer: () => void;
  onAddMeasurement: () => void;
}

const STATUS_PILL: Record<string, string> = {
  Activo: 'bg-[#10f94e]/10 text-[#10f94e] border-[#10f94e]/30',
  Suspendido: 'bg-[#ff3b5c]/10 text-[#ff3b5c] border-[#ff3b5c]/30',
  Inactivo: 'bg-muted text-muted-foreground border-border',
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function MemberProfileHeader(p: Props) {
  const { user, account, attendance } = p;
  const since = user.start_date ? monthLabel(String(user.start_date).slice(0, 10)) : null;

  return (
    <Card className="bg-card border-border overflow-hidden" data-testid="member-header">
      {/* Identidad + acciones */}
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={p.onBack} aria-label="Volver a Usuarios">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {user.photo ? (
            <img src={user.photo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#10f94e]/15 text-xl font-semibold text-[#10f94e]">
              {initials(user.name || '?')}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl leading-tight">{user.name}</h1>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_PILL[user.status] ?? STATUS_PILL.Inactivo}`}>
                {user.status}
              </span>
              {account.exempt && (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">Exento de pago</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[user.member_number && `Socio ${user.member_number}`, user.cedula && `CI ${user.cedula}`, since && `desde ${since.toLowerCase()}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {user.phone && (
                <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Phone className="h-3.5 w-3.5" aria-hidden /> {user.phone}
                </a>
              )}
              {user.email && (
                <a href={`mailto:${user.email}`} className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{user.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-12 lg:pl-0">
          <Button
            className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-semibold"
            onClick={p.onCollect}
            disabled={!account.member || !!account.cannotCollect}
            title={account.cannotCollect ?? undefined}
            data-testid="member-btn-cobrar"
          >
            <Wallet className="mr-2 h-4 w-4" /> Cobrar
          </Button>
          <Button variant="outline" onClick={p.onEdit} data-testid="member-btn-editar">
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Más acciones">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={p.onAssignRoutine}>
                <Dumbbell className="mr-2 h-4 w-4" /> Asignar rutina
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={p.onAssignTrainer}>
                <Users className="mr-2 h-4 w-4" /> {user.trainer_name ? 'Cambiar entrenador' : 'Asignar entrenador'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={p.onAddMeasurement}>
                <Ruler className="mr-2 h-4 w-4" /> Agregar medición
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {user.medical_notes && (
        <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-[#eab308]/30 bg-[#eab308]/10 px-3 py-2 text-sm" role="note">
          <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-[#eab308]" aria-hidden />
          <span>
            <strong className="font-medium">Nota médica:</strong> {user.medical_notes}
          </span>
        </div>
      )}

      {/* Prioridades */}
      <div className="grid grid-cols-1 divide-y divide-border border-t border-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <BillingPanel account={account} onOpen={() => p.onTab('pagos')} />
        <AttendancePanel {...attendance} onOpen={() => p.onTab('asistencia')} />
        <MembershipPanel user={user} account={account} onOpen={() => p.onTab('info')} />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function Panel({ label, onOpen, action, children, testId }: { label: string; onOpen: () => void; action?: ReactNode; children: ReactNode; testId: string }) {
  return (
    <section className="flex flex-col gap-2 p-5" data-testid={testId}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground">{label}</h2>
        <button onClick={onOpen} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
          Ver detalle <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
      {action && <div className="mt-auto pt-1">{action}</div>}
    </section>
  );
}

const TONE = {
  red: 'text-[#ff3b5c]',
  amber: 'text-[#eab308]',
  green: 'text-[#10f94e]',
  muted: 'text-muted-foreground',
};

function Headline({ icon: Icon, tone, title, detail }: { icon: typeof Wallet; tone: keyof typeof TONE; title: string; detail?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={`mt-1 h-5 w-5 shrink-0 ${TONE[tone]}`} aria-hidden />
      <div className="min-w-0">
        <p className={`text-xl font-semibold leading-tight ${tone === 'muted' ? '' : TONE[tone]}`}>{title}</p>
        {detail && <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function BillingPanel({ account, onOpen }: { account: MemberAccount; onOpen: () => void }) {
  const { state, debt, next, daysLeft, member, notice, lastPaid } = account;
  let content: ReactNode;
  switch (state) {
    case 'loading':
      content = <div className="h-12 animate-pulse rounded bg-muted/60" />;
      break;
    case 'exempt':
      content = <Headline icon={Gift} tone="muted" title="Exento de pago" detail="No se le factura ni se le suspende." />;
      break;
    case 'overdue':
      content = (
        <Headline
          icon={AlertTriangle}
          tone="red"
          title={`Debe ${formatMoney(debt!.total)}`}
          detail={`${debt!.count} período${debt!.count === 1 ? '' : 's'} · desde ${monthLabel(debt!.oldestDue).toLowerCase()} · ${debt!.daysLate} día${debt!.daysLate === 1 ? '' : 's'} de atraso`}
        />
      );
      break;
    case 'due-soon':
      content = (
        <Headline
          icon={Clock}
          tone="amber"
          title={`${dueInWords(daysLeft!)} · ${formatMoney(next!.amount)}`}
          detail={`${next!.label} · ${fmtDate(next!.due)}`}
        />
      );
      break;
    case 'no-plan':
      content = <Headline icon={AlertTriangle} tone="amber" title="Sin plan" detail="Asígnale un plan desde Editar." />;
      break;
    default:
      content = (
        <Headline
          icon={CheckCircle2}
          tone="green"
          title={member?.paid_until ? `Al día hasta ${monthLabel(member.paid_until).split(' ')[0].toLowerCase()}` : 'Sin deudas'}
          detail={next ? `Próximo vencimiento ${fmtDate(next.due)} · ${formatMoney(next.amount)}` : undefined}
        />
      );
  }
  return (
    <Panel
      label="Facturación"
      onOpen={onOpen}
      testId="panel-billing"
      action={
        notice ? (
          <NotifyButton phone={member?.phone} message={notice} />
        ) : lastPaid ? (
          <p className="text-xs text-muted-foreground">
            Último pago {fmtDate(lastPaid.paid_at)} · {formatMoney(Number(lastPaid.amount))}
            {lastPaid.method ? ` · ${lastPaid.method}` : ''}
          </p>
        ) : null
      }
    >
      {content}
    </Panel>
  );
}

function AttendancePanel({ summary, visits, loading, onOpen }: { summary: AttendanceSummary; visits: Visit[]; loading: boolean; onOpen: () => void }) {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const visited = new Set(visits.map((v) => v.date));
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayStr, i - 13));
  const inactive = summary.daysSinceLast !== null && summary.daysSinceLast >= 14;

  return (
    <Panel label="Asistencia" onOpen={onOpen} testId="panel-attendance">
      {loading ? (
        <div className="h-12 animate-pulse rounded bg-muted/60" />
      ) : (
        <>
          <Headline
            icon={CalendarCheck}
            tone={summary.total === 0 || inactive ? 'amber' : 'muted'}
            title={`${summary.thisMonth} visita${summary.thisMonth === 1 ? '' : 's'} este mes`}
            detail={
              summary.lastVisit
                ? `Última: ${lastVisitInWords(summary.daysSinceLast).toLowerCase()} · ${summary.weeklyAvg.toLocaleString('es-VE')} por semana`
                : 'Todavía no registra visitas'
            }
          />
          <div className="mt-1 flex gap-1" aria-label="Últimos 14 días">
            {days.map((d) => (
              <span
                key={d}
                title={`${fmtDate(d)}${visited.has(d) ? ' · asistió' : ''}`}
                className={`h-3 flex-1 rounded-sm ${visited.has(d) ? 'bg-[#10f94e]' : 'bg-muted'} ${d === todayStr ? 'ring-1 ring-foreground/40' : ''}`}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">Últimos 14 días</p>
        </>
      )}
    </Panel>
  );
}

function MembershipPanel({ user, account, onOpen }: { user: any; account: MemberAccount; onOpen: () => void }) {
  const plan = account.plan;
  return (
    <Panel label="Membresía" onOpen={onOpen} testId="panel-membership">
      <Headline
        icon={UserRound}
        tone="muted"
        title={plan ? plan.name : user.plan || 'Sin plan'}
        detail={plan ? `${formatMoney(Number(plan.price))} cada ${plan.duration_days} días` : undefined}
      />
      <dl className="mt-1 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Entrenador</dt>
          <dd className="truncate">{user.trainer_name || 'Libre'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Socio desde</dt>
          <dd>{user.start_date ? fmtDate(String(user.start_date)) : '—'}</dd>
        </div>
      </dl>
    </Panel>
  );
}
