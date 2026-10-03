-- =====================================================================
-- 50 - SEDES, SUSCRIPCIÓN AL SISTEMA Y PANEL DE PLATAFORMA
-- ---------------------------------------------------------------------
-- Etapa 3: sede activa por empleado (Dueño/Admin eligen; Recepción fija),
--          límite de sedes también al reactivar, sede del staff dentro
--          de su empresa.
-- Etapa 4: planes del sistema, próximo pago de cada empresa, pagos
--          recibidos y estado de la suscripción (solo avisos).
-- Etapa 5: funciones del panel (solo súper admin) y modo soporte.
-- =====================================================================

-- ---------- Etapa 4: planes y suscripción ----------------------------

CREATE TABLE IF NOT EXISTS public.platform_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  price_usd     numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
  max_branches  int NOT NULL DEFAULT 1 CHECK (max_branches >= 1),
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver planes del sistema" ON public.platform_plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Plataforma gestiona planes" ON public.platform_plans
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

INSERT INTO public.platform_plans (name, price_usd, max_branches, description)
VALUES ('Básico', 0, 1, 'Una sede. Precio por definir en el panel.')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_id        uuid REFERENCES public.platform_plans(id),
  ADD COLUMN IF NOT EXISTS monthly_price  numeric(10,2) CHECK (monthly_price >= 0),
  ADD COLUMN IF NOT EXISTS next_due_date  date,
  ADD COLUMN IF NOT EXISTS notes          text;

UPDATE public.organizations
SET plan_id = (SELECT id FROM platform_plans WHERE name = 'Básico')
WHERE plan_id IS NULL;

CREATE TABLE IF NOT EXISTS public.platform_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount_usd       numeric(10,2) NOT NULL CHECK (amount_usd > 0),
  method           text NOT NULL,
  reference        text,
  paid_at          date NOT NULL,
  months           int NOT NULL DEFAULT 1 CHECK (months BETWEEN 1 AND 24),
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  notes            text,
  created_by       uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_payments_org_idx ON public.platform_payments (organization_id, paid_at DESC);
ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver pagos de suscripción" ON public.platform_payments
  FOR SELECT TO authenticated
  USING (is_super_admin() OR (organization_id = current_org_id() AND is_staff_admin()));
CREATE POLICY "Plataforma registra pagos" ON public.platform_payments
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());

-- Los datos de la suscripción solo los cambia la plataforma
CREATE OR REPLACE FUNCTION public.trg_org_protect_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' OR auth.uid() IS NULL OR is_super_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id
     OR NEW.monthly_price IS DISTINCT FROM OLD.monthly_price
     OR NEW.max_branches IS DISTINCT FROM OLD.max_branches
     OR NEW.next_due_date IS DISTINCT FROM OLD.next_due_date
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.notes IS DISTINCT FROM OLD.notes THEN
    RAISE EXCEPTION 'El plan y la suscripción solo los cambia el proveedor del sistema';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER org_protect_subscription BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION trg_org_protect_subscription();

/** Estado de la suscripción: al_dia | por_vencer (≤3 días) | vencida | suspendida | cancelada | sin_fecha */
CREATE OR REPLACE FUNCTION public.subscription_state(p_due date, p_status text)
RETURNS text LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN p_status = 'Cancelada' THEN 'cancelada'
    WHEN p_status = 'Suspendida' THEN 'suspendida'
    WHEN p_due IS NULL THEN 'sin_fecha'
    WHEN p_due < billing_today() THEN 'vencida'
    WHEN p_due - billing_today() <= 3 THEN 'por_vencer'
    ELSE 'al_dia'
  END
$$;

-- ---------- Etapa 5: modo soporte -------------------------------------

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS active_gym_id  uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS support_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Empresa activa: la del empleado o, si el súper admin está en modo soporte, la del cliente
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN is_super_admin AND support_org_id IS NOT NULL THEN support_org_id ELSE organization_id END
       FROM staff WHERE auth_user_id = auth.uid() AND status = 'Activo' LIMIT 1),
    (SELECT organization_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
  )
$$;

-- ---------- Etapa 3: sede activa ---------------------------------------

