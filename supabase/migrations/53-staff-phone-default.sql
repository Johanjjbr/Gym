-- 53 - El teléfono del personal es obligatorio en la tabla; si no se indica, queda vacío
--      (el alta de clientes desde Plataforma puede no traer teléfono del Dueño).
CREATE OR REPLACE FUNCTION public.trg_staff_set_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      (SELECT organization_id FROM gyms WHERE id = NEW.gym_id),
      my_staff_org());
  END IF;
  NEW.phone := COALESCE(NEW.phone, '');
  RETURN NEW;
END;
$$;
