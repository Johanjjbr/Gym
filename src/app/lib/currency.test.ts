import { describe, expect, it } from 'vitest';
import {
  cashBreakdown, formatBs, formatRate, formatUSD, methodCurrency, moneyWithBs, paidAmountLabel, rateStatus, toBs,
} from './currency';
import { formatMoney } from './dashboardHelpers';

describe('formatos', () => {
  it('USD como moneda base', () => {
    expect(formatUSD(20)).toBe('$20');
    expect(formatUSD(20.5)).toBe('$20,50');
    expect(formatUSD(1250)).toBe('$1.250');
    expect(formatMoney(30)).toBe('$30');
  });
  it('bolívares y tasa', () => {
    expect(formatBs(4906)).toBe('Bs 4.906,00');
    expect(formatBs(4906.456)).toBe('Bs 4.906,46');
    expect(formatRate(245.3)).toBe('245,30');
    expect(toBs(20, 245.3)).toBe(4906);
    expect(toBs(30, 36.1234)).toBe(1083.7);
  });
});

describe('moneda del método (igual que method_currency en SQL)', () => {
  it('dólares', () => {
    expect(methodCurrency('Efectivo $')).toBe('USD');
    expect(methodCurrency('Zelle')).toBe('USD');
    expect(methodCurrency('Efectivo')).toBe('USD'); // histórico
  });
  it('bolívares', () => {
    expect(methodCurrency('Pago Móvil')).toBe('VES');
    expect(methodCurrency('Transferencia')).toBe('VES');
    expect(methodCurrency('Punto de venta')).toBe('VES');
  });
});

describe('tasa vigente', () => {
  const rates = [
    { rate_date: '2026-10-02', rate: '245.3' },
    { rate_date: '2026-09-30', rate: 240 },
  ];
  it('cargada hoy', () => {
    expect(rateStatus(rates, '2026-10-02')).toEqual({ rate: 245.3, rateDate: '2026-10-02', state: 'today', ageDays: 0 });
  });
  it('fin de semana: sirve la del viernes (hasta 3 días)', () => {
    expect(rateStatus(rates, '2026-10-05')).toMatchObject({ rate: 245.3, state: 'recent', ageDays: 3 });
  });
  it('vieja o inexistente: no se puede cobrar en Bs', () => {
    expect(rateStatus(rates, '2026-10-06')).toMatchObject({ rate: null, state: 'missing', ageDays: 4 });
    expect(rateStatus([], '2026-10-06')).toMatchObject({ rate: null, state: 'missing', rateDate: null });
  });
  it('ignora tasas con fecha futura', () => {
    expect(rateStatus(rates, '2026-10-01')).toMatchObject({ rate: 240, state: 'recent' });
  });
});

describe('cobros', () => {
  it('etiqueta de lo que se pagó', () => {
    expect(paidAmountLabel(20, { currency: 'VES', amount_original: '4906.00', exchange_rate: '245.3000' })).toBe('Bs 4.906,00 · tasa 245,30');
    expect(paidAmountLabel(20, { currency: 'USD', amount_original: 20 })).toBe('$20');
    expect(paidAmountLabel(20, null)).toBe('$20');
  });
  it('avisos con equivalente en Bs', () => {
    expect(moneyWithBs(245.3)(20)).toBe('$20 (Bs 4.906,00 a tasa BCV de hoy)');
    expect(moneyWithBs(null)(20)).toBe('$20');
    expect(moneyWithBs(240, false)(20)).toBe('$20 (Bs 4.800,00 a tasa BCV vigente)');
  });
  it('caja por moneda', () => {
    expect(
      cashBreakdown([
        { amount: 20, currency: 'USD', amount_original: 20 },
        { amount: 30, currency: 'VES', amount_original: 7359 },
        { amount: 20, currency: null },
      ]),
    ).toEqual({ usd: 40, ves: 7359, vesAsUsd: 30 });
  });
});
