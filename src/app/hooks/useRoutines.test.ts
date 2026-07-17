import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRoutines } from './useRoutines'
import { TestWrapper } from '../../test/test-utils'

beforeEach(() => {
  localStorage.setItem('access_token', 'mock-token')
})

vi.mock('../lib/api', () => {
  const mockData = [
    {
      id: 'routine-1',
      name: 'Rutina Principiante',
      description: 'Para empezar',
      level: 'Principiante',
      category: 'Fuerza',
      duration_weeks: 4,
      days_per_week: 3,
      created_by: 'staff-2',
      created_at: '2025-01-01',
      is_active: true,
      routine_exercises: [],
      staff: { id: 'staff-2', name: 'Trainer' },
    },
  ]
  return {
    routines: {
      getAll: () => Promise.resolve(mockData),
    },
    routineAssignments: {},
    workoutSessions: {},
    exerciseLogs: {},
    users: {},
    staff: {},
    plans: {},
    payments: {},
    invoices: {},
    attendance: {},
    exercises: {},
    stats: {},
    auth: {},
    default: {},
  }
})

describe('useRoutines', () => {
  it('fetches routines successfully', async () => {
    const { result } = renderHook(() => useRoutines(), { wrapper: TestWrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 })

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
    expect(result.current.data!.length).toBeGreaterThan(0)
    expect(result.current.data![0]).toHaveProperty('name')
    expect(result.current.data![0].name).toBe('Rutina Principiante')
  })
})
