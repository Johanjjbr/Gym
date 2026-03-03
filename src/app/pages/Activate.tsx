import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Dumbbell, CheckCircle, Loader2, AlertCircle, Eye, EyeOff, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useActivateAccount, useVerifyActivationToken } from '../hooks/useActivation';

export function Activate() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [isDatabaseNotConfigured, setIsDatabaseNotConfigured] = useState(false);

  // Verificar el token al cargar
  const { data: tokenData, isLoading: isVerifying, error: tokenError } = useVerifyActivationToken(token || '');
  const activateAccount = useActivateAccount();

  useEffect(() => {
    if (tokenError) {
      const errorMessage = tokenError.message || '';
      
      // Detectar si el error es por columnas faltantes en la base de datos
      if (
        errorMessage.includes('column') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('activation_token') ||
        errorMessage.includes('is_activated')
      ) {
        setIsDatabaseNotConfigured(true);
        setError('La base de datos no está configurada correctamente. Por favor, ejecuta el script SQL de activación.');
      } else {
        setError('El link de activación es inválido o ha expirado');
      }
    }
  }, [tokenError]);

  const validatePassword = () => {
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;
    if (!token) return;

    try {
      await activateAccount.mutateAsync({
        token,
        password,
      });
      
      setIsActivated(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Error al activar la cuenta. Intenta de nuevo.');
    }
  };

  // Estado de verificación del token
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Verificando link de activación...</p>
        </div>
      </div>
    );
  }

  // Token inválido
  if (tokenError || !tokenData) {
    // Caso especial: Base de datos no configurada
    if (isDatabaseNotConfigured) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
          <Card className="w-full max-w-2xl border-gray-700 bg-gray-900/50 backdrop-blur">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="p-4 bg-orange-500/10 rounded-full">
                  <Database className="h-12 w-12 text-orange-500" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl text-white">
                  Base de Datos No Configurada
                </CardTitle>
                <CardDescription className="text-gray-400 mt-2">
                  El sistema de activación requiere configuración adicional en Supabase
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-orange-500/50 bg-orange-500/10">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-300 ml-2">
                  Las columnas necesarias para el sistema de activación no existen en la tabla <code className="bg-gray-800 px-2 py-1 rounded">users</code>
                </AlertDescription>
              </Alert>

              <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="bg-[#10f94e] text-black rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  Abre el SQL Editor en Supabase
                </h3>
                <p className="text-sm text-gray-400 ml-8">
                  Ve a tu proyecto en Supabase → SQL Editor
                </p>

                <h3 className="font-semibold text-white flex items-center gap-2 mt-4">
                  <span className="bg-[#10f94e] text-black rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  Ejecuta el script de configuración
                </h3>
                <p className="text-sm text-gray-400 ml-8">
                  Copia y ejecuta el contenido del archivo <code className="bg-gray-800 px-2 py-1 rounded">/setup_activation.sql</code>
                </p>

                <h3 className="font-semibold text-white flex items-center gap-2 mt-4">
                  <span className="bg-[#10f94e] text-black rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                  Recarga esta página
                </h3>
                <p className="text-sm text-gray-400 ml-8">
                  Una vez ejecutado el script, actualiza el navegador
                </p>
              </div>

              <div className="bg-gray-800/30 p-4 rounded border border-gray-700">
                <p className="text-xs text-gray-500 font-mono">
                  💡 El script agregará las columnas: <span className="text-[#10f94e]">activation_token</span>, 
                  <span className="text-[#10f94e]"> is_activated</span>, y 
                  <span className="text-[#10f94e]"> auth_user_id</span> a la tabla users
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold"
                >
                  Recargar Página
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                >
                  Ir al Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Caso normal: Token inválido o expirado
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <Card className="w-full max-w-md border-gray-700 bg-gray-900/50 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-[#ff3b5c]/10 rounded-full">
                <AlertCircle className="h-12 w-12 text-[#ff3b5c]" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl text-white">Link Inválido</CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                El link de activación no es válido o ha expirado
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-gray-700 hover:bg-gray-600"
            >
              Ir al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cuenta activada exitosamente
  if (isActivated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <Card className="w-full max-w-md border-gray-700 bg-gray-900/50 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-[#10f94e]/10 rounded-full">
                <CheckCircle className="h-12 w-12 text-[#10f94e]" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl text-white">¡Cuenta Activada! 🎉</CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Tu cuenta ha sido activada exitosamente. Redirigiendo al login...
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Loader2 className="h-6 w-6 text-[#10f94e] animate-spin mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulario de activación
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
            <CardTitle className="text-2xl text-white">Activa tu Cuenta</CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              Bienvenido, <span className="font-semibold text-white">{tokenData.userName}</span>
            </CardDescription>
            <CardDescription className="text-gray-400 mt-1">
              Crea tu contraseña para acceder al sistema
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">
                Confirmar Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Indicador de fortaleza de contraseña */}
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= level * 2
                          ? password.length >= 12
                            ? 'bg-[#10f94e]'
                            : password.length >= 8
                            ? 'bg-yellow-500'
                            : 'bg-orange-500'
                          : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  {password.length >= 12
                    ? '✓ Contraseña fuerte'
                    : password.length >= 8
                    ? '⚠ Contraseña media'
                    : '⚠ Contraseña débil'}
                </p>
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
              disabled={activateAccount.isPending}
              className="w-full bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold h-12 text-lg"
            >
              {activateAccount.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Activando...
                </>
              ) : (
                'Activar Cuenta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-[#10f94e] hover:underline">
                Iniciar Sesión
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}