import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Database, 
  Users, 
  CreditCard,
  Activity,
  Dumbbell
} from 'lucide-react';
import api from '../lib/api';

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function TestSupabase() {
  const [email, setEmail] = useState('admin@gymteques.com');
  const [password, setPassword] = useState('Admin123!');
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (name: string, status: TestResult['status'], message?: string, data?: any) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.name === name);
      const newResult = { name, status, message, data };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newResult;
        return updated;
      }
      
      return [...prev, newResult];
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Health Check
    updateResult('Health Check', 'running');
    try {
      const health = await api.utils.healthCheck();
      updateResult('Health Check', 'success', 'Servidor respondiendo correctamente', health);
    } catch (error: any) {
      updateResult('Health Check', 'error', error.message);
      setIsRunning(false);
      return;
    }

    // Test 2: Login
    updateResult('Login', 'running');
    try {
      const loginResponse = await api.auth.login(email, password);
      updateResult('Login', 'success', `Bienvenido ${loginResponse.staff.name}`, loginResponse.staff);
    } catch (error: any) {
      updateResult('Login', 'error', error.message);
      setIsRunning(false);
      return;
    }

    // Test 3: Obtener Usuarios
    updateResult('Obtener Usuarios', 'running');
    try {
      const users = await api.users.getAll();
      updateResult('Obtener Usuarios', 'success', `${users.length} usuarios encontrados`, users);
    } catch (error: any) {
      updateResult('Obtener Usuarios', 'error', error.message);
    }

    // Test 4: Obtener Pagos
    updateResult('Obtener Pagos', 'running');
    try {
      const payments = await api.payments.getAll();
      updateResult('Obtener Pagos', 'success', `${payments.length} pagos encontrados`, payments);
    } catch (error: any) {
      updateResult('Obtener Pagos', 'error', error.message);
    }

    // Test 5: Obtener Staff
    updateResult('Obtener Staff', 'running');
    try {
      const staff = await api.staff.getAll();
      updateResult('Obtener Staff', 'success', `${staff.length} miembros del staff`, staff);
    } catch (error: any) {
      updateResult('Obtener Staff', 'error', error.message);
    }

    // Test 6: Obtener Asistencia
    updateResult('Obtener Asistencia', 'running');
    try {
      const attendance = await api.attendance.getAll();
      updateResult('Obtener Asistencia', 'success', `${attendance.length} registros de asistencia`, attendance);
    } catch (error: any) {
      updateResult('Obtener Asistencia', 'error', error.message);
    }

    // Test 7: Obtener Rutinas
    updateResult('Obtener Rutinas', 'running');
    try {
      const routines = await api.routines.getAll();
      updateResult('Obtener Rutinas', 'success', `${routines.length} rutinas creadas`, routines);
    } catch (error: any) {
      updateResult('Obtener Rutinas', 'error', error.message);
    }

    // Test 8: Estadísticas del Dashboard
    updateResult('Estadísticas', 'running');
    try {
      const stats = await api.stats.getDashboard();
      updateResult('Estadísticas', 'success', 'Estadísticas obtenidas', stats);
    } catch (error: any) {
      updateResult('Estadísticas', 'error', error.message);
    }

    setIsRunning(false);
  };

  const getIcon = (name: string) => {
    if (name.includes('Usuario')) return <Users className="h-4 w-4" />;
    if (name.includes('Pago')) return <CreditCard className="h-4 w-4" />;
    if (name.includes('Staff')) return <Users className="h-4 w-4" />;
    if (name.includes('Asistencia')) return <Activity className="h-4 w-4" />;
    if (name.includes('Rutina')) return <Dumbbell className="h-4 w-4" />;
    if (name.includes('Estadística')) return <Database className="h-4 w-4" />;
    return <Database className="h-4 w-4" />;
  };

  const getStatusIcon = (status: TestResult['status']) => {
    if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-[#10f94e]" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-[#ff3b5c]" />;
    return null;
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalTests = results.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Test de Conexión Supabase</h1>
          <p className="text-gray-400">Verifica que todos los endpoints estén funcionando correctamente</p>
        </div>

        {/* Login Form */}
        <Card className="border-gray-700 bg-gray-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Credenciales de Prueba</CardTitle>
            <CardDescription className="text-gray-400">
              Usa estas credenciales para probar la conexión
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={isRunning}
                />
              </div>
            </div>

            <Button 
              onClick={runAllTests}
              disabled={isRunning}
              className="w-full bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ejecutando Tests...
                </>
              ) : (
                'Ejecutar Todos los Tests'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-gray-700 bg-gray-900/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Tests</p>
                    <p className="text-3xl font-bold text-white">{totalTests}</p>
                  </div>
                  <Database className="h-10 w-10 text-gray-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#10f94e]/30 bg-[#10f94e]/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#10f94e]">Exitosos</p>
                    <p className="text-3xl font-bold text-[#10f94e]">{successCount}</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-[#10f94e]" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#ff3b5c]/30 bg-[#ff3b5c]/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#ff3b5c]">Errores</p>
                    <p className="text-3xl font-bold text-[#ff3b5c]">{errorCount}</p>
                  </div>
                  <XCircle className="h-10 w-10 text-[#ff3b5c]" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Results */}
        {results.length > 0 && (
          <Card className="border-gray-700 bg-gray-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Resultados de Tests</CardTitle>
              <CardDescription className="text-gray-400">
                Estado de cada endpoint probado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((result, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    result.status === 'success' ? 'border-[#10f94e]/30 bg-[#10f94e]/5' :
                    result.status === 'error' ? 'border-[#ff3b5c]/30 bg-[#ff3b5c]/5' :
                    'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getIcon(result.name)}
                      <span className="font-semibold text-white">{result.name}</span>
                    </div>
                    {getStatusIcon(result.status)}
                  </div>
                  
                  {result.message && (
                    <p className={`text-sm ${
                      result.status === 'success' ? 'text-[#10f94e]' :
                      result.status === 'error' ? 'text-[#ff3b5c]' :
                      'text-gray-400'
                    }`}>
                      {result.message}
                    </p>
                  )}

                  {result.data && result.status === 'success' && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                        Ver datos (clic para expandir)
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-950 rounded text-xs text-gray-300 overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {results.length === 0 && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Database className="h-5 w-5 text-blue-400" />
            <AlertDescription className="text-blue-200 ml-2">
              Haz clic en "Ejecutar Todos los Tests" para verificar la conexión con Supabase.
              Asegúrate de haber ejecutado el schema SQL y el seed de usuarios primero.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
