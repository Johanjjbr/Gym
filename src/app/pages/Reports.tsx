import { Download, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const reportTypes = [
  {
    id: 1,
    title: 'Reporte de Ingresos Mensual',
    description: 'Detalle completo de todos los pagos recibidos en el mes',
    icon: FileText,
    color: 'text-[#10f94e]',
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
    title: 'Reporte de Morosos',
    description: 'Usuarios con pagos vencidos y pendientes',
    icon: FileText,
    color: 'text-[#ff3b5c]',
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
    color: 'text-[#10f94e]',
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
              <label className="text-sm text-muted-foreground mb-2 block">Fecha Inicio</label>
              <input
                type="date"
                className="w-full p-2 bg-input border border-border rounded-lg"
                defaultValue="2026-02-01"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Fecha Fin</label>
              <input
                type="date"
                className="w-full p-2 bg-input border border-border rounded-lg"
                defaultValue="2026-02-24"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Tipo de Reporte</label>
              <select className="w-full p-2 bg-input border border-border rounded-lg">
                <option>Ingresos</option>
                <option>Usuarios</option>
                <option>Asistencia</option>
                <option>Personal</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Formato</label>
              <select className="w-full p-2 bg-input border border-border rounded-lg">
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
              </select>
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
