-- =====================================================================
-- 44 - MULTI-GIMNASIO: EMPRESAS (CLIENTES) Y SEDES — ESTRUCTURA
-- ---------------------------------------------------------------------
-- Plataforma -> Empresa (organizations) -> Sedes (gyms)
--  * Por empresa: socios, planes, facturas, pagos, asistencia, tasas BCV,
--    staff, ejercicios propios y rutinas.
--  * Por sede: gyms.organization_id; asistencia y pagos guardan la sede
--    donde se registraron (gym_id); el socio tiene una sede principal.
--  * staff_branches: sedes en las que trabaja cada empleado.
--  * Rol nuevo "Dueño" (ve y gestiona toda su empresa).
--  * Los datos actuales pasan a la empresa "Lagunetica", sede Los Teques.
-- La separación de datos (RLS) está en la migración 45.
-- =====================================================================

-- 1. Empresas -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  legal_name    text,
  rif           text,
  email         text,
  phone         text,
  logo_url      text,
  status        text NOT NULL DEFAULT 'Activa' CHECK (status IN ('Activa', 'Suspendida', 'Cancelada')),
  subscription_plan text NOT NULL DEFAULT 'Básico',
  max_branches  int  NOT NULL DEFAULT 1 CHECK (max_branches >= 1),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Columnas de empresa / sede ----------------------------------------------
ALTER TABLE public.gyms             ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.staff            ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.users            ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.plans            ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.invoices         ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.payments         ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.attendance       ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.exchange_rates   ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.exercises        ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.routine_templates ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Sede donde se registró
ALTER TABLE public.payments   ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);

-- 3. Sedes de cada empleado ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_branches (
  staff_id   uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  gym_id     uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_id, gym_id)
);
ALTER TABLE public.staff_branches ENABLE ROW LEVEL SECURITY;

-- 4. Rol Dueño -----------------------------------------------------------------
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE public.staff ADD CONSTRAINT staff_role_check
  CHECK (role = ANY (ARRAY['Dueño', 'Administrador', 'Entrenador', 'Recepción']));

-- 5. Datos actuales -> Lagunetica / Los Teques -----------------------------------
INSERT INTO public.organizations (id, name, subscription_plan, max_branches)
VALUES ('00000000-0000-4000-a000-000000000001', 'Lagunetica', 'Básico', 1)
ON CONFLICT (id) DO NOTHING;

UPDATE public.gyms SET organization_id = '00000000-0000-4000-a000-000000000001' WHERE organization_id IS NULL;

DO $$
DECLARE
  v_org uuid := '00000000-0000-4000-a000-000000000001';
  v_gym uuid := (SELECT id FROM gyms WHERE organization_id = '00000000-0000-4000-a000-000000000001' ORDER BY created_at LIMIT 1);
BEGIN
  UPDATE staff            SET organization_id = v_org WHERE organization_id IS NULL;
  UPDATE staff            SET gym_id = v_gym WHERE gym_id IS NULL;
  UPDATE users            SET organization_id = v_org WHERE organization_id IS NULL;
  UPDATE users            SET gym_id = v_gym WHERE gym_id IS NULL;
  UPDATE plans            SET organization_id = v_org WHERE organization_id IS NULL;
  UPDATE invoices         SET organization_id = v_org WHERE organization_id IS NULL;
  UPDATE payments         SET organization_id = v_org WHERE organization_id IS NULL;
  UPDATE payments         SET gym_id = v_gym WHERE gym_id IS NULL;
  UPDATE attendance       SET organization_id = v_org WHERE organization_id IS NULL;
  UPDATE attendance       SET gym_id = v_gym WHERE gym_id IS NULL;
  UPDATE exchange_rates   SET organization_id = v_org WHERE organization_id IS NULL;
  UPDATE exercises        SET organization_id = v_org WHERE organization_id IS NULL;
  UPDATE routine_templates SET organization_id = v_org WHERE organization_id IS NULL;
  INSERT INTO staff_branches (staff_id, gym_id)
    SELECT id, gym_id FROM staff WHERE gym_id IS NOT NULL
    ON CONFLICT DO NOTHING;
