import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RefreshCw, Database, CheckCircle, XCircle } from 'lucide-react';

export function RoutineAssignmentDebug() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  const [routineTemplates, setRoutineTemplates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Todas las asignaciones
      const { data: allData, error: allError } = await supabase
        .from('user_routine_assignments')
        .select('*');
      
      if (allError) throw allError;
      setAllAssignments(allData || []);

      // 2. Asignaciones del usuario actual
      if (user?.id) {
        const { data: userData, error: userError } = await supabase
          .from('user_routine_assignments')
          .select(`
            *,
            routine_templates (
              id,
              name,
              description,
              days_per_week,
              created_by,
              staff (
                name
              )
            )
          `)
          .eq('user_id', user.id);
        
        if (userError) throw userError;
        setUserAssignments(userData || []);
      }

      // 3. Todas las plantillas de rutinas
      const { data: templatesData, error: templatesError } = await supabase
        .from('routine_templates')
        .select('*');
      
      if (templatesError) throw templatesError;
      setRoutineTemplates(templatesData || []);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-['Rajdhani'] font-bold">Debug: Asignaciones de Rutinas</h1>
          <p className="text-muted-foreground font-['Inter'] mt-1">
            Información de diagnóstico para resolver problemas
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Recargar
        </Button>
      </div>

      {error && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usuario Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Usuario Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">ID:</span>
                <p className="font-bold break-all">{user?.id || 'No disponible'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-bold">{user?.email || 'No disponible'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p className="font-bold">{user?.name || 'No disponible'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Rol:</span>
                <p className="font-bold">{user?.role || 'No disponible'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asignaciones del Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Asignaciones de {user?.name || 'este usuario'}</span>
            <span className="text-sm font-normal">
              {userAssignments.length} encontrada(s)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No se encontraron asignaciones para este usuario</p>
              <p className="text-xs mt-1">User ID: {user?.id}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userAssignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">
                      {assignment.routine_templates?.name || 'Sin nombre'}
                    </h3>
                    {assignment.is_active ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Activa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 text-sm">
                        <XCircle className="w-4 h-4" />
                        Inactiva
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                    <div>
                      <span className="text-muted-foreground">Assignment ID:</span>
                      <p className="break-all">{assignment.id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Routine ID:</span>
                      <p className="break-all">{assignment.routine_id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha Inicio:</span>
                      <p>{assignment.start_date}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha Fin:</span>
                      <p>{assignment.end_date || 'Sin definir'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Descripción:</span>
                      <p>{assignment.routine_templates?.description || 'Sin descripción'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Días/semana:</span>
                      <p>{assignment.routine_templates?.days_per_week || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Entrenador:</span>
                      <p>{assignment.routine_templates?.staff?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Todas las Asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Todas las Asignaciones en la Tabla</span>
            <span className="text-sm font-normal">
              {allAssignments.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>La tabla user_routine_assignments está vacía</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">User ID</th>
                    <th className="text-left p-2">Routine ID</th>
                    <th className="text-left p-2">Activa</th>
                    <th className="text-left p-2">Fecha Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {allAssignments.map((assignment) => (
                    <tr 
                      key={assignment.id} 
                      className={`border-b ${assignment.user_id === user?.id ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                    >
                      <td className="p-2 text-xs break-all max-w-[100px]">{assignment.id}</td>
                      <td className="p-2 text-xs break-all max-w-[100px]">
                        {assignment.user_id}
                        {assignment.user_id === user?.id && (
                          <span className="ml-2 text-green-600">← TÚ</span>
                        )}
                      </td>
                      <td className="p-2 text-xs break-all max-w-[100px]">{assignment.routine_id}</td>
                      <td className="p-2">
                        {assignment.is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                      <td className="p-2">{assignment.start_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plantillas de Rutinas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Plantillas de Rutinas Disponibles</span>
            <span className="text-sm font-normal">
              {routineTemplates.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {routineTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay plantillas de rutinas creadas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {routineTemplates.map((template) => (
                <div key={template.id} className="border rounded p-3 text-sm font-mono">
                  <div className="font-bold">{template.name}</div>
                  <div className="text-muted-foreground text-xs break-all">ID: {template.id}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