-- Sede con la que se registran pagos y asistencias:
-- la elegida (Dueño/Admin), si no la propia, si no la primera de la empresa.
CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT g.id FROM staff s JOIN gyms g ON g.id = s.active_gym_id
      WHERE s.auth_user_id = auth.uid() AND s.status = 'Activo'
        AND g.organization_id = current_org_id() AND g.is_active IS NOT FALSE LIMIT 1),
    (SELECT g.id FROM staff s JOIN gyms g ON g.id = s.gym_id
      WHERE s.auth_user_id = auth.uid() AND s.status = 'Activo'
        AND g.organization_id = current_org_id() LIMIT 1),
    (SELECT id FROM gyms WHERE organization_id = current_org_id() AND is_active IS NOT FALSE
      ORDER BY created_at LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.set_active_branch(p_gym_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (is_staff_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Solo el Dueño o Administración pueden cambiar de sede';
  END IF;
  IF p_gym_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM gyms WHERE id = p_gym_id AND organization_id = current_org_id() AND is_active IS NOT FALSE
  ) THEN
    RAISE EXCEPTION 'Sede no encontrada';
  END IF;
  UPDATE staff SET active_gym_id = p_gym_id WHERE auth_user_id = auth.uid();
  RETURN p_gym_id;
END;
$$;

-- Límite de sedes también al reactivar una sede
CREATE OR REPLACE FUNCTION public.trg_gyms_branch_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_max int;
  v_count int;
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := current_org_id();
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.is_active IS FALSE OR OLD.is_active IS NOT FALSE) THEN
    RETURN NEW;  -- solo importa cuando se activa una sede inactiva
  END IF;
  IF NEW.is_active IS FALSE THEN
    RETURN NEW;
  END IF;
  SELECT max_branches INTO v_max FROM organizations WHERE id = NEW.organization_id;
  SELECT count(*) INTO v_count FROM gyms
  WHERE organization_id = NEW.organization_id AND is_active IS NOT FALSE AND id <> NEW.id;
  IF v_count >= COALESCE(v_max, 1) THEN
    RAISE EXCEPTION 'Tu plan permite % sede(s). Contacta a soporte para ampliarlo.', COALESCE(v_max, 1);
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER gyms_branch_limit_update BEFORE UPDATE OF is_active ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION trg_gyms_branch_limit();

-- La sede de un empleado debe ser de su empresa; y queda registrada en staff_branches
CREATE OR REPLACE FUNCTION public.trg_staff_branch_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.gym_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM gyms WHERE id = NEW.gym_id AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'La sede no pertenece a la empresa';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.gym_id IS NOT NULL AND NEW.gym_id IS DISTINCT FROM OLD.gym_id THEN
    INSERT INTO staff_branches (staff_id, gym_id) VALUES (NEW.id, NEW.gym_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER staff_branch_check BEFORE UPDATE OF gym_id ON public.staff
  FOR EACH ROW EXECUTE FUNCTION trg_staff_branch_check();

-- ---------- Contexto de la sesión (barra lateral y avisos) -------------

CREATE OR REPLACE FUNCTION public.my_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  s       staff%ROWTYPE;
  v_org   uuid := current_org_id();
  o       organizations%ROWTYPE;
  v_plan  platform_plans%ROWTYPE;
  v_admin boolean;
BEGIN
  SELECT * INTO s FROM staff WHERE auth_user_id = auth.uid() AND status = 'Activo' LIMIT 1;
  IF NOT FOUND OR v_org IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO o FROM organizations WHERE id = v_org;
  SELECT * INTO v_plan FROM platform_plans WHERE id = o.plan_id;
  v_admin := s.role IN ('Dueño', 'Administrador') OR coalesce(s.is_super_admin, false);

  RETURN jsonb_build_object(
    'organization', jsonb_build_object(
      'id', o.id, 'name', o.name, 'legal_name', o.legal_name, 'rif', o.rif,
      'email', o.email, 'phone', o.phone, 'logo_url', o.logo_url, 'status', o.status,
      'max_branches', o.max_branches),
    'branches', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'code', g.code,
                                          'address', g.address, 'phone', g.phone) ORDER BY g.created_at)
      FROM gyms g WHERE g.organization_id = v_org AND g.is_active IS NOT FALSE), '[]'::jsonb),
    'home_gym_id', s.gym_id,
    'active_gym_id', CASE WHEN EXISTS (SELECT 1 FROM gyms WHERE id = s.active_gym_id AND organization_id = v_org)
                          THEN s.active_gym_id END,
    'current_gym_id', current_gym_id(),
    'can_choose_branch', v_admin,
    'is_super_admin', coalesce(s.is_super_admin, false),
    'support_mode', coalesce(s.is_super_admin, false) AND s.support_org_id IS NOT NULL,
    'subscription', CASE WHEN v_admin THEN jsonb_build_object(
      'plan', v_plan.name,
      'price', COALESCE(o.monthly_price, v_plan.price_usd),
      'next_due_date', o.next_due_date,
      'days_left', o.next_due_date - billing_today(),
      'state', subscription_state(o.next_due_date, o.status)) END
  );
END;
$$;

-- ---------- Etapa 5: funciones del panel (solo súper admin) ------------

