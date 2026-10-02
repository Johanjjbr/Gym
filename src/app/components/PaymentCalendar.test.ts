import { describe, it, expect } from 'vitest'
import { getPaidMonthKeys, getMonthStatuses } from './PaymentCalendar'

describe('getPaidMonthKeys', () => {
  it('returns empty set for non-array input', () => {
    expect(getPaidMonthKeys(null as any)).toEqual(new Set())
    expect(getPaidMonthKeys(undefined as any)).toEqual(new Set())
    expect(getPaidMonthKeys('foo' as any)).toEqual(new Set())
  })

  it('ignores invoices that are not paid', () => {
    const result = getPaidMonthKeys([
      { status: 'Pendiente', due_date: '2026-01-15T12:00:00' },
      { status: 'Vencida', due_date: '2026-02-15T12:00:00' },
    ])
    expect(result.size).toBe(0)
  })

  it('adds month key from due_date', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', due_date: '2026-03-10T12:00:00' },
    ])
    expect(result.has('2026-2')).toBe(true)
  })

  it('aggregates multiple paid months without duplicates', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', due_date: '2026-01-01T12:00:00' },
      { status: 'Pagada', due_date: '2026-01-20T12:00:00' },
      { status: 'Pagada', due_date: '2026-07-15T12:00:00' },
    ])
    expect(result).toEqual(new Set(['2026-0', '2026-6']))
  })

  it('ignores invalid dates', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', due_date: 'invalid-date' },
      { status: 'Pagada' },
    ])
    expect(result.size).toBe(0)
  })
})

describe('getPaidMonthKeys - zona horaria', () => {
  it('un vencimiento del día 1 (solo fecha) cuenta en SU mes, no en el anterior', () => {
    // new Date('2026-10-01') es 30-sep en UTC-3/UTC-4; aquí no debe pasar por Date
    const result = getPaidMonthKeys([{ status: 'Pagada', due_date: '2026-10-01' }])
    expect(result).toEqual(new Set(['2026-9']))
  })

  it('acepta timestamp sin zona (como lo devuelve Postgres)', () => {
    const result = getPaidMonthKeys([{ status: 'Pagada', due_date: '2026-11-01T00:00:00' }])
    expect(result).toEqual(new Set(['2026-10']))
  })
})

describe('getMonthStatuses', () => {
  const now = new Date(2026, 9, 15) // 15-oct-2026

  it('marca Pagado / Pendiente / Vencido / Sin factura / Futuro', () => {
    const st = getMonthStatuses(
      [
        { status: 'Pagada', due_date: '2026-08-01T00:00:00' },
        { status: 'Vencida', due_date: '2026-09-01T00:00:00' },
        { status: 'Pendiente', due_date: '2026-10-20T00:00:00' }, // vence más adelante en el mes
        { status: 'Pagada', due_date: '2026-11-01T00:00:00' }, // adelantado
      ],
      2026,
      now,
    )
    expect(st[0]).toBe('Sin factura') // enero: pasado sin factura
    expect(st[7]).toBe('Pagado')
    expect(st[8]).toBe('Vencido')
    expect(st[9]).toBe('Pendiente')
    expect(st[10]).toBe('Pagado') // mes futuro ya pagado por adelantado
    expect(st[11]).toBe('Futuro')
  })

  it('la deuda no queda oculta: Vencida > Pendiente > Pagada en el mismo mes', () => {
    const st = getMonthStatuses(
      [
        { status: 'Pagada', due_date: '2026-03-01T00:00:00' },
        { status: 'Vencida', due_date: '2026-03-15T00:00:00' },
      ],
      2026,
      now,
    )
    expect(st[2]).toBe('Vencido')
  })

  it('pago adelantado de 3 meses con vencimientos día 1 pinta 3 meses distintos', () => {
    const st = getMonthStatuses(
      ['2026-10-01', '2026-11-01', '2026-12-01'].map((d) => ({ status: 'Pagada', due_date: d + 'T00:00:00' })),
      2026,
      now,
    )
    expect(st.filter((s) => s === 'Pagado')).toHaveLength(3)
  })

  it('solo considera el año pedido', () => {
    const st = getMonthStatuses([{ status: 'Pagada', due_date: '2025-10-01T00:00:00' }], 2026, now)
    expect(st.filter((s) => s === 'Pagado')).toHaveLength(0)
  })

  it('tolera entradas inválidas', () => {
    expect(() => getMonthStatuses(null as any, 2026, now)).not.toThrow()
    expect(getMonthStatuses([{ status: 'Pagada', due_date: 'x' }], 2026, now)).toHaveLength(12)
  })
})

describe('getMonthStatuses - reglas de la ficha del socio', () => {
  const now = new Date(2026, 9, 15) // 15-oct-2026

  it('una pendiente con fecha pasada se muestra vencida (igual que el proceso nocturno)', () => {
    const st = getMonthStatuses([{ status: 'Pendiente', due_date: '2026-10-01T00:00:00' }], 2026, now)
    expect(st[9]).toBe('Vencido')
  })

  it('los meses anteriores al alta no figuran como "Sin factura"', () => {
    const st = getMonthStatuses([], 2026, now, '2026-08-24T00:00:00')
    expect(st.slice(0, 7).every((s) => s === 'Antes del alta')).toBe(true)
    expect(st[7]).toBe('Sin factura') // agosto: mes del alta
    expect(st[11]).toBe('Futuro')
  })

  it('una factura existente se muestra aunque sea anterior al alta', () => {
    const st = getMonthStatuses([{ status: 'Pagada', due_date: '2026-07-01T00:00:00' }], 2026, now, '2026-08-24')
    expect(st[6]).toBe('Pagado')
  })
})