END $$;

-- Obligatorio en las tablas principales
ALTER TABLE public.gyms           ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.staff          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.users          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.plans          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.invoices       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.payments       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.attendance     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.exchange_rates ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS users_org_idx       ON public.users (organization_id);
CREATE INDEX IF NOT EXISTS invoices_org_idx    ON public.invoices (organization_id);
CREATE INDEX IF NOT EXISTS payments_org_idx    ON public.payments (organization_id, date);
CREATE INDEX IF NOT EXISTS attendance_org_idx  ON public.attendance (organization_id, date);
CREATE INDEX IF NOT EXISTS plans_org_idx       ON public.plans (organization_id);
CREATE INDEX IF NOT EXISTS staff_org_idx       ON public.staff (organization_id);

-- 6. Unicidad por empresa (dos gimnasios pueden tener el mismo socio o plan)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_cedula_key;
ALTER TABLE public.users ADD CONSTRAINT users_org_cedula_key UNIQUE (organization_id, cedula);
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_name_key;
ALTER TABLE public.plans ADD CONSTRAINT plans_org_name_key UNIQUE (organization_id, name);
ALTER TABLE public.exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_rate_date_key;
ALTER TABLE public.exchange_rates ADD CONSTRAINT exchange_rates_org_date_key UNIQUE (organization_id, rate_date);

-- 7. Funciones de contexto (quién soy, de qué empresa, qué sedes) ------------------
CREATE OR REPLACE FUNCTION public.my_staff_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT organization_id FROM staff WHERE auth_user_id = auth.uid() AND status = 'Activo' LIMIT 1
$$;

-- Empresa del usuario actual (empleado o socio). Todas las reglas de acceso usan esto.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM staff WHERE auth_user_id = auth.uid() AND status = 'Activo' LIMIT 1),
    (SELECT organization_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
  )
$$;

-- Sede principal del empleado actual (para sellar asistencia y pagos)
CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT gym_id FROM staff WHERE auth_user_id = auth.uid() AND status = 'Activo' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_branch_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT sb.gym_id FROM staff_branches sb JOIN staff s ON s.id = sb.staff_id
  WHERE s.auth_user_id = auth.uid() AND s.status = 'Activo'
$$;

-- ¿El socio pertenece a mi empresa?
CREATE OR REPLACE FUNCTION public.user_in_my_org(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND organization_id = current_org_id())
$$;

CREATE OR REPLACE FUNCTION public.session_in_my_org(p_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM workout_sessions ws JOIN users u ON u.id = ws.user_id
    WHERE ws.id = p_session_id AND u.organization_id = current_org_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.routine_in_my_org(p_routine_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM routine_templates WHERE id = p_routine_id AND organization_id = current_org_id())
$$;

-- Roles (el Dueño tiene todos los permisos de su empresa)
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND role IN ('Dueño', 'Administrador'))
$$;

CREATE OR REPLACE FUNCTION public.is_staff_reception()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND role IN ('Dueño', 'Administrador', 'Recepción'))
$$;

CREATE OR REPLACE FUNCTION public.is_staff_trainer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND role IN ('Dueño', 'Administrador', 'Entrenador'))
$$;

CREATE OR REPLACE FUNCTION public.is_staff_owner_or_admin(owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND (role IN ('Dueño', 'Administrador') OR id = owner_id))
$$;

-- 8. Completar empresa y sede al insertar (la app no tiene que enviarlas) ------------
-- Tablas "de la empresa": toman la empresa del usuario que inserta
CREATE OR REPLACE FUNCTION public.trg_set_org_from_actor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := current_org_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Tablas "del socio": toman la empresa del socio
CREATE OR REPLACE FUNCTION public.trg_set_org_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM users WHERE id = NEW.user_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := current_org_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Asistencia y pagos: además la sede (la del empleado; si no, la del socio)
CREATE OR REPLACE FUNCTION public.trg_set_org_and_branch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_org uuid;
  v_gym uuid;
