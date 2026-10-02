import { describe, expect, it } from 'vitest';
import {
  ageOn, birthDateError, cedulaError, formatPhone, maskDate, nameError, normalizeCedula, normalizeHeight,
  parseDateInput, phoneError, startDateError, toDisplayDate, suggestedFirstDue, firstDueError,
} from './memberFields';
import { userSchema } from './validations';

const TODAY = '2026-10-02';

describe('fecha de nacimiento', () => {
  it('acepta DD/MM/AAAA, AAAA-MM-DD y sin barras', () => {
    expect(parseDateInput('12/05/1990')).toBe('1990-05-12');
    expect(parseDateInput('1/5/1990')).toBe('1990-05-01');
    expect(parseDateInput('12-05-1990')).toBe('1990-05-12');
    expect(parseDateInput('12051990')).toBe('1990-05-12');
    expect(parseDateInput('1990-05-12')).toBe('1990-05-12');
  });
  it('rechaza fechas que no existen', () => {
    expect(parseDateInput('31/02/1990')).toBeNull();
    expect(parseDateInput('29/02/2023')).toBeNull();
    expect(parseDateInput('29/02/2024')).toBe('2024-02-29');
    expect(parseDateInput('12/13/1990')).toBeNull();
    expect(parseDateInput('12/05/90')).toBeNull();
  });
  it('máscara mientras se escribe', () => {
    expect(maskDate('12')).toBe('12');
    expect(maskDate('1205')).toBe('12/05');
    expect(maskDate('12051990')).toBe('12/05/1990');
    expect(maskDate('12/05/19901')).toBe('12/05/1990');
    expect(toDisplayDate('1990-05-12')).toBe('12/05/1990');
  });
  it('edad y errores (el caso real: año 1196)', () => {
    expect(ageOn('1990-10-03', TODAY)).toBe(35);
    expect(ageOn('1990-10-02', TODAY)).toBe(36);
    expect(birthDateError('', TODAY)).toBeNull();
    expect(birthDateError('28/05/1996', TODAY)).toBeNull();
    expect(birthDateError('28/05/1196', TODAY)).toBe('Revisa el año: tendría 830 años');
    expect(birthDateError('01/01/2030', TODAY)).toBe('La fecha de nacimiento no puede ser futura');
    expect(birthDateError('01/01/2024', TODAY)).toMatch(/Revisa la fecha/);
    expect(birthDateError('31/02/1990', TODAY)).toMatch(/Fecha inválida/);
  });
});

describe('cédula, teléfono, nombre', () => {
  it('cédula', () => {
    expect(normalizeCedula('V-12.345.678')).toBe('12345678');
    expect(normalizeCedula('e 81234567')).toBe('81234567');
    expect(cedulaError('V-12.345.678')).toBeNull();
    expect(cedulaError('')).toBe('La cédula es requerida');
    expect(cedulaError('123')).toMatch(/entre 5 y 10/);
    expect(cedulaError('12a45678')).toMatch(/solo lleva números/);
  });
  it('teléfono', () => {
    expect(phoneError('0412-029-84-13')).toBeNull();
    expect(phoneError('04141234567')).toBeNull();
    expect(phoneError('+58 414 1234567')).toBeNull();
    expect(phoneError('2644622855')).toBeNull(); // extranjero
    expect(phoneError('0414-123456')).toMatch(/11 dígitos/);
    expect(phoneError('01141234567')).toMatch(/04/);
    expect(phoneError('')).toBe('El teléfono es requerido');
    expect(phoneError('abc')).toMatch(/solo lleva números/);
    expect(formatPhone('0412-029-84-13')).toBe('0412-0298413');
    expect(formatPhone('+58 414 1234567')).toBe('+58 414 1234567');
  });
  it('nombre', () => {
    expect(nameError('Ana Pérez')).toBeNull();
    expect(nameError("D'Angelo O. Núñez-Rí")).toBeNull();
    expect(nameError('An')).toMatch(/nombre y apellido/);
    expect(nameError('Ana 2')).toMatch(/números/);
  });
  it('inicio y estatura', () => {
    expect(startDateError('2026-10-02', TODAY)).toBeNull();
    expect(startDateError('1026-10-02', TODAY)).toMatch(/año/);
    expect(startDateError('2027-10-02', TODAY)).toMatch(/60 días/);
    expect(normalizeHeight(1.75)).toBe(175);
    expect(normalizeHeight(175)).toBe(175);
  });
});

describe('userSchema (registro completo)', () => {
  const base = { name: '  ana   pérez ', email: ' Ana@Correo.COM ', cedula: 'V-25.123.456', phone: '04141234567', status: 'Activo', is_free_user: false, gender: '', plan_id: '' };
  it('normaliza los datos al guardar', () => {
    const r = userSchema.safeParse({ ...base, birth_date: '12/05/1990', start_date: '2026-10-02', weight: '70,5', height: '1.75' });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toMatchObject({
      name: 'ana pérez', email: 'ana@correo.com', cedula: '25123456', phone: '0414-1234567',
      birth_date: '1990-05-12', weight: 70.5, height: 175,
    });
  });
  it('campos opcionales vacíos', () => {
    const r = userSchema.safeParse({ ...base, birth_date: '', start_date: '', weight: '', height: '' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.birth_date).toBeUndefined();
  });
  it('mensajes en español para requeridos y fecha mal escrita', () => {
    const r = userSchema.safeParse({ status: 'Activo', birth_date: '28/05/1196' });
    expect(r.success).toBe(false);
    if (r.success) return;
    const msg = Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
    expect(msg).toMatchObject({
      name: 'Escribe nombre y apellido',
      email: 'El email es requerido',
      cedula: 'La cédula es requerida',
      phone: 'El teléfono es requerido',
    });
    expect(msg.birth_date).toMatch(/Revisa el año/);
  });
});

describe('próximo pago sugerido (socios migrados)', () => {
  it('por aniversario', () => {
    expect(suggestedFirstDue('2026-10-02', '2026-10-02')).toBe('2026-10-02'); // se inscribe hoy
    expect(suggestedFirstDue('2026-08-24', '2026-10-02')).toBe('2026-10-24');
    expect(suggestedFirstDue('2025-08-01', '2026-10-02')).toBe('2026-11-01');
    expect(suggestedFirstDue('2026-01-31', '2026-11-05')).toBe('2026-11-30');
    expect(suggestedFirstDue('2026-01-10', '2026-12-20')).toBe('2027-01-10');
  });
  it('validación', () => {
    expect(firstDueError('2026-10-24', '2026-10-02')).toBeNull();
    expect(firstDueError('2028-10-24', '2026-10-02')).toMatch(/Revisa/);
  });
});
