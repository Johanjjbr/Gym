import { useState } from 'react';
import { Plus, Loader2, Pencil, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan } from '../hooks/usePlans';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export function Plans() {
  const { data: plansData, isLoading, error } = usePlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formPrice, setFormPrice] = useState('');

  const openCreate = () => {
    setEditingPlan(null);
    setFormName('');
    setFormDescription('');
    setFormDuration('');
    setFormPrice('');
    setIsDialogOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormDescription(plan.description || '');
    setFormDuration(String(plan.duration_days));
    setFormPrice(String(plan.price));
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formDuration || !formPrice) {
      toast.error('Nombre, duración y precio son requeridos');
      return;
    }

    const data = {
      name: formName,
      description: formDescription || undefined,
      duration_days: parseInt(formDuration),
      price: parseFloat(formPrice),
    };

    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, data });
    } else {
      createPlan.mutate(data);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    deletePlan.mutate(id);
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-[#ff3b5c]/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#ff3b5c] mt-0.5" />
            <div>
              <p className="font-semibold text-[#ff3b5c]">Error al cargar planes</p>
              <p className="text-sm text-gray-400 mt-1">{error.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl mb-2">Planes</h1>
          <p className="text-muted-foreground">Configuración de membresías y precios</p>
        </div>
        <Button className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-bold" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Planes de Membresía ({plansData?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(!plansData || plansData.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay planes creados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground">Nombre</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Descripción</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Duración</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Precio</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Estado</th>
                    <th className="text-right py-3 px-4 text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {plansData.map((plan: any) => (
                    <tr key={plan.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4 font-medium">{plan.name}</td>
                      <td className="py-4 px-4 text-muted-foreground">{plan.description || '-'}</td>
                      <td className="py-4 px-4">{plan.duration_days} días</td>
                      <td className="py-4 px-4">
                        <span className="text-[#10f94e] font-semibold">Bs {plan.price.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-4">
                        {plan.is_active ? (
                          <Badge variant="outline" className="bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="ghost" className="hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEdit(plan)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteConfirm(plan.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingPlan ? 'Modifica los datos del plan' : 'Crea un nuevo plan de membresía'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Nombre <span className="text-[#ff3b5c]">*</span></Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white" placeholder="Ej: Mensual" />
            </div>
            <div>
              <Label className="text-gray-300">Descripción</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white" rows={2} placeholder="Descripción del plan" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Duración (días) <span className="text-[#ff3b5c]">*</span></Label>
                <Input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white" placeholder="30" />
              </div>
              <div>
                <Label className="text-gray-300">Precio (Bs) <span className="text-[#ff3b5c]">*</span></Label>
                <Input type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white" placeholder="300" />
              </div>
            </div>
            {editingPlan && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={editingPlan.is_active !== false}
                  onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                  className="rounded bg-gray-800 border-gray-700" />
                <Label htmlFor="is_active" className="text-gray-300">Plan activo</Label>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}
                className="border-gray-700 hover:bg-gray-800">Cancelar</Button>
              <Button onClick={handleSave} disabled={createPlan.isPending || updatePlan.isPending}
                className="bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold">
                {(createPlan.isPending || updatePlan.isPending) ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                ) : (
                  <>{editingPlan ? 'Actualizar' : 'Crear'} Plan</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Eliminar Plan</DialogTitle>
            <DialogDescription className="text-gray-400">
              ¿Estás seguro? Esta acción no se puede deshacer. Los usuarios asignados a este plan no se verán afectados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}
              className="border-gray-700 hover:bg-gray-800">Cancelar</Button>
            <Button onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deletePlan.isPending}
              className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white font-bold">
              {deletePlan.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</>
              ) : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