BEGIN
  IF NEW.organization_id IS NULL OR NEW.gym_id IS NULL THEN
    SELECT organization_id, gym_id INTO v_org, v_gym FROM users WHERE id = NEW.user_id;
    NEW.organization_id := COALESCE(NEW.organization_id, v_org, current_org_id());
    NEW.gym_id := COALESCE(NEW.gym_id, current_gym_id(), v_gym);
  END IF;
  RETURN NEW;
END;
$$;

-- Socios: empresa y sede principal del empleado que lo registra.
-- Auto-registro desde la app (sin empleado): por ahora la primera empresa;
-- en la fase de la app de socios se elegirá el gimnasio al registrarse.
CREATE OR REPLACE FUNCTION public.trg_users_set_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(current_org_id(), (SELECT id FROM organizations ORDER BY created_at LIMIT 1));
  END IF;
  IF NEW.gym_id IS NULL THEN
    NEW.gym_id := COALESCE(current_gym_id(),
      (SELECT id FROM gyms WHERE organization_id = NEW.organization_id AND is_active ORDER BY created_at LIMIT 1));
  END IF;
  RETURN NEW;
END;
$$;

-- Empleados: empresa de quien lo crea (o de su sede)
CREATE OR REPLACE FUNCTION public.trg_staff_set_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM gyms WHERE id = NEW.gym_id),
      my_staff_org());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_staff_default_branch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.gym_id IS NOT NULL THEN
    INSERT INTO staff_branches (staff_id, gym_id) VALUES (NEW.id, NEW.gym_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Sedes: límite de sedes según el plan de la empresa
CREATE OR REPLACE FUNCTION public.trg_gyms_branch_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_max int;
  v_count int;
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := current_org_id();
  END IF;
  SELECT max_branches INTO v_max FROM organizations WHERE id = NEW.organization_id;
  SELECT count(*) INTO v_count FROM gyms WHERE organization_id = NEW.organization_id AND is_active;
  IF COALESCE(NEW.is_active, true) AND v_count >= COALESCE(v_max, 1) THEN
    RAISE EXCEPTION 'Tu plan permite % sede(s). Contacta a soporte para ampliarlo.', COALESCE(v_max, 1);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER users_set_org       BEFORE INSERT ON public.users          FOR EACH ROW EXECUTE FUNCTION trg_users_set_org();
CREATE OR REPLACE TRIGGER staff_set_org       BEFORE INSERT ON public.staff          FOR EACH ROW EXECUTE FUNCTION trg_staff_set_org();
CREATE OR REPLACE TRIGGER staff_default_branch AFTER INSERT ON public.staff          FOR EACH ROW EXECUTE FUNCTION trg_staff_default_branch();
CREATE OR REPLACE TRIGGER gyms_branch_limit   BEFORE INSERT ON public.gyms           FOR EACH ROW EXECUTE FUNCTION trg_gyms_branch_limit();
CREATE OR REPLACE TRIGGER plans_set_org       BEFORE INSERT ON public.plans          FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_actor();
CREATE OR REPLACE TRIGGER rates_set_org       BEFORE INSERT ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_actor();
CREATE OR REPLACE TRIGGER exercises_set_org   BEFORE INSERT ON public.exercises      FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_actor();
CREATE OR REPLACE TRIGGER routines_set_org    BEFORE INSERT ON public.routine_templates FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_actor();
CREATE OR REPLACE TRIGGER invoices_set_org    BEFORE INSERT ON public.invoices       FOR EACH ROW EXECUTE FUNCTION trg_set_org_from_user();
CREATE OR REPLACE TRIGGER payments_set_org    BEFORE INSERT ON public.payments       FOR EACH ROW EXECUTE FUNCTION trg_set_org_and_branch();
CREATE OR REPLACE TRIGGER attendance_set_org  BEFORE INSERT ON public.attendance     FOR EACH ROW EXECUTE FUNCTION trg_set_org_and_branch();
