-- =====================================================================
-- 41 - ELIMINAR SOCIO (Recepción y Administración)
-- ---------------------------------------------------------------------
-- * delete_member(): borra al socio con sus facturas, asistencia, progreso
--   y rutinas, PERO conserva sus pagos para que los reportes de ingresos y
--   los cierres de caja no cambien (quedan con el nombre guardado).
-- * Permiso: Administrador, super admin, o un rol con "Eliminar" en
--   /usuarios (se habilita para Recepción).
-- * Borra también su cuenta de acceso a la app (si la activó), para que el
--   email se pueda volver a usar.
-- No modifica políticas RLS: el borrado pasa por esta función.
-- =====================================================================

-- 1. Los pagos sobreviven al socio ------------------------------------
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS member_name text;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Recepción puede eliminar socios ----------------------------------
UPDATE public.role_module_permissions
SET can_delete = true, updated_at = now()
WHERE role = 'Recepción' AND module_path = '/usuarios';

-- 3. Función -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_member(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff   staff%ROWTYPE;
  u         users%ROWTYPE;
  v_kept    int;
BEGIN
  SELECT * INTO v_staff FROM staff WHERE auth_user_id = auth.uid();
  IF NOT FOUND OR NOT (
       COALESCE(v_staff.is_super_admin, false)
    OR v_staff.role IN ('Dueño', 'Administrador')
    OR EXISTS (SELECT 1 FROM role_module_permissions
               WHERE role = v_staff.role AND module_path = '/usuarios' AND can_delete)
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar socios';
  END IF;

  SELECT * INTO u FROM users WHERE id = p_user_id AND organization_id = v_staff.organization_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Socio no encontrado';
  END IF;

  -- Conservar los pagos: guardar el nombre y desligarlos de las facturas
  -- (al borrar una factura, su trigger borraría el pago enlazado).
  UPDATE payments SET member_name = u.name WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_kept = ROW_COUNT;
  UPDATE invoices SET payment_id = NULL WHERE user_id = p_user_id AND payment_id IS NOT NULL;

  -- Rutinas que haya creado el socio quedan sin autor
  UPDATE routine_templates SET created_by_user = NULL WHERE created_by_user = p_user_id;

  DELETE FROM users WHERE id = p_user_id;

  -- Cuenta de acceso a la app (nunca la de un empleado)
  IF u.auth_user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM staff WHERE auth_user_id = u.auth_user_id) THEN
    DELETE FROM auth.users WHERE id = u.auth_user_id;
  END IF;

  RETURN jsonb_build_object('deleted', true, 'name', u.name, 'payments_kept', v_kept);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.delete_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_member(uuid) TO authenticated;
