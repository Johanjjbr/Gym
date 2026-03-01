# 🔧 Corrección del Error de Asignación de Ejercicios

## 📋 Problema Identificado

El error al asignar ejercicios a las rutinas se debía a que:

1. **La tabla `exercises` no estaba configurada correctamente** o faltaba en la base de datos
2. **El hook `useExercises` estaba tratando de llamar a un endpoint API inexistente** en lugar de usar Supabase directamente
3. **Faltaba la integración entre el frontend y la tabla `exercises`** en Supabase

## ✅ Soluciones Implementadas

### 1. Actualización del API Client (`/src/app/lib/api.ts`)
Se agregó una nueva sección completa para manejar la tabla `exercises`:

```typescript
export const exercises = {
  getAll: async () => { ... }    // Obtener todos los ejercicios
  getById: async (id) => { ... } // Obtener ejercicio por ID
  create: async (data) => { ... } // Crear nuevo ejercicio
  update: async (id, data) => { ... } // Actualizar ejercicio
  delete: async (id) => { ... }  // Eliminar ejercicio
};
```

Todas las funciones incluyen fallback a Supabase directamente si el API no está disponible.

### 2. Actualización del Hook `useExercises` (`/src/app/hooks/useExercises.ts`)
Se modificó para usar las funciones de `api.ts` en lugar de hacer fetch directo a endpoints inexistentes.

### 3. Nueva Migración SQL (`/supabase/migrations/04-fix-exercises-integration.sql`)
Se creó un script SQL consolidado que:
- Crea la tabla `exercises` con la estructura correcta
- Agrega índices para optimizar rendimiento
- Crea el trigger `update_exercises_updated_at`
- Agrega la columna `exercise_id` a `routine_exercises` (FK opcional a exercises)
- Deshabilita RLS en la tabla `exercises`
- Inserta 25 ejercicios predeterminados comunes

## 🚀 Pasos para Aplicar la Corrección

### Paso 1: Ejecutar la Migración SQL en Supabase

1. Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor** en el menú lateral
3. Copia y pega el contenido del archivo `/supabase/migrations/04-fix-exercises-integration.sql`
4. Haz clic en **Run** para ejecutar la migración
5. Verifica que no haya errores en la consola

### Paso 2: Verificar la Tabla Exercises

Ejecuta el script de verificación automático:

1. En el SQL Editor de Supabase
2. Copia y pega el contenido de `/supabase/migrations/05-verify-exercises-setup.sql`
3. Haz clic en **Run**
4. **Revisa los resultados:**
   - Todos los checks deberían mostrar ✅
   - Si alguno muestra ❌, hay un problema que debes resolver

También puedes ejecutar estas queries manualmente para verificar:

```sql
-- Ver total de ejercicios insertados
SELECT COUNT(*) as total_exercises FROM exercises;

-- Ver los primeros 10 ejercicios
SELECT id, name, muscle_group, equipment FROM exercises ORDER BY name LIMIT 10;

-- Verificar que routine_exercises tiene la columna exercise_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'routine_exercises' 
AND column_name IN ('exercise_id', 'exercise_name');
```

### Paso 3: Verificar en la Aplicación

1. **Reinicia la aplicación** (si está corriendo en desarrollo, haz Ctrl+C y vuelve a ejecutar)
2. **Inicia sesión** como Entrenador o Administrador
3. **Ve a Rutinas** → **Nueva Rutina**
4. **Haz clic en "Añadir Ejercicio"**
5. **Haz clic en el selector de ejercicio** (donde antes fallaba)
6. **Deberías ver la lista de ejercicios** cargándose desde Supabase

## 🔍 Verificación de Funcionalidad

Prueba estas acciones para asegurarte de que todo funciona:

### ✓ Cargar Ejercicios Existentes
- Al abrir el selector de ejercicios, deberías ver los 25 ejercicios predeterminados
- La búsqueda debería filtrar correctamente por nombre o grupo muscular

### ✓ Crear Nuevo Ejercicio
- En el selector, busca un ejercicio que no exista (ej: "Mi Ejercicio Custom")
- Haz clic en "Crear nuevo ejercicio"
- Completa el formulario y guarda
- El nuevo ejercicio debería aparecer en el selector inmediatamente

