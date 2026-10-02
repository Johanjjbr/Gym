/**
 * Moneda: todo lo que se debe va en USD; el bolívar solo se usa al cobrar,
 * con la tasa BCV del día (cargada a mano). Lógica pura, testeable.
 */
import { daysBetween, formatMoney, type DateStr } from './dashboardHelpers';

export type Currency = 'USD' | 'VES';

export const PAYMENT_METHODS = ['Efectivo $', 'Zelle', 'Pago Móvil', 'Transferencia', 'Punto de venta'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Igual que method_currency() en SQL. 'Efectivo' y 'Tarjeta' son métodos antiguos. */
export function methodCurrency(method?: string | null): Currency {
  return method === 'Efectivo $' || method === 'Zelle' || method === 'Efectivo' ? 'USD' : 'VES';
}

/** Métodos que suelen llevar referencia bancaria. */
export const needsReference = (method?: string | null) =>
  method === 'Pago Móvil' || method === 'Transferencia' || method === 'Zelle';

const fmt = (n: number, min = 0) =>
  n.toLocaleString('es-VE', { minimumFractionDigits: min, maximumFractionDigits: 2 });

/** "$20" · "$20,50" (mismo formato que formatMoney) */
export const formatUSD = formatMoney;

/** "Bs 4.906,00" (siempre con 2 decimales) */
export function formatBs(n: number): string {
  return `Bs ${fmt(Math.round(n * 100) / 100, 2)}`;
}

/** Tasa con 2 decimales: "245,30" */
export const formatRate = (r: number) => fmt(r, 2);

export const toBs = (usd: number, rate: number) => Math.round(usd * rate * 100) / 100;

export interface RateRow {
  rate_date: string;
  rate: number | string;
  source?: string | null;
  updated_at?: string | null;
}

/** Igual que exchange_rate_for(): tasa más reciente con fecha <= día, de hasta 3 días antes. */
export const RATE_MAX_AGE_DAYS = 3;

export interface RateStatus {
  rate: number | null;
  rateDate: string | null;
  /** 'today' = cargada hoy · 'recent' = de hasta 3 días (fin de semana) · 'missing' = no sirve para cobrar en Bs */
  state: 'today' | 'recent' | 'missing';
  ageDays: number | null;
}

export function rateStatus(rates: RateRow[], today: DateStr): RateStatus {
  const latest = rates
    .filter((r) => r.rate_date.slice(0, 10) <= today)
    .sort((a, b) => (a.rate_date < b.rate_date ? 1 : -1))[0];
  if (!latest) return { rate: null, rateDate: null, state: 'missing', ageDays: null };
  const date = latest.rate_date.slice(0, 10);
  const age = daysBetween(date, today);
  if (age > RATE_MAX_AGE_DAYS) return { rate: null, rateDate: date, state: 'missing', ageDays: age };
  return { rate: Number(latest.rate), rateDate: date, state: age === 0 ? 'today' : 'recent', ageDays: age };
}

/** Información del cobro de una factura pagada (desde payments). */
export interface PaidInfo {
  currency?: string | null;
  amount_original?: number | string | null;
  exchange_rate?: number | string | null;
}

/** "Bs 4.906,00 · tasa 245,30" o "$20" según cómo se cobró. */
export function paidAmountLabel(usd: number, p?: PaidInfo | null): string {
  if (p?.currency === 'VES' && p.amount_original != null) {
    const rate = p.exchange_rate != null ? ` · tasa ${formatRate(Number(p.exchange_rate))}` : '';
    return `${formatBs(Number(p.amount_original))}${rate}`;
  }
  return formatUSD(usd);
}

/** Para avisos: "$20 (Bs 4.906,00 a tasa BCV de hoy)". Sin tasa vigente, solo "$20". */
export function moneyWithBs(rate: number | null, isToday = true) {
  const when = isToday ? 'de hoy' : 'vigente';
  return (usd: number) => (rate ? `${formatUSD(usd)} (${formatBs(toBs(usd, rate))} a tasa BCV ${when})` : formatUSD(usd));
}

/** Caja: cuánto entró en cada moneda. */
export function cashBreakdown(payments: { amount: number | string; currency?: string | null; amount_original?: number | string | null }[]) {
  let usdCash = 0;
  let ves = 0;
  let vesAsUsd = 0;
  for (const p of payments) {
    if (p.currency === 'VES') {
      ves += Number(p.amount_original ?? 0);
      vesAsUsd += Number(p.amount);
    } else usdCash += Number(p.amount);
  }
  return { usd: Math.round(usdCash * 100) / 100, ves: Math.round(ves * 100) / 100, vesAsUsd: Math.round(vesAsUsd * 100) / 100 };
}
