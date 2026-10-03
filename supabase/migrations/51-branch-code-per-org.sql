-- 51 - El código de sede es único dentro de cada empresa (no en todo el sistema)
ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_code_key;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_org_code_key UNIQUE (organization_id, code);
