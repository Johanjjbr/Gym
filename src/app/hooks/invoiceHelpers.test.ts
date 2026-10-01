import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const rpc = vi.fn()
const calls: Array<{ table: string; op: string; args?: any }> = []

// Query builder encadenable que registra operaciones y resuelve con `result`
let selectResult: any = { data: [], error: null }
function builder(table: string) {
  const b: any = {
    select: () => b,
    insert: (rows: any) => { calls.push({ table, op: 'insert', args: rows }); return b },
    update: (v: any) => { calls.push({ table, op: 'update', args: v }); return b },
    delete: () => { calls.push({ table, op: 'delete' }); return b },
    eq: () => b, gte: () => b, lt: () => b, in: () => b, order: () => b, limit: () => b,
    single: () => Promise.resolve({ data: { id: 'new-inv' }, error: null }),
    then: (resolve: any) => Promise.resolve(resolve(selectResult)),
  }
  return b
}

vi.mock('../lib/supabase', () => ({
  supabase: { from: (t: string) => builder(t), rpc: (...a: any[]) => rpc(...a) },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { monthBounds, toDateOnly, useCreateInvoice, usePayInvoice, usePayAdvanceMonths, useProcessRecurringPayments } from './useInvoices'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) },
    children,
  )

beforeEach(() => { rpc.mockReset(); calls.length = 0; selectResult = { data: [], error: null } })

describe('monthBounds', () => {
  it('devuelve [inicio, fin) del mes', () => {
    expect(monthBounds('2026-10-17')).toEqual({ start: '2026-10-01', end: '2026-11-01' })
    expect(monthBounds('2026-02-01T00:00:00')).toEqual({ start: '2026-02-01', end: '2026-03-01' })
  })
  it('diciembre pasa al año siguiente', () => {
    expect(monthBounds('2026-12-31')).toEqual({ start: '2026-12-01', end: '2027-01-01' })
  })
})

describe('toDateOnly', () => {
  it('usa la fecha local, no UTC', () => {
    expect(toDateOnly(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31')
  })
})

describe('usePayInvoice', () => {
  it('delega TODO en la RPC pay_invoice (sin escribir payments/users desde el cliente)', async () => {
    rpc.mockResolvedValue({ data: { id: 'i1', status: 'Pagada' }, error: null })
    const { result } = renderHook(() => usePayInvoice(), { wrapper })
    await result.current.mutateAsync({ id: 'i1', data: { method: 'Pago Móvil', reference: 'R1' } })
    expect(rpc).toHaveBeenCalledWith('pay_invoice', expect.objectContaining({ p_invoice_id: 'i1', p_method: 'Pago Móvil', p_reference: 'R1' }))
    expect(calls.filter((c) => c.table === 'payments' || c.table === 'users')).toHaveLength(0)
  })

  it('propaga el error de la base (p. ej. factura ya pagada)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'La factura FAC-1 ya está pagada' } })
    const { result } = renderHook(() => usePayInvoice(), { wrapper })
    await expect(result.current.mutateAsync({ id: 'i1', data: { method: 'Efectivo' } })).rejects.toThrow('ya está pagada')
  })
})

describe('useCreateInvoice', () => {
  it('no envía invoice_number (lo asigna la base de datos)', async () => {
    const { result } = renderHook(() => useCreateInvoice(), { wrapper })
    await result.current.mutateAsync({ user_id: 'u1', amount: 20, due_date: '2026-10-01' })
    const ins = calls.find((c) => c.table === 'invoices' && c.op === 'insert')!
    expect(ins.args[0]).not.toHaveProperty('invoice_number')
    expect(ins.args[0].due_date).toBe('2026-10-01')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('status Pagada y NO hay factura impaga del mes: crea Pendiente y la paga por RPC', async () => {
    rpc.mockResolvedValue({ data: { id: 'new-inv' }, error: null })
    const { result } = renderHook(() => useCreateInvoice(), { wrapper })
    await result.current.mutateAsync({ user_id: 'u1', amount: 20, due_date: '2026-10-01', status: 'Pagada', method: 'Efectivo' })
    expect(calls.find((c) => c.op === 'insert')!.args[0].status).toBe('Pendiente')
    expect(rpc).toHaveBeenCalledWith('pay_invoice', expect.objectContaining({ p_invoice_id: 'new-inv' }))
  })

  it('status Pagada y YA existe una impaga del mes: la salda, no crea otra', async () => {
    selectResult = { data: [{ id: 'exist-1', amount: 20 }], error: null }
    rpc.mockResolvedValue({ data: { id: 'exist-1' }, error: null })
    const { result } = renderHook(() => useCreateInvoice(), { wrapper })
    await result.current.mutateAsync({ user_id: 'u1', amount: 20, due_date: '2026-10-01', status: 'Pagada' })
    expect(calls.filter((c) => c.op === 'insert')).toHaveLength(0)
    expect(rpc).toHaveBeenCalledWith('pay_invoice', expect.objectContaining({ p_invoice_id: 'exist-1' }))
  })

  it('si el monto cobrado difiere, se actualiza la factura existente antes de pagar', async () => {
    selectResult = { data: [{ id: 'exist-1', amount: 20 }], error: null }
    rpc.mockResolvedValue({ data: {}, error: null })
    const { result } = renderHook(() => useCreateInvoice(), { wrapper })
    await result.current.mutateAsync({ user_id: 'u1', amount: 15, due_date: '2026-10-01', status: 'Pagada' })
    expect(calls.find((c) => c.op === 'update')!.args).toEqual({ amount: 15 })
  })

  it('si el cobro falla, borra la factura recién creada (no deja basura)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'check_violation' } })
    const { result } = renderHook(() => useCreateInvoice(), { wrapper })
    await expect(
      result.current.mutateAsync({ user_id: 'u1', amount: 20, due_date: '2026-10-01', status: 'Pagada', method: 'Bitcoin' }),
    ).rejects.toThrow('check_violation')
    expect(calls.some((c) => c.table === 'invoices' && c.op === 'delete')).toBe(true)
  })
})

describe('usePayAdvanceMonths / useProcessRecurringPayments', () => {
  it('pago adelantado llama a pay_advance_months con los parámetros correctos', async () => {
    rpc.mockResolvedValue({ data: { paid: 3, created: 2, paid_until: '2026-12-01' }, error: null })
    const { result } = renderHook(() => usePayAdvanceMonths(), { wrapper })
    const r = await result.current.mutateAsync({ user_id: 'u1', months: 3, method: 'Transferencia' })
    expect(rpc).toHaveBeenCalledWith('pay_advance_months', { p_user_id: 'u1', p_months: 3, p_method: 'Transferencia', p_reference: null })
    expect(r.paid).toBe(3)
  })

  it('facturación manual usa run_daily_billing (el mismo proceso que el cron)', async () => {
    rpc.mockResolvedValue({ data: { overdue_invoices: 1, suspended_users: 1, generated_invoices: 2 }, error: null })
    const { result } = renderHook(() => useProcessRecurringPayments(), { wrapper })
    await waitFor(async () => { await result.current.mutateAsync() })
    expect(rpc).toHaveBeenCalledWith('run_daily_billing')
  })
})
