import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import { 
  Search, QrCode, UserCheck, Loader2, AlertCircle, LogIn, LogOut, 
  Calendar as CalendarIcon, User, ChevronLeft, ChevronRight, 
  UserPlus, X, Download, RefreshCw, Filter, CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { useAttendance, useCreateAttendance, useAttendanceStatus } from '../hooks/useAttendance';
import { useUsers } from '../hooks/useUsers';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

type AttendanceRecord = {
  id: string;
  user_id: string;
  date: string;
  time: string;
  type: 'Entrada' | 'Salida';
  source?: string;
  device_id?: string | null;
  session_number?: number;
  created_at: string;
  users?: { name: string; member_number?: string };
};

type UserStatus = {
  inside: boolean;
  last_entry_time: string | null;
  session_count_today: number;
  can_enter: boolean;
  can_exit: boolean;
  last_record_type: string | null;
};

const PAGE_SIZES = [10, 25, 50, 100];
const DATE_FILTER_OPTIONS = [
  { value: 'today', label: 'Hoy' },
  { value: 'month', label: 'Este mes' },
  { value: 'all', label: 'Todos' },
];

export function Attendance() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('today');
  const [customDate, setCustomDate] = useState('');
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [registerUserId, setRegisterUserId] = useState('');
  const [registerType, setRegisterType] = useState<'Entrada' | 'Salida'>('Entrada');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Estados usuarios dentro
  const [usersInside, setUsersInside] = useState<Record<string, UserStatus>>({});
  const [checkingStatus, setCheckingStatus] = useState<Set<string>>(new Set());

  // Obtener datos
  const { data: attendance, isLoading, error, refetch } = useAttendance();
  const { data: users, isLoading: loadingUsers } = useUsers();
  const createAttendanceMutation = useCreateAttendance();

  // Calcular fecha efectiva según filtro
  const getEffectiveDate = () => {
    if (dateFilter === 'today') return new Date().toISOString().split('T')[0];
    if (dateFilter === 'month') {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return undefined;
  };

  // Verificar estado de usuarios (solo para filtro hoy)
  useEffect(() => {
    if (dateFilter !== 'today' || !users?.length) return;
    
    const checkUsersStatus = async () => {
      const today = new Date().toISOString().split('T')[0];
      const newStatus: Record<string, UserStatus> = {};
      const checking = new Set<string>();
      
      for (const user of users) {
        if (user.status !== 'Activo') continue;
        checking.add(user.id);
        try {
          const { attendance: status } = await import('../lib/api');
          const result = await status.getStatus(user.id, today);
          if (result?.inside) {
            newStatus[user.id] = result;
          }
        } catch (e) {
          console.warn(`Error checking status for ${user.id}:`, e);
        }
      }
      setUsersInside(newStatus);
      setCheckingStatus(checking);
    };
    
    checkUsersStatus();
  }, [dateFilter, users, refetch]);

  // Función para refrescar estado de usuarios dentro (llamar tras mutación exitosa)
  const refreshUsersInside = async () => {
    if (dateFilter !== 'today' || !users?.length) return;
    
    const today = new Date().toISOString().split('T')[0];
    const newStatus: Record<string, UserStatus> = {};
    const checking = new Set<string>();
    
    for (const user of users) {
      if (user.status !== 'Activo') continue;
      checking.add(user.id);
      try {
        const { attendance: statusApi } = await import('../lib/api');
        const result = await statusApi.getStatus(user.id, today);
        if (result?.inside) {
          newStatus[user.id] = result;
        }
      } catch (e) {
        console.warn(`Error checking status for ${user.id}:`, e);
      }
    }
    setUsersInside(newStatus);
    setCheckingStatus(checking);
  };

  // Filtrar asistencia
  const filteredAttendance = attendance && attendance.length > 0 
    ? attendance.filter((a: AttendanceRecord) => {
        const matchesSearch = a.users?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (dateFilter === 'today') {
          const today = new Date().toISOString().split('T')[0];
          return matchesSearch && a.date === today;
        }
        if (dateFilter === 'month') {
          const now = new Date();
          const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
          return matchesSearch && a.date >= monthStart && a.date <= monthEnd;
        }
        return matchesSearch; // all
      })
    : [];

  // Paginación
  const totalPages = Math.ceil(filteredAttendance.length / pageSize);
  const paginatedAttendance = filteredAttendance.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats de hoy
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance && attendance.length > 0 
    ? attendance.filter((a: AttendanceRecord) => a.date === today) 
    : [];
  const todayUniqueUsers = todayAttendance.length > 0 
    ? new Set(todayAttendance.map((a: AttendanceRecord) => a.user_id)).size
    : 0;
  const todayTotalRecords = todayAttendance.length;
  const usersInsideCount = Object.keys(usersInside).length;

  // Registrar asistencia
  const handleRegisterAttendance = () => {
    if (!registerUserId) {
      toast.error('Selecciona un usuario');
      return;
    }
    
    createAttendanceMutation.mutate({
      user_id: registerUserId,
      type: registerType,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
    }, {
      onSuccess: () => {
        setIsRegisterDialogOpen(false);
        setRegisterUserId('');
        setRegisterType('Entrada');
        refetch();
        refreshUsersInside(); // Actualizar panel "Dentro Ahora" inmediatamente
      }
    });
  };

  // Abrir modal registro con pre-selección inteligente
  const openRegisterDialog = (userId?: string, type?: 'Entrada' | 'Salida') => {
    if (userId) setRegisterUserId(userId);
    if (type) setRegisterType(type);
    setIsRegisterDialogOpen(true);
  };

  // Descargar QR real
  const handleDownloadQR = (userId: string) => {
    const user = users?.find((u: any) => u.id === userId);
    const memberNumber = user?.member_number || userId.slice(0, 8);
    const name = user?.name || 'Usuario';
    
    // Crear canvas del QR
    const qrValue = `GYM-${userId}`;
    const canvas = document.createElement('canvas');
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Fondo
    ctx.fillStyle = '#1f1f2e';
    ctx.fillRect(0, 0, size, size);
    
    // Generar QR en canvas usando QRCodeSVG renderizado
    const qrSvg = document.createElement('div');
    // Usamos un enfoque más simple: renderizamos el SVG a canvas via data URL
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrValue)}&bgcolor=1f1f2e&color=10f94e&qzone=2&format=png`;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `QR_${memberNumber}_${name.replace(/\s+/g, '_')}.png`);
          toast.success('QR descargado correctamente');
        }
      }, 'image/png');
    };
    img.src = qrDataUrl;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando asistencia...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-[#ff3b5c]" />
        <h2 className="text-2xl">Error al cargar asistencia</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Ocurrió un error al cargar los datos de asistencia. Verifica tu conexión a Supabase.
        </p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="attendance-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Control de Asistencia</h1>
          <p className="text-muted-foreground">Registro de entrada y salida de usuarios</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-primary text-primary hover:bg-primary/10"
            onClick={() => setIsQRDialogOpen(true)}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Generar QR
          </Button>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => openRegisterDialog()}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Registrar Asistencia
          </Button>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usuarios Hoy</p>
                <p className="text-2xl">{todayUniqueUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <LogIn className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros Hoy</p>
                <p className="text-2xl">{todayTotalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#10f94e]/10">
                <UserPlus className="w-6 h-6 text-[#10f94e]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dentro Ahora</p>
                <p className="text-2xl text-[#10f94e]">{usersInsideCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <CalendarIcon className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl">{attendance?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel "Dentro Ahora" - Solo si hay usuarios dentro y filtro es hoy */}
      {dateFilter === 'today' && usersInsideCount > 0 && (
        <Card className="bg-card border-border border-[#10f94e]/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[#10f94e]">
                <UserPlus className="w-5 h-5" />
                Usuarios Dentro del Gimnasio ({usersInsideCount})
              </CardTitle>
              <Badge variant="outline" className="bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30">
                <span className="w-2 h-2 rounded-full bg-[#10f94e] mr-1 inline-block" />
                Activos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(usersInside).map(([userId, status]) => {
                const user = users?.find((u: any) => u.id === userId);
                const isChecking = checkingStatus.has(userId);
                return (
                  <div 
                    key={userId} 
                    className="p-4 bg-[#10f94e]/5 border border-[#10f94e]/20 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#10f94e]/20 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-5 h-5 text-[#10f94e]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user?.name || 'Usuario'}</p>
                        <p className="text-xs text-muted-foreground">
                          Entrada: {status.last_entry_time || '--:--'} 
                          <span className="ml-1 text-[#10f94e]">● Sesión #{status.session_count_today}</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#ff3b5c] text-[#ff3b5c] hover:bg-[#ff3b5c]/10 whitespace-nowrap"
                      onClick={() => openRegisterDialog(userId, 'Salida')}
                      disabled={isChecking || createAttendanceMutation.isPending}
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      Salida
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda usuario */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre de usuario..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 bg-input border-border"
              />
            </div>
            
            {/* Filtro fecha rápida */}
            <div className="md:col-span-1">
              <Select value={dateFilter} onValueChange={(v: 'today' | 'month' | 'all') => { setDateFilter(v); setCurrentPage(1); setCustomDate(''); }}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Filtrar por fecha" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {DATE_FILTER_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.value === 'today' && <CalendarDays className="w-4 h-4 text-[#10f94e]" />}
                        {opt.value === 'month' && <CalendarIcon className="w-4 h-4 text-accent" />}
                        {opt.value === 'all' && <Filter className="w-4 h-4 text-secondary" />}
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Fecha personalizada (opcional) */}
            <div className="md:col-span-1">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => { setCustomDate(e.target.value); setDateFilter('all'); setCurrentPage(1); }}
                className="bg-input border-border"
                placeholder="Fecha específica"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Registro de Asistencia ({filteredAttendance.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Mostrar:</Label>
              <Select value={pageSize} onValueChange={(v: string) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[100px] bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {PAGE_SIZES.map(size => (
                    <SelectItem key={size} value={String(size)}>{size} por página</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginatedAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="attendance-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground">Usuario</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Fecha</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Hora</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Tipo</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Fuente</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Sesión</th>
                    <th className="text-right py-3 px-4 text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAttendance.map((record: AttendanceRecord) => (
                    <tr key={record.id} className="border-b border-border hover:bg-muted/50 transition-colors" data-testid={`attendance-record-${record.id}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {record.users?.name || 'Usuario desconocido'}
                          {record.users?.member_number && (
                            <span className="text-xs text-muted-foreground ml-1">({record.users.member_number})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">{new Date(record.date).toLocaleDateString('es-ES')}</td>
                      <td className="py-4 px-4">
                        <span className="text-primary font-mono">{record.time}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge 
                          variant="outline" 
                          className={record.type === 'Entrada' 
                            ? 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30' 
                            : 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30'}
                        >
                          {record.type === 'Entrada' ? <LogIn className="w-3 h-3 mr-1 inline" /> : <LogOut className="w-3 h-3 mr-1 inline" />}
                          {record.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary" className="text-xs">
                          {record.source || 'manual'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono text-muted-foreground">#{record.session_number || 1}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-primary text-primary hover:bg-primary/10"
                            onClick={() => navigate(`/usuarios/${record.user_id}`)}
                          >
                            Ver Usuario
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No hay registros de asistencia</p>
              {searchTerm && <p className="text-sm mt-1">Intenta cambiar los filtros o limpiar la búsqueda</p>}
            </div>
          )}
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} · {filteredAttendance.length} registros
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 px-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register Attendance Dialog */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Asistencia</DialogTitle>
            <DialogDescription>
              Registra la entrada o salida de un usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">Usuario *</Label>
              <Select value={registerUserId} onValueChange={setRegisterUserId}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-[300px]">
                  {loadingUsers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  ) : users && users.length > 0 ? (
                    users
                      .filter((u: any) => u.status === 'Activo')
                      .map((user: any) => {
                        const inside = usersInside[user.id]?.inside;
                        return (
                          <SelectItem key={user.id} value={user.id} disabled={inside && registerType === 'Entrada'}>
                            <div className="flex items-center justify-between w-full">
                              <span>{user.name} - {user.member_number || user.id.slice(0, 8)}</span>
                              {inside && (
                                <Badge variant="outline" className="bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30 text-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#10f94e] mr-1 inline-block" />
                                  Dentro
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No hay usuarios disponibles
                    </div>
                  )}
                </SelectContent>
              </Select>
              {registerUserId && usersInside[registerUserId]?.inside && registerType === 'Entrada' && (
                <p className="text-xs text-[#ff3b5c] mt-1">⚠ Este usuario ya está dentro. Selecciona "Salida" para registrar su salida.</p>
              )}
            </div>
            <div>
              <Label htmlFor="type-select">Tipo de Registro *</Label>
              <Select value={registerType} onValueChange={(value: 'Entrada' | 'Salida') => setRegisterType(value)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Entrada" disabled={registerUserId && usersInside[registerUserId]?.inside}>
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-[#10f94e]" />
                      Entrada {registerUserId && usersInside[registerUserId]?.inside && '(no disponible)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="Salida" disabled={registerUserId && !usersInside[registerUserId]?.inside}>
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-[#ff3b5c]" />
                      Salida {registerUserId && !usersInside[registerUserId]?.inside && '(no hay entrada pendiente)'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {registerUserId && (
                <p className="text-xs text-muted-foreground mt-1">
                  {usersInside[registerUserId]?.inside 
                    ? 'El usuario está dentro. Solo puede registrar Salida.'
                    : 'El usuario está fuera. Puede registrar Entrada.'}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRegisterDialogOpen(false);
                  setRegisterUserId('');
                  setRegisterType('Entrada');
                }}
              >
                Cancelar
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleRegisterAttendance}
                disabled={createAttendanceMutation.isPending || !registerUserId}
              >
                {createAttendanceMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Registrar {registerType}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Código QR de Usuario</DialogTitle>
            <DialogDescription>
              Selecciona un usuario para generar su código QR de acceso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="qr-user-select">Seleccionar Usuario</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-[300px]">
                  {loadingUsers ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  ) : users && users.length > 0 ? (
                    users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.member_number || user.id.slice(0, 8)}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No hay usuarios disponibles
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedUserId && (
              <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-lg">
                <div className="relative">
                  <QRCodeSVG
                    value={`GYM-${selectedUserId}`}
                    size={200}
                    level="H"
                    bgColor="#1f1f2e"
                    fgColor="#10f94e"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Código QR para {users?.find((u: any) => u.id === selectedUserId)?.name || 'Usuario'}
                </p>
                <div className="flex gap-2 w-full">
                  <Button 
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleDownloadQR(selectedUserId)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PNG
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-primary text-primary hover:bg-primary/10"
                    onClick={() => {
                      const qrValue = `GYM-${selectedUserId}`;
                      navigator.clipboard.writeText(qrValue);
                      toast.success('Código copiado al portapapeles');
                    }}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Copiar Código
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}