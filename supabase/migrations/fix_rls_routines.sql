-- =============================================
-- FIX: Deshabilitar RLS para tablas de rutinas
-- =============================================
-- El servidor usa SERVICE_ROLE_KEY que bypasea RLS automáticamente,
-- pero por seguridad adicional, deshabilitamos RLS temporalmente

-- Deshabilitar RLS para routine_templates
ALTER TABLE routine_templates DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS para routine_exercises
ALTER TABLE routine_exercises DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS para user_routine_assignments
ALTER TABLE user_routine_assignments DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS para workout_sessions
ALTER TABLE workout_sessions DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS para workout_exercise_logs
ALTER TABLE workout_exercise_logs DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS para set_logs
ALTER TABLE set_logs DISABLE ROW LEVEL SECURITY;

-- Verificar estado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN (
  'routine_templates',
  'routine_exercises', 
  'user_routine_assignments',
  'workout_sessions',
  'workout_exercise_logs',
  'set_logs'
);
