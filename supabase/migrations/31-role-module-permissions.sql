-- =============================================
-- Migration 31: Permisos de módulos por rol
-- =============================================

-- 1. Tabla de permisos de módulos por rol
CREATE TABLE IF NOT EXISTS role_module_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('Administrador', 'Entrenador', 'Recepción', 'Usuario')),
  module_path TEXT NOT NULL,           
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role, module_path, gym_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_role ON role_module_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_gym_id ON role_module_permissions(gym_id);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module_path ON role_module_permissions(module_path);

-- RLS
ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;

-- Solo super admin puede gestionar permisos globalmente
CREATE POLICY "Super admin acceso total a permisos"
  ON role_module_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE auth_user_id = auth.uid() 
      AND is_super_admin = true 
      AND status = 'Activo'
    )
  );

-- Admins pueden ver/gestionar permisos de sus gyms asignados
CREATE POLICY "Admins pueden gestionar permisos de sus gyms"
  ON role_module_permissions FOR ALL
  USING (
    gym_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM admin_gyms ag
      JOIN staff s ON s.id = ag.staff_id
      WHERE s.auth_user_id = auth.uid() 
      AND s.status = 'Activo'
      AND ag.gym_id = role_module_permissions.gym_id
    )
  );

-- Cualquier staff puede ver permisos (para filtrar sidebar)
CREATE POLICY "Staff puede ver permisos"
  ON role_module_permissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND status = 'Activo')
    OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid())
  );

-- 2. Trigger para updated_at
CREATE TRIGGER update_role_module_permissions_updated_at 
BEFORE UPDATE ON role_module_permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Seed inicial de permisos (basado en lógica actual de Sidebar.tsx)
-- Módulos definidos por las rutas existentes en routes.ts

-- Administrador: acceso total a todos los módulos (global, gym_id = NULL)
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id) VALUES
  ('Administrador', '/', true, true, true, true, NULL),
  ('Administrador', '/usuarios', true, true, true, true, NULL),
  ('Administrador', '/facturas', true, true, true, true, NULL),
  ('Administrador', '/planes', true, true, true, true, NULL),
  ('Administrador', '/personal', true, true, true, true, NULL),
  ('Administrador', '/gimnasios', true, true, true, true, NULL),
  ('Administrador', '/asistencia', true, true, true, true, NULL),
  ('Administrador', '/rutinas', true, true, true, true, NULL),
  ('Administrador', '/ejercicios', true, true, true, true, NULL),
  ('Administrador', '/mi-entrenamiento', true, true, true, true, NULL),
  ('Administrador', '/reportes', true, true, true, true, NULL),
  ('Administrador', '/admin/permisos', true, true, true, true, NULL)
ON CONFLICT (role, module_path, gym_id) DO NOTHING;

-- Entrenador: solo módulos de entrenamiento
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id) VALUES
  ('Entrenador', '/rutinas', true, true, true, false, NULL),
  ('Entrenador', '/ejercicios', true, true, true, false, NULL),
  ('Entrenador', '/mi-entrenamiento', true, false, false, false, NULL)
ON CONFLICT (role, module_path, gym_id) DO NOTHING;

-- Recepción: gestión de usuarios, facturas, asistencia, planes
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id) VALUES
  ('Recepción', '/usuarios', true, true, true, false, NULL),
  ('Recepción', '/facturas', true, true, true, false, NULL),
  ('Recepción', '/planes', true, false, true, false, NULL),
  ('Recepción', '/asistencia', true, true, true, false, NULL)
ON CONFLICT (role, module_path, gym_id) DO NOTHING;

-- Usuario: solo sus rutas bajo /usuario/*
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id) VALUES
  ('Usuario', '/usuario/mi-entrenamiento', true, false, false, false, NULL),
  ('Usuario', '/usuario/rutinas', true, false, false, false, NULL),
  ('Usuario', '/usuario/rutinas/crear', true, true, false, false, NULL),
  ('Usuario', '/usuario/mi-perfil', true, false, true, false, NULL),
  ('Usuario', '/usuario/progreso', true, false, false, false, NULL),
  ('Usuario', '/usuario/asistencia', true, false, false, false, NULL),
  ('Usuario', '/usuario/facturas', true, false, false, false, NULL),
  ('Usuario', '/usuario/valorar-gimnasio', true, true, false, false, NULL)
ON CONFLICT (role, module_path, gym_id) DO NOTHING;

-- 4. Función helper para verificar permiso de módulo
CREATE OR REPLACE FUNCTION public.has_module_permission(p_module_path TEXT, p_action TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    v_role TEXT;
    v_gym_id UUID;
    v_is_super_admin BOOLEAN;
    v_result BOOLEAN;
  BEGIN
    -- Obtener rol y gym_id del staff actual
    SELECT s.role, s.gym_id, s.is_super_admin
    INTO v_role, v_gym_id, v_is_super_admin
    FROM staff s
    WHERE s.auth_user_id = auth.uid() AND s.status = 'Activo'
    LIMIT 1;

    -- Si no es staff, verificar si es usuario regular
    IF v_role IS NULL THEN
      SELECT 'Usuario', u.gym_id, false
      INTO v_role, v_gym_id, v_is_super_admin
      FROM users u
      WHERE u.auth_user_id = auth.uid()
      LIMIT 1;
    END IF;

    -- Si super admin, acceso total
    IF v_is_super_admin THEN
      RETURN true;
    END IF;

    -- Buscar permiso específico (primero por gym, luego global)
    SELECT 
      CASE p_action
        WHEN 'view' THEN can_view
        WHEN 'create' THEN can_create
        WHEN 'edit' THEN can_edit
        WHEN 'delete' THEN can_delete
        ELSE false
      END
    INTO v_result
    FROM role_module_permissions
    WHERE role = v_role
      AND module_path = p_module_path
      AND (gym_id = v_gym_id OR gym_id IS NULL)
    ORDER BY gym_id DESC NULLS LAST
    LIMIT 1;

    RETURN COALESCE(v_result, false);
  END;
$$;

-- 5. Función para obtener todos los permisos del rol actual
CREATE OR REPLACE FUNCTION public.get_my_module_permissions()
RETURNS SETOF role_module_permissions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    v_role TEXT;
    v_gym_id UUID;
    v_is_super_admin BOOLEAN;
  BEGIN
    SELECT s.role, s.gym_id, s.is_super_admin
    INTO v_role, v_gym_id, v_is_super_admin
    FROM staff s
    WHERE s.auth_user_id = auth.uid() AND s.status = 'Activo'
    LIMIT 1;

    IF v_role IS NULL THEN
      SELECT 'Usuario', u.gym_id, false
      INTO v_role, v_gym_id, v_is_super_admin
      FROM users u
      WHERE u.auth_user_id = auth.uid()
      LIMIT 1;
    END IF;

    IF v_is_super_admin THEN
      RETURN QUERY SELECT * FROM role_module_permissions WHERE gym_id IS NULL;
    ELSE
      RETURN QUERY 
      SELECT DISTINCT ON (module_path) * 
      FROM role_module_permissions
      WHERE role = v_role
        AND (gym_id = v_gym_id OR gym_id IS NULL)
      ORDER BY module_path, gym_id DESC NULLS LAST;
    END IF;
  END;
$$;