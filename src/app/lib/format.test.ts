import { describe, it, expect } from 'vitest'
import { formatDate } from './format'

describe('formatDate', () => {
  it('returns N/A for empty string', () => {
    expect(formatDate('')).toBe('N/A')
  })

  it('returns N/A for nullish values', () => {
    expect(formatDate(null as any)).toBe('N/A')
    expect(formatDate(undefined as any)).toBe('N/A')
  })

  it('returns N/A for invalid dates', () => {
    expect(formatDate('invalid-date')).toBe('N/A')
  })

  it('formats date string to DD/MM/YYYY without day name', () => {
    const result = formatDate('2025-01-15T12:00:00')
    expect(result).toBe('15/01/2025')
  })

  it('formats Date object correctly', () => {
    const result = formatDate(new Date(2025, 0, 15, 12, 0, 0))
    expect(result).toBe('15/01/2025')
  })

  it('pads single-digit days and months', () => {
    expect(formatDate('2025-03-05T12:00:00')).toBe('05/03/2025')
    expect(formatDate('2025-12-01T12:00:00')).toBe('01/12/2025')
  })

  it('includes day name when withDayName is true', () => {
    const result = formatDate('2025-01-15T12:00:00', true)
    expect(result).toContain('15')
    expect(result).toContain('enero')
    expect(result).toContain('2025')
  })
})
