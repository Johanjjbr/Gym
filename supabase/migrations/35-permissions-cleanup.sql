-- =====================================================================
-- 35 - LIMPIEZA DE PERMISOS POR MÓDULO
-- ---------------------------------------------------------------------
-- Problema: UNIQUE (role, module_path, gym_id) no impide duplicados cuando
-- gym_id es NULL (en Postgres, NULL <> NULL). Cada "Guardar" en Admin Permisos
-- insertaba una fila nueva en vez de actualizar, y quedaron filas
-- contradictorias (p. ej. Administrador "/" con Ver = true y Ver = false).
-- get_my_module_permissions() devolvía cualquiera de ellas, al azar.
--
-- No toca políticas RLS.
-- =====================================================================

-- 1. Quitar duplicados (decisiones explícitas)
DELETE FROM role_module_permissions
WHERE gym_id IS NULL AND id IN (
  '8dd277b2-9917-4548-a66f-24d997405785', -- Administrador "/"      Ver = false (contradictoria)
  '4022b75c-d17d-47b0-8c0a-62fa5557d52e', -- Administrador "/"      copia idéntica
  '7eac72d2-3a96-4d71-ad76-83e46341fa11', -- Recepción /gimnasios   Ver = true  -> queda Ver = false
  'edd52774-e746-4500-92eb-26e945a6affc'  -- Recepción /planes      Ver = false -> queda Ver = true
);

-- Red de seguridad: si quedara algún otro duplicado, conservar el más reciente
DELETE FROM role_module_permissions a
USING role_module_permissions b
WHERE a.role = b.role
  AND a.module_path = b.module_path
  AND a.gym_id IS NOT DISTINCT FROM b.gym_id
  AND (a.updated_at, a.id) < (b.updated_at, b.id);

-- 2. Unicidad real: NULLS NOT DISTINCT (Postgres 15+) hace que dos permisos
--    globales (gym_id NULL) del mismo rol y módulo choquen, y que
--    upsert(onConflict: 'role,module_path,gym_id') actualice en vez de duplicar.
ALTER TABLE role_module_permissions
  DROP CONSTRAINT IF EXISTS role_module_permissions_role_module_path_gym_id_key;
ALTER TABLE role_module_permissions
  ADD CONSTRAINT role_module_permissions_role_module_path_gym_id_key
  UNIQUE NULLS NOT DISTINCT (role, module_path, gym_id);

-- 3. Permisos del usuario actual: siempre los de SU rol, en orden determinista.
--    Antes, para el super admin devolvía las filas de TODOS los roles y el
--    frontend se quedaba con la primera que llegara (a veces la de otro rol).
--    El acceso total del super admin se resuelve en el frontend (is_super_admin)
--    y en has_module_permission(), que no cambia.
CREATE OR REPLACE FUNCTION get_my_module_permissions()
RETURNS SETOF role_module_permissions
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role   text;
  v_gym_id uuid;
BEGIN
  SELECT s.role, s.gym_id INTO v_role, v_gym_id
  FROM staff s
  WHERE s.auth_user_id = auth.uid() AND s.status = 'Activo'
  LIMIT 1;

  IF v_role IS NULL THEN
    SELECT 'Usuario', u.gym_id INTO v_role, v_gym_id
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_role IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (p.module_path) p.*
  FROM role_module_permissions p
  WHERE p.role = v_role
    AND (p.gym_id = v_gym_id OR p.gym_id IS NULL)
  ORDER BY p.module_path, (p.gym_id IS NULL), p.updated_at DESC;
END;
$$;
