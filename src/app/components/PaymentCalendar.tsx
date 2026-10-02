import { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, AlertCircle, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export type MonthStatus = 'Pagado' | 'Pendiente' | 'Vencido' | 'Anulado' | 'Sin factura' | 'Futuro' | 'Antes del alta';

/**
 * Año y mes (0-11) de un due_date SIN pasar por Date: 'YYYY-MM-DD' se interpretaría
 * en UTC y en UTC-3 / UTC-4 un vencimiento del día 1 caería en el mes anterior.
 */
function parseYearMonth(value: unknown): { year: number; month: number } | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(value);
  if (!m) return null;
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year: Number(m[1]), month };
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function getPaidMonthKeys(invoices: any[]): Set<string> {
  const paidMonths = new Set<string>();
  if (!Array.isArray(invoices)) return paidMonths;
  for (const inv of invoices) {
    if (!inv || inv.status !== 'Pagada') continue;
    const ym = parseYearMonth(inv.due_date);
    if (!ym) continue;
    paidMonths.add(`${ym.year}-${ym.month}`);
  }
  return paidMonths;
}

/**
 * Estado de cada mes de un año a partir de las facturas.
 *  - Una factura 'Pendiente' cuya fecha ya pasó cuenta como vencida (igual que el
 *    proceso nocturno, que la marcará 'Vencida').
 *  - Prioridad si hay varias facturas en el mismo mes: Vencida > Pendiente > Pagada
 *    (la deuda no queda oculta por otra factura pagada).
 *  - Los meses anteriores al alta del socio (startDate) no se marcan como "Sin factura".
 */
export function getMonthStatuses(
  invoices: any[],
  year: number,
  now: Date = new Date(),
  startDate?: string | null,
): MonthStatus[] {
  const today = ymd(now);
  const byMonth: Array<Set<string>> = Array.from({ length: 12 }, () => new Set<string>());
  if (Array.isArray(invoices)) {
    for (const inv of invoices) {
      const ym = parseYearMonth(inv?.due_date);
      if (!ym || ym.year !== year || !inv?.status) continue;
      const overdue = inv.status === 'Pendiente' && String(inv.due_date).slice(0, 10) < today;
      byMonth[ym.month].add(overdue ? 'Vencida' : inv.status);
    }
  }
  const start = parseYearMonth(startDate);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return byMonth.map((statuses, month) => {
    if (statuses.has('Vencida')) return 'Vencido';
    if (statuses.has('Pendiente')) return 'Pendiente';
    if (statuses.has('Pagada')) return 'Pagado';
    if (statuses.has('Anulada')) return 'Anulado';
    if (start && (year < start.year || (year === start.year && month < start.month))) return 'Antes del alta';
    const isFuture = year > currentYear || (year === currentYear && month > currentMonth);
    return isFuture ? 'Futuro' : 'Sin factura';
  });
}

const STATUS_STYLES: Record<MonthStatus, string> = {
  Pagado: 'bg-[#10f94e]/15 text-[#10f94e] border-[#10f94e]/30',
  Pendiente: 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30',
  Vencido: 'bg-[#ff3b5c]/10 text-[#ff3b5c] border-[#ff3b5c]/40',
  Anulado: 'bg-muted/40 text-muted-foreground border-border line-through',
  'Sin factura': 'bg-muted/40 text-muted-foreground border-border',
  Futuro: 'bg-transparent text-muted-foreground border-dashed border-border',
  'Antes del alta': 'bg-transparent text-muted-foreground/40 border-transparent',
};

const STATUS_ICON: Partial<Record<MonthStatus, typeof Circle>> = {
  Pagado: CheckCircle2,
  Pendiente: Clock,
  Vencido: AlertCircle,
};

export function PaymentCalendar({ invoices, startDate }: { invoices: any[]; startDate?: string | null }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const statuses = getMonthStatuses(invoices, year, now, startDate);
  const startYear = parseYearMonth(startDate)?.year;
  const paidCount = statuses.filter((s) => s === 'Pagado').length;
  const overdueCount = statuses.filter((s) => s === 'Vencido').length;
  const pendingCount = statuses.filter((s) => s === 'Pendiente').length;

  return (
    <section aria-label="Calendario de pagos" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Calendario {year}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setYear((y) => y - 1)}
            disabled={startYear !== undefined ? year <= startYear : year <= 2000}
            aria-label="Año anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 tabular-nums"
            onClick={() => setYear(now.getFullYear())}
            disabled={year === now.getFullYear()}
          >
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= now.getFullYear() + 2}
            aria-label="Año siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ol className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
        {MONTHS_ES.map((monthName, i) => {
          const status = statuses[i];
          const Icon = STATUS_ICON[status];
          const isCurrent = year === now.getFullYear() && i === now.getMonth();
          return (
            <li
              key={monthName}
              title={`${monthName} ${year}: ${status}`}
              className={cn(
                'rounded-lg border px-2 py-2 text-center',
                STATUS_STYLES[status],
                isCurrent && 'ring-2 ring-foreground/30 ring-offset-1 ring-offset-background',
              )}
            >
              <p className="text-xs font-medium">{MONTHS_SHORT[i]}</p>
              <p className="mt-1 flex h-4 items-center justify-center">
                {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : <span className="text-[10px]">—</span>}
                <span className="sr-only">{status}</span>
              </p>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-3">
          {(['Pagado', 'Pendiente', 'Vencido', 'Sin factura'] as MonthStatus[]).map((st) => (
            <span key={st} className="flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-sm border', STATUS_STYLES[st])} />
              {st}
            </span>
          ))}
        </div>
        <p>
          {paidCount} pagado{paidCount === 1 ? '' : 's'}
          {overdueCount > 0 && <span className="text-[#ff3b5c]"> · {overdueCount} vencido{overdueCount === 1 ? '' : 's'}</span>}
          {pendingCount > 0 && <span className="text-[#eab308]"> · {pendingCount} por pagar</span>}
        </p>
      </div>
    </section>
  );
}
