import { describe, expect, it } from 'vitest';
import { buildPermissionMap, canAccessPath, findPermission } from './permissions';
import type { ModulePermission } from '../types';

let n = 0;
const perm = (role: ModulePermission['role'], module_path: string, can_view: boolean, extra: Partial<ModulePermission> = {}): ModulePermission => ({
  id: `p${++n}`,
  role,
  module_path,
  can_view,
  can_create: false,
  can_edit: false,
  can_delete: false,
  gym_id: null,
  created_at: '2026-09-25',
  updated_at: '2026-09-25',
  ...extra,
});

describe('buildPermissionMap', () => {
  it('ignora filas de otros roles (antes el super admin recibía las de todos)', () => {
    const map = buildPermissionMap(
      [perm('Recepción', '/gimnasios', false), perm('Administrador', '/gimnasios', true)],
      'Administrador',
    );
    expect(map.get('/gimnasios')?.can_view).toBe(true);
  });

  it('con duplicados elige siempre el más reciente, sin importar el orden de llegada', () => {
    const viejo = perm('Recepción', '/planes', false, { updated_at: '2026-09-27' });
    const nuevo = perm('Recepción', '/planes', true, { updated_at: '2026-09-28' });
    expect(buildPermissionMap([viejo, nuevo], 'Recepción').get('/planes')?.can_view).toBe(true);
    expect(buildPermissionMap([nuevo, viejo], 'Recepción').get('/planes')?.can_view).toBe(true);
  });

  it('el permiso específico del gimnasio gana al global', () => {
    const global = perm('Recepción', '/planes', false, { updated_at: '2026-09-30' });
    const delGym = perm('Recepción', '/planes', true, { gym_id: 'g1', updated_at: '2026-09-01' });
    expect(buildPermissionMap([global, delGym], 'Recepción').get('/planes')?.can_view).toBe(true);
  });
});

describe('findPermission / canAccessPath', () => {
  const map = buildPermissionMap(
    [
      perm('Administrador', '/', true),
      perm('Administrador', '/usuarios', true),
      perm('Administrador', '/rutinas', true),
      perm('Administrador', '/rutinas/:id/editar', false),
    ],
    'Administrador',
  );

  it('coincidencia exacta e ignora "/" final y query string', () => {
    expect(canAccessPath(map, '/usuarios/')).toBe(true);
    expect(canAccessPath(map, '/usuarios?tab=1')).toBe(true);
  });

  it('rutas con parámetros usan el patrón de la tabla', () => {
    expect(findPermission(map, '/rutinas/42/editar')?.module_path).toBe('/rutinas/:id/editar');
    expect(canAccessPath(map, '/rutinas/42/editar')).toBe(false);
  });

  it('una ruta hija hereda del módulo padre', () => {
    expect(canAccessPath(map, '/usuarios/123')).toBe(true);
  });

  it('el Dashboard "/" no da acceso a módulos sin permiso', () => {
    expect(canAccessPath(map, '/personal')).toBe(false);
  });

  it('sin permisos cargados, se deniega', () => {
    expect(canAccessPath(new Map(), '/')).toBe(false);
  });

  it('el super admin accede a todo', () => {
    expect(canAccessPath(new Map(), '/personal', 'delete', true)).toBe(true);
  });

  it('respeta la acción pedida', () => {
    const m = buildPermissionMap([perm('Recepción', '/gimnasios', true, { can_edit: false })], 'Recepción');
    expect(canAccessPath(m, '/gimnasios', 'view')).toBe(true);
    expect(canAccessPath(m, '/gimnasios', 'edit')).toBe(false);
  });
});
