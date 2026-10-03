-- =====================================================================
-- 52 - EMPRESA PROVEEDORA (SeeStars)
-- ---------------------------------------------------------------------
-- El súper admin pertenece a la empresa proveedora del sistema, que no es
-- un cliente: no aparece en la lista de clientes, ni en los totales, ni
-- recibe avisos de pago.
-- =====================================================================

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_platform boolean NOT NULL DEFAULT false;

INSERT INTO public.organizations (id, name, legal_name, email, status, max_branches, is_platform)
VALUES ('00000000-0000-4000-a000-00000000aaaa', 'SeeStars', 'SeeStars', 'admin@seestars.com', 'Activa', 1, true)
ON CONFLICT (id) DO NOTHING;

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
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.is_platform IS DISTINCT FROM OLD.is_platform THEN
    RAISE EXCEPTION 'El plan y la suscripción solo los cambia el proveedor del sistema';
  END IF;
  RETURN NEW;
END;
$$;

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
    'is_platform', coalesce(o.is_platform, false),
    'subscription', CASE WHEN v_admin AND NOT coalesce(o.is_platform, false) THEN jsonb_build_object(
      'plan', v_plan.name,
      'price', COALESCE(o.monthly_price, v_plan.price_usd),
      'next_due_date', o.next_due_date,
      'days_left', o.next_due_date - billing_today(),
      'state', subscription_state(o.next_due_date, o.status)) END
  );
END;
$$;

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
      WHERE NOT o.is_platform
    ) c), '[]'::jsonb);
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
                         WHERE o.status = 'Activa' AND NOT o.is_platform),
    'clients', (SELECT jsonb_build_object(
                  'total', count(*),
                  'al_dia', count(*) FILTER (WHERE st = 'al_dia'),
                  'por_vencer', count(*) FILTER (WHERE st = 'por_vencer'),
                  'vencida', count(*) FILTER (WHERE st = 'vencida'),
                  'suspendida', count(*) FILTER (WHERE st = 'suspendida'),
                  'cancelada', count(*) FILTER (WHERE st = 'cancelada'),
                  'sin_fecha', count(*) FILTER (WHERE st = 'sin_fecha'))
                FROM (SELECT subscription_state(next_due_date, status) st FROM organizations WHERE NOT is_platform) x)
  );
END;
$$;
