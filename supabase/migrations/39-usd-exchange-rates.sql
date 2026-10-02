-- =====================================================================
-- 39 - MONEDA BASE USD + TASA BCV DEL DÍA
-- ---------------------------------------------------------------------
-- * Planes, facturas y deudas quedan en USD (los montos actuales ya lo son).
-- * exchange_rates: tasa BCV (Bs por 1 USD) cargada a mano cada día.
--   Recepción y Admin la cargan; solo Admin puede corregirla.
-- * payments guarda la moneda en que se cobró, el monto recibido en esa
--   moneda, la tasa usada y el equivalente en USD (amount sigue siendo USD).
-- * La moneda la define el método: Efectivo $ / Zelle = USD;
--   Pago Móvil / Transferencia / Punto de venta = Bs.
-- * Para cobrar en Bs se usa la tasa más reciente con fecha <= día del pago,
--   de hasta 3 días antes (el BCV no publica fines de semana).
-- No modifica políticas existentes; crea las de la tabla nueva.
-- =====================================================================

-- 1. Tasas ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date   date NOT NULL UNIQUE,
  rate        numeric(14,4) NOT NULL CHECK (rate > 0),
  source      text NOT NULL DEFAULT 'BCV',
  created_by  uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados ven las tasas" ON public.exchange_rates;
CREATE POLICY "Usuarios autenticados ven las tasas" ON public.exchange_rates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Recepción y Admin cargan tasas" ON public.exchange_rates;
CREATE POLICY "Recepción y Admin cargan tasas" ON public.exchange_rates
  FOR INSERT TO authenticated WITH CHECK (is_staff_reception());

DROP POLICY IF EXISTS "Solo Admin corrige tasas" ON public.exchange_rates;
CREATE POLICY "Solo Admin corrige tasas" ON public.exchange_rates
  FOR UPDATE TO authenticated USING (is_staff_admin()) WITH CHECK (is_staff_admin());

-- Quién cargó / corrigió
CREATE OR REPLACE FUNCTION public.trg_exchange_rates_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_staff uuid;
BEGIN
  SELECT id INTO v_staff FROM staff WHERE auth_user_id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, v_staff);
  END IF;
  NEW.updated_by := v_staff;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exchange_rates_audit ON public.exchange_rates;
CREATE TRIGGER exchange_rates_audit BEFORE INSERT OR UPDATE ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION trg_exchange_rates_audit();

-- Tasa vigente para un día (la más reciente de hasta 3 días antes)
CREATE OR REPLACE FUNCTION public.exchange_rate_for(p_date date)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT rate FROM exchange_rates
  WHERE rate_date <= p_date AND rate_date >= p_date - 3
  ORDER BY rate_date DESC LIMIT 1
$$;

-- Moneda de cada método de pago
CREATE OR REPLACE FUNCTION public.method_currency(p_method text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_method IN ('Efectivo $', 'Zelle', 'Efectivo') THEN 'USD' ELSE 'VES' END
$$;

-- 2. Métodos de pago nuevos (se conservan los antiguos para el historial)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_method_check CHECK (method = ANY (ARRAY[
  'Efectivo $', 'Zelle', 'Pago Móvil', 'Transferencia', 'Punto de venta', 'Efectivo', 'Tarjeta']));
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_method_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_method_check CHECK (method = ANY (ARRAY[
  'Efectivo $', 'Zelle', 'Pago Móvil', 'Transferencia', 'Punto de venta', 'Efectivo', 'Tarjeta']));

-- 3. Moneda del cobro en payments ------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'VES')),
  ADD COLUMN IF NOT EXISTS amount_original numeric(14,2),
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(14,4),
  ADD COLUMN IF NOT EXISTS amount_usd numeric(12,2);

-- Pagos existentes: en dólares, mismo monto
UPDATE public.payments
SET currency = 'USD', amount_original = amount, amount_usd = amount
WHERE amount_usd IS NULL;

COMMENT ON COLUMN public.payments.amount IS 'Monto en USD acreditado (igual a amount_usd).';
COMMENT ON COLUMN public.payments.amount_original IS 'Monto recibido en la moneda del cobro (USD o Bs).';
COMMENT ON COLUMN public.payments.exchange_rate IS 'Tasa BCV (Bs por USD) usada si se cobró en Bs.';

-- 4. pay_invoice: registra moneda, tasa y monto en Bs -----------------
CREATE OR REPLACE FUNCTION public.pay_invoice(
  p_invoice_id uuid,
  p_method text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_paid_at timestamp without time zone DEFAULT NULL
)
RETURNS invoices
LANGUAGE plpgsql
AS $function$
DECLARE
  inv        invoices%ROWTYPE;
  v_days     int;
  v_pay_id   uuid;
  v_paid     timestamp := COALESCE(p_paid_at, billing_now());
  v_currency text;
  v_rate     numeric;
  v_original numeric;
BEGIN
  IF p_method IS NULL OR btrim(p_method) = '' THEN
    RAISE EXCEPTION 'Método de pago requerido';
  END IF;

  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  IF inv.status = 'Pagada' THEN
    RAISE EXCEPTION 'La factura % ya está pagada', inv.invoice_number;
  END IF;

  v_currency := method_currency(p_method);
  IF v_currency = 'VES' THEN
    v_rate := exchange_rate_for(v_paid::date);
    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'No hay tasa BCV cargada para el %. Cárgala antes de cobrar en bolívares.', to_char(v_paid::date, 'DD/MM/YYYY');
    END IF;
    v_original := round(inv.amount * v_rate, 2);
  ELSE
    v_original := inv.amount;
  END IF;

  SELECT pl.duration_days INTO v_days
  FROM plans pl
  WHERE pl.id = COALESCE(inv.plan_id, (SELECT plan_id FROM users WHERE id = inv.user_id));

  INSERT INTO payments (user_id, amount, date, next_payment, status, method,
                        currency, amount_original, exchange_rate, amount_usd)
  VALUES (inv.user_id, inv.amount, v_paid,
          plan_next_due(inv.due_date::date, COALESCE(v_days, 30))::timestamp,
          'Pagado', p_method,
          v_currency, v_original, v_rate, inv.amount)
  RETURNING id INTO v_pay_id;

  UPDATE invoices
  SET status     = 'Pagada',
      method     = p_method,
      reference  = NULLIF(p_reference, ''),
      notes      = COALESCE(NULLIF(p_notes, ''), notes),
      paid_at    = v_paid,
      payment_id = v_pay_id
  WHERE id = p_invoice_id
  RETURNING * INTO inv;

  IF EXISTS (SELECT 1 FROM users WHERE id = inv.user_id AND status = 'Suspendido')
     AND NOT EXISTS (SELECT 1 FROM invoices WHERE user_id = inv.user_id AND status = 'Vencida') THEN
    UPDATE users SET status = 'Activo' WHERE id = inv.user_id;
    PERFORM ensure_user_invoices(inv.user_id, true);
  END IF;

  RETURN inv;
END;
$function$;
