import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Dumbbell, Search, Plus, Users, Share2, Eye,
  ChevronDown, ChevronUp, Calendar, Clock, Target,
  AlertCircle, CheckCircle, BookOpen, X, Power,
  Loader2, Trash2, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRoutineAssignment } from '../hooks/useRoutineAssignments';
import {
  usePublicRoutines,
  useSharedUserRoutines,
  useUserOwnRoutines,
  useSelfAssignRoutine,
  useDeactivateOwnAssignment,
  useToggleShareRoutine,
  useDeleteUserRoutine,
} from '../hooks/useUserRoutines';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { formatDate } from '../lib/format';

type RoutineLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

const LEVEL_COLORS: Record<string, string> = {
  Principiante: 'bg-primary/20 text-primary border-primary/30',
  Intermedio: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  Avanzado: 'bg-destructive/20 text-destructive border-destructive/30',
};

interface RoutineWithCreator {
  id: string;
  name: string;
  description: string;
  level: RoutineLevel;
  category: string;
  duration_weeks: number;
  days_per_week: number;
  is_active: boolean;
  created_at: string;
  staff?: { name: string };
  user?: { name: string };
}

export function UserRoutines() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('current');

  const { data: assignment, isLoading: loadingAssignment } = useRoutineAssignment(user?.id || '');
  const { data: publicRoutines = [], isLoading: loadingPublic } = usePublicRoutines();
  const { data: sharedRoutines = [], isLoading: loadingShared } = useSharedUserRoutines();
  const { data: ownRoutines = [], isLoading: loadingOwn } = useUserOwnRoutines(user?.id);

  const selfAssign = useSelfAssignRoutine();
  const deactivate = useDeactivateOwnAssignment();
  const toggleShare = useToggleShareRoutine();
  const deleteRoutine = useDeleteUserRoutine();

  const [selectedRoutine, setSelectedRoutine] = useState<RoutineWithCreator | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const allPublicRoutines = [...publicRoutines, ...sharedRoutines].filter(
    (r: any, i, arr) => arr.findIndex((x: any) => x.id === r.id) === i
  );

  const filteredPublic = allPublicRoutines.filter((r: RoutineWithCreator) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCreatorName = (r: RoutineWithCreator) => {
    if (r.staff?.name) return `Por: ${r.staff.name}`;
    if (r.user?.name) return `Compartido por: ${r.user.name}`;
    return 'Rutina pública';
  };

  const handleAssign = (routineId: string) => {
    if (!user?.id) return;
    selfAssign.mutate({ userId: user.id, routineId });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Debes iniciar sesión
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          RUTINAS
        </h1>
        <p className="text-muted-foreground">
          {user.is_free_user
            ? 'Gestiona tus rutinas de entrenamiento libre'
            : 'Explora y gestiona tus rutinas de entrenamiento'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="current">Mi Rutina Actual</TabsTrigger>
          <TabsTrigger value="explore">Explorar</TabsTrigger>
          <TabsTrigger value="mine">Mis Rutinas</TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB: MI RUTINA ACTUAL ═══════════ */}
        <TabsContent value="current" className="space-y-6">
          {loadingAssignment ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent></Card>
          ) : assignment ? (
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <span className="text-xs text-primary uppercase tracking-wider">Activa</span>
                    </div>
                    <CardTitle className="text-2xl font-bold">
                      {assignment.routine_templates.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {assignment.routine_templates.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                    onClick={() => deactivate.mutate(user.id!)}
                    disabled={deactivate.isPending}
                  >
                    <Power className="w-4 h-4 mr-1" />
                    Quitar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Frecuencia</p>
                    <p className="font-semibold">{assignment.routine_templates.days_per_week}x semana</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Inicio</p>
                    <p className="font-semibold">{formatDate(assignment.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ir a entrenar</p>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-semibold text-primary"
                      onClick={() => navigate('/usuario/mi-entrenamiento')}
                    >
                      Mi Entrenamiento →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Dumbbell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Sin Rutina Asignada</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {user.is_free_user
                    ? 'Explora rutinas públicas o crea tu propia rutina personalizada.'
                    : 'Tu entrenador aún no te ha asignado una rutina. Puedes explorar rutinas públicas mientras tanto.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setActiveTab('explore')}>
                    Explorar Rutinas
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/usuario/rutinas/crear')}>
                    Crear mi Rutina
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════ TAB: EXPLORAR ═══════════ */}
        <TabsContent value="explore" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar rutinas por nombre, descripción o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {(loadingPublic || loadingShared) ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent></Card>
          ) : filteredPublic.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron rutinas públicas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublic.map((routine: any) => {
                const isSystemRoutine = !!routine.staff;
                return (
                  <Card key={routine.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg">{routine.name}</CardTitle>
                        <Badge variant="outline" className={LEVEL_COLORS[routine.level] || ''}>
                          {routine.level}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                          {routine.category}
                        </Badge>
                        <Badge variant="outline" className={
                          isSystemRoutine
                            ? 'bg-purple-500/20 text-purple-500 border-purple-500/30'
                            : 'bg-green-500/20 text-green-500 border-green-500/30'
                        }>
                          {isSystemRoutine ? 'Del Sistema' : 'Compartida'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">{routine.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Duración</p>
                          <p className="font-semibold">{routine.duration_weeks} semanas</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Días/Semana</p>
                          <p className="font-semibold">{routine.days_per_week} días</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{getCreatorName(routine)}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedRoutine(routine)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90"
                          onClick={() => handleAssign(routine.id)}
                          disabled={selfAssign.isPending}
                        >
                          {selfAssign.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <UserIcon className="w-4 h-4 mr-1" />
                          )}
                          Asignarme
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════ TAB: MIS RUTINAS ═══════════ */}
        <TabsContent value="mine" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => navigate('/usuario/rutinas/crear')}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Rutina
            </Button>
          </div>

          {loadingOwn ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent></Card>
          ) : ownRoutines.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Dumbbell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Sin Rutinas</h3>
                <p className="text-muted-foreground mb-6">Aún no has creado ninguna rutina personalizada.</p>
                <Button onClick={() => navigate('/usuario/rutinas/crear')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear mi Primera Rutina
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownRoutines.map((routine: any) => (
                <Card key={routine.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg">{routine.name}</CardTitle>
                      <Badge variant="outline" className={LEVEL_COLORS[routine.level] || ''}>
                        {routine.level}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                      {routine.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{routine.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Duración</p>
                        <p className="font-semibold">{routine.duration_weeks} semanas</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Días/Semana</p>
                        <p className="font-semibold">{routine.days_per_week} días</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={routine.shared_publicly}
                          onChange={() => toggleShare.mutate({
                            routineId: routine.id,
                            shared: !routine.shared_publicly
                          })}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">
                          {routine.shared_publicly ? 'Compartida públicamente' : 'Compartir públicamente'}
                        </span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAssign(routine.id)}
                        disabled={selfAssign.isPending}
                      >
                        <UserIcon className="w-4 h-4 mr-1" />
                        Asignarme
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteId(routine.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRoutine} onOpenChange={() => setSelectedRoutine(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">
              {selectedRoutine?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedRoutine && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="outline" className={LEVEL_COLORS[selectedRoutine.level] || ''}>
                  {selectedRoutine.level}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                  {selectedRoutine.category}
                </Badge>
              </div>
              <p className="text-muted-foreground">{selectedRoutine.description}</p>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Duración</p>
                  <p className="font-semibold">{selectedRoutine.duration_weeks} semanas</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Días/Semana</p>
                  <p className="font-semibold">{selectedRoutine.days_per_week} días</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{getCreatorName(selectedRoutine)}</p>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => {
                  handleAssign(selectedRoutine.id);
                  setSelectedRoutine(null);
                }}
                disabled={selfAssign.isPending}
              >
                Asignarme esta rutina
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Rutina</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) deleteRoutine.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
