import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Dumbbell, LogIn, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { signIn } from '../lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      toast.success('¡Bienvenido!', {
        description: 'Has iniciado sesión exitosamente',
      });
      navigate('/');
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      toast.error('Error al iniciar sesión', {
        description: error.message === 'Invalid login credentials' 
          ? 'Email o contraseña incorrectos' 
          : error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Credenciales de prueba para desarrollo
  const testCredentials = [
    { email: 'admin@gymlagunetica.com', password: 'Admin123!', role: 'Administrador' },
    { email: 'entrenador@gymlagunetica.com', password: 'Trainer123!', role: 'Entrenador' },
    { email: 'usuario@gymlagunetica.com', password: 'User123!', role: 'Usuario' },
  ];

  const quickLogin = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo y Título */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
              <Dumbbell className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl">GYM Lagunetica</h1>
          <p className="text-muted-foreground">Sistema Administrativo</p>
        </div>

        {/* Formulario de Login */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input border-border"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-input border-border"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Iniciar Sesión
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Credenciales de Prueba (Solo para desarrollo) */}
        <Card className="bg-muted/50 border-border">
          <CardHeader>
            <CardTitle className="text-sm">🔧 Credenciales de Prueba</CardTitle>
            <CardDescription className="text-xs">
              Click en un rol para autocompletar (solo desarrollo)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {testCredentials.map((cred, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-between hover:bg-primary/10"
                onClick={() => quickLogin(cred.email, cred.password)}
                disabled={isLoading}
              >
                <span className="text-sm">{cred.role}</span>
                <span className="text-xs text-muted-foreground">{cred.email}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Los Teques, Sector Lagunetica
        </p>
      </div>
    </div>
  );
}