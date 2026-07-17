import { Download, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const reportTypes = [
  {
    id: 1,
    title: 'Reporte de Ingresos Mensual',
    description: 'Detalle completo de todos los pagos recibidos en el mes',
    icon: FileText,
    color: 'text-primary',
  },
  {
    id: 2,
    title: 'Reporte de Usuarios Activos',
    description: 'Lista de todos los usuarios con membresía activa',
    icon: FileText,
    color: 'text-[#3b82f6]',
  },
  {
    id: 3,
    title: 'Reporte de Suspendidos',
    description: 'Usuarios con pagos vencidos y pendientes',
    icon: FileText,
    color: 'text-destructive',
  },
  {
    id: 4,
    title: 'Reporte de Asistencia',
    description: 'Registro completo de entradas y salidas por período',
    icon: FileText,
    color: 'text-[#a855f7]',
  },
  {
    id: 5,
    title: 'Reporte de Personal',
    description: 'Información del equipo y control de turnos',
    icon: FileText,
    color: 'text-[#eab308]',
  },
  {
    id: 6,
    title: 'Reporte Financiero Anual',
    description: 'Resumen financiero completo del año',
    icon: FileText,
    color: 'text-primary',
  },
];

export function Reports() {
  const handleDownload = (reportTitle: string) => {
    console.log(`Descargando reporte: ${reportTitle}`);
    // Aquí iría la lógica para generar y descargar el reporte
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl mb-2">Reportes</h1>
        <p className="text-muted-foreground">Genera y descarga reportes del sistema</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Último Reporte</p>
                <p className="text-lg">24 Feb 2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reportes Este Mes</p>
                <p className="text-lg">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <Download className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descargas Totales</p>
                <p className="text-lg">156</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="bg-card border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-lg bg-card-foreground/5">
                    <Icon className={`w-6 h-6 ${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{report.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => handleDownload(report.title)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Custom Report */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Generar Reporte Personalizado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Fecha Inicio</Label>
              <Input
                type="date"
                className="bg-input border-border"
                defaultValue="2026-02-01"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Fecha Fin</Label>
              <Input
                type="date"
                className="bg-input border-border"
                defaultValue="2026-02-24"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Tipo de Reporte</Label>
              <Select>
                <SelectTrigger className="w-full bg-input border-border">
                  <SelectValue placeholder="Ingresos" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Ingresos">Ingresos</SelectItem>
                  <SelectItem value="Usuarios">Usuarios</SelectItem>
                  <SelectItem value="Asistencia">Asistencia</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Formato</Label>
              <Select>
                <SelectTrigger className="w-full bg-input border-border">
                  <SelectValue placeholder="PDF" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="Excel">Excel</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" />
            Generar Reporte Personalizado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
