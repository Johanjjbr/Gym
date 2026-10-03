-- =====================================================================
-- 47 - MULTI-GIMNASIO: CANDADOS
-- ---------------------------------------------------------------------
--  * Nadie (salvo el sistema / súper admin) puede mover un registro a
--    otra empresa cambiando organization_id.
--  * Solo un Dueño (o el súper admin) puede nombrar a otro Dueño.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trg_lock_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     AND coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND is_super_admin AND status = 'Activo') THEN
    RAISE EXCEPTION 'No se puede cambiar la empresa de un registro';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER lock_organization BEFORE UPDATE OF organization_id ON public.users
  FOR EACH ROW EXECUTE FUNCTION trg_lock_organization();
CREATE OR REPLACE TRIGGER lock_organization BEFORE UPDATE OF organization_id ON public.staff
  FOR EACH ROW EXECUTE FUNCTION trg_lock_organization();
CREATE OR REPLACE TRIGGER lock_organization BEFORE UPDATE OF organization_id ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION trg_lock_organization();
CREATE OR REPLACE TRIGGER lock_organization BEFORE UPDATE OF organization_id ON public.plans
  FOR EACH ROW EXECUTE FUNCTION trg_lock_organization();
CREATE OR REPLACE TRIGGER lock_organization BEFORE UPDATE OF organization_id ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION trg_lock_organization();
CREATE OR REPLACE TRIGGER lock_organization BEFORE UPDATE OF organization_id ON public.payments
  FOR EACH ROW EXECUTE FUNCTION trg_lock_organization();
CREATE OR REPLACE TRIGGER lock_organization BEFORE UPDATE OF organization_id ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION trg_lock_organization();
CREATE OR REPLACE TRIGGER lock_organization BEFORE UPDATE OF organization_id ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION trg_lock_organization();

CREATE OR REPLACE FUNCTION public.trg_staff_owner_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.role = 'Dueño'
     AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'Dueño')
     AND coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM staff
       WHERE auth_user_id = auth.uid() AND status = 'Activo' AND (role = 'Dueño' OR is_super_admin)
     ) THEN
    RAISE EXCEPTION 'Solo el Dueño puede nombrar a otro Dueño';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER staff_owner_role BEFORE INSERT OR UPDATE OF role ON public.staff
  FOR EACH ROW EXECUTE FUNCTION trg_staff_owner_role();
