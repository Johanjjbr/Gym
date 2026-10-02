/**
 * Resolución de permisos por módulo (lógica pura, testeable).
 */
import type { ModulePermission, PermissionAction, UserRole } from '../types';

const ACTION_FIELD: Record<PermissionAction, keyof Pick<ModulePermission, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>> = {
  view: 'can_view',
  create: 'can_create',
  edit: 'can_edit',
  delete: 'can_delete',
};

/**
 * Un permiso por módulo para el rol dado. Si hubiera más de uno (duplicados),
 * gana el específico del gimnasio y luego el más reciente: siempre el mismo,
 * sin depender del orden en que lleguen las filas.
 */
export function buildPermissionMap(permissions: ModulePermission[], role: UserRole | undefined) {
  const map = new Map<string, ModulePermission>();
  for (const p of permissions) {
    if (role && p.role !== role) continue;
    const prev = map.get(p.module_path);
    if (!prev || rank(p) > rank(prev)) map.set(p.module_path, p);
  }
  return map;
}

function rank(p: ModulePermission): string {
  return `${p.gym_id ? 1 : 0}|${p.updated_at ?? ''}|${p.id}`;
}

/** ¿El patrón de la tabla ('/rutinas/:id/editar') cubre la ruta real ('/rutinas/42/editar')? */
function matchesPattern(pattern: string, path: string): boolean {
  if (!pattern.includes(':')) return false;
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  return a.length === b.length && a.every((seg, i) => seg.startsWith(':') || seg === b[i]);
}

function normalize(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

/**
 * Busca el permiso aplicable a una ruta:
 *  1. coincidencia exacta;
 *  2. patrón con parámetros (/usuarios/:id);
 *  3. el módulo padre más cercano (/usuarios/123 -> /usuarios).
 * La raíz '/' (Dashboard) NO hereda a las demás rutas.
 */
export function findPermission(map: Map<string, ModulePermission>, rawPath: string): ModulePermission | undefined {
  const path = normalize(rawPath);
  const exact = map.get(path);
  if (exact) return exact;

  for (const [pattern, perm] of map) {
    if (matchesPattern(pattern, path)) return perm;
  }

  const parts = path.split('/').filter(Boolean);
  for (let i = parts.length - 1; i > 0; i--) {
    const parent = map.get('/' + parts.slice(0, i).join('/'));
    if (parent) return parent;
  }
  return undefined;
}

export function canAccessPath(
  map: Map<string, ModulePermission>,
  path: string,
  action: PermissionAction = 'view',
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin) return true;
  const perm = findPermission(map, path);
  return perm ? perm[ACTION_FIELD[action]] === true : false;
}
