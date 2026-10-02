import { describe, expect, it } from 'vitest';
import {
  billingKpis,
  buildPaymentPlan,
  effectiveStatus,
  fmtDate,
  membersWithDebt,
  planNextDue,
  statusCounts,
  type InvoiceRow,
} from './billing';

const plan = { id: 'pl', name: 'Premium Plus', price: 20, duration_days: 30 };
const inv = (id: string, due: string, status: string, amount = 20, user_id = 'u1'): InvoiceRow => ({
  id, user_id, due_date: `${due}T00:00:00`, status, amount, invoice_number: `FAC-${id}`,
});

describe('planNextDue (igual que SQL)', () => {
  it('mensual ancla al día 1 del mes siguiente', () => {
    expect(planNextDue('2026-01-01', 30)).toBe('2026-02-01');
    expect(planNextDue('2026-12-01', 31)).toBe('2027-01-01');
  });
  it('trimestral, semestral y anual', () => {
    expect(planNextDue('2026-10-01', 90)).toBe('2027-01-01');
    expect(planNextDue('2026-10-01', 180)).toBe('2027-04-01');
    expect(planNextDue('2026-10-01', 365)).toBe('2027-10-01');
  });
  it('otros planes suman días exactos', () => {
    expect(planNextDue('2026-10-01', 7)).toBe('2026-10-08');
  });
});

describe('effectiveStatus', () => {
  it('una pendiente con fecha pasada se muestra vencida', () => {
    expect(effectiveStatus(inv('a', '2026-09-01', 'Pendiente'), '2026-10-02')).toBe('Vencida');
    expect(effectiveStatus(inv('a', '2026-10-02', 'Pendiente'), '2026-10-02')).toBe('Pendiente');
  });
});

describe('buildPaymentPlan (vista previa de pay_periods)', () => {
  it('salda primero la deuda más antigua', () => {
    const p = buildPaymentPlan(
      [inv('oct', '2026-10-01', 'Pendiente'), inv('sep', '2026-09-01', 'Vencida'), inv('ago', '2026-08-01', 'Pagada')],
      plan, 1, '2026-10-02',
    );
    expect(p.periods.map((x) => [x.label, x.invoiceId, x.overdue])).toEqual([['Septiembre 2026', 'sep', true]]);
    expect(p.openCount).toBe(2);
  });

  it('paga lo adeudado y adelanta meses siguientes', () => {
    const p = buildPaymentPlan([inv('oct', '2026-10-01', 'Pendiente')], plan, 3, '2026-10-02');
    expect(p.periods.map((x) => [x.due, x.invoiceId])).toEqual([
      ['2026-10-01', 'oct'],
      ['2026-11-01', null],
      ['2026-12-01', null],
    ]);
    expect(p.total).toBe(60);
    expect(p.coversThrough).toBe('2026-12-01');
  });

  it('socio sin facturas: empieza en el mes actual', () => {
    const p = buildPaymentPlan([], plan, 1, '2026-10-02');
    expect(p.periods[0]).toMatchObject({ due: '2026-10-01', label: 'Octubre 2026', amount: 20, invoiceId: null });
  });

  it('si todo está pagado continúa después del último período', () => {
    const p = buildPaymentPlan([inv('oct', '2026-10-01', 'Pagada')], plan, 1, '2026-10-02');
    expect(p.periods[0].due).toBe('2026-11-01');
  });

  it('usa el monto de la factura existente, no el precio actual del plan', () => {
    const p = buildPaymentPlan([inv('sep', '2026-09-01', 'Vencida', 15)], plan, 2, '2026-10-02');
    expect(p.periods.map((x) => x.amount)).toEqual([15, 20]);
  });
});

describe('resúmenes', () => {
  const invoices = [
    inv('a', '2026-09-01', 'Vencida', 20, 'u1'),
    inv('b', '2026-10-01', 'Pendiente', 20, 'u1'), // vence hoy+? -> 2026-10-01 < 10-02 => vencida
    inv('c', '2026-10-05', 'Pendiente', 30, 'u2'),
    inv('d', '2026-11-01', 'Pendiente', 20, 'u3'),
    inv('e', '2026-10-01', 'Pagada', 20, 'u4'),
  ];
  const payments = [
    { amount: 20, date: '2026-10-01T10:00:00' },
    { amount: 50, date: '2026-09-30T10:00:00' },
  ];

  it('KPIs independientes de cualquier filtro', () => {
    expect(billingKpis(invoices, payments, '2026-10-02')).toEqual({
      collectedThisMonth: 20, paymentsThisMonth: 1,
      openTotal: 90, openCount: 4,
      overdueTotal: 40, overdueCount: 2, debtorCount: 1,
      dueSoonTotal: 30, dueSoonCount: 1,
    });
  });

  it('socios con deuda ordenados por atraso', () => {
    const d = membersWithDebt(invoices, '2026-10-02');
    expect(d.map((x) => [x.user_id, x.total, x.daysLate])).toEqual([
      ['u1', 40, 31],
      ['u2', 30, 0],
      ['u3', 20, 0],
    ]);
  });

  it('conteos por estado efectivo', () => {
    expect(statusCounts(invoices, '2026-10-02')).toEqual({ all: 5, Pendiente: 2, Vencida: 2, Pagada: 1, Anulada: 0 });
  });

  it('las anuladas no cuentan como deuda ni en "Todas"', () => {
    const withVoid = [...invoices, { id: 'x', user_id: 'u9', amount: 20, due_date: '2026-09-01', status: 'Anulada' }];
    expect(statusCounts(withVoid, '2026-10-02')).toMatchObject({ all: 5, Anulada: 1 });
    expect(membersWithDebt(withVoid, '2026-10-02').some((d) => d.user_id === 'u9')).toBe(false);
  });

  it('formatea fechas sin corrimiento de zona horaria', () => {
    expect(fmtDate('2026-10-01T00:00:00')).toBe('01/10/2026');
    expect(fmtDate(null)).toBe('—');
  });
});

