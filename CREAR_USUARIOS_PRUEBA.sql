-- =====================================================
-- 🔐 CREAR USUARIOS DE PRUEBA - GYM LAGUNETICA
-- =====================================================
-- 
-- IMPORTANTE: Este SQL crea usuarios directamente en auth.users
-- y sus perfiles correspondientes en user_profiles
--
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard > SQL Editor
-- 2. Copia y pega TODO este código
-- 3. Click en "Run"
-- 4. Los usuarios estarán listos para usar
--
-- CREDENCIALES DE ACCESO:
-- 
-- 👤 ADMINISTRADOR:
--    Email: admin@gymlagunetica.com
--    Password: Admin123!
--    Rol: administrador
--
-- 🏋️ ENTRENADOR:
--    Email: entrenador@gymlagunetica.com
--    Password: Trainer123!
--    Rol: entrenador
--
-- 💪 USUARIO:
--    Email: usuario@gymlagunetica.com
--    Password: User123!
--    Rol: usuario
--
-- =====================================================

-- =====================================================
-- PASO 1: LIMPIAR USUARIOS EXISTENTES (OPCIONAL)
-- =====================================================
-- ⚠️ DESCOMENTA ESTAS LÍNEAS SI QUIERES BORRAR LOS USUARIOS ANTERIORES
-- DELETE FROM auth.users WHERE email IN (
--   'admin@gymlagunetica.com',
--   'entrenador@gymlagunetica.com', 
--   'usuario@gymlagunetica.com'
-- );
-- 
-- DELETE FROM public.user_profiles WHERE email IN (
--   'admin@gymlagunetica.com',
--   'entrenador@gymlagunetica.com',
--   'usuario@gymlagunetica.com'
-- );

-- =====================================================
-- PASO 2: CREAR USUARIOS EN auth.users
-- =====================================================

-- Usuario 1: ADMINISTRADOR
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@gymlagunetica.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Carlos Administrador","role":"administrador"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  FALSE,
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- Usuario 2: ENTRENADOR
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'entrenador@gymlagunetica.com',
  crypt('Trainer123!', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Pedro Entrenador","role":"entrenador"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  FALSE,
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- Usuario 3: USUARIO REGULAR
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'usuario@gymlagunetica.com',
  crypt('User123!', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"María Usuario","role":"usuario"}',
  FALSE,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  FALSE,
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- PASO 3: CREAR PERFILES EN user_profiles
-- =====================================================
-- El trigger handle_new_user() debería crearlos automáticamente,
-- pero por si acaso lo hacemos manualmente también

-- Perfil Administrador
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  member_number,
  phone,
  membership_status,
  membership_type,
  join_date,
  created_at
)
SELECT
  au.id,
  'admin@gymlagunetica.com',
  'Carlos Administrador',
  'administrador',
  'ADMIN-001',
  '+58-412-1234567',
  'Activo',
  'VIP',
  CURRENT_DATE,
  NOW()
FROM auth.users au
WHERE au.email = 'admin@gymlagunetica.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  member_number = EXCLUDED.member_number,
  phone = EXCLUDED.phone,
  membership_status = EXCLUDED.membership_status,
  membership_type = EXCLUDED.membership_type;

-- Perfil Entrenador
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  member_number,
  phone,
  membership_status,
  membership_type,
  join_date,
  created_at
)
SELECT
  au.id,
  'entrenador@gymlagunetica.com',
  'Pedro Entrenador',
  'entrenador',
  'TRAINER-001',
  '+58-424-7654321',
  'Activo',
  'Premium',
  CURRENT_DATE,
  NOW()
FROM auth.users au
WHERE au.email = 'entrenador@gymlagunetica.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  member_number = EXCLUDED.member_number,
  phone = EXCLUDED.phone,
  membership_status = EXCLUDED.membership_status,
  membership_type = EXCLUDED.membership_type;

-- Perfil Usuario
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  member_number,
  phone,
  gender,
  birth_date,
  height,
  membership_status,
  membership_type,
  join_date,
  created_at
)
SELECT
  au.id,
  'usuario@gymlagunetica.com',
  'María Usuario',
  'usuario',
  'MEMBER-001',
  '+58-414-9876543',
  'Femenino',
  '1995-05-15',
  165,
  'Activo',
  'Básica',
  CURRENT_DATE,
  NOW()
FROM auth.users au
WHERE au.email = 'usuario@gymlagunetica.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  member_number = EXCLUDED.member_number,
  phone = EXCLUDED.phone,
  gender = EXCLUDED.gender,
  birth_date = EXCLUDED.birth_date,
  height = EXCLUDED.height,
  membership_status = EXCLUDED.membership_status,
  membership_type = EXCLUDED.membership_type;

-- =====================================================
-- PASO 4: VERIFICAR USUARIOS CREADOS
-- =====================================================
-- Esta query te muestra los usuarios creados
SELECT 
  au.id,
  au.email,
  up.full_name,
  up.role,
  up.member_number,
  up.membership_status,
  au.email_confirmed_at as confirmado,
  au.created_at as fecha_creacion
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email IN (
  'admin@gymlagunetica.com',
  'entrenador@gymlagunetica.com',
  'usuario@gymlagunetica.com'
)
ORDER BY up.role;

-- =====================================================
-- ✅ USUARIOS CREADOS EXITOSAMENTE
-- =====================================================
-- 
-- Ahora puedes iniciar sesión con:
--
-- 👤 ADMINISTRADOR:
--    admin@gymlagunetica.com / Admin123!
--
-- 🏋️ ENTRENADOR:
--    entrenador@gymlagunetica.com / Trainer123!
--
-- 💪 USUARIO:
--    usuario@gymlagunetica.com / User123!
--
-- =====================================================