CREATE OR REPLACE FUNCTION public.platform_clients()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo para la plataforma';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(c)::jsonb ORDER BY c.name)
    FROM (
      SELECT o.id, o.name, o.legal_name, o.rif, o.email, o.phone, o.status, o.notes,
             o.plan_id, p.name AS plan_name, o.monthly_price,
             COALESCE(o.monthly_price, p.price_usd) AS price,
             o.max_branches, o.next_due_date, o.created_at,
             o.next_due_date - billing_today() AS days_left,
             subscription_state(o.next_due_date, o.status) AS state,
             (SELECT count(*) FROM gyms g WHERE g.organization_id = o.id AND g.is_active IS NOT FALSE) AS branches,
             (SELECT count(*) FROM users u WHERE u.organization_id = o.id) AS members,
             (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.status = 'Activo') AS active_members,
             (SELECT count(*) FROM staff st WHERE st.organization_id = o.id) AS staff,
             (SELECT max(pp.paid_at) FROM platform_payments pp WHERE pp.organization_id = o.id) AS last_payment,
             (SELECT jsonb_build_object('name', st.name, 'email', st.email) FROM staff st
               WHERE st.organization_id = o.id AND st.role IN ('Dueño', 'Administrador')
               ORDER BY (st.role = 'Dueño') DESC, st.created_at LIMIT 1) AS owner
      FROM organizations o
      LEFT JOIN platform_plans p ON p.id = o.plan_id
    ) c), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_register_payment(
  p_org uuid, p_amount numeric, p_method text, p_reference text DEFAULT NULL,
  p_paid_at date DEFAULT NULL, p_months int DEFAULT 1, p_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  o        organizations%ROWTYPE;
  v_paid   date := COALESCE(p_paid_at, billing_today());
  v_start  date;
  v_next   date;
  v_id     uuid;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo para la plataforma';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que 0';
  END IF;
  IF p_method IS NULL OR btrim(p_method) = '' THEN
    RAISE EXCEPTION 'Indica el método de pago';
  END IF;
  IF p_months IS NULL OR p_months < 1 OR p_months > 24 THEN
    RAISE EXCEPTION 'Meses inválidos (1 a 24)';
  END IF;

  SELECT * INTO o FROM organizations WHERE id = p_org FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  -- Cubre desde el vencimiento pendiente (o desde el día del pago si no tenía fecha)
  v_start := COALESCE(o.next_due_date, v_paid);
  v_next  := (v_start + make_interval(months => p_months))::date;

  INSERT INTO platform_payments (organization_id, amount_usd, method, reference, paid_at, months,
                                 period_start, period_end, notes, created_by)
  VALUES (p_org, round(p_amount, 2), btrim(p_method), NULLIF(btrim(coalesce(p_reference, '')), ''), v_paid, p_months,
          v_start, v_next - 1, NULLIF(btrim(coalesce(p_notes, '')), ''),
          (SELECT id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1))
  RETURNING id INTO v_id;

  UPDATE organizations
  SET next_due_date = v_next,
      status = CASE WHEN status = 'Suspendida' THEN 'Activa' ELSE status END,
      updated_at = now()
  WHERE id = p_org;

  RETURN jsonb_build_object('id', v_id, 'period_start', v_start, 'period_end', v_next - 1, 'next_due_date', v_next);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_summary(p_months int DEFAULT 6)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_from date := (date_trunc('month', billing_today()) - make_interval(months => greatest(p_months, 1) - 1))::date;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo para la plataforma';
  END IF;
  RETURN jsonb_build_object(
    'by_month', (
      SELECT jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'),
                                          'total', COALESCE(t.total, 0), 'count', COALESCE(t.n, 0)) ORDER BY m)
      FROM generate_series(v_from, date_trunc('month', billing_today())::date, interval '1 month') m
      LEFT JOIN (
        SELECT date_trunc('month', paid_at)::date mm, sum(amount_usd) total, count(*) n
        FROM platform_payments GROUP BY 1
      ) t ON t.mm = m::date),
    'this_month', (SELECT COALESCE(sum(amount_usd), 0) FROM platform_payments
                   WHERE paid_at >= date_trunc('month', billing_today())::date),
    'expected_monthly', (SELECT COALESCE(sum(COALESCE(o.monthly_price, p.price_usd)), 0)
                         FROM organizations o LEFT JOIN platform_plans p ON p.id = o.plan_id
                         WHERE o.status = 'Activa'),
    'clients', (SELECT jsonb_build_object(
                  'total', count(*),
                  'al_dia', count(*) FILTER (WHERE st = 'al_dia'),
                  'por_vencer', count(*) FILTER (WHERE st = 'por_vencer'),
                  'vencida', count(*) FILTER (WHERE st = 'vencida'),
                  'suspendida', count(*) FILTER (WHERE st = 'suspendida'),
                  'cancelada', count(*) FILTER (WHERE st = 'cancelada'),
                  'sin_fecha', count(*) FILTER (WHERE st = 'sin_fecha'))
                FROM (SELECT subscription_state(next_due_date, status) st FROM organizations) x)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_enter_support(p_org uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Solo para la plataforma';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org) THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;
  UPDATE staff
  SET support_org_id = CASE WHEN organization_id = p_org THEN NULL ELSE p_org END,
      active_gym_id = NULL
  WHERE auth_user_id = auth.uid();
  RETURN p_org;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_exit_support()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE staff SET support_org_id = NULL, active_gym_id = NULL
  WHERE auth_user_id = auth.uid() AND support_org_id IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_active_branch(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_context() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.platform_clients() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.platform_register_payment(uuid, numeric, text, text, date, int, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.platform_summary(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.platform_enter_support(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.platform_exit_support() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_branch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_clients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_register_payment(uuid, numeric, text, text, date, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_summary(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_enter_support(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_exit_support() TO authenticated;
