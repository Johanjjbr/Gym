import { describe, it, expect } from 'vitest'
import { emptyToNull } from './emptyToNull'

describe('emptyToNull', () => {
  it('converts empty string to null', () => {
    expect(emptyToNull('')).toBe(null)
  })

  it('converts null to null', () => {
    expect(emptyToNull(null)).toBe(null)
  })

  it('converts undefined to null', () => {
    expect(emptyToNull(undefined)).toBe(null)
  })

  it('keeps non-empty strings', () => {
    expect(emptyToNull('Mensual')).toBe('Mensual')
  })

  it('keeps numeric values', () => {
    expect(emptyToNull(75.5)).toBe(75.5)
    expect(emptyToNull(0)).toBe(0)
  })

  it('keeps boolean values', () => {
    expect(emptyToNull(false)).toBe(false)
    expect(emptyToNull(true)).toBe(true)
  })

  it('keeps whitespace-only strings as-is (no trimming)', () => {
    expect(emptyToNull('   ')).toBe('   ')
  })
})
