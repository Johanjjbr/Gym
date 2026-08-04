import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserFormDialog } from './UserFormDialog'
import { TestWrapper } from '../../test/test-utils'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'

const API_BASE = 'https://yziorfskmdwjumjwabxa.supabase.co/functions/v1/server'

const PLAN_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

const mockUser = {
  id: 'user-victor',
  cedula: 'V-20123456',
  name: 'Victor Rojas',
  email: 'victor@example.com',
  phone: '04121234567',
  status: 'Inactivo',
  plan: '',
  plan_id: null,
  member_number: 'GYM-000001',
  start_date: '2026-07-01',
  next_payment: '2026-08-01',
  weight: null,
  height: null,
  imc: null,
  birth_date: '',
  gender: '',
  address: '',
  emergency_contact: '',
  notes: '',
  medical_notes: '',
  photo: '',
}

function setupServer() {
  let capturedBody: any = null
  server.use(
    http.get(`${API_BASE}/plans`, () => {
      return HttpResponse.json([
        { id: PLAN_UUID, name: 'Mensual', price: 40, duration_days: 30 },
      ])
    }),
    http.put(`${API_BASE}/users/:id`, async ({ request }) => {
      capturedBody = await request.json()
      return HttpResponse.json({ ...(capturedBody as any), id: 'user-victor' })
    }),
  )
  return {
    getCapturedBody: () => capturedBody,
  }
}

describe('UserFormDialog', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'mock-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('envía plan_id y plan al guardar un usuario editado con un plan seleccionado', async () => {
    const user = userEvent.setup()
    const { getCapturedBody } = setupServer()

    render(
      <TestWrapper>
        <UserFormDialog open={true} onOpenChange={vi.fn()} user={mockUser} />
      </TestWrapper>
    )

    const planTrigger = (await screen.findAllByRole('combobox')).find(b =>
      b.textContent?.includes('Seleccionar plan')
    )!
    await user.click(planTrigger)

    const option = await screen.findByRole('option', { name: /Mensual — Bs 40/i })
    await user.click(option)

    const submitBtn = screen.getByRole('button', { name: /Actualizar Usuario/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(getCapturedBody()).not.toBeNull()
    })
    expect(getCapturedBody().plan_id).toBe(PLAN_UUID)
    expect(getCapturedBody().plan).toBe('Mensual')
  })

  it('mantiene el plan existente al editar un usuario que ya tiene plan asignado', async () => {
    const user = userEvent.setup()
    const { getCapturedBody } = setupServer()

    const userWithPlan = { ...mockUser, plan_id: PLAN_UUID, plan: 'Mensual' }

    render(
      <TestWrapper>
        <UserFormDialog open={true} onOpenChange={vi.fn()} user={userWithPlan} />
      </TestWrapper>
    )

    const submitBtn = screen.getByRole('button', { name: /Actualizar Usuario/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(getCapturedBody()).not.toBeNull()
    })
    expect(getCapturedBody().plan_id).toBe(PLAN_UUID)
  })
})
