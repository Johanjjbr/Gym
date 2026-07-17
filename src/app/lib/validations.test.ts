import { describe, it, expect } from 'vitest'
import {
  userSchema,
  paymentSchema,
  staffSchema,
  staffUpdateSchema,
  routineSchema,
  exerciseSchema,
  routineAssignmentSchema,
  attendanceSchema,
  loginSchema,
  physicalDataSchema,
} from './validations'

describe('userSchema', () => {
  it('validates a correct user', () => {
    const result = userSchema.safeParse({
      cedula: 'V-12345678',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '04121234567',
      status: 'Activo',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid cedula format', () => {
    const result = userSchema.safeParse({
      cedula: 'ABC',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '04121234567',
      status: 'Activo',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('cedula')
    }
  })

  it('rejects short name', () => {
    const result = userSchema.safeParse({
      cedula: 'V-12345678',
      name: 'A',
      email: 'juan@example.com',
      phone: '04121234567',
      status: 'Activo',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = userSchema.safeParse({
      cedula: 'V-12345678',
      name: 'Juan Pérez',
      email: 'not-an-email',
      phone: '04121234567',
      status: 'Activo',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = userSchema.safeParse({
      cedula: 'V-12345678',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '04121234567',
      status: 'Desconocido',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields as empty strings', () => {
    const result = userSchema.safeParse({
      cedula: 'V-12345678',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '04121234567',
      status: 'Activo',
      birth_date: '',
      gender: '',
      address: '',
      notes: '',
    })
    expect(result.success).toBe(true)
  })

  it('transforms weight string to number', () => {
    const result = userSchema.safeParse({
      cedula: 'V-12345678',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '04121234567',
      status: 'Activo',
      weight: '75.5',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.weight).toBe(75.5)
    }
  })

  it('rejects negative weight', () => {
    const result = userSchema.safeParse({
      cedula: 'V-12345678',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '04121234567',
      status: 'Activo',
      weight: '-10',
    })
    expect(result.success).toBe(false)
  })

  it('rejects birth_date with wrong format', () => {
    const result = userSchema.safeParse({
      cedula: 'V-12345678',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '04121234567',
      status: 'Activo',
      birth_date: '15-01-2025',
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('validates correct login data', () => {
    const result = loginSchema.safeParse({
      email: 'admin@gymteques.com',
      password: 'Admin123!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-email',
      password: 'password',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@gymteques.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('staffSchema', () => {
  it('validates correct staff data', () => {
    const result = staffSchema.safeParse({
      email: 'staff@gymteques.com',
      password: 'Staff123!',
      name: 'Staff Member',
      role: 'Administrador',
      phone: '04121111111',
      shift: 'Mañana',
      status: 'Activo',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = staffSchema.safeParse({
      email: 'staff@gymteques.com',
      password: 'Staff123!',
      name: 'Staff Member',
      role: 'Invitado',
      phone: '04121111111',
      shift: 'Mañana',
      status: 'Activo',
    })
    expect(result.success).toBe(false)
  })

  it('rejects weak password', () => {
    const result = staffSchema.safeParse({
      email: 'staff@gymteques.com',
      password: 'weak',
      name: 'Staff Member',
      role: 'Administrador',
      phone: '04121111111',
      shift: 'Mañana',
      status: 'Activo',
    })
    expect(result.success).toBe(false)
  })

  it('rejects phone with letters', () => {
    const result = staffSchema.safeParse({
      email: 'staff@gymteques.com',
      password: 'Staff123!',
      name: 'Staff Member',
      role: 'Administrador',
      phone: '0412-ABC-1234',
      shift: 'Mañana',
      status: 'Activo',
    })
    expect(result.success).toBe(false)
  })

  it('staffUpdateSchema allows empty password', () => {
    const result = staffUpdateSchema.safeParse({
      email: 'staff@gymteques.com',
      name: 'Staff Member',
      role: 'Administrador',
      phone: '04121111111',
      shift: 'Mañana',
      status: 'Activo',
      password: '',
    })
    expect(result.success).toBe(true)
  })
})

describe('paymentSchema', () => {
  it('validates correct payment data', () => {
    const result = paymentSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 30,
      date: '2025-01-15',
      next_payment: '2025-02-15',
      status: 'Pagado',
      method: 'Efectivo',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative amount', () => {
    const result = paymentSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: -10,
      date: '2025-01-15',
      next_payment: '2025-02-15',
      status: 'Pagado',
      method: 'Efectivo',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid payment status', () => {
    const result = paymentSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 30,
      date: '2025-01-15',
      next_payment: '2025-02-15',
      status: 'Reembolsado',
      method: 'Efectivo',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid payment method', () => {
    const result = paymentSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 30,
      date: '2025-01-15',
      next_payment: '2025-02-15',
      status: 'Pagado',
      method: 'Cripto',
    })
    expect(result.success).toBe(false)
  })
})

describe('routineSchema', () => {
  it('validates correct routine data', () => {
    const result = routineSchema.safeParse({
      name: 'Rutina Full Body',
      level: 'Intermedio',
      category: 'Fuerza',
      duration_weeks: 4,
      days_per_week: 3,
      created_by: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short name', () => {
    const result = routineSchema.safeParse({
      name: 'AB',
      level: 'Intermedio',
      category: 'Fuerza',
      duration_weeks: 4,
      days_per_week: 3,
      created_by: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid level', () => {
    const result = routineSchema.safeParse({
      name: 'Rutina Full Body',
      level: 'Experto',
      category: 'Fuerza',
      duration_weeks: 4,
      days_per_week: 3,
      created_by: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects duration_weeks out of range', () => {
    const result = routineSchema.safeParse({
      name: 'Rutina Full Body',
      level: 'Intermedio',
      category: 'Fuerza',
      duration_weeks: 0,
      days_per_week: 3,
      created_by: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })
})

describe('exerciseSchema', () => {
  it('validates correct exercise data', () => {
    const result = exerciseSchema.safeParse({
      routine_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Press de Banca',
      sets: 4,
      reps: '10-12',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative sets', () => {
    const result = exerciseSchema.safeParse({
      routine_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Press de Banca',
      sets: -1,
      reps: '10-12',
    })
    expect(result.success).toBe(false)
  })
})

describe('attendanceSchema', () => {
  it('validates correct attendance data', () => {
    const result = attendanceSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Entrada',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = attendanceSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Ausente',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional date and time', () => {
    const result = attendanceSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Salida',
      date: '2025-01-15',
      time: '10:30:00',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid time formats', () => {
    const result = attendanceSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Entrada',
      time: '08:30:00',
    })
    expect(result.success).toBe(true)
  })
})

describe('routineAssignmentSchema', () => {
  it('validates correct assignment data', () => {
    const result = routineAssignmentSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      routine_id: '550e8400-e29b-41d4-a716-446655440001',
      assigned_by: '550e8400-e29b-41d4-a716-446655440002',
      start_date: '2025-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = routineAssignmentSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      routine_id: '550e8400-e29b-41d4-a716-446655440001',
      assigned_by: '550e8400-e29b-41d4-a716-446655440002',
      start_date: '15-01-2025',
    })
    expect(result.success).toBe(false)
  })
})

describe('physicalDataSchema', () => {
  it('validates correct physical data', () => {
    const result = physicalDataSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      weight: 75.5,
      height: 175,
      measurement_date: '2025-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects body_fat over 100%', () => {
    const result = physicalDataSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      body_fat: 110,
      measurement_date: '2025-01-15',
    })
    expect(result.success).toBe(false)
  })
})
