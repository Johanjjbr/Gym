/**
 * Caja del día: pagos registrados en una fecha, totales por método y moneda,
 * y exportación a CSV. Lógica pura, testeable.
 */
import { formatBs, formatUSD } from './currency';

export interface DayPayment {
  id: string;
  user_id: string | null;
  /** Nombre guardado si el socio fue eliminado */
  member_name?: string | null;
  amount: number | string; // USD acreditado
  date: string; // fecha de pago (hora local de Caracas)
  created_at?: string | null; // UTC
  method?: string | null;
  status: string; // 'Pagado' | 'Anulado'
  currency?: string | null;
  amount_original?: number | string | null;
  exchange_rate?: number | string | null;
  users?: { name?: string | null; member_number?: string | null; cedula?: string | null } | null;
  staff?: { name?: string | null } | null;
  invoices?: { id?: string; invoice_number?: string | null; concept?: string | null; reference?: string | null; notes?: string | null; void_reason?: string | null }[] | null;
}

export const isVoided = (p: Pick<DayPayment, 'status'>) => p.status === 'Anulado';

/** Hora del pago "6:05 pm"; los pagos con fecha anterior se registran a las 00:00 → sin hora. */
export function paymentTime(p: Pick<DayPayment, 'date'>): string | null {
  const t = String(p.date).slice(11, 16);
  if (!t || t === '00:00') return null;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** Monto en la moneda en que se cobró. */
export function originalAmount(p: DayPayment): number {
  return p.currency === 'VES' ? Number(p.amount_original ?? 0) : Number(p.amount_original ?? p.amount ?? 0);
}

export function amountLabel(p: DayPayment): string {
  return p.currency === 'VES' ? formatBs(originalAmount(p)) : formatUSD(Number(p.amount));
}

export interface MethodTotal {
  method: string;
  currency: 'USD' | 'VES';
  count: number;
  /** En la moneda del método */
  amount: number;
  /** Equivalente en USD */
  usd: number;
}

export interface DaySummary {
  count: number;
  voidedCount: number;
  /** Total del día en USD (sin anulados) */
  totalUsd: number;
  /** Dólares recibidos (efectivo $, Zelle) */
  usdReceived: number;
  /** Bolívares recibidos (pago móvil, transferencia, punto) */
  vesReceived: number;
  byMethod: MethodTotal[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeDay(payments: DayPayment[]): DaySummary {
  const map = new Map<string, MethodTotal>();
  let totalUsd = 0;
  let usdReceived = 0;
  let vesReceived = 0;
  let voidedCount = 0;
  for (const p of payments) {
    if (isVoided(p)) {
      voidedCount++;
      continue;
    }
    const method = p.method || 'Sin método';
    const currency: 'USD' | 'VES' = p.currency === 'VES' ? 'VES' : 'USD';
    const usd = Number(p.amount) || 0;
    const orig = currency === 'VES' ? Number(p.amount_original ?? 0) : usd;
    const row = map.get(method) ?? { method, currency, count: 0, amount: 0, usd: 0 };
    row.count++;
    row.amount = r2(row.amount + orig);
    row.usd = r2(row.usd + usd);
    map.set(method, row);
    totalUsd += usd;
    if (currency === 'VES') vesReceived += orig;
    else usdReceived += usd;
  }
  const order = ['Efectivo $', 'Zelle', 'Pago Móvil', 'Transferencia', 'Punto de venta'];
  const byMethod = [...map.values()].sort((a, b) => {
    const ia = order.indexOf(a.method);
    const ib = order.indexOf(b.method);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.method.localeCompare(b.method);
  });
  return {
    count: payments.length - voidedCount,
    voidedCount,
    totalUsd: r2(totalUsd),
    usdReceived: r2(usdReceived),
    vesReceived: r2(vesReceived),
    byMethod,
  };
}

/** Rango UTC de un día de Caracas (UTC-4, sin horario de verano) para filtrar created_at. */
export function caracasDayUtcRange(day: string): { from: string; to: string } {
  const [y, m, d] = day.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, d, 4, 0, 0));
  const to = new Date(Date.UTC(y, m - 1, d + 1, 4, 0, 0));
  const fmt = (x: Date) => x.toISOString().slice(0, 19);
  return { from: fmt(from), to: fmt(to) };
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV con ";" (abre bien en Excel en español). */
export function paymentsCsv(day: string, payments: DayPayment[]): string {
  const head = ['Fecha', 'Hora', 'Socio', 'Cédula', 'Factura', 'Motivo', 'Método', 'Referencia', 'Moneda', 'Monto', 'Tasa', 'Equivalente USD', 'Registró', 'Estado', 'Motivo anulación'];
  const rows = payments.map((p) => {
    const inv = p.invoices?.[0];
    return [
      day,
      paymentTime(p) ?? '',
      p.users?.name ?? '',
      p.users?.cedula ?? '',
      inv?.invoice_number ?? '',
      inv?.concept ?? '',
      p.method ?? '',
      inv?.reference ?? '',
      p.currency === 'VES' ? 'Bs' : 'USD',
      originalAmount(p).toFixed(2).replace('.', ','),
      p.exchange_rate != null ? Number(p.exchange_rate).toFixed(2).replace('.', ',') : '',
      Number(p.amount).toFixed(2).replace('.', ','),
      p.staff?.name ?? '',
      p.status,
      inv?.void_reason ?? '',
    ];
  });
  return [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}
