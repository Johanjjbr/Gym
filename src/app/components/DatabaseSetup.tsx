import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Database, Users, Play } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function DatabaseSetup() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);

  const runSeed = async () => {
    setStatus('running');
    setMessage('Creando usuarios de prueba...');
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-104060a1/seed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al ejecutar seed');
      }

      setStatus('success');
      setMessage('¡Base de datos inicializada correctamente!');
      setDetails(data);

    } catch (error: any) {
      console.error('Error ejecutando seed:', error);
      setStatus('error');
      setMessage(error.message || 'Error al inicializar la base de datos');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <Card className="w-full max-w-2xl border-gray-700 bg-gray-900/50 backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Database className="h-12 w-12 text-[#10f94e]" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">
            Configuración de Base de Datos
          </CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Gimnasio Los Teques - Lagunetica
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Estado Idle */}
          {status === 'idle' && (
            <>
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                <AlertDescription className="text-blue-200 ml-2">
                  Este asistente creará automáticamente todos los usuarios de prueba necesarios para comenzar a usar el sistema.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#10f94e]" />
                  Usuarios que se crearán:
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-white">Administrador</p>
                      <p className="text-gray-400">admin@gymteques.com / Admin123!</p>
                      <p className="text-gray-500 text-xs mt-1">Acceso total al sistema</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-white">Entrenador</p>
                      <p className="text-gray-400">trainer@gymteques.com / Trainer123!</p>
                      <p className="text-gray-500 text-xs mt-1">Gestión de rutinas y seguimiento</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-[#10f94e] mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-white">Recepción</p>
                      <p className="text-gray-400">recepcion@gymteques.com / Recepcion123!</p>
                      <p className="text-gray-500 text-xs mt-1">Pagos y control de asistencia</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <p className="text-sm text-gray-400">
                    También se crearán <strong className="text-white">5 miembros de prueba</strong> con diferentes estados y algunos <strong className="text-white">pagos de ejemplo</strong>.
                  </p>
                </div>
              </div>

              <Button 
                onClick={runSeed}
                className="w-full bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold text-lg h-14 rounded-xl shadow-lg shadow-[#10f94e]/20"
              >
                <Play className="mr-2 h-5 w-5" />
                Inicializar Base de Datos
              </Button>
            </>
          )}

          {/* Estado Running */}
          {status === 'running' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-16 w-16 text-[#10f94e] animate-spin" />
              <p className="text-white text-lg font-medium">{message}</p>
              <p className="text-gray-400 text-sm">Esto puede tomar unos segundos...</p>
            </div>
          )}

          {/* Estado Success */}
          {status === 'success' && (
            <>
              <Alert className="border-[#10f94e]/50 bg-[#10f94e]/10">
                <CheckCircle2 className="h-5 w-5 text-[#10f94e]" />
                <AlertDescription className="text-[#10f94e] ml-2 font-medium">
                  {message}
                </AlertDescription>
              </Alert>

              {details && (
                <div className="space-y-4 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white">Resumen de Creación:</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                      <p className="text-gray-400">Personal Creado</p>
                      <p className="text-2xl font-bold text-[#10f94e] mt-1">
                        {details.created?.staff || 0}
                      </p>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                      <p className="text-gray-400">Miembros Creados</p>
                      <p className="text-2xl font-bold text-[#10f94e] mt-1">
                        {details.created?.members || 0}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700 space-y-2">
                    <h4 className="text-white font-semibold text-sm">Credenciales de Acceso:</h4>
                    {details.credentials && Object.entries(details.credentials).map(([role, cred]: [string, any]) => (
                      <div key={role} className="text-xs font-mono bg-gray-900/70 p-2 rounded border border-gray-700 text-gray-300">
                        {cred}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <strong>Próximo paso:</strong> Recarga la página para iniciar sesión con cualquiera de las credenciales mostradas arriba.
                </p>
              </div>

              <Button 
                onClick={() => window.location.reload()}
                className="w-full bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold text-lg h-12 rounded-xl"
              >
                Recargar Página
              </Button>
            </>
          )}

          {/* Estado Error */}
          {status === 'error' && (
            <>
              <Alert className="border-[#ff3b5c]/50 bg-[#ff3b5c]/10">
                <AlertCircle className="h-5 w-5 text-[#ff3b5c]" />
                <AlertDescription className="text-[#ff3b5c] ml-2">
                  {message}
                </AlertDescription>
              </Alert>

              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 space-y-3">
                <h3 className="text-white font-semibold">Soluciones posibles:</h3>
                <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
                  <li>Verifica que el schema SQL se haya ejecutado en Supabase</li>
                  <li>Revisa los logs en Supabase Dashboard → Edge Functions</li>
                  <li>Asegúrate de tener conexión a internet</li>
                  <li>Consulta el archivo INSTRUCCIONES_SUPABASE.md</li>
                </ul>
              </div>

              <Button 
                onClick={() => {
                  setStatus('idle');
                  setMessage('');
                }}
                variant="outline"
                className="w-full border-gray-600 text-white hover:bg-gray-800"
              >
                Intentar Nuevamente
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
