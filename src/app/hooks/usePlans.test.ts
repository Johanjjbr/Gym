import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from './usePlans'
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

describe('usePlans', () => {
  it('fetches plans successfully', async () => {
    const { result } = renderHook(() => usePlans(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data!.length).toBeGreaterThan(0)
    expect(result.current.data![0]).toHaveProperty('name')
    expect(result.current.data![0]).toHaveProperty('price')
  })

  it('handles empty plans list', async () => {
    server.use(
      http.get(`${API_BASE}/plans`, () => {
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => usePlans(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

describe('useCreatePlan', () => {
  it('creates a plan successfully', async () => {
    const { result } = renderHook(() => useCreatePlan(), { wrapper: TestWrapper })

    await result.current.mutateAsync({
      name: 'Premium Plus',
      price: 100,
      duration_days: 30,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useUpdatePlan', () => {
  it('updates a plan successfully', async () => {
    const { result } = renderHook(() => useUpdatePlan(), { wrapper: TestWrapper })

    await result.current.mutateAsync({
      id: 'plan-1',
      data: { name: 'Básico Plus', price: 35 },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useDeletePlan', () => {
  it('deletes a plan successfully', async () => {
    const { result } = renderHook(() => useDeletePlan(), { wrapper: TestWrapper })

    await result.current.mutateAsync('plan-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
