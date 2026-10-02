-- =====================================================================
-- 43 - CORRECCIÓN DE SOCIOS MIGRADOS (una sola vez, 02/10/2026)
-- ---------------------------------------------------------------------
-- Las facturas de octubre se generaron con vencimiento 01/10 (cobro el
-- día 1). Con el cobro por aniversario:
--  * Facturas abiertas del 01/10 -> vencen en el próximo día de pago del
--    socio (>= hoy): se asume que está al día hasta entonces.
--  * Facturas pagadas del 01/10 -> se mueven a su día de pago de octubre.
--  * Socios activos sin factura del ciclo vigente -> se les genera.
--  * Se reactiva a los suspendidos que ya no deben nada vencido.
-- Además: Recepción puede corregir la tasa BCV.
-- =====================================================================

-- Abiertas: al próximo día de pago (>= hoy)
UPDATE invoices i
SET due_date = (CASE WHEN anchor_date(billing_today(), u.billing_day) >= billing_today()
                     THEN anchor_date(billing_today(), u.billing_day)
                     ELSE anchor_date((billing_today() + interval '1 month')::date, u.billing_day) END)::timestamp,
    status = 'Pendiente'
FROM users u
WHERE u.id = i.user_id
  AND i.status IN ('Pendiente', 'Vencida')
  AND i.due_date::date = DATE '2026-10-01'
  AND u.billing_day IS NOT NULL AND u.billing_day <> 1;

-- Socios con día 1 cuya factura del 01/10 sigue abierta: al día hasta el 01/11
UPDATE invoices i
SET due_date = DATE '2026-11-01'::timestamp, status = 'Pendiente'
FROM users u
WHERE u.id = i.user_id
  AND i.status IN ('Pendiente', 'Vencida')
  AND i.due_date::date = DATE '2026-10-01'
  AND u.billing_day = 1
  AND u.start_date::date < DATE '2026-10-01';

-- Pagadas del 01/10: a su día de pago de octubre
UPDATE invoices i
SET due_date = anchor_date(DATE '2026-10-01', u.billing_day)::timestamp
FROM users u
WHERE u.id = i.user_id
  AND i.status = 'Pagada'
  AND i.due_date::date = DATE '2026-10-01'
  AND u.billing_day IS NOT NULL AND u.billing_day <> 1;

-- Conceptos con el período
UPDATE invoices i
SET concept = invoice_concept(p.name, i.due_date::date, p.duration_days, u.billing_day, p.type)
FROM users u JOIN plans p ON p.id = u.plan_id
WHERE u.id = i.user_id AND i.plan_id = p.id AND u.billing_day IS NOT NULL AND i.status <> 'Anulada';

-- Reactivar suspendidos sin deuda vencida
UPDATE users u SET status = 'Activo'
WHERE u.status = 'Suspendido'
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.user_id = u.id AND i.status = 'Vencida');

-- Activos sin factura (no anulada) del ciclo vigente: se genera
INSERT INTO invoices (user_id, plan_id, concept, amount, due_date, status)
SELECT u.id, p.id,
       invoice_concept(p.name, billing_cycle_start(billing_today(), u.billing_day, p.duration_days), p.duration_days, u.billing_day, p.type),
       p.price, billing_cycle_start(billing_today(), u.billing_day, p.duration_days)::timestamp, 'Pendiente'
FROM users u JOIN plans p ON p.id = u.plan_id
WHERE u.status = 'Activo' AND NOT COALESCE(u.is_free_user, false) AND p.price > 0
  AND p.type IS DISTINCT FROM 'Visita'
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.user_id = u.id AND i.status <> 'Anulada'
      AND i.due_date::date >= billing_cycle_start(billing_today(), u.billing_day, p.duration_days)
  );

-- Recalcular próximo pago / al día hasta
SELECT refresh_user_billing(id) FROM users;


-- Recepción puede corregir la tasa BCV
ALTER POLICY "Solo Admin corrige tasas" ON public.exchange_rates
  USING (is_staff_reception()) WITH CHECK (is_staff_reception());
ALTER POLICY "Solo Admin corrige tasas" ON public.exchange_rates RENAME TO "Recepción y Admin corrigen tasas";