### ✓ Guardar Rutina con Ejercicios
- Crea una rutina nueva
- Agrega varios ejercicios usando el selector
- Configura series, repeticiones, descanso, etc.
- Guarda la rutina
- Verifica que se guardó correctamente en la lista de rutinas

### ✓ Editar Rutina Existente
- Abre una rutina existente para editarla
- Los ejercicios deberían cargarse correctamente
- Puedes agregar, eliminar o modificar ejercicios
- Guarda los cambios

## 📊 Estructura de la Base de Datos

### Tabla `exercises` (Librería de ejercicios)
```sql
- id: UUID (PK)
- name: TEXT (UNIQUE, NOT NULL)
- description: TEXT (nullable)
- muscle_group: TEXT (NOT NULL, default 'General')
- equipment: TEXT (nullable)
- created_by: UUID (FK a auth.users)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Tabla `routine_exercises` (Ejercicios en rutinas)
```sql
- id: UUID (PK)
- routine_id: UUID (FK a routine_templates)
- exercise_id: UUID (FK a exercises, nullable) ← NUEVA COLUMNA
- exercise_name: TEXT (NOT NULL) ← Se mantiene como cache/respaldo
- day_of_week: INTEGER (1-7)
- order_index: INTEGER
- sets: INTEGER
- reps: TEXT
- rest_seconds: INTEGER
- notes: TEXT
- created_at: TIMESTAMPTZ
```

## 🎯 Relación entre Tablas

```
exercises (Librería centralizada)
    ↑
    | (FK opcional via exercise_id)
    |
routine_exercises (Ejercicios específicos de cada rutina)
    ↑
    | (FK via routine_id)
    |
routine_templates (Plantillas de rutinas)
```

**Nota importante:** 
- `exercise_id` es **opcional** (puede ser NULL)
- `exercise_name` es **obligatorio** y almacena el nombre del ejercicio como texto
- Esto permite flexibilidad: usar ejercicios de la librería O crear ejercicios ad-hoc

## 🐛 Solución de Problemas

### Error: "No se encontró la tabla exercises"
**Solución:** Ejecuta la migración SQL del Paso 1

### Error: "Error al obtener ejercicios"
**Solución:** 
1. Verifica que RLS esté deshabilitado en la tabla exercises
2. Ejecuta en SQL Editor:
```sql
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
```

### El selector de ejercicios está vacío
**Solución:**
1. Verifica que los ejercicios se insertaron correctamente:
```sql
SELECT COUNT(*) FROM exercises;
```
2. Si es 0, ejecuta nuevamente la parte del INSERT de la migración

### Error: "duplicate key value violates unique constraint"
**Solución:** Este error es normal si intentas insertar ejercicios que ya existen. La cláusula `ON CONFLICT (name) DO NOTHING` previene esto, pero si lo ves, significa que los ejercicios ya están en la base de datos.

## 📝 Notas Adicionales

### RLS (Row Level Security)
La tabla `exercises` tiene RLS **deshabilitado** porque:
- Es una tabla de referencia/catálogo compartida por todos
- No contiene información sensible
- Simplifica el acceso desde el cliente
- El campo `created_by` mantiene registro de quién creó cada ejercicio

### Columna `exercise_id` en `routine_exercises`
- **Permite vincular** ejercicios de la librería con ejercicios en rutinas
- **Es opcional** (nullable) para mantener retrocompatibilidad
- **El frontend actual** solo usa `exercise_name` por ahora
- **Futura implementación** podría usar `exercise_id` para:
  - Actualizar automáticamente el nombre si cambia en la librería
  - Mostrar información adicional del ejercicio (grupo muscular, equipamiento)
  - Generar reportes de ejercicios más populares

## ✨ Resumen

Con estos cambios:

1. ✅ **Se agregó soporte completo para la tabla `exercises`** en el API client
2. ✅ **Se corrigió el hook `useExercises`** para usar Supabase correctamente
3. ✅ **Se creó la migración SQL** para configurar la base de datos
4. ✅ **El componente `ExerciseCombobox` ahora funciona** correctamente
5. ✅ **Se pueden crear rutinas con ejercicios** sin errores
6. ✅ **Se pueden crear nuevos ejercicios** que se guardan en la librería
7. ✅ **Los ejercicios se pueden reutilizar** en múltiples rutinas

La aplicación ahora debería funcionar correctamente al asignar ejercicios a las rutinas. 🎉