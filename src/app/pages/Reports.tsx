/**
 * Reportes mensuales: ingresos, socios y asistencia de un mes, por sede o de
 * toda la empresa. Se ven en pantalla y se descargan en PDF (imprimir) o Excel (CSV).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Download, FileText, Loader2, MapPin, Printer, TrendingUp, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useOrgContext, useSetActiveBranch } from '../hooks/useOrgContext';
import { useMonthAttendance, useMonthPayments, useReportMembers, useStatusHistory } from '../hooks/useReports';
import { branchScopeFor, scopeLabel } from '../lib/orgContext';
import { fmtDate } from '../lib/billing';
import { formatBs, formatUSD } from '../lib/currency';
import { amountLabel, type DayPayment } from '../lib/dailyPayments';
import { toDateOnly } from '../lib/dashboardHelpers';
import {
  attendanceCsv, attendanceReport, hourLabel, incomeCsv, incomeReport, membersCsv, membersReport, monthOf, monthRange, recentMonths,
  type MemberMovement,
} from '../lib/reports';
import { attendanceHtml, downloadCsv, incomeHtml, membersHtml, openPrint, type PrintHeader } from '../lib/reportPrint';

const ALL = '__all__';

const nameOf = (p: DayPayment) => p.users?.name ?? (p.member_name ? `${p.member_name} (eliminado)` : 'Socio eliminado');

export function Reports() {
  const today = toDateOnly(new Date());
  const [month, setMonth] = useState(monthOf(today));
  const [tab, setTab] = useState('ingresos');
  const { data: ctx } = useOrgContext();
  const setBranch = useSetActiveBranch();
  const months = useMemo(() => recentMonths(today, 13), [today]);

  const members = useReportMembers();
  const history = useStatusHistory();
  const payments = useMonthPayments(month);
  const attendance = useMonthAttendance(month);

  const income = useMemo(() => (payments.data ? incomeReport(month, payments.data) : null), [payments.data, month]);
  const membersR = useMemo(
    () => (members.data && history.data ? membersReport(month, members.data, history.data, today) : null),
    [members.data, history.data, month, today],
  );
  const attendanceR = useMemo(
    () => (attendance.data && members.data && history.data ? attendanceReport(month, attendance.data, members.data, history.data, today) : null),
    [attendance.data, members.data, history.data, month, today],
  );

  const scope = scopeLabel(ctx) || 'Mi gimnasio';
  const header: PrintHeader = {
    orgName: ctx?.organization.name ?? 'Gimnasio',
    rif: ctx?.organization.rif ?? undefined,
    logoUrl: ctx?.organization.logo_url ?? undefined,
    scope,
  };
  const fileBase = `${(ctx?.organization.name ?? 'gimnasio').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}_${month}`;

  const print = (html: string) => {
    if (!openPrint(html)) toast.error('El navegador bloqueó la ventana', { description: 'Permite las ventanas emergentes para este sitio.' });
  };

  const multi = (ctx?.branches.length ?? 0) > 1;
  const error = [members, history, payments, attendance].find((q) => q.error)?.error as Error | undefined;

  return (
    <div className="space-y-6" data-testid="reports">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-4xl">Reportes</h1>
          <p className="text-muted-foreground">Cierre del mes: ingresos, socios y asistencia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-48" aria-label="Mes" data-testid="report-month">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthRange(m).label}{m === monthOf(today) ? ' (en curso)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ctx && multi && ctx.can_choose_branch ? (
            <Select value={branchScopeFor(ctx) ?? ALL} onValueChange={(v) => setBranch.mutate(v === ALL ? null : v)} disabled={setBranch.isPending}>
              <SelectTrigger className="h-9 w-52" aria-label="Sede" data-testid="report-branch">
                {setBranch.isPending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <MapPin className="h-4 w-4 shrink-0" />}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las sedes</SelectItem>
                {ctx.branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {scope}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-[#ff3b5c]/40 bg-[#ff3b5c]/10 px-4 py-3 text-sm text-[#ff3b5c]">
          No se pudieron cargar los datos: {error.message}
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="ingresos"><TrendingUp className="mr-1.5 h-4 w-4" /> Ingresos</TabsTrigger>
          <TabsTrigger value="socios"><Users className="mr-1.5 h-4 w-4" /> Socios</TabsTrigger>
          <TabsTrigger value="asistencia"><UserCheck className="mr-1.5 h-4 w-4" /> Asistencia</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------ Ingresos */}
        <TabsContent value="ingresos" className="mt-4 space-y-4">
          {!income ? (
            <Loading />
          ) : (
            <>
              <Actions
                onPdf={() => print(incomeHtml(header, income, nameOf))}
                onCsv={() => downloadCsv(incomeCsv(income, nameOf), `ingresos_${fileBase}.csv`)}
                testId="income"
              />
              <Kpis
                items={[
                  ['Total equivalente', formatUSD(income.summary.totalUsd)],
                  ['Recibido en dólares', formatUSD(income.summary.usdReceived)],
                  ['Recibido en bolívares', formatBs(income.summary.vesReceived)],
                  ['Pagos', `${income.summary.count}${income.summary.voidedCount ? ` · ${income.summary.voidedCount} anulados` : ''}`],
                ]}
              />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Section title="Por método de pago">
                  <SimpleTable
                    head={['Método', 'Pagos', 'Monto', 'Equivalente $']}
                    right={[1, 2, 3]}
                    rows={income.summary.byMethod.map((m) => [m.method, m.count, m.currency === 'VES' ? formatBs(m.amount) : formatUSD(m.amount), formatUSD(m.usd)])}
                  />
                </Section>
                <Section title="Por día">
                  <SimpleTable
                    head={['Día', 'Pagos', 'Dólares', 'Bolívares', 'Equiv. $']}
                    right={[1, 2, 3, 4]}
                    rows={income.byDay.map((d) => [fmtDate(d.day), d.count, formatUSD(d.usd), formatBs(d.ves), formatUSD(d.totalUsd)])}
                  />
                </Section>
              </div>
              <Section title={`Detalle de pagos (${income.payments.length})`}>
                <SimpleTable
                  head={['Fecha', 'Socio', 'Motivo', 'Método', 'Monto']}
                  right={[4]}
                  rows={income.payments.map((p) => [fmtDate(String(p.date)), nameOf(p), p.invoices?.[0]?.concept ?? '', p.method ?? '', amountLabel(p)])}
                />
              </Section>
            </>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------ Socios */}
        <TabsContent value="socios" className="mt-4 space-y-4">
          {!membersR ? (
            <Loading />
          ) : (
            <>
              <Actions
                onPdf={() => print(membersHtml(header, membersR))}
                onCsv={() => downloadCsv(membersCsv(membersR), `socios_${fileBase}.csv`)}
                testId="members"
              />
              <Kpis
                items={[
                  [`Activos al ${fmtDate(membersR.closeDay)}`, String(membersR.activeAtClose)],
                  ['Altas del mes', String(membersR.newMembers.length)],
                  ['Bajas del mes', String(membersR.dropped.length)],
                  ['Suspendidos al cierre', String(membersR.suspendedAtClose)],
                ]}
              />
              {(!membersR.historySince || membersR.historySince > membersR.range.from) && (
                <p className="text-xs text-muted-foreground">
                  {membersR.historySince
                    ? `Las bajas y suspensiones se registran desde el ${fmtDate(membersR.historySince)}.`
                    : 'Las bajas y suspensiones se empiezan a registrar desde hoy.'}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Section title="Activos por plan">
                  <SimpleTable head={['Plan', 'Activos']} right={[1]} rows={membersR.byPlan.map((p) => [p.plan, p.active])} />
                </Section>
                <Section title={`Altas (${membersR.newMembers.length})`}>
                  <Movements list={membersR.newMembers} />
                </Section>
                <Section title={`Bajas (${membersR.dropped.length})`}>
                  <Movements list={membersR.dropped} />
                </Section>
                <Section title={`Suspensiones (${membersR.suspended.length})`}>
                  <Movements list={membersR.suspended} />
                </Section>
              </div>
            </>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------ Asistencia */}
        <TabsContent value="asistencia" className="mt-4 space-y-4">
          {!attendanceR ? (
            <Loading />
          ) : (
            <>
              <Actions
                onPdf={() => print(attendanceHtml(header, attendanceR))}
                onCsv={() => downloadCsv(attendanceCsv(attendanceR), `asistencia_${fileBase}.csv`)}
                testId="attendance"
              />
              <Kpis
                items={[
                  ['Visitas', String(attendanceR.visits)],
                  ['Socios que vinieron', String(attendanceR.uniqueMembers)],
                  ['Promedio por día', String(attendanceR.avgPerDay).replace('.', ',')],
                  ['Hora pico', attendanceR.peakHour !== null ? hourLabel(attendanceR.peakHour) : '—'],
                ]}
              />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Section title="Visitas por hora">
                  <Bars items={attendanceR.byHour.map((h) => ({ label: hourLabel(h.hour), value: h.visits }))} />
                </Section>
                <Section title="Visitas por día">
                  <Bars items={attendanceR.byDay.map((d) => ({ label: fmtDate(d.day).slice(0, 5), value: d.visits }))} />
                </Section>
                <Section title={`Visitas por socio (${attendanceR.byMember.length})`}>
                  <SimpleTable head={['Socio', 'Visitas', 'Última']} right={[1]} rows={attendanceR.byMember.map((m) => [m.name, m.visits, fmtDate(m.lastVisit)])} />
                </Section>
                <Section title={`Activos que no vinieron (${attendanceR.absent.length})`}>
                  <SimpleTable head={['Socio']} rows={attendanceR.absent.map((m) => [m.name])} />
                </Section>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Loading() {
  return (
    <div className="flex h-40 items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
    </div>
  );
}

function Actions({ onPdf, onCsv, testId }: { onPdf: () => void; onCsv: () => void; testId: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onCsv} data-testid={`${testId}-csv`}>
        <Download className="mr-2 h-4 w-4" /> Excel (CSV)
      </Button>
      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onPdf} data-testid={`${testId}-pdf`}>
        <Printer className="mr-2 h-4 w-4" /> PDF / Imprimir
      </Button>
    </div>
  );
}

function Kpis({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label} className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-muted-foreground" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SimpleTable({ head, rows, right = [] }: { head: string[]; rows: (string | number)[][]; right?: number[] }) {
  if (rows.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">Sin registros en este mes.</p>;
  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={h} className={`px-2 py-2 font-medium ${right.includes(i) ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => (
                <td key={j} className={`px-2 py-1.5 ${right.includes(j) ? 'text-right tabular-nums' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Movements({ list }: { list: MemberMovement[] }) {
  return <SimpleTable head={['Fecha', 'Socio', 'Detalle']} rows={list.map((m) => [fmtDate(m.date), m.name, m.detail])} />;
}

function Bars({ items }: { items: { label: string; value: number }[] }) {
  if (items.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">Sin visitas en este mes.</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="max-h-96 space-y-1.5 overflow-auto">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-xs">
          <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">{i.label}</span>
          <div className="h-4 flex-1 rounded bg-muted/40">
            <div className="h-4 rounded bg-primary/70" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 tabular-nums">{i.value}</span>
        </div>
      ))}
    </div>
  );
}
