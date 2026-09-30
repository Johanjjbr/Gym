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
