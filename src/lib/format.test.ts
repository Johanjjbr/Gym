import { describe, expect, it } from 'vitest';
import { formatDate, formatMonthYear, formatShortDate, safeFileName } from './format';

describe('fechas de factura sin corrimiento de zona horaria', () => {
  it('una fecha sin hora no se corre al día anterior', () => {
    expect(formatShortDate('2026-10-24')).toBe('24/10/2026');
    expect(formatShortDate('2026-10-24T00:00:00')).toBe('24/10/2026');
    expect(formatDate('2026-10-01')).toMatch(/^01 de octubre de 2026$/);
  });
  it('mes pagado y nombre de archivo', () => {
    expect(formatMonthYear('2026-10-24T00:00:00')).toBe('Octubre 2026');
    expect(safeFileName('Factura - KEVIN J. RAGA / Q - Octubre 2026')).toBe('Factura - KEVIN J. RAGA Q - Octubre 2026');
  });
});
