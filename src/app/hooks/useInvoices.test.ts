import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useInvoices, usePayInvoice } from './useInvoices'
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

describe('useInvoices', () => {
  it('fetches invoices successfully', async () => {
    const { result } = renderHook(() => useInvoices(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data!.length).toBeGreaterThan(0)
  })
})

describe('usePayInvoice', () => {
  it('pays an invoice successfully', async () => {
    const { result } = renderHook(() => usePayInvoice(), { wrapper: TestWrapper })

    await result.current.mutateAsync({
      id: 'inv-2',
      data: { method: 'Efectivo' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('handles pay invoice error', async () => {
    server.use(
      http.put(`${API_BASE}/invoices/inv-999/pay`, () => {
        return HttpResponse.json({ error: 'Invoice not found' }, { status: 404 })
      })
    )

    const { result } = renderHook(() => usePayInvoice(), { wrapper: TestWrapper })

    try {
      await result.current.mutateAsync({
        id: 'inv-999',
        data: { method: 'Efectivo' },
      })
    } catch (e) {
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