import {
  dueInWords, nextDueFor, overdueReminderText, upcomingRenewals, upcomingReminderText, whatsappNumber, whatsappUrl,
} from './billing';

describe('próximos vencimientos (avisos con 3 días)', () => {
  const plan = { id: 'pl', name: 'Premium Plus', price: 20, duration_days: 30 };
  const member = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `Socio ${id}`, status: 'Activo', is_free_user: false, plans: plan, ...extra });
  const money = (n: number) => `Bs ${n}`;

  it('sin facturas abiertas, calcula el siguiente período con el plan (la factura aún no existe)', () => {
    const r = nextDueFor(member('a'), [inv('oct', '2026-10-01', 'Pagada')], '2026-10-29');
    expect(r).toEqual({ due: '2026-11-01', amount: 20, invoiceId: null, label: 'Noviembre 2026' });
  });

  it('con una factura abierta, usa esa factura', () => {
    const r = nextDueFor(member('a'), [inv('nov', '2026-11-01', 'Pendiente', 25)], '2026-10-29');
    expect(r).toMatchObject({ due: '2026-11-01', amount: 25, invoiceId: 'nov' });
  });

  it('exentos, inactivos o sin plan no reciben aviso', () => {
    expect(nextDueFor(member('a', { is_free_user: true }), [], '2026-10-29')).toBeNull();
    expect(nextDueFor(member('a', { status: 'Suspendido' }), [], '2026-10-29')).toBeNull();
    expect(nextDueFor(member('a', { plans: null }), [], '2026-10-29')).toBeNull();
  });

  it('lista solo a quienes vencen dentro de los próximos 3 días, el más urgente primero', () => {
    const members = [member('a'), member('b'), member('c'), member('d')];
    const invoices = [
      inv('a1', '2026-10-01', 'Pagada', 20, 'a'),          // a: vence 1-nov (en 3 días)
      inv('b1', '2026-10-01', 'Pagada', 20, 'b'),
      inv('b2', '2026-11-01', 'Pagada', 20, 'b'),          // b: pagó adelantado -> 1-dic
      inv('c1', '2026-10-01', 'Vencida', 20, 'c'),         // c: ya vencido (va a "Socios con deuda")
      inv('d1', '2026-10-29', 'Pendiente', 20, 'd'),       // d: vence hoy
    ];
    const r = upcomingRenewals(members, invoices, '2026-10-29');
    expect(r.map((x) => [x.user_id, x.daysLeft])).toEqual([['d', 0], ['a', 3]]);
  });

  it('textos de vencimiento', () => {
    expect([0, 1, 3].map(dueInWords)).toEqual(['Vence hoy', 'Vence mañana', 'Vence en 3 días']);
  });

  it('normaliza teléfonos venezolanos para WhatsApp', () => {
    expect(whatsappNumber('0414-551.14.62')).toBe('584145511462');
    expect(whatsappNumber('+58 424 1234567')).toBe('584241234567');
    expect(whatsappNumber('4121234567')).toBe('584121234567');
    expect(whatsappNumber('12345')).toBeNull();
    expect(whatsappNumber(null)).toBeNull();
  });

  it('arma los mensajes de aviso', () => {
    expect(upcomingReminderText('KEVIN J RAGA', { due: '2026-11-01', amount: 20 }, 'GYM Lagunetica', money))
      .toBe('Hola Kevin, te recordamos que tu mensualidad de Bs 20 vence el 1 de noviembre. Puedes pagar en recepción o por transferencia / pago móvil. ¡Te esperamos en GYM Lagunetica!');
    expect(overdueReminderText('Ana', { total: 40, count: 2, oldestDue: '2026-09-01' }, 'GYM', money))
      .toBe('Hola Ana, tienes 2 mensualidades pendientes por Bs 40 desde septiembre 2026. Pasa por recepción para ponerte al día y seguir entrenando en GYM.');
    expect(whatsappUrl('584145511462', 'Hola Ana')).toBe('https://wa.me/584145511462?text=Hola%20Ana');
  });
});
