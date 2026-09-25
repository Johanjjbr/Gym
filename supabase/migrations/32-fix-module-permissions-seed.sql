-- =============================================
-- Migration 32: Corregir seed de permisos de módulos
-- Sincroniza con routes.ts real y corrige inconsistencias
-- =============================================

-- 1. Limpiar permisos antiguos incorrectos
DELETE FROM role_module_permissions WHERE module_path IN ('/facturas', '/planes', '/gimnasios', '/ejercicios');

-- 2. Administrador: acceso total a TODAS las rutas reales en routes.ts
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id) VALUES
  -- Rutas principales staff
  ('Administrador', '/', true, true, true, true, NULL),
  ('Administrador', '/usuarios', true, true, true, true, NULL),
  ('Administrador', '/facturacion', true, true, true, true, NULL),
  ('Administrador', '/personal', true, true, true, true, NULL),
  ('Administrador', '/asistencia', true, true, true, true, NULL),
  ('Administrador', '/rutinas', true, true, true, true, NULL),
  ('Administrador', '/rutinas/crear', true, true, true, true, NULL),
  ('Administrador', '/rutinas/:id/editar', true, true, true, true, NULL),
  ('Administrador', '/mi-entrenamiento', true, true, true, true, NULL),
  ('Administrador', '/reportes', true, true, true, true, NULL),
  ('Administrador', '/admin/permisos', true, true, true, true, NULL),
  -- Rutas de usuario (Admin también accede)
  ('Administrador', '/usuario/mi-entrenamiento', true, true, true, true, NULL),
  ('Administrador', '/usuario/rutinas', true, true, true, true, NULL),
  ('Administrador', '/usuario/rutinas/crear', true, true, true, true, NULL),
  ('Administrador', '/usuario/mi-perfil', true, true, true, true, NULL),
  ('Administrador', '/usuario/progreso', true, true, true, true, NULL),
  ('Administrador', '/usuario/asistencia', true, true, true, true, NULL),
  ('Administrador', '/usuario/pagos', true, true, true, true, NULL),
  ('Administrador', '/usuario/valorar-gimnasio', true, true, true, true, NULL),
  ('Administrador', '/usuario/diagnostico-rutina', true, true, true, true, NULL),
  ('Administrador', '/usuario/migrar-rutinas', true, true, true, true, NULL),
  ('Administrador', '/usuario/debug-asignaciones', true, true, true, true, NULL)
ON CONFLICT (role, module_path, gym_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- 3. Entrenador: solo módulos de entrenamiento (staff + usuario)
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id) VALUES
  -- Staff routes
  ('Entrenador', '/rutinas', true, true, true, false, NULL),
  ('Entrenador', '/rutinas/crear', true, true, true, false, NULL),
  ('Entrenador', '/rutinas/:id/editar', true, true, true, false, NULL),
  ('Entrenador', '/mi-entrenamiento', true, false, false, false, NULL),
  -- Usuario routes (para ver rutinas asignadas)
  ('Entrenador', '/usuario/rutinas', true, false, false, false, NULL),
  ('Entrenador', '/usuario/mi-entrenamiento', true, false, false, false, NULL)
ON CONFLICT (role, module_path, gym_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- 4. Recepción: gestión usuarios, facturación, asistencia
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id) VALUES
  ('Recepción', '/usuarios', true, true, true, false, NULL),
  ('Recepción', '/facturacion', true, true, true, false, NULL),
  ('Recepción', '/asistencia', true, true, true, false, NULL),
  ('Recepción', '/mi-entrenamiento', true, false, false, false, NULL)
ON CONFLICT (role, module_path, gym_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- 5. Usuario: solo sus rutas bajo /usuario/*
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id) VALUES
  ('Usuario', '/usuario/mi-entrenamiento', true, false, false, false, NULL),
  ('Usuario', '/usuario/rutinas', true, false, false, false, NULL),
  ('Usuario', '/usuario/rutinas/crear', true, true, false, false, NULL),
  ('Usuario', '/usuario/mi-perfil', true, false, true, false, NULL),
  ('Usuario', '/usuario/progreso', true, false, false, false, NULL),
  ('Usuario', '/usuario/asistencia', true, false, false, false, NULL),
  ('Usuario', '/usuario/pagos', true, false, false, false, NULL),
  ('Usuario', '/usuario/valorar-gimnasio', true, true, false, false, NULL),
  ('Usuario', '/usuario/diagnostico-rutina', true, false, false, false, NULL),
  ('Usuario', '/usuario/migrar-rutinas', true, false, false, false, NULL),
  ('Usuario', '/usuario/debug-asignaciones', true, false, false, false, NULL)
ON CONFLICT (role, module_path, gym_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

-- 6. Verificar seed final
SELECT role, module_path, can_view, can_create, can_edit, can_delete
FROM role_module_permissions
ORDER BY 
  CASE role 
    WHEN 'Administrador' THEN 1
    WHEN 'Entrenador' THEN 2
    WHEN 'Recepción' THEN 3
    WHEN 'Usuario' THEN 4
  END,
  module_path;