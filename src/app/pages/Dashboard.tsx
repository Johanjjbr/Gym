import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  DollarSign,
  RefreshCw,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatCard } from '../components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useDashboard, type DashboardData } from '../hooks/useDashboard';
import { formatCompact, formatMoney, formatShortDate } from '../lib/dashboardHelpers';

const GREEN = '#10f94e';
const AXIS = '#9494a8';
const GRID = '#2a2a3a';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, isFetching } = useDashboard();

  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl mb-1">Dashboard</h1>
          <p className="text-muted-foreground first-letter:uppercase">
            {firstName ? `Hola, ${firstName} · ` : ''}
            {todayLabel}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert className="border-[#ff3b5c]/30 bg-[#ff3b5c]/5">
          <AlertCircle className="h-5 w-5 text-[#ff3b5c]" />
          <AlertDescription className="ml-2 flex flex-wrap items-center justify-between gap-3">
            <span>
              No se pudieron cargar los datos del dashboard.{' '}
              <span className="text-muted-foreground">{(error as Error).message}</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? <DashboardSkeleton /> : data && <DashboardContent data={data} onNavigate={navigate} />}
    </div>
  );
}

function DashboardContent({ data, onNavigate }: { data: DashboardData; onNavigate: (to: string) => void }) {
  const { members, revenue, receivables: rec } = data;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Socios activos"
          value={members.active}
          icon={UserCheck}
          color="green"
          subtitle={
            <>
              de {members.total} registrados
              {members.newThisMonth > 0 && <> · <span className="text-[#10f94e]">+{members.newThisMonth} este mes</span></>}
            </>
          }
          onClick={() => onNavigate('/usuarios')}
        />
        <StatCard
          title="Ingresos del mes"
          value={formatMoney(revenue.current)}
          icon={DollarSign}
          color="green"
          trend={
            revenue.pct !== null
              ? { value: revenue.pct, isPositive: revenue.pct >= 0, label: 'vs mismo período del mes anterior' }
              : undefined
          }
          subtitle={revenue.pct === null ? 'Sin cobros el mes anterior para comparar' : undefined}
          onClick={() => onNavigate('/facturacion')}
        />
        <StatCard
          title="Por cobrar"
          value={formatMoney(rec.totalOpen)}
          icon={Receipt}
          color={rec.overdueTotal > 0 ? 'red' : 'blue'}
          subtitle={
            rec.overdueCount > 0 ? (
              <span className="text-[#ff3b5c]">
                {formatMoney(rec.overdueTotal)} vencido · {rec.overdueCount} factura{rec.overdueCount === 1 ? '' : 's'}
              </span>
            ) : rec.openCount > 0 ? (
              `${rec.openCount} factura${rec.openCount === 1 ? '' : 's'} pendiente${rec.openCount === 1 ? '' : 's'}, ninguna vencida`
            ) : (
              'Todo al día'
            )
          }
          onClick={() => onNavigate('/facturacion')}
        />
        <StatCard
          title="Asistencia hoy"
          value={data.todayAttendance}
          icon={Activity}
          color="purple"
          subtitle={
            members.active > 0
              ? `${Math.round((data.todayAttendance / members.active) * 100)}% de los socios activos`
              : undefined
          }
          onClick={() => onNavigate('/asistencia')}
        />
      </div>

      {/* Ingresos + Cobranza */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="bg-card border-border lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Ingresos mensuales</CardTitle>
            <p className="text-sm text-muted-foreground">Cobros registrados, últimos 6 meses. El mes actual va en curso.</p>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueTrend} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle>Cobranza</CardTitle>
            <Button variant="link" size="sm" className="h-auto p-0 text-[#10f94e]" onClick={() => onNavigate('/facturacion')}>
              Ir a facturación
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <section>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-[#ff3b5c]" aria-hidden /> Con deuda vencida
              </h3>
              {rec.debtors.length === 0 ? (
                <EmptyLine>Nadie tiene facturas vencidas.</EmptyLine>
              ) : (
                <ul className="divide-y divide-border">
                  {rec.debtors.slice(0, 5).map((d) => (
                    <ListRow
                      key={d.user_id}
                      onClick={() => onNavigate(`/usuarios/${d.user_id}`)}
                      title={data.nameOf(d.user_id)}
                      detail={`${d.daysLate} día${d.daysLate === 1 ? '' : 's'} de atraso${d.count > 1 ? ` · ${d.count} facturas` : ''}`}
                      amount={formatMoney(d.total)}
                      amountClass="text-[#ff3b5c]"
                    />
                  ))}
                </ul>
              )}
              {rec.debtors.length > 5 && (
                <p className="text-xs text-muted-foreground mt-2">y {rec.debtors.length - 5} más</p>
              )}
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-[#eab308]" aria-hidden /> Vencen en los próximos 7 días
              </h3>
              {rec.upcoming.length === 0 ? (
                <EmptyLine>No hay vencimientos esta semana.</EmptyLine>
              ) : (
                <ul className="divide-y divide-border">
                  {rec.upcoming.slice(0, 5).map((inv) => (
                    <ListRow
                      key={inv.id}
                      onClick={() => onNavigate(`/usuarios/${inv.user_id}`)}
                      title={data.nameOf(inv.user_id)}
                      detail={inv.daysLeft === 0 ? 'Vence hoy' : `${formatShortDate(inv.due)} · en ${inv.daysLeft} día${inv.daysLeft === 1 ? '' : 's'}`}
                      amount={formatMoney(inv.amount)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>
      </div>

      {/* Asistencia, socios, pagos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle>Asistencia</CardTitle>
            <p className="text-sm text-muted-foreground">Socios distintos por día, últimos 7 días</p>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={data.attendance} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle>Estado de socios</CardTitle>
            <p className="text-sm text-muted-foreground">{members.total} registrados</p>
          </CardHeader>
          <CardContent>
            <MemberStatus members={members} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle>Últimos pagos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <EmptyLine>Aún no hay pagos registrados.</EmptyLine>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentPayments.map((p) => (
                  <ListRow
                    key={p.id}
                    onClick={() => onNavigate(`/usuarios/${p.user_id}`)}
                    title={data.nameOf(p.user_id)}
                    detail={`${formatShortDate(p.date)}${p.method ? ` · ${p.method}` : ''}`}
                    amount={formatMoney(Number(p.amount))}
                    amountClass="text-[#10f94e]"
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Gráficos
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label, format: fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      <p className="text-muted-foreground">
        {label}
        {payload[0].payload?.isCurrent && ' (en curso)'}
        {payload[0].payload?.isToday && ' (hoy)'}
      </p>
      <p className="font-semibold tabular-nums">{fmt(payload[0].value)}</p>
    </div>
  );
}

function RevenueChart({ data }: { data: DashboardData['revenueTrend'] }) {
  const empty = data.every((m) => m.total === 0);
  if (empty) return <EmptyChart>Todavía no hay cobros en los últimos 6 meses.</EmptyChart>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} width={48} tickFormatter={formatCompact} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={<ChartTooltip format={(v: number) => formatMoney(v)} />}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((m) => (
            <Cell key={m.key} fill={GREEN} fillOpacity={m.isCurrent ? 1 : 0.55} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function AttendanceChart({ data }: { data: DashboardData['attendance'] }) {
  if (data.every((d) => d.count === 0)) {
    return <EmptyChart>No hay entradas registradas esta semana.</EmptyChart>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} interval={0} tickFormatter={(v: string) => v.split(' ')[0]} />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} width={32} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={<ChartTooltip format={(v: number) => `${v} socio${v === 1 ? '' : 's'}`} />}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((d) => (
            <Cell key={d.date} fill={GREEN} fillOpacity={d.isToday ? 1 : 0.55} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUS_ROWS = [
  { key: 'active', label: 'Activos', color: '#10f94e' },
  { key: 'suspended', label: 'Suspendidos', color: '#ff3b5c' },
  { key: 'inactive', label: 'Inactivos', color: '#6b7280' },
] as const;

function MemberStatus({ members }: { members: DashboardData['members'] }) {
  if (members.total === 0) return <EmptyLine>Aún no hay socios registrados.</EmptyLine>;
  const segments = STATUS_ROWS.map((s) => ({ ...s, value: members[s.key] })).filter((s) => s.value > 0);
  return (
    <div className="space-y-5">
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={STATUS_ROWS.map((s) => `${s.label}: ${members[s.key]}`).join(', ')}
      >
        {segments.map((s) => (
          <div key={s.key} style={{ flexGrow: s.value, backgroundColor: s.color }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <ul className="space-y-3">
        {STATUS_ROWS.map((s) => {
          const value = members[s.key];
          const pct = Math.round((value / members.total) * 100);
          return (
            <li key={s.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="tabular-nums">
                {value} <span className="text-muted-foreground">· {pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas pequeñas
// ---------------------------------------------------------------------------

function ListRow({
  title,
  detail,
  amount,
  amountClass = '',
  onClick,
}: {
  title: string;
  detail: string;
  amount: string;
  amountClass?: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between gap-3 py-2.5 text-left rounded-sm hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium truncate">{title}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
        <span className={`text-sm font-semibold tabular-nums shrink-0 ${amountClass}`}>{amount}</span>
      </button>
    </li>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-2">{children}</p>;
}

function EmptyChart({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  const block = 'animate-pulse rounded-lg bg-muted/60';
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${block} h-[118px]`} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className={`${block} h-[340px] lg:col-span-3`} />
        <div className={`${block} h-[340px] lg:col-span-2`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${block} h-[300px]`} />
        ))}
      </div>
    </div>
  );
}
