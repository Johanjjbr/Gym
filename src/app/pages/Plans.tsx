import { useState } from 'react';
import { Search, Plus, DollarSign, Calendar, Loader2, Edit, Trash2, BadgeCheck, AlertCircle } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '../hooks/usePlans';

const PLAN_TYPES = [
  'Mensual', 'Trimestral', 'Semestral', 'Anual', 'Visita', 'Promoción'
] as const;

const DURATION_OPTIONS = [
  { value: 1, label: '1 Día (Visita)' },
  { value: 30, label: '1 Mes (30 días)' },
  { value: 90, label: '3 Meses (90 días)' },
  { value: 180, label: '6 Meses (180 días)' },
  { value: 365, label: '1 Año (365 días)' },
];

type PlanFormData = {
  name: string;
  description?: string;
  duration_days: number;
  price: number;
  type: string;
  is_active: boolean;
};

export function Plans() {
  const { user } = useAuth();
  const { canAccess } = useModulePermissions();
  const canCreate = canAccess('/planes', 'create');
  const canEdit = canAccess('/planes', 'edit');
  const canDelete = canAccess('/planes', 'delete');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<string | null>(null);

  const { data: plans = [], isLoading, error } = usePlans();
  const createPlanMutation = useCreatePlan();
  const updatePlanMutation = useUpdatePlan();
  const deletePlanMutation = useDeletePlan();

  const { register: registerCreate, control: controlCreate, handleSubmit: handleSubmitCreate, reset: resetCreate, watch: watchCreate, formState: { errors: errorsCreate } } = useForm<PlanFormData>({
    defaultValues: {
      duration_days: 30,
      is_active: true,
    },
  });
  const { register: registerEdit, control: controlEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, formState: { errors: errorsEdit } } = useForm<PlanFormData>({
    defaultValues: {
      duration_days: 30,
      is_active: true,
    },
  });

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedType === 'all' || plan.type === selectedType)
  );

  const handleCreate = async (data: PlanFormData) => {
    try {
      await createPlanMutation.mutateAsync(data);
      resetCreate();
      setIsCreateOpen(false);
      toast.success('Plan creado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear plan');
    }
  };

  const handleEdit = async (data: PlanFormData) => {
    if (!editingPlan) return;
    try {
      await updatePlanMutation.mutateAsync({ id: editingPlan.id, data });
      resetEdit();
      setIsEditOpen(false);
      setEditingPlan(null);
      toast.success('Plan actualizado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar plan');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlanMutation.mutateAsync(id);
      setDeletingPlan(null);
      toast.success('Plan eliminado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar plan');
    }
  };

  const openEditDialog = (plan: any) => {
    setEditingPlan(plan);
    resetEdit(plan);
    setIsEditOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando planes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-destructive">Error al cargar planes: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2 flex items-center gap-3">
            <BadgeCheck className="h-8 w-8 text-primary" />
            Planes de Membresía
          </h1>
          <p className="text-muted-foreground">
            Gestiona los planes de suscripción del gimnasio
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetCreate(); setIsCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Plan
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {PLAN_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      {filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="bg-card border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BadgeCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20">
                        {plan.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button size="icon" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => openEditDialog(plan)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10" onClick={() => setDeletingPlan(plan.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{plan.duration_days} días</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-[#10f94e]" />
                    <span className="text-[#10f94e] font-semibold">{formatPrice(plan.price)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Badge variant={plan.is_active ? 'default' : 'outline'} className="gap-1">
                    {plan.is_active ? (
                      <>
                        <BadgeCheck className="w-3 h-3" />
                        Activo
                      </>
                    ) : (
                      'Inactivo'
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BadgeCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No se encontraron planes</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nuevo Plan</DialogTitle>
            <DialogDescription>
              Agrega un plan de membresía
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
            <div>
              <Label htmlFor="create-name">Nombre *</Label>
              <Input
                id="create-name"
                {...registerCreate('name', { required: 'El nombre es requerido' })}
                className="bg-input border-border mt-1"
                placeholder="Ej: Plan Mensual Premium"
              />
              {errorsCreate.name && <p className="text-xs text-destructive mt-1">{errorsCreate.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="create-type">Tipo *</Label>
              <Controller
                name="type"
                control={controlCreate}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="create-duration">Duración (días) *</Label>
              <Controller
                name="duration_days"
                control={controlCreate}
                render={({ field }) => (
                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Seleccionar duración" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(d => (
                        <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="create-price">Precio *</Label>
              <Input
                id="create-price"
                type="number"
                step="0.01"
                min="0"
                {...registerCreate('price', { 
                  required: 'El precio es requerido',
                  valueAsNumber: true,
                })}
                className="bg-input border-border mt-1"
                placeholder="0.00"
              />
              {errorsCreate.price && <p className="text-xs text-destructive mt-1">{errorsCreate.price.message}</p>}
            </div>
            <div>
              <Label htmlFor="create-description">Descripción</Label>
              <Textarea
                id="create-description"
                {...registerCreate('description')}
                className="bg-input border-border mt-1"
                placeholder="Descripción del plan..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="checkbox"
                id="create-active"
                {...registerCreate('is_active')}
                className="w-4 h-4"
              />
              <Label htmlFor="create-active" className="cursor-pointer">
                Plan activo
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Crear Plan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Plan</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del plan
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEdit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                {...registerEdit('name', { required: 'El nombre es requerido' })}
                className="bg-input border-border mt-1"
              />
              {errorsEdit.name && <p className="text-xs text-destructive mt-1">{errorsEdit.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="edit-type">Tipo *</Label>
              <Controller
                name="type"
                control={controlEdit}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="edit-duration">Duración (días) *</Label>
<Controller
                name="duration_days"
                control={controlEdit}
                render={({ field }) => (
                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Seleccionar duración" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(d => (
                        <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Precio *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                {...registerEdit('price', { 
                  required: 'El precio es requerido',
                  valueAsNumber: true,
                })}
                className="bg-input border-border mt-1"
              />
              {errorsEdit.price && <p className="text-xs text-destructive mt-1">{errorsEdit.price.message}</p>}
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                {...registerEdit('description')}
                className="bg-input border-border mt-1"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="checkbox"
                id="edit-active"
                {...registerEdit('is_active')}
                className="w-4 h-4"
              />
              <Label htmlFor="edit-active" className="cursor-pointer">
                Plan activo
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <Edit className="w-4 h-4 mr-2" />
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar plan?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El plan se eliminará permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogContent className="bg-card border-border">
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeletingPlan(null)}>
                Cancelar
              </Button>
              <Button 
                className="bg-red-500 hover:bg-red-600 text-red-500-foreground"
                onClick={() => { handleDelete(deletingPlan!); setDeletingPlan(null); }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </DialogContent>
      </Dialog>
    </div>
  );
}