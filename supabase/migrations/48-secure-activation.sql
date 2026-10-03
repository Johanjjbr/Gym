-- =====================================================================
-- 48 - ACTIVACIÓN DE CUENTA SIN EXPONER LA TABLA users
-- ---------------------------------------------------------------------
-- La política "Verificar token de activación" dejaba leer (incluso sin
-- sesión, y desde otra empresa) a todo socio con token pendiente.
-- Ahora la activación usa dos funciones que solo devuelven/actualizan
-- el socio dueño del token.
-- =====================================================================

ALTER POLICY "Verificar token de activación" ON public.users USING (false);

CREATE OR REPLACE FUNCTION public.activation_lookup(p_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('id', id, 'name', name, 'email', email, 'is_activated', coalesce(is_activated, false))
  FROM users
  WHERE length(coalesce(p_token, '')) >= 20 AND activation_token = p_token
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.activation_complete(p_token text, p_auth_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'auth' AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  IF length(coalesce(p_token, '')) < 20 THEN
    RAISE EXCEPTION 'Token de activación inválido';
  END IF;

  SELECT * INTO v_user FROM users WHERE activation_token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token de activación inválido';
  END IF;
  IF coalesce(v_user.is_activated, false) THEN
    RAISE EXCEPTION 'Esta cuenta ya ha sido activada';
  END IF;

  -- La cuenta de Auth debe ser nueva, con el mismo correo y sin otro socio enlazado
  IF NOT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = p_auth_user_id
      AND lower(au.email) = lower(v_user.email)
      AND au.created_at > now() - interval '1 hour'
  ) OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = p_auth_user_id) THEN
    RAISE EXCEPTION 'No se pudo enlazar la cuenta';
  END IF;

  UPDATE users
  SET is_activated = true, activation_token = NULL, auth_user_id = p_auth_user_id, updated_at = now()
  WHERE id = v_user.id;

  RETURN jsonb_build_object('id', v_user.id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activation_lookup(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activation_complete(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activation_lookup(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activation_complete(text, uuid) TO anon, authenticated;
