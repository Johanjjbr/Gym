import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from './useStaff'
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
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })),
  },
  default: {},
}))

describe('useStaff', () => {
  it('fetches staff list successfully', async () => {
    const { result } = renderHook(() => useStaff(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data!.length).toBe(2)
    expect(result.current.data![0]).toHaveProperty('role')
  })

  it('handles empty staff list', async () => {
    server.use(
      http.get(`${API_BASE}/staff`, () => {
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => useStaff(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })
})

describe('useCreateStaff', () => {
  it('creates staff successfully', async () => {
    const { result } = renderHook(() => useCreateStaff(), { wrapper: TestWrapper })

    await result.current.mutateAsync({
      name: 'New Trainer',
      email: 'trainer2@gymteques.com',
      password: 'Trainer123!',
      role: 'Entrenador',
      phone: '04123333444',
      shift: 'Mañana',
      status: 'Activo',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useUpdateStaff', () => {
  it('updates staff successfully', async () => {
    const { result } = renderHook(() => useUpdateStaff(), { wrapper: TestWrapper })

    await result.current.mutateAsync({
      id: 'staff-1',
      data: { name: 'Admin Modificado', shift: 'Tarde' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useDeleteStaff', () => {
  it('deletes staff successfully', async () => {
    const { result } = renderHook(() => useDeleteStaff(), { wrapper: TestWrapper })

    await result.current.mutateAsync('staff-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
