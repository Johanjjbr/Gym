import { describe, expect, it } from 'vitest';
import { amountLabel, caracasDayUtcRange, paymentsCsv, paymentTime, summarizeDay, type DayPayment } from './dailyPayments';

const pay = (o: Partial<DayPayment>): DayPayment => ({
  id: 'p', user_id: 'u', amount: 20, date: '2026-10-02T18:05:00', status: 'Pagado', method: 'Efectivo $', currency: 'USD', amount_original: 20, ...o,
});

describe('caja del día', () => {
  const list = [
    pay({ id: '1' }),
    pay({ id: '2', method: 'Zelle' }),
    pay({ id: '3', method: 'Pago Móvil', currency: 'VES', amount_original: 4906, exchange_rate: 245.3 }),
    pay({ id: '4', method: 'Pago Móvil', currency: 'VES', amount: 30, amount_original: 7359, exchange_rate: 245.3 }),
    pay({ id: '5', method: 'Efectivo $', status: 'Anulado' }),
  ];
  it('totales por método y moneda (sin anulados)', () => {
    const s = summarizeDay(list);
    expect(s).toMatchObject({ count: 4, voidedCount: 1, totalUsd: 90, usdReceived: 40, vesReceived: 12265 });
    expect(s.byMethod.map((m) => [m.method, m.count, m.amount, m.usd])).toEqual([
      ['Efectivo $', 1, 20, 20],
      ['Zelle', 1, 20, 20],
      ['Pago Móvil', 2, 12265, 50],
    ]);
  });
  it('hora y monto', () => {
    expect(paymentTime(pay({}))).toBe('6:05 pm');
    expect(paymentTime(pay({ date: '2026-10-01T00:00:00' }))).toBeNull();
    expect(amountLabel(list[2])).toBe('Bs 4.906,00');
    expect(amountLabel(list[0])).toBe('$20');
  });
  it('rango UTC de un día en Caracas', () => {
    expect(caracasDayUtcRange('2026-10-02')).toEqual({ from: '2026-10-02T04:00:00', to: '2026-10-03T04:00:00' });
  });
  it('CSV con punto y coma', () => {
    const csv = paymentsCsv('2026-10-02', [pay({ users: { name: 'Ana; Pérez' }, invoices: [{ concept: 'Premium - Octubre 2026', reference: '123' }] })]);
    const [head, row] = csv.split('\r\n');
    expect(head.startsWith('Fecha;Hora;Socio')).toBe(true);
    expect(row).toContain('"Ana; Pérez"');
    expect(row).toContain('Premium - Octubre 2026;Efectivo $;123;USD;20,00');
  });
});
