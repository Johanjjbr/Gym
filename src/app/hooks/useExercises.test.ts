import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useExercises } from './useExercises'
import { TestWrapper } from '../../test/test-utils'

beforeEach(() => {
  localStorage.setItem('access_token', 'mock-token')
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  default: {},
}))

describe('useExercises', () => {
  it('fetches exercises successfully', async () => {
    const { result } = renderHook(() => useExercises(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
  })
})
