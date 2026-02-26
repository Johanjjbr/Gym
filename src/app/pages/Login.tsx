import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dumbbell, Loader2, AlertCircle } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (role: 'admin' | 'trainer' | 'reception') => {
    const credentials = {
      admin: { email: 'admin@gymteques.com', password: 'Admin123!' },
      trainer: { email: 'trainer@gymteques.com', password: 'Trainer123!' },
      reception: { email: 'recepcion@gymteques.com', password: 'Recepcion123!' },
    };

    setEmail(credentials[role].email);
    setPassword(credentials[role].password);
    setShowCredentials(false);
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="w-full text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              {showCredentials ? '− Ocultar' : '+ Mostrar'} credenciales de prueba
            </button>

            {showCredentials && (
              <div className="space-y-2 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-3">Haz clic para usar:</p>
                
                <button
                  type="button"
                  onClick={() => fillCredentials('admin')}
                  className="w-full text-left p-3 bg-gray-900/70 hover:bg-gray-900 rounded border border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Administrador</p>
                      <p className="text-xs text-gray-400">admin@gymteques.com</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('trainer')}
                  className="w-full text-left p-3 bg-gray-900/70 hover:bg-gray-900 rounded border border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Entrenador</p>
                      <p className="text-xs text-gray-400">trainer@gymteques.com</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('reception')}
                  className="w-full text-left p-3 bg-gray-900/70 hover:bg-gray-900 rounded border border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#10f94e]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Recepción</p>
                      <p className="text-xs text-gray-400">recepcion@gymteques.com</p>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

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