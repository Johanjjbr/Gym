import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboardStats } from './useStats'
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

describe('useDashboardStats', () => {
  it('fetches dashboard stats successfully', async () => {
    const { result } = renderHook(() => useDashboardStats(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(result.current.data).toHaveProperty('totalUsers')
    expect(result.current.data).toHaveProperty('activeUsers')
    expect(result.current.data).toHaveProperty('monthlyRevenue')
    expect(result.current.data).toHaveProperty('todayAttendance')
  })
})
