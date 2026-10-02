-- =====================================================================
-- 40 - ANULAR FACTURAS + QUIÉN REGISTRÓ CADA PAGO
-- ---------------------------------------------------------------------
-- * Una factura ya no se borra: se ANULA con un motivo. Queda en el
--   historial, no cuenta como deuda ni ingreso y el proceso nocturno no la
--   vuelve a generar (ensure_user_invoices ve que ese período ya existe).
-- * Si estaba pagada, su pago pasa a 'Anulado' (sale de los ingresos).
--   Anular una pagada requiere el permiso "Eliminar" de Facturación
--   (o ser Administrador / super admin).
-- * payments.created_by: quién registró el cobro (para el chequeo diario).
-- No modifica políticas RLS.
-- =====================================================================

-- 1. Estados nuevos ----------------------------------------------------
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY['Pendiente', 'Pagada', 'Vencida', 'Anulada']));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status = ANY (ARRAY['Pagado', 'Pendiente', 'Vencido', 'Anulado']));

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS voided_at   timestamp without time zone,
  ADD COLUMN IF NOT EXISTS voided_by   uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS void_reason text;

-- 2. Quién registró cada pago -----------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.trg_payments_created_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    SELECT id INTO NEW.created_by FROM staff WHERE auth_user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER payments_created_by BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION trg_payments_created_by();

-- 3. Anular factura -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_invoice(p_invoice_id uuid, p_reason text)
RETURNS invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv      invoices%ROWTYPE;
  v_staff  staff%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  SELECT * INTO v_staff FROM staff WHERE auth_user_id = auth.uid();
  IF NOT FOUND OR v_staff.role NOT IN ('Administrador', 'Recepción') THEN
    RAISE EXCEPTION 'No tienes permiso para anular facturas';
  END IF;

  IF length(v_reason) < 3 THEN
    RAISE EXCEPTION 'Escribe el motivo de la anulación';
  END IF;

  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  IF inv.status = 'Anulada' THEN
    RAISE EXCEPTION 'La factura % ya está anulada', inv.invoice_number;
  END IF;

  -- Las pagadas solo con permiso de eliminar en Facturación
  IF inv.status = 'Pagada'
     AND NOT COALESCE(v_staff.is_super_admin, false)
     AND v_staff.role <> 'Administrador'
     AND NOT EXISTS (
       SELECT 1 FROM role_module_permissions
       WHERE role = v_staff.role AND module_path = '/facturacion' AND can_delete
     ) THEN
    RAISE EXCEPTION 'Anular una factura pagada requiere el permiso "Eliminar" de Facturación';
  END IF;

  IF inv.payment_id IS NOT NULL THEN
    UPDATE payments SET status = 'Anulado' WHERE id = inv.payment_id;
  END IF;

  UPDATE invoices
  SET status      = 'Anulada',
      voided_at   = billing_now(),
      voided_by   = v_staff.id,
      void_reason = v_reason
  WHERE id = p_invoice_id
  RETURNING * INTO inv;

  -- Si estaba suspendido y ya no debe nada vencido, se reactiva (igual que al pagar)
  IF EXISTS (SELECT 1 FROM users WHERE id = inv.user_id AND status = 'Suspendido')
     AND NOT EXISTS (SELECT 1 FROM invoices WHERE user_id = inv.user_id AND status = 'Vencida') THEN
    UPDATE users SET status = 'Activo' WHERE id = inv.user_id;
    PERFORM ensure_user_invoices(inv.user_id, true);
  END IF;

  RETURN inv;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.void_invoice(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_invoice(uuid, text) TO authenticated;
