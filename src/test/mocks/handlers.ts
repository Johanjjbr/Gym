import { http, HttpResponse } from 'msw'

export const API_BASE = 'https://yziorfskmdwjumjwabxa.supabase.co/functions/v1/server'

export const mockUsers = [
  {
    id: 'user-1',
    cedula: 'V-12345678',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    phone: '04121234567',
    status: 'Activo',
    plan: 'Básico',
    member_number: 'GM-0001',
    start_date: '2025-01-15',
    next_payment: '2025-02-15',
    weight: 75,
    height: 175,
    imc: 24.5,
  },
  {
    id: 'user-2',
    cedula: 'V-87654321',
    name: 'María García',
    email: 'maria@example.com',
    phone: '04129876543',
    status: 'Activo',
    plan: 'Premium',
    member_number: 'GM-0002',
    start_date: '2025-02-01',
    next_payment: '2025-03-01',
    weight: 60,
    height: 165,
    imc: 22.0,
  },
  {
    id: 'user-3',
    cedula: 'V-11122333',
    name: 'Carlos López',
    email: 'carlos@example.com',
    phone: '04125556677',
    status: 'Inactivo',
    plan: 'Básico',
    member_number: 'GM-0003',
    start_date: '2024-11-01',
    next_payment: '2024-12-01',
    weight: 80,
    height: 180,
    imc: 24.7,
  },
]

export const mockPlans = [
  { id: 'plan-1', name: 'Básico', price: 30, duration_days: 30 },
  { id: 'plan-2', name: 'Premium', price: 50, duration_days: 30 },
  { id: 'plan-3', name: 'VIP', price: 80, duration_days: 30 },
]

export const mockStaff = [
  {
    id: 'staff-1',
    name: 'Admin Principal',
    email: 'admin@gymteques.com',
    role: 'Administrador',
    phone: '04121111111',
    shift: 'Mañana',
    status: 'Activo',
  },
  {
    id: 'staff-2',
    name: 'Entrenador Uno',
    email: 'trainer@gymteques.com',
    role: 'Entrenador',
    phone: '04122222222',
    shift: 'Tarde',
    status: 'Activo',
  },
]

export const mockInvoices = [
  {
    id: 'inv-1',
    user_id: 'user-1',
    user_name: 'Juan Pérez',
    amount: 30,
    date: '2025-01-15',
    invoice_number: 'FAC-0001',
    concept: 'Mensualidad Enero',
    status: 'Pagada',
  },
  {
    id: 'inv-2',
    user_id: 'user-2',
    user_name: 'María García',
    amount: 50,
    date: '2025-02-01',
    invoice_number: 'FAC-0002',
    concept: 'Mensualidad Febrero',
    status: 'Pendiente',
  },
]

export const mockAttendance = [
  {
    id: 'att-1',
    user_id: 'user-1',
    user_name: 'Juan Pérez',
    date: '2025-02-15',
    time: '08:30:00',
    type: 'Entrada',
  },
  {
    id: 'att-2',
    user_id: 'user-1',
    user_name: 'Juan Pérez',
    date: '2025-02-15',
    time: '10:00:00',
    type: 'Salida',
  },
]

export const mockExercises = [
  { id: 'ex-1', name: 'Press de Banca', muscle_group: 'Pecho', equipment: 'Barra' },
  { id: 'ex-2', name: 'Sentadilla', muscle_group: 'Piernas', equipment: 'Barra' },
  { id: 'ex-3', name: 'Dominadas', muscle_group: 'Espalda', equipment: 'Barra' },
]

export const mockRoutines = [
  {
    id: 'routine-1',
    name: 'Rutina Principiante',
    description: 'Para empezar en el gym',
    level: 'Principiante',
    category: 'Fuerza',
    duration_weeks: 4,
    days_per_week: 3,
    created_by: 'staff-2',
  },
]

export const mockDashboardStats = {
  totalUsers: 3,
  activeUsers: 2,
  delinquentUsers: 1,
  monthlyRevenue: 130,
  todayAttendance: 5,
  totalStaff: 2,
}

export const handlers = [
  http.get(`${API_BASE}/users`, () => {
    return HttpResponse.json(mockUsers)
  }),

  http.get(`${API_BASE}/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id)
    if (!user) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(user)
  }),

  http.post(`${API_BASE}/users`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body as any, id: 'new-user-id' }, { status: 201 })
  }),

  http.put(`${API_BASE}/users/:id`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body as any, id: 'user-1' })
  }),

  http.delete(`${API_BASE}/users/:id`, () => {
    return HttpResponse.json({ success: true })
  }),

  http.get(`${API_BASE}/plans`, () => {
    return HttpResponse.json(mockPlans)
  }),

  http.post(`${API_BASE}/plans`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body as any, id: 'new-plan-id' }, { status: 201 })
  }),

  http.put(`${API_BASE}/plans/:id`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body as any })
  }),

  http.delete(`${API_BASE}/plans/:id`, () => {
    return HttpResponse.json({ success: true })
  }),

  http.get(`${API_BASE}/invoices`, () => {
    return HttpResponse.json(mockInvoices)
  }),

  http.get(`${API_BASE}/users/:userId/invoices`, ({ params }) => {
    const invoices = mockInvoices.filter((i) => i.user_id === params.userId)
    return HttpResponse.json(invoices)
  }),

  http.put(`${API_BASE}/invoices/:id/pay`, () => {
    return HttpResponse.json({ success: true })
  }),

  http.get(`${API_BASE}/staff`, () => {
    return HttpResponse.json(mockStaff)
  }),

  http.post(`${API_BASE}/staff`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body as any, id: 'new-staff-id' }, { status: 201 })
  }),

  http.put(`${API_BASE}/staff/:id`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body as any })
  }),

  http.delete(`${API_BASE}/staff/:id`, () => {
    return HttpResponse.json({ success: true })
  }),

  http.get(`${API_BASE}/exercises`, () => {
    return HttpResponse.json(mockExercises)
  }),

  http.get(`${API_BASE}/routines`, () => {
    return HttpResponse.json(mockRoutines)
  }),

  http.get(`${API_BASE}/stats`, () => {
    return HttpResponse.json(mockDashboardStats)
  }),

  http.post(`${API_BASE}/attendance`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...body as any, id: 'new-att-id' }, { status: 201 })
  }),

  http.get(`${API_BASE}/attendance`, () => {
    return HttpResponse.json(mockAttendance)
  }),

  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json({
      session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
      user: { id: 'staff-1', email: 'admin@gymteques.com' },
      staff: mockStaff[0],
    })
  }),

  http.get(`${API_BASE}/users/without-trainer`, () => {
    return HttpResponse.json([])
  }),

  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'ok' })
  }),
]
