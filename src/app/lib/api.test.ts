import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { API_BASE } from '../../test/mocks/handlers'

describe('API - Users', () => {
  it('fetches users list', async () => {
    const response = await fetch(`${API_BASE}/users`)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('name')
    expect(data[0]).toHaveProperty('email')
  })

  it('fetches a single user by id', async () => {
    const response = await fetch(`${API_BASE}/users/user-1`)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.id).toBe('user-1')
    expect(data.name).toBe('Juan Pérez')
  })

  it('returns 404 for unknown user', async () => {
    const response = await fetch(`${API_BASE}/users/non-existent`)
    expect(response.status).toBe(404)
  })

  it('creates a user', async () => {
    const newUser = {
      cedula: 'V-99999999',
      name: 'New User',
      email: 'new@example.com',
      phone: '04120000000',
      status: 'Activo',
    }
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    const data = await response.json()
    expect(response.status).toBe(201)
    expect(data.id).toBeDefined()
  })

  it('updates a user', async () => {
    const response = await fetch(`${API_BASE}/users/user-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Juan Updated' }),
    })
    expect(response.status).toBe(200)
  })

  it('deletes a user', async () => {
    const response = await fetch(`${API_BASE}/users/user-1`, { method: 'DELETE' })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

describe('API - Plans', () => {
  it('fetches all plans', async () => {
    const response = await fetch(`${API_BASE}/plans`)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.length).toBe(3)
    expect(data[0]).toHaveProperty('name')
    expect(data[0]).toHaveProperty('price')
  })

  it('creates a plan', async () => {
    const newPlan = { name: 'Test Plan', price: 25, duration_days: 30 }
    const response = await fetch(`${API_BASE}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlan),
    })
    const data = await response.json()
    expect(response.status).toBe(201)
    expect(data.id).toBe('new-plan-id')
  })

  it('updates a plan', async () => {
    const response = await fetch(`${API_BASE}/plans/plan-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Básico Plus' }),
    })
    expect(response.status).toBe(200)
  })

  it('deletes a plan', async () => {
    const response = await fetch(`${API_BASE}/plans/plan-1`, { method: 'DELETE' })
    expect(response.status).toBe(200)
  })
})

describe('API - Staff', () => {
  it('fetches all staff', async () => {
    const response = await fetch(`${API_BASE}/staff`)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.length).toBe(2)
    expect(data[0]).toHaveProperty('role')
  })

  it('creates staff', async () => {
    const response = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Staff', email: 'new@test.com', role: 'Administrador' }),
    })
    expect(response.status).toBe(201)
  })

  it('updates staff', async () => {
    const response = await fetch(`${API_BASE}/staff/staff-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(response.status).toBe(200)
  })

  it('deletes staff', async () => {
    const response = await fetch(`${API_BASE}/staff/staff-1`, { method: 'DELETE' })
    expect(response.status).toBe(200)
  })
})

describe('API - Invoices', () => {
  it('fetches all invoices', async () => {
    const response = await fetch(`${API_BASE}/invoices`)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  it('pays an invoice', async () => {
    const response = await fetch(`${API_BASE}/invoices/inv-2/pay`, { method: 'PUT' })
    expect(response.status).toBe(200)
  })
})

describe('API - Attendance', () => {
  it('registers attendance', async () => {
    const entry = { user_id: 'user-1', type: 'Entrada' }
    const response = await fetch(`${API_BASE}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    const data = await response.json()
    expect(response.status).toBe(201)
    expect(data.id).toBe('new-att-id')
  })
})

describe('API - Error handling', () => {
  it('handles 404 errors gracefully', async () => {
    const response = await fetch(`${API_BASE}/non-existent-route`)
    expect(response.status).toBe(404)
  })

  it('handles server errors gracefully', async () => {
    server.use(
      http.get(`${API_BASE}/users`, () => {
        return HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      })
    )
    const response = await fetch(`${API_BASE}/users`)
    expect(response.status).toBe(500)
  })
})
