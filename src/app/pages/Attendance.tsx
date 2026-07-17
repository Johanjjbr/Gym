import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Search, QrCode, UserCheck, Loader2, AlertCircle, LogIn, LogOut, Calendar as CalendarIcon, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { useAttendance, useCreateAttendance } from '../hooks/useAttendance';
import { useUsers } from '../hooks/useUsers';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { formatDate } from '../lib/format';

export function Attendance() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [registerUserId, setRegisterUserId] = useState('');
  const [registerType, setRegisterType] = useState<'Entrada' | 'Salida'>('Entrada');
  
  // Obtener datos reales
  const { data: attendance, isLoading, error } = useAttendance(selectedDate);
  const { data: users, isLoading: loadingUsers } = useUsers();
  const createAttendanceMutation = useCreateAttendance();
  
  // Filtrar asistencia por búsqueda
  const filteredAttendance = attendance && attendance.length > 0 ? attendance.filter((a: any) =>
    a.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.users?.cedula && a.users.cedula.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];
  
  // Calcular asistencia de hoy
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance && attendance.length > 0 
    ? attendance.filter((a: any) => a.date === today) 
    : [];
  
  // Calcular entradas únicas de hoy
  const todayUniqueUsers = todayAttendance.length > 0 
    ? new Set(todayAttendance.map((a: any) => a.user_id)).size
    : 0;
    
  // Calcular total de registros de hoy (entradas + salidas)
  const todayTotalRecords = todayAttendance.length;
  
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
      }
    });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-gray-400">Cargando asistencia...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl">Error al cargar asistencia</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Ocurrió un error al cargar los datos de asistencia. Verifica tu conexión a Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            onClick={() => setIsRegisterDialogOpen(true)}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Registrar Asistencia
          </Button>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre de usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>
            <div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-input border-border"
                placeholder="Filtrar por fecha"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Registro de Asistencia ({filteredAttendance.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAttendance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {record.users?.name || 'Usuario desconocido'}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>
                      <span className="text-primary">{record.time}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={record.type === 'Entrada' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-destructive/20 text-destructive border-destructive/30'}>
                        {record.type === 'Entrada' ? <LogIn className="w-3 h-3 mr-1 inline" /> : <LogOut className="w-3 h-3 mr-1 inline" />}
                        {record.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No hay registros de asistencia</p>
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
                    users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.cedula || user.member_number || user.id.slice(0, 8)}
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
            <div>
              <Label htmlFor="type-select">Tipo de Registro *</Label>
              <Select value={registerType} onValueChange={(value: 'Entrada' | 'Salida') => setRegisterType(value)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Entrada">
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-primary" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="Salida">
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-destructive" />
                      Salida
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                disabled={createAttendanceMutation.isPending}
              >
                {createAttendanceMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Registrar
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
                        {user.name} - {user.cedula || user.member_number || user.id.slice(0, 8)}
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
                <QRCodeSVG
                  value={`GYM-${selectedUserId}`}
                  size={200}
                  level="H"
                  bgColor="#1f1f2e"
                  fgColor="#10f94e"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Código QR para {users?.find((u: any) => u.id === selectedUserId)?.name || 'Usuario'}
                </p>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <QrCode className="w-4 h-4 mr-2" />
                  Descargar QR
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
