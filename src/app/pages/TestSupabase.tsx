/**
 * Página de Prueba de Conexión con Supabase
 * Permite verificar que todos los endpoints estén funcionando correctamente
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Database, Users, DollarSign, Calendar, Dumbbell, UserCog } from 'lucide-react';
import { utils, users, payments, staff, attendance, routines, stats } from '../lib/api';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function TestSupabase() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const tests = [
    {
      name: 'Health Check',
      icon: Database,
      fn: utils.healthCheck,
    },
    {
      name: 'Obtener Usuarios',
      icon: Users,
      fn: users.getAll,
    },
    {
      name: 'Obtener Pagos',
      icon: DollarSign,
      fn: payments.getAll,
    },
    {
      name: 'Obtener Personal',
      icon: UserCog,
      fn: staff.getAll,
    },
    {
      name: 'Obtener Asistencia',
      icon: Calendar,
      fn: attendance.getAll,
    },
    {
      name: 'Obtener Rutinas',
      icon: Dumbbell,
      fn: routines.getAll,
    },
    {
      name: 'Obtener Estadísticas',
      icon: Database,
      fn: stats.getDashboard,
    },
  ];

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    for (const test of tests) {
      const result: TestResult = {
        name: test.name,
        status: 'pending',
      };

      setResults((prev) => [...prev, result]);

      try {
        const data = await test.fn();
        result.status = 'success';
        result.message = `✓ ${Array.isArray(data) ? `${data.length} registros` : 'OK'}`;
        result.data = data;
      } catch (error: any) {
        result.status = 'error';
        result.message = error.message || 'Error desconocido';
      }

      setResults((prev) =>
        prev.map((r) => (r.name === test.name ? result : r))
      );

      // Pequeña pausa entre tests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setTesting(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-[#10f94e]" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-[#ff3b5c]" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            Probando...
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="outline" className="bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30">
            OK
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30">
            Error
          </Badge>
        );
    }
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl mb-2">Prueba de Conexión Supabase</h1>
        <p className="text-muted-foreground">
          Verifica que todos los endpoints del backend estén funcionando correctamente
        </p>
      </div>

      {/* Action Button */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estado de Conexión</p>
              <p className="text-lg">
                {results.length === 0
                  ? 'Sin pruebas ejecutadas'
                  : `${successCount} exitosas, ${errorCount} fallidas de ${tests.length}`}
              </p>
            </div>
            <Button
              onClick={runTests}
              disabled={testing}
              className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-bold"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Probando...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Ejecutar Pruebas
                </>
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#10f94e] transition-all duration-300"
                      style={{
                        width: `${(successCount / tests.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.round((successCount / tests.length) * 100)}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Resultados de Pruebas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => {
                const test = tests[index];
                const Icon = test.icon;

                return (
                  <div
                    key={result.name}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{result.name}</p>
                        {result.message && (
                          <p
                            className={`text-sm ${
                              result.status === 'error'
                                ? 'text-[#ff3b5c]'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Instrucciones de Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Configurar Backend en Supabase</h3>
            <p className="text-sm text-muted-foreground">
              Asegúrate de que tu Edge Function esté desplegada en Supabase y funcionando correctamente.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">2. Verificar Credenciales</h3>
            <p className="text-sm text-muted-foreground">
              Verifica que el archivo <code className="bg-muted px-1 py-0.5 rounded">/utils/supabase/info.ts</code> contenga tu Project ID y Anon Key correctos.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">3. Ejecutar Seed de Datos</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Si tu backend está funcionando pero no hay datos, puedes ejecutar el seed desde el endpoint:
            </p>
            <code className="block bg-muted px-3 py-2 rounded text-xs">
              POST https://[tu-project-id].supabase.co/functions/v1/make-server-104060a1/seed
            </code>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">4. Documentación Completa</h3>
            <p className="text-sm text-muted-foreground">
              Consulta los siguientes archivos para más información:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>
                <code className="bg-muted px-1 py-0.5 rounded">GUIA_INTEGRACION_COMPLETA.md</code>
              </li>
              <li>
                <code className="bg-muted px-1 py-0.5 rounded">INTEGRACION_FINAL_README.md</code>
              </li>
              <li>
                <code className="bg-muted px-1 py-0.5 rounded">EJEMPLOS_RAPIDOS.md</code>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
