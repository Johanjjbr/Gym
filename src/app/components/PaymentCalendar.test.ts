import { describe, it, expect } from 'vitest'
import { getPaidMonthKeys } from './PaymentCalendar'

describe('getPaidMonthKeys', () => {
  it('returns empty set for non-array input', () => {
    expect(getPaidMonthKeys(null as any)).toEqual(new Set())
    expect(getPaidMonthKeys(undefined as any)).toEqual(new Set())
    expect(getPaidMonthKeys('foo' as any)).toEqual(new Set())
  })

  it('ignores invoices that are not paid', () => {
    const result = getPaidMonthKeys([
      { status: 'Pendiente', paid_at: '2026-01-15T12:00:00' },
      { status: 'Vencida', paid_at: '2026-02-15T12:00:00' },
    ])
    expect(result.size).toBe(0)
  })

  it('adds month key from due_date when present (billing month wins over paid_at)', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', due_date: '2026-07-01T00:00:00', paid_at: '2026-08-04T22:29:07Z' },
    ])
    expect(result.has('2026-6')).toBe(true)
    expect(result.has('2026-7')).toBe(false)
  })

  it('adds month key from paid_at when due_date is missing', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', paid_at: '2026-03-10T12:00:00' },
    ])
    expect(result.has('2026-2')).toBe(true)
  })

  it('maps each paid plan invoice to its own billing month', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', due_date: '2026-07-01T00:00:00', paid_at: '2026-08-04T22:29:07Z' },
      { status: 'Pagada', due_date: '2026-08-04T00:00:00', paid_at: '2026-08-04T22:29:07Z' },
      { status: 'Pagada', due_date: '2026-09-01T00:00:00', paid_at: '2026-08-04T22:29:07Z' },
    ])
    expect(result).toEqual(new Set(['2026-6', '2026-7', '2026-8']))
  })

  it('falls back to due_date when paid_at is missing', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', due_date: '2026-11-05T12:00:00' },
    ])
    expect(result.has('2026-10')).toBe(true)
  })

  it('aggregates multiple paid months without duplicates', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', paid_at: '2026-01-01T12:00:00' },
      { status: 'Pagada', paid_at: '2026-01-20T12:00:00' },
      { status: 'Pagada', paid_at: '2026-07-15T12:00:00' },
    ])
    expect(result).toEqual(new Set(['2026-0', '2026-6']))
  })

  it('ignores invalid dates', () => {
    const result = getPaidMonthKeys([
      { status: 'Pagada', paid_at: 'invalid-date' },
      { status: 'Pagada' },
    ])
    expect(result.size).toBe(0)
  })
})
