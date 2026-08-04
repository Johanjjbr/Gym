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

export function getPaidMonthKeys(invoices: any[]): Set<string> {
  const paidMonths = new Set<string>();
  if (!Array.isArray(invoices)) return paidMonths;
  for (const inv of invoices) {
    if (!inv || inv.status !== 'Pagada') continue;
    const dateStr = inv.paid_at || inv.due_date;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) continue;
    paidMonths.add(`${date.getFullYear()}-${date.getMonth()}`);
  }
  return paidMonths;
}

export function PaymentCalendar({ invoices }: { invoices: any[] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const paidMonths = getPaidMonthKeys(invoices);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const paidCount = MONTHS_ES.reduce(
    (count, _, month) => count + (paidMonths.has(`${year}-${month}`) ? 1 : 0),
    0,
  );

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
            const isPaid = paidMonths.has(`${year}-${monthIndex}`);
            const isCurrent = year === currentYear && monthIndex === currentMonth;
            const isFuture = year > currentYear || (year === currentYear && monthIndex > currentMonth);
            const statusLabel = isPaid ? 'Pagado' : isFuture ? 'Futuro' : 'Pendiente';

            return (
              <div
                key={monthName}
                className={cn(
                  'rounded-lg border p-3 text-center transition-colors',
                  isPaid
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-muted text-muted-foreground border-border',
                  isCurrent && !isPaid && 'border-primary/50 ring-1 ring-primary/30',
                )}
              >
                <p className="text-sm font-semibold">{monthName}</p>
                <p className="text-xs mt-1 flex items-center justify-center gap-1">
                  {isPaid ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {statusLabel}
                    </>
                  ) : (
                    <>
                      <Circle className="w-3 h-3" />
                      {statusLabel}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/30" />
              Pagado
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-muted border border-border" />
              No pagado
            </span>
          </div>
          <p>
            <span className="text-primary font-semibold">{paidCount}</span> de {MONTHS_ES.length} meses pagados
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
