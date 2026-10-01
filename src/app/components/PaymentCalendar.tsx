import { useState } from 'react';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { cn } from './ui/utils';

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export type MonthStatus = 'Pagado' | 'Pendiente' | 'Vencido' | 'Sin factura' | 'Futuro';

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
 * Prioridad si hay varias facturas en el mismo mes: Vencida > Pendiente > Pagada
 * (la deuda no queda oculta por otra factura pagada).
 */
export function getMonthStatuses(
  invoices: any[],
  year: number,
  now: Date = new Date(),
): MonthStatus[] {
  const byMonth: Array<Set<string>> = Array.from({ length: 12 }, () => new Set<string>());
  if (Array.isArray(invoices)) {
    for (const inv of invoices) {
      const ym = parseYearMonth(inv?.due_date);
      if (ym && ym.year === year && inv?.status) byMonth[ym.month].add(inv.status);
    }
  }
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return byMonth.map((statuses, month) => {
    if (statuses.has('Vencida')) return 'Vencido';
    if (statuses.has('Pendiente')) return 'Pendiente';
    if (statuses.has('Pagada')) return 'Pagado';
    const isFuture = year > currentYear || (year === currentYear && month > currentMonth);
    return isFuture ? 'Futuro' : 'Sin factura';
  });
}

const STATUS_STYLES: Record<MonthStatus, string> = {
  Pagado: 'bg-primary/20 text-primary border-primary/30',
  Pendiente: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  Vencido: 'bg-red-500/15 text-red-500 border-red-500/30',
  'Sin factura': 'bg-muted text-muted-foreground border-border',
  Futuro: 'bg-muted text-muted-foreground border-border opacity-70',
};

export function PaymentCalendar({ invoices }: { invoices: any[] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const statuses = getMonthStatuses(invoices, year);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const paidCount = statuses.filter((s) => s === 'Pagado').length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendario de Pagos
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="border-border"
            onClick={() => setYear((y) => y - 1)}
            disabled={year <= 2000}
            aria-label="Año anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[4.5rem] text-center">{year}</span>
          <Button
            variant="outline"
            size="icon"
            className="border-border"
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= 2100}
            aria-label="Año siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {MONTHS_ES.map((monthName, monthIndex) => {
            const status = statuses[monthIndex];
            const isCurrent = year === currentYear && monthIndex === currentMonth;

            return (
              <div
                key={monthName}
                className={cn(
                  'rounded-lg border p-3 text-center transition-colors',
                  STATUS_STYLES[status],
                  isCurrent && status !== 'Pagado' && 'ring-1 ring-primary/40',
                )}
              >
                <p className="text-sm font-semibold">{monthName}</p>
                <p className="text-xs mt-1 flex items-center justify-center gap-1">
                  {status === 'Pagado' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                  {status}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            {(['Pagado', 'Pendiente', 'Vencido', 'Sin factura'] as MonthStatus[]).map((st) => (
              <span key={st} className="flex items-center gap-2">
                <span className={cn('w-3 h-3 rounded-sm border', STATUS_STYLES[st])} />
                {st}
              </span>
            ))}
          </div>
          <p>
            <span className="text-primary font-semibold">{paidCount}</span> de {MONTHS_ES.length} meses pagados
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
