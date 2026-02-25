import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Search, QrCode, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { mockAttendance, mockUsers } from '../lib/mockData';

export function Attendance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredAttendance = mockAttendance.filter(attendance =>
    attendance.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayAttendance = mockAttendance.filter(a => a.date === '2026-02-24');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Control de Asistencia</h1>
          <p className="text-muted-foreground">Registro de entrada y salida de usuarios</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <QrCode className="w-4 h-4 mr-2" />
              Generar QR
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Generar Código QR de Usuario</DialogTitle>
              <DialogDescription>
                Selecciona un usuario para generar su código QR de acceso
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Seleccionar Usuario</label>
                <select
                  className="w-full p-2 bg-input border border-border rounded-lg"
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {mockUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.memberNumber}
                    </option>
                  ))}
                </select>
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
                  <p className="text-sm text-muted-foreground">
                    Código QR para{' '}
                    {mockUsers.find(u => u.id === selectedUserId)?.name}
                  </p>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Descargar QR
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
                <p className="text-sm text-muted-foreground">Asistencia Hoy</p>
                <p className="text-2xl">{todayAttendance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <UserCheck className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio Semanal</p>
                <p className="text-2xl">92</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <UserCheck className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacidad Actual</p>
                <p className="text-2xl">45%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre de usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Registro de Asistencia ({filteredAttendance.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground">Usuario</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Fecha</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Hora</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Tipo</th>
                  <th className="text-right py-3 px-4 text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((attendance) => (
                  <tr key={attendance.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">{attendance.userName}</td>
                    <td className="py-4 px-4">{new Date(attendance.date).toLocaleDateString('es-ES')}</td>
                    <td className="py-4 px-4">
                      <span className="text-primary">{attendance.time}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={attendance.type === 'Entrada' ? 'text-primary' : 'text-secondary'}>
                        {attendance.type}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                          Ver Usuario
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}