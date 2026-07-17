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
import { Toaster } from '../components/ui/sonner';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

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

    if (!cedula.trim()) {
      setError('La cédula es requerida');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Generar número de miembro único
      const memberNumber = await generateUniqueMemberNumber();

      // 2. Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: undefined,
          data: {
            name: name,
            role: 'Usuario',
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Error al crear la cuenta');
      }

      // 3. Crear registro en la tabla users
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          cedula: cedula,
          name: name,
          email: email,
          phone: phone || null,
          member_number: memberNumber,
          status: 'Inactivo',
          start_date: new Date().toISOString(),
          is_activated: true,
          auth_user_id: authData.user.id,
          created_at: new Date().toISOString(),
        }]);

      if (userError) {
        // Si falla la inserción del usuario, no intentar eliminar porque puede causar errores
        console.error('Error al crear usuario en DB:', userError);
        throw new Error('Error al crear el perfil de usuario. Por favor contacta al administrador.');
      }

      toast.success(`¡Cuenta creada exitosamente! Tu número de miembro es: ${memberNumber}`);
      
      // Cambiar a modo login y prellenar el email
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setCedula('');
      setPhone('');
      
    } catch (error: any) {
      console.error('Error en registro:', error);
      setError(error.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para generar número de miembro único
  const generateUniqueMemberNumber = async (): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        // Obtener el último número de miembro registrado
        const { data: lastMember, error } = await supabase
          .from('users')
          .select('member_number')
          .order('member_number', { ascending: false })
          .limit(1)
          .single();

        let nextNumber = 1;

        if (!error && lastMember && lastMember.member_number) {
          // Extraer el número del formato GM-XXXX
          const match = lastMember.member_number.match(/GM-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }

        // Formatear con ceros a la izquierda (GM-0001, GM-0002, etc.)
        const memberNumber = `GM-${String(nextNumber).padStart(4, '0')}`;

        // Verificar que no exista (doble verificación por seguridad)
        const { data: existing } = await supabase
          .from('users')
          .select('member_number')
          .eq('member_number', memberNumber)
          .single();

        if (!existing) {
          return memberNumber;
        }

        attempts++;
      } catch (error) {
        attempts++;
      }
    }

    // Si después de varios intentos no se pudo generar, usar timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `GM-${timestamp}`;
  };

  const fillCredentials = (role: 'admin' | 'trainer' | 'reception' | 'user') => {
    const credentials = {
      admin: { email: 'admin@gymteques.com', password: 'Admin123!' },
      trainer: { email: 'trainer@gymteques.com', password: 'Trainer123!' },
      reception: { email: 'recepcion@gymteques.com', password: 'Recepcion123!' },
      user: { email: 'usuario@gymteques.com', password: 'User123!' },
    };

    setEmail(credentials[role].email);
    setPassword(credentials[role].password);
    setShowCredentials(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <Toaster position="bottom-right" richColors />
      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Dumbbell className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-foreground">Gimnasio Los Teques</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sector Lagunetica - Sistema Administrativo
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tabs de Login / Registro */}
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-primary text-black font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
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
                  ? 'bg-primary text-black font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrarse</span>
            </button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <Alert className="border-primary/50 bg-primary/10">
                <UserPlus className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary ml-2">
                  Regístrate para acceder a tus rutinas, seguimiento de progreso y pagar tu mensualidad
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80">
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
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80">
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
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground/80">
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
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground/80">
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
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="cedula" className="text-foreground/80">
                  Cédula <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cedula"
                  type="text"
                  placeholder="V-12345678"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground/80">
                  Teléfono (opcional)
                </Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="0414-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            )}

            {error && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive ml-2">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-black font-bold h-12 text-lg"
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

          {mode === 'login' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="w-full text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                {showCredentials ? '− Ocultar' : '+ Mostrar'} credenciales de prueba
              </button>

              {showCredentials && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-3">Haz clic para usar:</p>
                  
                  <button
                    type="button"
                    onClick={() => fillCredentials('user')}
                    className="w-full text-left p-3 bg-card hover:bg-muted rounded border border-border transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Usuario Regular</p>
                        <p className="text-xs text-muted-foreground">usuario@gymteques.com</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin')}
                    className="w-full text-left p-3 bg-card hover:bg-muted rounded border border-border transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Administrador</p>
                        <p className="text-xs text-muted-foreground">admin@gymteques.com</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillCredentials('trainer')}
                    className="w-full text-left p-3 bg-card hover:bg-muted rounded border border-border transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Entrenador</p>
                        <p className="text-xs text-muted-foreground">trainer@gymteques.com</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillCredentials('reception')}
                    className="w-full text-left p-3 bg-card hover:bg-muted rounded border border-border transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Recepción</p>
                        <p className="text-xs text-muted-foreground">recepcion@gymteques.com</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground/70">
              Sistema de gestión v1.0 - Febrero 2026
            </p>
            <a 
              href="/test-supabase" 
              className="text-xs text-muted-foreground/70 hover:text-primary transition-colors mt-2 inline-block"
            >
              Test de Conexión Supabase →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}