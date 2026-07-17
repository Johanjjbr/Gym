import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePayments } from './usePayments'
import { TestWrapper } from '../../test/test-utils'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'

const API_BASE = 'https://yziorfskmdwjumjwabxa.supabase.co/functions/v1/server'

beforeEach(() => {
  localStorage.setItem('access_token', 'mock-token')
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    })),
  },
  default: {},
}))

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual as any,
    payments: {
      getAll: async () => {
        return [
          { id: 'pay-1', user_id: 'user-1', amount: 30, status: 'Pagado', method: 'Efectivo', date: '2025-01-15' },
        ]
      },
    },
  }
})

describe('usePayments', () => {
  it('returns payments data', async () => {
    const { result } = renderHook(() => usePayments(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data!.length).toBeGreaterThan(0)
    expect(result.current.data![0]).toHaveProperty('amount')
  })
})
