import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Login } from './Login'

const mockNavigate = vi.hoisted(() => vi.fn())
const mockLogin = vi.hoisted(() => vi.fn())
const mockSignUp = vi.hoisted(() => vi.fn())

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
    storage: { from: vi.fn() },
  },
  default: {},
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: mockLogin,
    logout: vi.fn(),
    hasRole: () => false,
  }),
  AuthProvider: ({ children }: any) => children,
}))

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the login form', () => {
    renderLogin()
    expect(screen.getByText('Gimnasio Los Teques')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('usuario@gymteques.com')).toBeInTheDocument()
  })

  it('switches to register mode', async () => {
    renderLogin()

    const buttons = screen.getAllByRole('button')
    const registerBtn = buttons.find(b => b.textContent?.trim() === 'Registrarse')
    await userEvent.click(registerBtn!)

    await waitFor(() => {
      expect(screen.getByText('Confirmar Contraseña')).toBeInTheDocument()
    })
  })

  it('calls login on form submission', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText('usuario@gymteques.com'), 'admin@gymteques.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Admin123!')

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@gymteques.com', 'Admin123!')
    })
  })

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Credenciales inválidas'))
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText('usuario@gymteques.com'), 'bad@email.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong')

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument()
    })
  })

  it('shows validation error for short password in register mode', async () => {
    renderLogin()

    const buttons = screen.getAllByRole('button')
    const registerBtn = buttons.find(b => b.textContent?.trim() === 'Registrarse')
    await userEvent.click(registerBtn!)

    await waitFor(() => {
      expect(screen.getByText('Confirmar Contraseña')).toBeInTheDocument()
    })

    await userEvent.type(screen.getByLabelText('Contraseña'), '12345')
    const confirmInput = screen.getByLabelText('Confirmar Contraseña')
    await userEvent.type(confirmInput, '12345')

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/La contraseña debe tener al menos 6 caracteres/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when passwords do not match', async () => {
    renderLogin()

    const buttons = screen.getAllByRole('button')
    const registerBtn = buttons.find(b => b.textContent?.trim() === 'Registrarse')
    await userEvent.click(registerBtn!)

    await waitFor(() => {
      expect(screen.getByText('Confirmar Contraseña')).toBeInTheDocument()
    })

    await userEvent.type(screen.getByLabelText('Contraseña'), 'password123')
    const confirmInput = screen.getByLabelText('Confirmar Contraseña')
    await userEvent.type(confirmInput, 'different')

    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/Las contraseñas no coinciden/i)).toBeInTheDocument()
    })
  })
})
