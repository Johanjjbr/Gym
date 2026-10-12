import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dumbbell, Loader2, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirigir según el rol del usuario después del login
  useEffect(() => {
    if (user) {
      if (user.role === 'Usuario') {
        navigate('/usuario/mi-entrenamiento', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setIsLoading(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // 1. Crear la cuenta. Los datos quedan en el metadata por si el email
      //    debe confirmarse antes de poder crear el perfil.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
            timezone,
            signup_kind: 'independent',
          },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Error al crear la cuenta');

      // 2. Sin sesión = Supabase pide confirmar el email primero. El perfil se
      //    crea solo en el primer inicio de sesión (AuthContext).
      if (!authData.session) {
        toast.success('¡Cuenta creada! Revisa tu email para confirmarla y luego inicia sesión.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      // 3. Con sesión: crear el perfil de usuario independiente (sin gimnasio)
      const { error: profileError } = await supabase.rpc('register_independent_user', {
        p_name: name.trim(),
        p_phone: phone.trim() || null,
        p_timezone: timezone,
      });
      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(profileError.message);
      }

      toast.success(`¡Bienvenido a GymStars, ${name.trim().split(' ')[0]}!`);
      // Carga el perfil y redirige a la zona de usuario
      await login(email.trim().toLowerCase(), password);
    } catch (error: any) {
      console.error('Error en registro:', error);
      setError(error.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <Card className="w-full max-w-md border-gray-700 bg-gray-900/50 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-[#10f94e]/10 rounded-full">
              <Dumbbell className="h-12 w-12 text-[#10f94e]" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-white">Gimnasio Los Teques</CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              Sector Lagunetica - Sistema Administrativo
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tabs de Login / Registro */}
          <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg border border-gray-700">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-[#10f94e] text-black font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-[#10f94e] text-black font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrarse</span>
            </button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <Alert className="border-[#10f94e]/50 bg-[#10f94e]/10">
                <UserPlus className="h-4 w-4 text-[#10f94e]" />
                <AlertDescription className="text-[#10f94e] ml-2">
                  Regístrate para acceder a tus rutinas, seguimiento de progreso y pagar tu mensualidad
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@gymteques.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">
                  Confirmar Contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Nombre Completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  Teléfono (opcional)
                </Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="0414-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
            )}

            {error && (
              <Alert className="border-[#ff3b5c]/50 bg-[#ff3b5c]/10">
                <AlertCircle className="h-4 w-4 text-[#ff3b5c]" />
                <AlertDescription className="text-[#ff3b5c] ml-2">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold h-12 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {mode === 'login' ? 'Iniciando sesión...' : 'Registrando...'}
                </>
              ) : (
                mode === 'login' ? 'Iniciar Sesión' : 'Registrarse'
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Sistema de gestión v1.0 - Febrero 2026
            </p>
            <a 
              href="/test-supabase" 
              className="text-xs text-gray-500 hover:text-[#10f94e] transition-colors mt-2 inline-block"
            >
              Test de Conexión Supabase →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}