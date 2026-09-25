import { describe, it, expect } from 'vitest';
import { formatDate, formatCurrency, formatShortDate, formatDateTime } from './format';

describe('formatDate', () => {
  it('debe formatear fecha en formato largo español', () => {
    const result = formatDate('2026-01-15T12:00:00');
    expect(result).toContain('2026');
    expect(result).toContain('enero');
    expect(result).toContain('de');
  });

  it('debe manejar fecha con hora UTC', () => {
    const result = formatDate('2026-12-25T10:30:00Z');
    expect(result).toContain('2026');
    expect(result).toContain('diciembre');
  });

  it('debe funcionar con diferentes formatos de fecha', () => {
    expect(() => formatDate('2026-06-01')).not.toThrow();
    expect(() => formatDate('2026-06-01T00:00:00Z')).not.toThrow();
    expect(() => formatDate('2026-06-01T12:00:00')).not.toThrow();
  });
});

describe('formatCurrency', () => {
  it('debe formatear moneda VES por defecto', () => {
    const result = formatCurrency(300);
    expect(result).toContain('300');
    expect(result).toContain('Bs');
  });

  it('debe formatear con decimales', () => {
    const result = formatCurrency(300.5);
    expect(result).toContain('300');
    expect(result).toContain('50');
  });

  it('debe formatear cero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toContain('00');
  });

  it('debe formatear números grandes', () => {
    const result = formatCurrency(1000000);
    expect(result).toMatch(/1\.000\.000|1,000,000/);
  });

  it('debe aceptar moneda personalizada', () => {
    const result = formatCurrency(100, 'USD');
    expect(result).toContain('100');
  });

  it('debe ser una función', () => {
    expect(typeof formatCurrency).toBe('function');
  });
});

describe('formatShortDate', () => {
  it('debe formatear fecha corta con año', () => {
    const result = formatShortDate('2026-01-15T12:00:00');
    expect(result).toContain('2026');
    expect(result).toContain('01');
  });

  it('debe contener separadores de fecha', () => {
    const result = formatShortDate('2026-06-15T12:00:00');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('formatDateTime', () => {
  it('debe formatear fecha y hora', () => {
    const result = formatDateTime('2026-01-15T14:30:00');
    expect(result).toContain('2026');
    expect(result).toContain('15');
  });

  it('debe contener información de hora', () => {
    const result = formatDateTime('2026-01-15T14:30:00');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});