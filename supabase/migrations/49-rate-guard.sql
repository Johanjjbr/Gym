-- 49 - La tasa de otra empresa no se puede consultar por RPC.
--      pay_invoice (invocador) pasa la empresa de su propia factura; el job nocturno corre sin sesión.
CREATE OR REPLACE FUNCTION public.exchange_rate_for(p_date date, p_org uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT rate FROM exchange_rates
  WHERE organization_id = p_org AND rate_date <= p_date AND rate_date >= p_date - 3
    AND (auth.uid() IS NULL OR p_org = current_org_id() OR coalesce(auth.jwt() ->> 'role', '') = 'service_role')
  ORDER BY rate_date DESC LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.exchange_rate_for(date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.exchange_rate_for(date, uuid) TO authenticated, service_role;
