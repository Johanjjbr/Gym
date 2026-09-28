import { useState } from 'react';
import { Search, Plus, Building2, MapPin, Phone, Mail, Globe, Clock, Loader2, AlertCircle, Edit, Trash2, Image, Save, X, Camera, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
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
import { uploadFile } from '../lib/upload';
import { useRef } from 'react';
import { useGyms, useMainGyms, useBranches, useCreateGym, useUpdateGym, useDeleteGym } from '../hooks/useGyms';
import type { Gym } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const DAYS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

type GymFormData = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  code: string;
  description?: string;
  logo_url?: string;
  schedule?: Record<string, { abre: string; cierra: string }>;
  social_links?: {
    instagram?: string;
    whatsapp?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  };
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  parent_gym_id?: string | null;
};

const defaultSchedule = DAYS.reduce((acc, day) => {
  acc[day.key] = { abre: '06:00', cierra: '22:00' };
  return acc;
}, {} as Record<string, { abre: string; cierra: string }>);

const defaultSocialLinks = {
  instagram: '',
  whatsapp: '',
  twitter: '',
  tiktok: '',
  youtube: '',
};

export function GymSettings() {
  const { user } = useAuth();
  const { canAccess } = useModulePermissions();
  const canCreate = canAccess('/gimnasios', 'create');
  const canEdit = canAccess('/gimnasios', 'edit');
  const canDelete = canAccess('/gimnasios', 'delete');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'branches'>('main');
  const [selectedMainGymId, setSelectedMainGymId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [deletingGym, setDeletingGym] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const { data: mainGyms, isLoading: loadingMain, refetch: refetchMain } = useMainGyms();
  const { data: allGyms } = useGyms();
  const { data: branches, isLoading: loadingBranches } = useBranches(selectedMainGymId || '');
  const createGym = useCreateGym();
  const updateGym = useUpdateGym();
  const deleteGym = useDeleteGym();

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate, watch: watchCreate, setValue: setValueCreate, formState: { errors: errorsCreate } } = useForm<GymFormData>({
    defaultValues: {
      schedule: defaultSchedule,
      social_links: defaultSocialLinks,
      is_active: true,
      parent_gym_id: null,
    },
  });
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit, formState: { errors: errorsEdit } } = useForm<GymFormData>({
    defaultValues: {
      schedule: defaultSchedule,
      social_links: defaultSocialLinks,
      is_active: true,
      parent_gym_id: null,
    },
  });

  const filteredMainGyms = (mainGyms || []).filter(gym => 
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBranches = (branches || []).filter(gym => 
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, 'gym-logos', 'gyms');
      if (isEditOpen) {
        setValueEdit('logo_url', url);
      } else {
        setValueCreate('logo_url', url);
      }
      toast.success('Logo subido exitosamente');
    } catch (error) {
      toast.error('Error subiendo logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCreate = (data: GymFormData) => {
    // Si estamos en tab de sucursales y hay gym principal seleccionado, asignar parent_gym_id
    if (activeTab === 'branches' && selectedMainGymId) {
      data.parent_gym_id = selectedMainGymId;
    }
    createGym.mutate(data, {
      onSuccess: () => {
        resetCreate({
          schedule: defaultSchedule,
          social_links: defaultSocialLinks,
          is_active: true,
          parent_gym_id: activeTab === 'branches' ? selectedMainGymId : null,
        });
        setIsCreateOpen(false);
        refetchMain();
      },
    });
  };

  const handleEdit = (data: GymFormData) => {
    if (!editingGym) return;
    updateGym.mutate({ id: editingGym.id, data }, {
      onSuccess: () => {
        resetEdit();
        setIsEditOpen(false);
        setEditingGym(null);
        refetchMain();
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteGym.mutate(id, {
      onSuccess: () => {
        setDeletingGym(null);
        refetchMain();
      },
    });
  };

  const openEditDialog = (gym: Gym) => {
    setEditingGym(gym);
    resetEdit({
      ...gym,
      schedule: gym.schedule || defaultSchedule,
      social_links: gym.social_links || defaultSocialLinks,
    });
    setIsEditOpen(true);
  };

  const openCreateDialog = (parentGymId?: string) => {
    if (parentGymId) {
      setSelectedMainGymId(parentGymId);
      setActiveTab('branches');
    }
    resetCreate({
      schedule: defaultSchedule,
      social_links: defaultSocialLinks,
      is_active: true,
      parent_gym_id: parentGymId || null,
    });
    setIsCreateOpen(true);
  };

  const isLoading = loadingMain || (activeTab === 'branches' && loadingBranches);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando gimnasios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="gyms-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Configuración de Gimnasios
          </h1>
          <p className="text-muted-foreground">
            Gestiona la información de los gimnasios y sucursales
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => openCreateDialog(activeTab === 'branches' ? selectedMainGymId : undefined)}>
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'branches' ? 'Nueva Sucursal' : 'Nuevo Gimnasio'}
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main">
            <Building2 className="w-4 h-4 mr-2" />
            Gimnasios Principales
            <Badge variant="secondary" className="ml-2">{mainGyms?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="branches" disabled={!selectedMainGymId && mainGyms && mainGyms.length > 0}>
            <Building2 className="w-4 h-4 mr-2" />
            Sucursales
            {selectedMainGymId && (
              <Badge variant="secondary" className="ml-2">{branches?.length || 0}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Main Gyms Tab */}
        <TabsContent value="main" className="mt-4">
          {selectedMainGymId && (
            <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4" />
                <span>Ver sucursales de: <strong>{mainGyms?.find(g => g.id === selectedMainGymId)?.name}</strong></span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedMainGymId(null); setActiveTab('main'); }}>
                Volver a Gimnasios Principales
              </Button>
            </div>
          )}

          {filteredMainGyms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gyms-grid">
              {filteredMainGyms.map((gym) => (
                <Card key={gym.id} className="bg-card border-border hover:border-primary/50 transition-all duration-300" data-testid="gym-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                          {gym.logo_url ? (
                            <img src={gym.logo_url} alt={gym.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{gym.name}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            {gym.code}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <Button size="icon" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => openEditDialog(gym)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="icon" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10" onClick={() => setDeletingGym(gym.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canCreate && (
                          <Button size="icon" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10" onClick={() => openCreateDialog(gym.id)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {gym.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{gym.address}</span>
                      </div>
                    )}
                    {gym.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{gym.phone}</span>
                      </div>
                    )}
                    {gym.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{gym.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm pt-2 border-t border-border">
                      <Badge variant={gym.is_active ? 'default' : 'outline'} className="gap-1">
                        {gym.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {gym.branches && gym.branches.length > 0 ? `${gym.branches.length} sucursal(es)` : 'Sin sucursales'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron gimnasios principales</p>
                  {canCreate && (
                    <Button className="mt-4" onClick={() => openCreateDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear primer gimnasio
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="mt-4">
          {!selectedMainGymId && mainGyms && mainGyms.length > 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Selecciona un gimnasio principal para ver sus sucursales</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {mainGyms.map((gym) => (
                      <Button
                        key={gym.id}
                        variant="outline"
                        className="h-auto p-4 text-left"
                        onClick={() => { setSelectedMainGymId(gym.id); setActiveTab('branches'); }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{gym.name}</p>
                            <p className="text-xs text-muted-foreground">{gym.code}</p>
                          </div>
                        </div>
                        <ChevronDown className="ml-auto w-4 h-4" />
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedMainGymId ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sucursales de {mainGyms?.find(g => g.id === selectedMainGymId)?.name}</h3>
                {canCreate && (
                  <Button onClick={() => openCreateDialog(selectedMainGymId)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Sucursal
                  </Button>
                )}
              </div>
              {filteredBranches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gyms-grid">
                  {filteredBranches.map((gym) => (
                    <Card key={gym.id} className="bg-card border-border hover:border-primary/50 transition-all duration-300" data-testid="gym-card">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center overflow-hidden">
                              {gym.logo_url ? (
                                <img src={gym.logo_url} alt={gym.name} className="w-full h-full object-cover" />
                              ) : (
                                <Building2 className="w-6 h-6 text-green-500" />
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{gym.name}</CardTitle>
                              <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-500 border-green-500/20">
                                {gym.code}
                              </Badge>
                              <Badge variant="secondary" className="mt-1 ml-1 text-xs">
                                SUCURSAL
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <Button size="icon" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => openEditDialog(gym)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button size="icon" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10" onClick={() => setDeletingGym(gym.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {gym.address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{gym.address}</span>
                          </div>
                        )}
                        {gym.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{gym.phone}</span>
                          </div>
                        )}
                        {gym.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{gym.email}</span>
                          </div>
                        )}
                        {gym.latitude && gym.longitude && (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{gym.latitude}, {gym.longitude}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm pt-2 border-t border-border">
                          <Badge variant={gym.is_active ? 'default' : 'outline'} className="gap-1">
                            {gym.is_active ? 'Activo' : 'Inactivo'}
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
                      <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50 text-green-500" />
                      <p>No hay sucursales para este gimnasio</p>
                      {canCreate && (
                        <Button className="mt-4" onClick={() => openCreateDialog(selectedMainGymId)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Crear primera sucursal
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No hay gimnasios principales creados</p>
                  {canCreate && (
                    <Button className="mt-4" onClick={() => { setActiveTab('main'); openCreateDialog(); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear gimnasio principal
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Gym Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeTab === 'branches' ? 'Nueva Sucursal' : 'Nuevo Gimnasio'}</DialogTitle>
            <DialogDescription>
              {activeTab === 'branches' 
                ? `Configura la información de la sucursal para ${mainGyms?.find(g => g.id === selectedMainGymId)?.name}`
                : 'Configura la información del gimnasio principal'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-6">
            {/* Parent Gym Selector (solo si no está pre-seleccionado) */}
            {activeTab === 'main' && canCreate && (
              <div className="space-y-2 border-b pb-4">
                <Label>Tipo de Gimnasio</Label>
                <Select onValueChange={(v) => setValueCreate('parent_gym_id', v === 'branch' ? selectedMainGymId : null)} defaultValue="main">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Gimnasio Principal</SelectItem>
                    <SelectItem value="branch" disabled={!mainGyms || mainGyms.length === 0}>
                      Sucursal de gimnasio existente
                    </SelectItem>
                  </SelectContent>
                </Select>
                {watchCreate('parent_gym_id') && (
                  <p className="text-sm text-muted-foreground">
                    Se creará como sucursal de: {mainGyms?.find(g => g.id === watchCreate('parent_gym_id'))?.name}
                  </p>
                )}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-name">Nombre *</Label>
                  <Input
                    id="create-name"
                    {...registerCreate('name', { required: 'El nombre es requerido' })}
                    className="bg-input border-border mt-1"
                    placeholder="Ej: Gimnasio Los Teques"
                  />
                  {errorsCreate.name && <p className="text-xs text-destructive mt-1">{errorsCreate.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="create-code">Código *</Label>
                  <Input
                    id="create-code"
                    {...registerCreate('code', { required: 'El código es requerido' })}
                    className="bg-input border-border mt-1"
                    placeholder="Ej: GYM-LTQ-001"
                  />
                  {errorsCreate.code && <p className="text-xs text-destructive mt-1">{errorsCreate.code.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="create-address">Dirección</Label>
                  <Input
                    id="create-address"
                    {...registerCreate('address')}
                    className="bg-input border-border mt-1"
                    placeholder="Sector, Ciudad, Estado"
                  />
                </div>
                <div>
                  <Label htmlFor="create-phone">Teléfono</Label>
                  <Input
                    id="create-phone"
                    {...registerCreate('phone')}
                    className="bg-input border-border mt-1"
                    placeholder="0412-1234567"
                  />
                </div>
                <div>
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    {...registerCreate('email')}
                    className="bg-input border-border mt-1"
                    placeholder="info@gym.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="create-description">Descripción</Label>
                  <Textarea
                    id="create-description"
                    {...registerCreate('description')}
                    className="bg-input border-border mt-1"
                    placeholder="Descripción del gimnasio..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Image className="w-5 h-5" />
                Logo del Gimnasio
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden border border-border">
                  {watchCreate('logo_url') ? (
                    <img src={watchCreate('logo_url')} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-10 h-10 text-primary" />
                  )}
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button variant="outline" className="w-full">
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadingLogo ? 'Subiendo...' : 'Seleccionar Logo'}
                    </Button>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">Formatos: JPG, PNG, WebP. Máx 2MB</p>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horarios
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DAYS.map(day => (
                  <div key={day.key} className="grid grid-cols-3 gap-2">
                    <Label className="text-sm col-span-1">{day.label}</Label>
                    <Input
                      type="time"
                      {...registerCreate(`schedule.${day.key}.abre`)}
                      className="bg-input border-border col-span-1"
                      placeholder="Abre"
                    />
                    <Input
                      type="time"
                      {...registerCreate(`schedule.${day.key}.cierra`)}
                      className="bg-input border-border col-span-1"
                      placeholder="Cierra"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Redes Sociales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(defaultSocialLinks).map(([key]) => (
                  <div key={key}>
                    <Label htmlFor={`create-social-${key}`}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Label>
                    <Input
                      id={`create-social-${key}`}
                      {...registerCreate(`social_links.${key}`)}
                      className="bg-input border-border mt-1"
                      placeholder={`https://${key}.com/...`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Ubicación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-latitude">Latitud</Label>
                  <Input
                    id="create-latitude"
                    type="number"
                    step="any"
                    {...registerCreate('latitude', { valueAsNumber: true })}
                    className="bg-input border-border mt-1"
                    placeholder="10.3407"
                  />
                </div>
                <div>
                  <Label htmlFor="create-longitude">Longitud</Label>
                  <Input
                    id="create-longitude"
                    type="number"
                    step="any"
                    {...registerCreate('longitude', { valueAsNumber: true })}
                    className="bg-input border-border mt-1"
                    placeholder="-66.9836"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Input
                type="checkbox"
                id="create-active"
                {...registerCreate('is_active')}
                className="w-4 h-4"
              />
              <Label htmlFor="create-active" className="cursor-pointer">
                Gimnasio activo
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createGym.isPending}>
                {createGym.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {activeTab === 'branches' ? 'Crear Sucursal' : 'Crear Gimnasio'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Gym Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar {editingGym?.parent_gym_id ? 'Sucursal' : 'Gimnasio'}</DialogTitle>
            <DialogDescription>
              Actualiza la información
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEdit)} className="space-y-6">
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="edit-code">Código *</Label>
                  <Input
                    id="edit-code"
                    {...registerEdit('code', { required: 'El código es requerido' })}
                    className="bg-input border-border mt-1"
                  />
                  {errorsEdit.code && <p className="text-xs text-destructive mt-1">{errorsEdit.code.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-address">Dirección</Label>
                  <Input
                    id="edit-address"
                    {...registerEdit('address')}
                    className="bg-input border-border mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input
                    id="edit-phone"
                    {...registerEdit('phone')}
                    className="bg-input border-border mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    {...registerEdit('email')}
                    className="bg-input border-border mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Textarea
                    id="edit-description"
                    {...registerEdit('description')}
                    className="bg-input border-border mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Image className="w-5 h-5" />
                Logo
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden border border-border">
                  {watchEdit('logo_url') ? (
                    <img src={watchEdit('logo_url')} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-10 h-10 text-primary" />
                  )}
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button variant="outline" className="w-full">
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
                    </Button>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">Formatos: JPG, PNG, WebP. Máx 2MB</p>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horarios
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DAYS.map(day => (
                  <div key={day.key} className="grid grid-cols-3 gap-2">
                    <Label className="text-sm col-span-1">{day.label}</Label>
                    <Input
                      type="time"
                      {...registerEdit(`schedule.${day.key}.abre`)}
                      className="bg-input border-border col-span-1"
                      placeholder="Abre"
                    />
                    <Input
                      type="time"
                      {...registerEdit(`schedule.${day.key}.cierra`)}
                      className="bg-input border-border col-span-1"
                      placeholder="Cierra"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Redes Sociales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(defaultSocialLinks).map(([key]) => (
                  <div key={key}>
                    <Label htmlFor={`edit-social-${key}`}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Label>
                    <Input
                      id={`edit-social-${key}`}
                      {...registerEdit(`social_links.${key}`)}
                      className="bg-input border-border mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Ubicación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-latitude">Latitud</Label>
                  <Input
                    id="edit-latitude"
                    type="number"
                    step="any"
                    {...registerEdit('latitude', { valueAsNumber: true })}
                    className="bg-input border-border mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-longitude">Longitud</Label>
                  <Input
                    id="edit-longitude"
                    type="number"
                    step="any"
                    {...registerEdit('longitude', { valueAsNumber: true })}
                    className="bg-input border-border mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Input
                type="checkbox"
                id="edit-active"
                {...registerEdit('is_active')}
                className="w-4 h-4"
              />
              <Label htmlFor="edit-active" className="cursor-pointer">
                Gimnasio activo
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={updateGym.isPending}>
                {updateGym.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingGym} onOpenChange={(open) => !open && setDeletingGym(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar {editingGym?.parent_gym_id ? 'sucursal' : 'gimnasio'}?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente.
              {editingGym?.parent_gym_id ? '' : ' Si tiene sucursales, debe eliminarlas primero.'}
            </DialogDescription>
          </DialogHeader>
          <DialogContent className="bg-card border-border">
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeletingGym(null)}>
                Cancelar
              </Button>
              <Button 
                className="bg-red-500 hover:bg-red-600 text-red-500-foreground"
                onClick={() => { handleDelete(deletingGym!); setDeletingGym(null); }}
                disabled={deleteGym.isPending}
              >
                {deleteGym.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </DialogContent>
      </Dialog>
    </div>
  );
}