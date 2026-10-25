-- =============================================================================
-- 60 · Reportes mensuales
-- -----------------------------------------------------------------------------
--   · member_status_history: cada alta y cada cambio de estado de un socio
--     (Activo / Inactivo / Suspendido). Lo llena un disparador; nadie lo edita.
--     Permite el reporte de altas, bajas y suspensiones del mes a partir de hoy.
--   · Acceso a /reportes: Dueño, Administrador y Recepción (no Entrenador).
-- Sin DROP de tablas ni DELETE de datos. Se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Historial de estados ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  member_name     text,
  organization_id uuid REFERENCES public.organizations(id),
  gym_id          uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  old_status      text,            -- NULL = alta (socio nuevo)
  new_status      text NOT NULL,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  changed_by      uuid             -- auth.uid() de quien hizo el cambio (NULL = sistema)
);

CREATE INDEX IF NOT EXISTS member_status_history_org_idx ON public.member_status_history (organization_id, changed_at);
CREATE INDEX IF NOT EXISTS member_status_history_user_idx ON public.member_status_history (user_id, changed_at);

ALTER TABLE public.member_status_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member_status_history' AND policyname = 'Personal ve el historial de su empresa') THEN
    CREATE POLICY "Personal ve el historial de su empresa" ON public.member_status_history FOR SELECT
      USING (is_staff_any() AND organization_id = current_org_id());
  END IF;
END $$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.member_status_history FROM anon, authenticated;
GRANT SELECT ON public.member_status_history TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_users_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo socios de un gimnasio (los independientes no tienen estado de membresía)
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO member_status_history (user_id, member_name, organization_id, gym_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NEW.name, NEW.organization_id, NEW.gym_id,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
            NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_users_status_history() FROM public, anon, authenticated;

CREATE OR REPLACE TRIGGER users_status_history
  AFTER INSERT OR UPDATE OF status ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_users_status_history();

-- 2. Acceso a Reportes -----------------------------------------------------------------
UPDATE public.role_module_permissions
   SET can_view = true, updated_at = now()
 WHERE role = 'Recepción' AND module_path = '/reportes' AND gym_id IS NULL;

INSERT INTO public.role_module_permissions (role, module_path, can_view, gym_id)
SELECT 'Recepción', '/reportes', true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_module_permissions WHERE role = 'Recepción' AND module_path = '/reportes' AND gym_id IS NULL
);

UPDATE public.role_module_permissions
   SET can_view = false, updated_at = now()
 WHERE role = 'Entrenador' AND module_path = '/reportes';
