import { describe, expect, it } from 'vitest';
import { hasGuardian, isMinor, missingGuardian } from './minors';

const today = '2026-10-16';
const guardian = { guardian_name: 'Ana Pérez', guardian_cedula: '12345678', guardian_phone: '0414-1234567', guardian_relationship: 'Madre' };

describe('isMinor', () => {
  it('menor de 18 años', () => expect(isMinor('2010-01-01', today)).toBe(true));
  it('cumple 18 hoy: ya es adulto', () => expect(isMinor('2008-10-16', today)).toBe(false));
  it('cumple 18 mañana: todavía menor', () => expect(isMinor('2008-10-17', today)).toBe(true));
  it('acepta DD/MM/AAAA', () => expect(isMinor('17/10/2008', today)).toBe(true));
  it('sin fecha o inválida: no se sabe', () => {
    expect(isMinor(null, today)).toBeNull();
    expect(isMinor('', today)).toBeNull();
    expect(isMinor('abc', today)).toBeNull();
  });
});

describe('representante', () => {
  it('completo solo con los 4 datos', () => {
    expect(hasGuardian(guardian)).toBe(true);
    expect(hasGuardian({ ...guardian, guardian_phone: ' ' })).toBe(false);
  });
  it('avisa solo si es menor y le falta', () => {
    expect(missingGuardian({ birth_date: '2012-05-01' }, today)).toBe(true);
    expect(missingGuardian({ birth_date: '2012-05-01', ...guardian }, today)).toBe(false);
    expect(missingGuardian({ birth_date: '1990-05-01' }, today)).toBe(false);
    expect(missingGuardian({ birth_date: null }, today)).toBe(false);
  });
});
