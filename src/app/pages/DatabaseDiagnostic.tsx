import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Database } from 'lucide-react';

export function DatabaseDiagnostic() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const requiredTables = [
    'users',
    'staff',
    'payments',
    'attendance',
    'physical_progress',
    'routine_templates',
    'routine_exercises',
    'workout_sessions',
    'workout_exercise_logs',
    'set_logs',
    'invoices',
  ];

  const checkDatabase = async () => {
    setLoading(true);
    const tableStatus: any = {};

    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          tableStatus[table] = {
            exists: false,
            error: error.message,
            count: 0,
          };
        } else {
          tableStatus[table] = {
            exists: true,
            error: null,
            count: data || 0,
          };
        }
      } catch (err: any) {
        tableStatus[table] = {
          exists: false,
          error: err.message,
          count: 0,
        };
      }
    }

    setResults(tableStatus);
    setLoading(false);
  };

  const getStatusIcon = (status: any) => {
    if (!status) return <AlertCircle className="w-5 h-5 text-gray-400" />;
    if (status.exists) return <CheckCircle className="w-5 h-5 text-[#10f94e]" />;
    return <XCircle className="w-5 h-5 text-[#ff3b5c]" />;
  };

  const missingTables = results
    ? Object.entries(results).filter(([_, status]: any) => !status.exists).length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-gray-700 bg-gray-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#10f94e]/10 rounded-lg">
                <Database className="w-6 h-6 text-[#10f94e]" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">
                  Diagnóstico de Base de Datos
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Verifica qué tablas existen en tu base de datos de Supabase
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Button
              onClick={checkDatabase}
              disabled={loading}
              className="w-full bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold h-12"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-5 w-5" />
                  Verificar Base de Datos
                </>
              )}
            </Button>

            {results && (
              <>
                {missingTables > 0 ? (
                  <Alert className="border-[#ff3b5c]/50 bg-[#ff3b5c]/10">
                    <AlertCircle className="h-5 w-5 text-[#ff3b5c]" />
                    <AlertDescription className="text-[#ff3b5c] ml-2">
                      <strong>¡Faltan {missingTables} tablas!</strong>
                      <br />
                      Debes ejecutar el script <code className="bg-black/30 px-2 py-1 rounded">
                        /setup_complete_db.sql
                      </code> en Supabase.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-[#10f94e]/50 bg-[#10f94e]/10">
                    <CheckCircle className="h-5 w-5 text-[#10f94e]" />
                    <AlertDescription className="text-[#10f94e] ml-2">
                      <strong>¡Base de datos configurada correctamente!</strong>
                      <br />
                      Todas las tablas necesarias están creadas.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Estado de las Tablas:</h3>
                  <div className="grid gap-2">
                    {Object.entries(results).map(([table, status]: any) => (
                      <div
                        key={table}
                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(status)}
                          <div>
                            <p className="font-mono text-white">{table}</p>
                            {status.error && (
                              <p className="text-xs text-gray-400 mt-1">
                                Error: {status.error}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {status.exists ? (
                            <span className="text-sm text-[#10f94e]">
                              ✓ Existe
                            </span>
                          ) : (
                            <span className="text-sm text-[#ff3b5c]">
                              ✗ Falta
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {missingTables > 0 && (
                  <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#10f94e]" />
                      Instrucciones para Solucionar
                    </h3>
                    <ol className="list-decimal list-inside space-y-3 text-gray-300">
                      <li>
                        Ve a tu proyecto en Supabase:{' '}
                        <a
                          href="https://supabase.com/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#10f94e] hover:underline"
                        >
                          https://supabase.com/dashboard
                        </a>
                      </li>
                      <li>
                        En el menú lateral, haz clic en{' '}
                        <strong className="text-white">SQL Editor</strong>
                      </li>
                      <li>
                        Haz clic en <strong className="text-white">+ New query</strong>
                      </li>
                      <li>
                        Copia y pega el contenido del archivo{' '}
                        <code className="bg-black/30 px-2 py-1 rounded text-[#10f94e]">
                          /setup_complete_db.sql
                        </code>
                      </li>
                      <li>
                        Haz clic en <strong className="text-white">Run</strong> (o presiona Ctrl/Cmd + Enter)
                      </li>
                      <li>
                        Vuelve aquí y haz clic en{' '}
                        <strong className="text-white">Verificar Base de Datos</strong> nuevamente
                      </li>
                    </ol>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-700 bg-gray-900/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Script SQL Completo</CardTitle>
            <CardDescription className="text-gray-400">
              Ubicación del archivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <code className="text-[#10f94e] font-mono text-sm">
                /setup_complete_db.sql
              </code>
              <p className="text-gray-400 text-sm mt-2">
                Este archivo contiene todas las tablas, índices y configuraciones necesarias
                para el sistema del gimnasio.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            ← Volver
          </Button>
        </div>
      </div>
    </div>
  );
}