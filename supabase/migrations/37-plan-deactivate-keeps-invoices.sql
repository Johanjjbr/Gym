-- =====================================================================
-- 37 - DESACTIVAR UN PLAN YA NO BORRA FACTURAS
-- ---------------------------------------------------------------------
-- Desactivar un plan = dejar de ofrecerlo a socios nuevos. Los socios que
-- ya lo tienen lo siguen pagando hasta que se les cambie el plan.
-- Antes, el trigger borraba las facturas Pendientes de esos socios (que el
-- proceso nocturno volvía a generar). Se deja la función sin efecto.
-- No toca RLS.
-- =====================================================================
CREATE OR REPLACE FUNCTION trigger_stop_billing_on_plan_deactivate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_stop_billing_on_plan_deactivate() IS
  'Sin efecto desde la migración 37: desactivar un plan solo lo oculta para socios nuevos.';
