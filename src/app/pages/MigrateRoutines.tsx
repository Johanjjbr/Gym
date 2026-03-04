import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Database } from 'lucide-react';
import { toast } from 'sonner';

export function MigrateRoutines() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const migrateRoutineAssignments = async () => {
    setLoading(true);
    try {
      // 1. Obtener todas las sesiones con routine_id
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('*')
        .not('routine_id', 'is', null)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      console.log('📊 Sesiones encontradas:', sessions?.length);

      // 2. Agrupar por user_id + routine_id para encontrar asignaciones únicas
      const assignmentsMap = new Map<string, any>();

      sessions?.forEach((session) => {
        const key = `${session.user_id}-${session.routine_id}`;
        
        if (!assignmentsMap.has(key)) {
          assignmentsMap.set(key, {
            user_id: session.user_id,
            routine_id: session.routine_id,
            start_date: session.date,
            notes: session.notes,
            created_at: session.created_at,
          });
        }
      });

      console.log('🔄 Asignaciones únicas a migrar:', assignmentsMap.size);

      // 3. Verificar cuáles ya existen en user_routine_assignments
      const { data: existingAssignments } = await supabase
        .from('user_routine_assignments')
        .select('user_id, routine_id');

      const existingKeys = new Set(
        existingAssignments?.map((a) => `${a.user_id}-${a.routine_id}`) || []
      );

      // 4. Filtrar solo las que no existen
      const newAssignments = Array.from(assignmentsMap.values()).filter((assignment) => {
        const key = `${assignment.user_id}-${assignment.routine_id}`;
        return !existingKeys.has(key);
      });

      console.log('✨ Nuevas asignaciones a crear:', newAssignments.length);

      // 5. Obtener el primer staff disponible para assigned_by
      const { data: firstStaff } = await supabase
        .from('staff')
        .select('id')
        .limit(1)
        .single();

      if (!firstStaff) {
        throw new Error('No se encontró personal del staff para asignar como creador');
      }

      // 6. Insertar nuevas asignaciones
      let insertedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const assignment of newAssignments) {
        const { error } = await supabase
          .from('user_routine_assignments')
          .insert([{
            user_id: assignment.user_id,
            routine_id: assignment.routine_id,
            assigned_by: firstStaff.id,
            start_date: assignment.start_date,
            is_active: true,
          }]);

        if (error) {
          errorCount++;
          errors.push(`Error: ${error.message}`);
          console.error('❌ Error insertando:', error);
        } else {
          insertedCount++;
        }
      }

      setResults({
        totalSessions: sessions?.length || 0,
        uniqueAssignments: assignmentsMap.size,
        existingAssignments: existingKeys.size,
        newAssignments: newAssignments.length,
        insertedCount,
        errorCount,
        errors,
      });

      if (insertedCount > 0) {
        toast.success(`✅ Se migraron ${insertedCount} asignaciones correctamente`);
      }

      if (errorCount > 0) {
        toast.error(`⚠️ Hubo ${errorCount} errores durante la migración`);
      }

    } catch (error: any) {
      console.error('❌ Error en migración:', error);
      toast.error(`Error: ${error.message}`);
      setResults({
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Migración de Rutinas</h1>
        <p className="text-muted-foreground">
          Migra las asignaciones de rutinas del sistema antiguo al nuevo
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="w-5 h-5" />
            ¿Qué hace esta herramienta?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Esta herramienta migra las asignaciones de rutinas del sistema antiguo que estaban
            guardadas en <code className="bg-muted px-1 py-0.5 rounded">workout_sessions</code> a
            la tabla correcta{' '}
            <code className="bg-muted px-1 py-0.5 rounded">user_routine_assignments</code>.
          </p>
          <div className="space-y-2">
            <p className="font-semibold">Pasos que realiza:</p>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>Busca todas las sesiones de entrenamiento con rutinas asignadas</li>
              <li>Agrupa por usuario y rutina para encontrar asignaciones únicas</li>
              <li>Verifica cuáles ya existen en la tabla nueva</li>
              <li>Crea solo las asignaciones que no existen</li>
            </ol>
          </div>
          <p className="text-yellow-600 dark:text-yellow-400 font-medium">
            ⚠️ Esta operación es segura - no elimina ni modifica datos existentes
          </p>
        </CardContent>
      </Card>

      {/* Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Ejecutar Migración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={migrateRoutineAssignments}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Migrando...' : 'Iniciar Migración'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.error ? (
                <XCircle className="w-5 h-5 text-destructive" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              Resultados de la Migración
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.error ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive font-semibold mb-2">Error:</p>
                <p className="text-sm">{results.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Sesiones Totales</p>
                    <p className="text-2xl font-bold">{results.totalSessions}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Asignaciones Únicas</p>
                    <p className="text-2xl font-bold">{results.uniqueAssignments}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Ya Existentes</p>
                    <p className="text-2xl font-bold">{results.existingAssignments}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Nuevas a Crear</p>
                    <p className="text-2xl font-bold text-green-500">
                      {results.newAssignments}
                    </p>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Insertadas</p>
                    <p className="text-2xl font-bold text-green-500">
                      {results.insertedCount}
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-lg ${
                      results.errorCount > 0
                        ? 'bg-destructive/10 border border-destructive/20'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm text-muted-foreground mb-1">Errores</p>
                    <p
                      className={`text-2xl font-bold ${
                        results.errorCount > 0 ? 'text-destructive' : ''
                      }`}
                    >
                      {results.errorCount}
                    </p>
                  </div>
                </div>

                {results.errors && results.errors.length > 0 && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="font-semibold mb-2 text-destructive">Errores encontrados:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {results.errors.slice(0, 10).map((error: string, idx: number) => (
                        <li key={idx} className="text-destructive/80">
                          {error}
                        </li>
                      ))}
                      {results.errors.length > 10 && (
                        <li className="text-muted-foreground">
                          ... y {results.errors.length - 10} errores más
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {results.insertedCount > 0 && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-green-500 font-semibold mb-2">
                      <CheckCircle className="w-4 h-4" />
                      ¡Migración Completada!
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Las rutinas ya deberían estar visibles en "Mi Entrenamiento".
                      Actualiza la página para verlas.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
