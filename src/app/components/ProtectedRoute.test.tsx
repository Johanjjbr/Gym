/**
 * Reproduce el bug "al iniciar sesión a veces dice Acceso denegado hasta recargar".
 * Se simula Supabase en memoria: sesión, tablas staff/users y la RPC de permisos.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router';

// ---- Supabase simulado -------------------------------------------------------
const db = vi.hoisted(() => {
  const accounts: Record<string, { id: string; password: string }> = {
    'admin@gym.com': { id: 'auth-admin', password: 'x' },
    'recepcion@gym.com': { id: 'auth-rec', password: 'x' },
  };
  const staff = [
    { id: 's1', auth_user_id: 'auth-admin', name: 'Admin', email: 'admin@gym.com', role: 'Administrador', status: 'Activo', is_super_admin: false, gym_id: null, phone: '', shift: '' },
    { id: 's2', auth_user_id: 'auth-rec', name: 'Linda', email: 'recepcion@gym.com', role: 'Recepción', status: 'Activo', is_super_admin: false, gym_id: null, phone: '', shift: '' },
  ];
  const row = (role: string, module_path: string, can_view: boolean) => ({
    id: `${role}${module_path}`, role, module_path, can_view, can_create: false, can_edit: false, can_delete: false, gym_id: null, created_at: '', updated_at: '',
  });
  const permissions = [
    row('Administrador', '/', true),
    row('Administrador', '/personal', true),
    row('Recepción', '/', true),
    row('Recepción', '/personal', false),
  ];
  const state = { session: null as null | { access_token: string; user: { id: string } }, rpcCalls: [] as (string | null)[] };
  const listeners = new Set<(e: string, s: unknown) => void>();
  return { accounts, staff, permissions, state, listeners };
});

vi.mock('../lib/supabase', () => {
  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    const q: any = {
      select: () => q,
      eq: (col: string, val: unknown) => (filters.push([col, val]), q),
      maybeSingle: async () => {
        const rows = table === 'staff' ? db.staff : [];
        const found = rows.find((r: any) => filters.every(([c, v]) => r[c] === v));
        return { data: found ?? null, error: null };
      },
    };
    return q;
  };
  const supabase = {
    from,
    rpc: async (fn: string) => {
      if (fn !== 'get_my_module_permissions') return { data: null, error: null };
      const uid = db.state.session?.user.id ?? null;
      db.state.rpcCalls.push(uid);
      const me = db.staff.find((s) => s.auth_user_id === uid);
      return { data: me ? db.permissions.filter((p) => p.role === me.role) : [], error: null };
    },
    auth: {
      getSession: async () => ({ data: { session: db.state.session }, error: null }),
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const acc = db.accounts[email];
        if (!acc || acc.password !== password) return { data: { session: null }, error: { message: 'Credenciales inválidas' } };
        db.state.session = { access_token: `tok-${acc.id}`, user: { id: acc.id } };
        return { data: { session: db.state.session, user: db.state.session.user }, error: null };
      },
      signOut: async () => {
        db.state.session = null;
        db.listeners.forEach((l) => l('SIGNED_OUT', null));
        return { error: null };
      },
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        db.listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => db.listeners.delete(cb) } } };
      },
    },
  };
  return { supabase, default: supabase };
});

vi.mock('../lib/api', () => {
  const modulePermissions = {
    getMyPermissions: async () => {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase.rpc('get_my_module_permissions');
      return data;
    },
  };
  return { default: { auth: { login: async () => { throw new Error('sin API'); } } }, modulePermissions };
});

import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ModuleGuard, ProtectedRoute } from './ProtectedRoute';

// ---- App mínima ------------------------------------------------------------
let auth: ReturnType<typeof useAuth>;
function Capture() {
  auth = useAuth();
  return null;
}

function setup(initial: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60_000 } } });
  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>Pantalla de login</p> },
      {
        path: '/',
        element: (
          <ProtectedRoute allowedRoles={['Administrador', 'Recepción']} checkModule={false}>
            <ModuleGuard>
              <Outlet />
            </ModuleGuard>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <p>Dashboard</p> },
          { path: 'personal', element: <p>Personal</p> },
        ],
      },
    ],
    { initialEntries: [initial] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Capture />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  db.state.session = null;
  db.state.rpcCalls = [];
  localStorage.clear();
});

describe('login y permisos', () => {
  it('abrir la app sin sesión y luego iniciar sesión muestra la página (sin recargar)', async () => {
    const router = setup('/');
    await screen.findByText('Pantalla de login');
    // Sin sesión no se piden permisos (antes se cacheaba una lista vacía)
    expect(db.state.rpcCalls).toEqual([]);

    await act(() => auth.login('admin@gym.com', 'x'));
    await act(() => router.navigate('/'));

    expect(await screen.findByText('Dashboard')).toBeTruthy();
    expect(screen.queryByText(/Acceso denegado/)).toBeNull();
    expect(db.state.rpcCalls).toEqual(['auth-admin']);
  });

  it('cerrar sesión y entrar con otra cuenta no reutiliza los permisos de la anterior', async () => {
    db.state.session = { access_token: 't', user: { id: 'auth-admin' } };
    const router = setup('/personal');
    expect(await screen.findByText('Personal')).toBeTruthy();

    await act(() => auth.logout());
    await act(() => auth.login('recepcion@gym.com', 'x'));
    await act(() => router.navigate('/personal'));

    expect(await screen.findByText(/Acceso denegado/)).toBeTruthy();
    expect(db.state.rpcCalls).toEqual(['auth-admin', 'auth-rec']);
  });

  it('una cuenta sin perfil activo no queda logueada', async () => {
    db.accounts['fantasma@gym.com'] = { id: 'auth-x', password: 'x' };
    setup('/login');
    await screen.findByText('Pantalla de login');
    await expect(act(() => auth.login('fantasma@gym.com', 'x'))).rejects.toThrow(/perfil activo/);
    await waitFor(() => expect(auth.isAuthenticated).toBe(false));
    expect(db.state.session).toBeNull();
  });
});
