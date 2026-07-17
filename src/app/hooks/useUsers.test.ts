import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUsers, useUser, useCreateUser, useUpdateUser, useDeleteUser } from './useUsers'
import { TestWrapper } from '../../test/test-utils'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'

const API_BASE = 'https://yziorfskmdwjumjwabxa.supabase.co/functions/v1/server'

beforeEach(() => {
  localStorage.setItem('access_token', 'mock-token')
})

afterEach(() => {
  localStorage.clear()
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    })),
    storage: { from: vi.fn() },
  },
  default: {},
}))

describe('useUsers', () => {
  it('fetches users successfully', async () => {
    const { result } = renderHook(() => useUsers(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data!.length).toBeGreaterThan(0)
  })

  it('returns error when API fails', async () => {
    server.use(
      http.get(`${API_BASE}/users`, () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 })
      })
    )

    const { result } = renderHook(() => useUsers(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useUser', () => {
  it('fetches a single user by id', async () => {
    const { result } = renderHook(() => useUser('user-1'), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
  })

  it('is not enabled without id', () => {
    const { result } = renderHook(() => useUser(''), { wrapper: TestWrapper })
    expect(result.current.isPending).toBe(true)
  })
})

describe('useCreateUser', () => {
  it('creates a user successfully', async () => {
    const { result } = renderHook(() => useCreateUser(), { wrapper: TestWrapper })

    const mutationResult = await result.current.mutateAsync({
      cedula: 'V-99999999',
      name: 'New User',
      email: 'new@example.com',
      phone: '04120000000',
      status: 'Activo',
    })

    expect(mutationResult.activationToken).toBeDefined()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useUpdateUser', () => {
  it('updates a user successfully', async () => {
    const { result } = renderHook(() => useUpdateUser(), { wrapper: TestWrapper })

    await result.current.mutateAsync({
      id: 'user-1',
      data: { name: 'Updated Name' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useDeleteUser', () => {
  it('deletes a user successfully', async () => {
    const { result } = renderHook(() => useDeleteUser(), { wrapper: TestWrapper })

    await result.current.mutateAsync('user-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
