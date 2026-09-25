import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useInvoices,
  useUserInvoices,
  useCreateInvoice,
  usePayInvoice,
  useDeleteInvoice,
} from './useInvoices';

// Mock supabase
vi.mock('../lib/supabase', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: vi.fn((resolve) => Promise.resolve(resolve({ data: [], error: null }))),
  };
  return { supabase: mockSupabase };
});

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

describe('useInvoices', () => {
  beforeEach(() => {
    localStorage.setItem('access_token', 'test-token');
    vi.clearAllMocks();
  });

  it('debe retornar array de facturas', async () => {
    const { result } = renderHook(() => useInvoices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('debe tener estado de carga inicial', () => {
    const { result } = renderHook(() => useInvoices(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('debe funcionar con params de filtro', async () => {
    const { result } = renderHook(
      () => useInvoices({ status: 'Pagada', user_id: 'test-user' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe('useUserInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe retornar facturas del usuario', async () => {
    const { result } = renderHook(() => useUserInvoices('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('no debe ejecutar si userId está vacío', () => {
    const { result } = renderHook(() => useUserInvoices(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe exponer función mutate', () => {
    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('debe tener isPending en false inicialmente', () => {
    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});

describe('usePayInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe exponer función mutate', () => {
    const { result } = renderHook(() => usePayInvoice(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('debe tener estado inicial correcto', () => {
    const { result } = renderHook(() => usePayInvoice(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});

describe('useDeleteInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe exponer función mutate', () => {
    const { result } = renderHook(() => useDeleteInvoice(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('debe tener estado inicial correcto', () => {
    const { result } = renderHook(() => useDeleteInvoice(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});

describe('invoiceKeys', () => {
  it('debe tener key all', async () => {
    const { invoiceKeys } = await import('./useInvoices');
    expect(invoiceKeys.all).toEqual(['invoices']);
  });

  it('debe generar key byUser', async () => {
    const { invoiceKeys } = await import('./useInvoices');
    expect(invoiceKeys.byUser('user-1')).toEqual(['invoices', 'user', 'user-1']);
  });
});