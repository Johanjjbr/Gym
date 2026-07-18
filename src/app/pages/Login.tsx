import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dumbbell, Loader2, AlertCircle, UserPlus, LogIn, Building2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { useGymByCode } from '../hooks/useUserRoutines';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registrationType, setRegistrationType] = useState<'free' | 'gym'>('free');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [gymCode, setGymCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const { data: foundGym, isLoading: searchingGym } = useGymByCode(
    registrationType === 'gym' && gymCode.trim().length > 0 ? gymCode.trim() : ''
  );

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

      // 3. Validar código de gimnasio si aplica
      let gymId = null;
      if (registrationType === 'gym') {
        if (!gymCode.trim()) {
          throw new Error('Debes ingresar el código del gimnasio');
        }
        const { data: gym } = await supabase
          .from('gyms')
          .select('id')
          .eq('code', gymCode.trim())
          .maybeSingle();
        if (!gym) {
          throw new Error('Código de gimnasio inválido. Verifica el código e intenta de nuevo.');
        }
        gymId = gym.id;
      }

      // 4. Crear registro en la tabla users
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
          is_free_user: registrationType === 'free',
          gym_id: gymId,
        }]);

      if (userError) {
        // Si falla la inserción del usuario, no intentar eliminar porque puede causar errores
        console.error('Error al crear usuario en DB:', userError);
        throw new Error('Error al crear el perfil de usuario. Por favor contacta al administrador.');
      }

      toast.success(
        registrationType === 'free'
          ? `¡Cuenta creada! Bienvenido al entrenamiento libre. Tu número de miembro: ${memberNumber}`
          : `¡Cuenta creada exitosamente! Tu número de miembro es: ${memberNumber}`
      );
      
      // Cambiar a modo login y prellenar el email
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setCedula('');
      setPhone('');
      setGymCode('');
      
    } catch (error: any) {
      console.error('Error en registro:', error);
      setError(error.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para generar número de miembro único
  const generateUniqueMemberNumber = async (): Promise<string> => {
    // Usar timestamp para generar número único (evita RLS que bloquea lectura de otros registros)
    const ts = Date.now().toString(36).toUpperCase().slice(-6);
    const memberNumber = `GM-${ts}`;

    // Verificar que no exista (por si acaso)
    const { data: existing } = await supabase
      .from('users')
      .select('member_number')
      .eq('member_number', memberNumber)
      .maybeSingle();

    if (existing) {
      // Colisión extremadamente rara, reintentar con otro timestamp
      const ts2 = Date.now().toString(36).toUpperCase().slice(-4);
      return `GM-${ts2}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    }

    return memberNumber;
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
                  {registrationType === 'free'
                    ? 'Regístrate en modo libre para crear tus rutinas, seguir tu progreso y entrenar por tu cuenta.'
                    : 'Regístrate para vincularte a un gimnasio y recibir asignación de entrenadores.'}
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

            {mode === 'register' && (
              <div className="space-y-3">
                <Label className="text-foreground/80">Tipo de Registro</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRegistrationType('free'); setGymCode(''); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      registrationType === 'free'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    <User className="w-6 h-6" />
                    <span className="text-sm font-semibold">Entrenamiento Libre</span>
                    <span className="text-xs text-center opacity-70">
                      Sin gimnasio, tú gestionas tus rutinas
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegistrationType('gym')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      registrationType === 'gym'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    <Building2 className="w-6 h-6" />
                    <span className="text-sm font-semibold">Asociado a un Gym</span>
                    <span className="text-xs text-center opacity-70">
                      Vinculado a un gimnasio con entrenadores
                    </span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && registrationType === 'gym' && (
              <div className="space-y-2">
                <Label htmlFor="gymCode" className="text-foreground/80">
                  Código del Gimnasio <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="gymCode"
                  type="text"
                  placeholder="Ej: GYM-LTQ-001"
                  value={gymCode}
                  onChange={(e) => setGymCode(e.target.value)}
                  disabled={isLoading}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70"
                />
                {searchingGym && gymCode.trim().length > 0 && (
                  <p className="text-xs text-muted-foreground">Buscando gimnasio...</p>
                )}
                {foundGym && !searchingGym && (
                  <p className="text-xs text-primary">✓ {foundGym.name} encontrado</p>
                )}
                {!foundGym && !searchingGym && gymCode.trim().length >= 5 && (
                  <p className="text-xs text-destructive">✗ Código no encontrado</p>
                )}
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