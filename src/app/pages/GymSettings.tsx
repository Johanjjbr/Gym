import { useState } from 'react';
import { Search, MapPin, Phone, Mail, Globe, Star, Clock, Image, Loader2, AlertCircle, Plus, Save, Building2, Instagram, MessageCircle, Twitter, Video, Youtube, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { useGyms, useUpdateGym } from '../hooks/useGyms';
import { uploadFile } from '../lib/upload';

const DAYS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

function ScheduleEditor({ schedule, onChange }: {
  schedule: Record<string, { abre: string; cierra: string }>;
  onChange: (s: Record<string, { abre: string; cierra: string }>) => void;
}) {
  const copyToAll = (fromDay: string) => {
    const source = schedule[fromDay];
    if (!source) return;
    const updated = { ...schedule };
    DAYS.forEach(d => {
      updated[d.key] = { ...source };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Horarios por día</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            const first = DAYS.find(d => schedule[d.key]?.abre);
            if (first) copyToAll(first.key);
          }}
        >
          Copiar a todos
        </Button>
      </div>
      {DAYS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
          <span className="w-20 text-sm font-medium">{label}</span>
          <Input
            type="time"
            value={schedule[key]?.abre || ''}
            onChange={(e) => {
              const current = schedule[key] || { abre: '', cierra: '' };
              onChange({ ...schedule, [key]: { ...current, abre: e.target.value } });
            }}
            className="w-32 bg-input border-border"
          />
          <span className="text-muted-foreground">a</span>
          <Input
            type="time"
            value={schedule[key]?.cierra || ''}
            onChange={(e) => {
              const current = schedule[key] || { abre: '', cierra: '' };
              onChange({ ...schedule, [key]: { ...current, cierra: e.target.value } });
            }}
            className="w-32 bg-input border-border"
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="Copiar horario a todos los días"
            onClick={() => copyToAll(key)}
          >
            <Globe className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function SocialLinksEditor({ links, onChange }: {
  links: Record<string, string>;
  onChange: (l: Record<string, string>) => void;
}) {
  const platforms = [
    { key: 'instagram', icon: Instagram, label: 'Instagram', placeholder: 'https://instagram.com/...' },
    { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', placeholder: 'https://wa.me/58...' },
    { key: 'twitter', icon: Twitter, label: 'Twitter / X', placeholder: 'https://twitter.com/...' },
    { key: 'tiktok', icon: Video, label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
    { key: 'youtube', icon: Youtube, label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  ];

  return (
    <div className="space-y-3">
      {platforms.map(({ key, icon: Icon, label, placeholder }) => (
        <div key={key} className="flex items-center gap-3">
          <Icon className="size-5 text-muted-foreground shrink-0" />
          <Label className="w-20 text-sm">{label}</Label>
          <Input
            value={links[key] || ''}
            onChange={(e) => onChange({ ...links, [key]: e.target.value })}
            placeholder={placeholder}
            className="flex-1 bg-input border-border"
          />
        </div>
      ))}
    </div>
  );
}

export function GymSettings() {
  const { user } = useAuth();
  const { data: gyms, isLoading, error } = useGyms(true);
  const updateGymMutation = useUpdateGym();
  const [editingGym, setEditingGym] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const isSuperAdmin = user?.is_super_admin;

  const myGym = isSuperAdmin
    ? null
    : (gyms?.find((g: any) => g.id === user?.gym_id) || null);

  const visibleGyms = isSuperAdmin ? (gyms || []) : (myGym ? [myGym] : []);

  const openEdit = (gym: any) => {
    setEditingGym({
      ...gym,
      schedule: typeof gym.schedule === 'string' ? JSON.parse(gym.schedule) : (gym.schedule || {}),
      social_links: typeof gym.social_links === 'string' ? JSON.parse(gym.social_links) : (gym.social_links || {}),
    });
    setIsEditOpen(true);
  };

  const handleSave = () => {
    if (!editingGym) return;
    const { id, created_at, updated_at, ...data } = editingGym;
    updateGymMutation.mutate({ id, data }, {
      onSuccess: () => {
        setIsEditOpen(false);
        setEditingGym(null);
      },
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingGym) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, 'staff-photos', 'gym-logos');
      setEditingGym({ ...editingGym, logo_url: url });
    } finally {
      setUploadingLogo(false);
    }
  };

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl">Error al cargar gimnasios</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Ocurrió un error al cargar los datos. Verifica tu conexión.
        </p>
      </div>
    );
  }

  if (!editingGym && visibleGyms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl">No hay gimnasios disponibles</h2>
        {isSuperAdmin && (
          <p className="text-muted-foreground">Crea un nuevo gimnasio desde el panel de super admin.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl mb-2">Configuración del Gimnasio</h1>
          <p className="text-muted-foreground">Administra la información de tu gimnasio</p>
        </div>
        {isSuperAdmin && gyms && gyms.length > 0 && (
          <p className="text-sm text-muted-foreground">{gyms.length} gimnasio(s) registrados</p>
        )}
      </div>

      {visibleGyms.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No tienes un gimnasio asociado. Contacta al super admin.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {visibleGyms.map((gym: any) => (
          <Card key={gym.id} className="bg-card border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {gym.logo_url ? (
                  <img src={gym.logo_url} alt={gym.name} className="size-16 rounded-xl object-cover" />
                ) : (
                  <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="size-8 text-primary" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-2xl">{gym.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Código: {gym.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${gym.is_active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {gym.is_active ? 'Activo' : 'Inactivo'}
                </span>
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => openEdit(gym)}>
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gym.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span>{gym.address}</span>
                  </div>
                )}
                {gym.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <span>{gym.phone}</span>
                  </div>
                )}
                {gym.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <span>{gym.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Star className="size-4 text-yellow-500 shrink-0" />
                  <span>{gym.rating ? `${gym.rating} / 5` : 'Sin calificar'} ({gym.review_count || 0} reseñas)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {gym.staff_count || 0} empleados · {gym.users_count || 0} usuarios
                  </span>
                </div>
              </div>
              {gym.description && (
                <p className="text-sm text-muted-foreground mt-3">{gym.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Gimnasio</DialogTitle>
            <DialogDescription>
              Configura todos los parámetros de tu gimnasio.
            </DialogDescription>
          </DialogHeader>

          {editingGym && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                <TabsTrigger value="schedule" className="flex-1">Horarios</TabsTrigger>
                <TabsTrigger value="social" className="flex-1">Redes Sociales</TabsTrigger>
                <TabsTrigger value="location" className="flex-1">Ubicación</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="relative size-20 rounded-xl overflow-hidden bg-muted border-2 border-border shrink-0">
                    {editingGym.logo_url ? (
                      <img src={editingGym.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/70">
                        <Image className="size-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="gym-logo-upload"
                    />
                    <Label htmlFor="gym-logo-upload" className="cursor-pointer">
                      <div className="px-3 py-1.5 text-sm rounded-md bg-input border-border text-muted-foreground hover:bg-accent inline-flex items-center gap-2">
                        <Camera className="size-4" />
                        {uploadingLogo ? 'Subiendo...' : 'Logo'}
                      </div>
                    </Label>
                  </div>
                </div>

                <div>
                  <Label>Nombre del Gimnasio *</Label>
                  <Input
                    value={editingGym.name}
                    onChange={(e) => setEditingGym({ ...editingGym, name: e.target.value })}
                    className="bg-input border-border mt-1"
                  />
                </div>

                <div>
                  <Label>Código</Label>
                  <Input
                    value={editingGym.code}
                    onChange={(e) => setEditingGym({ ...editingGym, code: e.target.value })}
                    className="bg-input border-border mt-1"
                    disabled={!isSuperAdmin}
                  />
                  {!isSuperAdmin && <p className="text-xs text-muted-foreground mt-1">Solo el super admin puede cambiar el código</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Dirección</Label>
                    <Input
                      value={editingGym.address || ''}
                      onChange={(e) => setEditingGym({ ...editingGym, address: e.target.value })}
                      className="bg-input border-border mt-1"
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={editingGym.phone || ''}
                      onChange={(e) => setEditingGym({ ...editingGym, phone: e.target.value })}
                      className="bg-input border-border mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email de contacto</Label>
                    <Input
                      type="email"
                      value={editingGym.email || ''}
                      onChange={(e) => setEditingGym({ ...editingGym, email: e.target.value })}
                      className="bg-input border-border mt-1"
                    />
                  </div>
                  <div>
                    <Label>Calificación (calculada de reseñas)</Label>
                    <Input
                      type="number"
                      value={editingGym.rating || ''}
                      className="bg-muted border-border mt-1 opacity-60"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">Calculada automáticamente de las reseñas de usuarios</p>
                  </div>
                </div>

                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={editingGym.description || ''}
                    onChange={(e) => setEditingGym({ ...editingGym, description: e.target.value })}
                    className="bg-input border-border mt-1 min-h-[100px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="gym-active"
                    checked={editingGym.is_active}
                    onChange={(e) => setEditingGym({ ...editingGym, is_active: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Label htmlFor="gym-active">Gimnasio activo</Label>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                <ScheduleEditor
                  schedule={editingGym.schedule || {}}
                  onChange={(s) => setEditingGym({ ...editingGym, schedule: s })}
                />
              </TabsContent>

              <TabsContent value="social" className="space-y-4 mt-4">
                <SocialLinksEditor
                  links={editingGym.social_links || {}}
                  onChange={(l) => setEditingGym({ ...editingGym, social_links: l })}
                />
              </TabsContent>

              <TabsContent value="location" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Latitud</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={editingGym.latitude ?? ''}
                      onChange={(e) => setEditingGym({ ...editingGym, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                      className="bg-input border-border mt-1"
                      placeholder="10.123456"
                    />
                  </div>
                  <div>
                    <Label>Longitud</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={editingGym.longitude ?? ''}
                      onChange={(e) => setEditingGym({ ...editingGym, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                      className="bg-input border-border mt-1"
                      placeholder="-66.123456"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Coordenadas GPS para mostrar la ubicación del gimnasio en el mapa.
                </p>
              </TabsContent>

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                  <Save className="size-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
