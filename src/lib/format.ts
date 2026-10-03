/**
 * Fechas sin hora ("2026-10-24" o "2026-10-24T00:00:00") se leen como fecha
 * local: new Date("2026-10-24") es medianoche UTC y en Venezuela (UTC-4)
 * mostraría el 23.
 */
function toLocalDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]00:00(?::00(?:\.0+)?)?)?$/.exec(dateStr);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** "Octubre 2026" */
export function formatMonthYear(dateStr: string): string {
  const d = toLocalDate(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Nombre de archivo seguro: "Factura - Kevin Raga - Octubre 2026" */
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function formatDate(dateStr: string): string {
  const date = toLocalDate(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Montos en USD (moneda base del gimnasio): "$20,00". Con currency='VES': "Bs 4.906,00". */
export function formatCurrency(amount: number, currency: 'USD' | 'VES' = 'USD'): string {
  const n = amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'VES' ? `Bs ${n}` : `$${n}`;
}

export function formatShortDate(dateStr: string): string {
  const date = toLocalDate(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}