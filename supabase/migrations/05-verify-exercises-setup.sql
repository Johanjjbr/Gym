-- =====================================================
-- SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================
-- Ejecuta este script después de aplicar la migración
-- para verificar que todo esté configurado correctamente
-- =====================================================

-- 1. Verificar que la tabla exercises existe
SELECT 'Tabla exercises existe: ' || 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'exercises'
  ) THEN '✅ SI' ELSE '❌ NO' END as resultado;

-- 2. Verificar estructura de la tabla exercises
SELECT 
  'Columnas de exercises:' as info,
  string_agg(column_name || ' (' || data_type || ')', ', ') as columnas
FROM information_schema.columns
WHERE table_name = 'exercises'
GROUP BY info;

-- 3. Verificar que exercise_id existe en routine_exercises
SELECT 'Columna exercise_id en routine_exercises: ' || 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'routine_exercises' 
    AND column_name = 'exercise_id'
  ) THEN '✅ SI' ELSE '❌ NO' END as resultado;

-- 4. Contar ejercicios insertados
SELECT 
  'Total de ejercicios en la biblioteca: ' || COUNT(*)::text || ' ejercicios' as resultado
FROM exercises;

-- 5. Ver primeros 10 ejercicios
SELECT 
  name as "Nombre del Ejercicio",
  muscle_group as "Grupo Muscular",
  equipment as "Equipamiento"
FROM exercises 
ORDER BY name 
LIMIT 10;

-- 6. Verificar índices de exercises
SELECT 
  'Índices de exercises:' as info,
  string_agg(indexname, ', ') as indices
FROM pg_indexes
WHERE tablename = 'exercises'
GROUP BY info;

-- 7. Verificar que RLS está deshabilitado
SELECT 
  'RLS en exercises: ' || 
  CASE WHEN relrowsecurity THEN '❌ HABILITADO (debería estar deshabilitado)' 
       ELSE '✅ DESHABILITADO' END as resultado
FROM pg_class
WHERE relname = 'exercises';

-- 8. Verificar función trigger
SELECT 
  'Trigger update_exercises_updated_at: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_exercises_updated_at'
  ) THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as resultado;

-- 9. Verificar grupos musculares únicos
SELECT 
  'Grupos musculares disponibles:' as info,
  string_agg(DISTINCT muscle_group, ', ') as grupos
FROM exercises
GROUP BY info;

-- 10. Test de inserción (se elimina al final)
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Intentar insertar ejercicio de prueba
  INSERT INTO exercises (name, muscle_group, equipment, description)
  VALUES ('__TEST_EJERCICIO__', 'General', 'Ninguno', 'Ejercicio de prueba')
  RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ Test de inserción exitoso, ID: %', test_id;
  
  -- Eliminar el ejercicio de prueba
  DELETE FROM exercises WHERE id = test_id;
  
  RAISE NOTICE '✅ Test de eliminación exitoso';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error en test: %', SQLERRM;
END $$;

-- =====================================================
-- RESUMEN DE VERIFICACIÓN
-- =====================================================
-- Si todos los checks muestran ✅, la migración fue exitosa
-- Si alguno muestra ❌, revisa los pasos de la migración
-- =====================================================

SELECT '
=====================================================
✨ VERIFICACIÓN COMPLETADA
=====================================================
Revisa los resultados arriba:
- ✅ indica que todo está correcto
- ❌ indica que hay un problema que debes resolver

Si todos los checks son ✅, puedes probar la aplicación.
Si hay algún ❌, ejecuta nuevamente la migración:
  /supabase/migrations/04-fix-exercises-integration.sql
=====================================================
' as mensaje;
