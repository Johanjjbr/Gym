# ⚡ Guía Rápida: Corrección de Ejercicios

## 🎯 Problema
Error al asignar ejercicios a las rutinas porque faltaba la tabla `exercises` en Supabase.

## ✅ Solución en 3 Pasos

### 1️⃣ Ejecutar Migración SQL
```bash
# Archivo: /supabase/migrations/04-fix-exercises-integration.sql
```
1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**
2. Copia y pega el contenido del archivo
3. Clic en **Run**
4. ✅ Debería ejecutarse sin errores

### 2️⃣ Verificar Instalación
```bash
# Archivo: /supabase/migrations/05-verify-exercises-setup.sql
```
1. En el mismo SQL Editor
2. Copia y pega el contenido del archivo
3. Clic en **Run**
4. ✅ Todos los checks deberían mostrar ✅

### 3️⃣ Probar en la App
1. **Reinicia la app** (Ctrl+C y vuelve a ejecutar)
2. Ve a **Rutinas** → **Nueva Rutina**
3. Clic en **Añadir Ejercicio**
4. Clic en el selector de ejercicio
5. ✅ Deberías ver la lista de 25 ejercicios

## 📁 Archivos Modificados

### Frontend
- ✅ `/src/app/lib/api.ts` - Agregado soporte para tabla `exercises`
- ✅ `/src/app/hooks/useExercises.ts` - Corregido para usar Supabase

### Base de Datos
- ✅ `/supabase/migrations/04-fix-exercises-integration.sql` - Crear tabla y datos
- ✅ `/supabase/migrations/05-verify-exercises-setup.sql` - Script de verificación

### Documentación
- 📖 `/INSTRUCCIONES_CORRECCION_EJERCICIOS.md` - Guía detallada

## 🔍 ¿Funcionó?

### ✅ Sí funciona si:
- El selector muestra ejercicios
- Puedes crear nuevos ejercicios
- Puedes guardar rutinas con ejercicios
- No hay errores en la consola

### ❌ No funciona si:
- Error: "No se encontró la tabla exercises"
  → Ejecuta el Paso 1 nuevamente
  
- El selector está vacío
  → Verifica con: `SELECT COUNT(*) FROM exercises;`
  
- Error al crear ejercicios
  → Verifica con: `ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;`

## 💡 Ayuda Adicional

Ver documentación completa en:
**`/INSTRUCCIONES_CORRECCION_EJERCICIOS.md`**

## 🎉 ¡Listo!

Una vez completados los 3 pasos, el sistema de rutinas debería funcionar perfectamente.
