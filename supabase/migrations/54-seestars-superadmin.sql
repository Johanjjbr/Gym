-- 54 - Súper admin = SeeStars (APLICADO el 03/10/2026; queda como registro)
--  * admin@seestars.com (cuenta creada en Supabase Auth) pasa a ser el súper admin,
--    en la empresa proveedora SeeStars (sede interna "Oficina SeeStars").
--  * admin@gymteques.com queda como Administrador normal de Lagunetica.
INSERT INTO gyms (id, name, code, organization_id, is_active)
VALUES ('00000000-0000-4000-a000-00000000aaab', 'Oficina SeeStars', 'OFICINA', '00000000-0000-4000-a000-00000000aaaa', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff (auth_user_id, name, role, email, phone, shift, status, organization_id, gym_id, is_super_admin)
SELECT u.id, 'SeeStars', 'Administrador', 'admin@seestars.com', '', 'Completo (6am - 10pm)', 'Activo',
       '00000000-0000-4000-a000-00000000aaaa', '00000000-0000-4000-a000-00000000aaab', true
FROM auth.users u
WHERE lower(u.email) = 'admin@seestars.com'
  AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.auth_user_id = u.id);

UPDATE staff SET is_super_admin = false, support_org_id = NULL
WHERE lower(email) = 'admin@gymteques.com'
  AND EXISTS (SELECT 1 FROM staff WHERE lower(email) = 'admin@seestars.com' AND is_super_admin);
