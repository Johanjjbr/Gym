import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAttendance, useCreateAttendance } from './useAttendance'
import { TestWrapper } from '../../test/test-utils'

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

describe('useAttendance', () => {
  it('fetches attendance records', async () => {
    const { result } = renderHook(() => useAttendance(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
  })
})

describe('useCreateAttendance', () => {
  it('registers attendance successfully', async () => {
    const { result } = renderHook(() => useCreateAttendance(), { wrapper: TestWrapper })

    await result.current.mutateAsync({
      user_id: 'user-1',
      type: 'Entrada',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
