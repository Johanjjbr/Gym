# 📸 GUÍA VISUAL: Cómo Configurar Supabase

## Paso a Paso con Capturas de Pantalla

---

## 🎯 OBJETIVO

Configurar completamente la base de datos del gimnasio en Supabase ejecutando el schema SQL.

---

## 📋 PASO 1: Acceder a Supabase Dashboard

### 1.1 Ir a Supabase
- Abre tu navegador
- Ve a: **https://supabase.com/dashboard**
- Inicia sesión con tu cuenta

### 1.2 Seleccionar tu Proyecto
- En la pantalla principal, verás una lista de tus proyectos
- **Haz clic en el proyecto** donde quieres configurar el gimnasio
- Si no tienes un proyecto, crea uno nuevo haciendo clic en "New Project"

---

## 🗄️ PASO 2: Abrir SQL Editor

### 2.1 Navegar al SQL Editor
```
┌─────────────────────────────────────┐
│  Supabase Dashboard                 │
│                                     │
│  ┌─ Menú Lateral ─────────────┐   │
│  │  🏠 Home                    │   │
│  │  📊 Table Editor            │   │
│  │  🔐 Authentication          │   │
│  │  🗄️  Database               │   │
│  │      ↳ Tables              │   │
│  │      ↳ Triggers            │   │
│  │      ↳ Functions           │   │
│  │      ↳ Extensions          │   │
│  │  ▶️  SQL Editor  ← ¡AQUÍ!  │   │
│  │  🔌 Edge Functions         │   │
│  │  📦 Storage                │   │
│  └────────────────────────────┘   │
└─────────────────────────────────────┘
```

- En el **menú lateral izquierdo**
- Busca la sección **"SQL Editor"**
- **Haz clic** en "SQL Editor"

### 2.2 Crear Nueva Query
- Una vez dentro del SQL Editor
- Verás un botón **"New Query"** o **"+ New query"**
- **Haz clic** en ese botón
- Se abrirá un editor de texto vacío

---

## 📝 PASO 3: Copiar y Pegar el Schema SQL

### 3.1 Abrir el archivo schema.sql

**Opción A: Desde tu editor de código**
```
1. Abre tu proyecto en VS Code (o tu editor favorito)
2. Navega a: /supabase/migrations/schema.sql
3. Selecciona TODO el contenido (Ctrl+A o Cmd+A)
4. Copia (Ctrl+C o Cmd+C)
```

**Opción B: Desde el explorador de archivos**
```
1. Abre el archivo: /supabase/migrations/schema.sql
2. Usa un editor de texto (Notepad++, Sublime, etc.)
3. Selecciona TODO el contenido
4. Copia
```

### 3.2 Pegar en Supabase SQL Editor
```
┌──────────────────────────────────────────────┐
│  SQL Editor - New Query                      │
├──────────────────────────────────────────────┤
│  [Run] [Save] [Format]                       │
├──────────────────────────────────────────────┤
│  1  -- ================================       │
│  2  -- SCHEMA SQL COMPLETO PARA SISTEMA      │
│  3  -- DE GIMNASIO                           │
│  4  -- ================================       │
│  5                                            │
│  6  CREATE EXTENSION IF NOT EXISTS ...       │
│  7                                            │
│  ...                                          │
│                                               │
│  (Pega aquí TODO el contenido del schema.sql)│
│                                               │
└──────────────────────────────────────────────┘
```

**Pasos:**
1. Haz clic dentro del editor (el área de texto grande)
2. **Pega** el contenido copiado (Ctrl+V o Cmd+V)
3. Verifica que se haya pegado correctamente
4. Deberías ver aproximadamente **600-700 líneas de código SQL**

### 3.3 Verificar el Contenido
Asegúrate de que el archivo pegado incluya:

✅ **Primera línea debe ser:**
```sql
-- =============================================
-- SCHEMA SQL COMPLETO PARA SISTEMA DE GIMNASIO
-- =============================================
```

✅ **Debe contener estas secciones:**
- `CREATE EXTENSION`
- `CREATE TABLE IF NOT EXISTS users`
- `CREATE TABLE IF NOT EXISTS staff`
- `CREATE TABLE IF NOT EXISTS payments`
- ... (12 tablas en total)
- `CREATE INDEX`
- `CREATE POLICY`
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

---

## ▶️ PASO 4: Ejecutar el Schema

### 4.1 Hacer clic en el botón RUN
```
┌──────────────────────────────────────────────┐
│  SQL Editor                                  │
├──────────────────────────────────────────────┤
│  [▶️ RUN]  ← ¡HAZ CLIC AQUÍ!                 │
│                                               │
│  O presiona: Ctrl + Enter (Windows/Linux)    │
│             Cmd + Enter (Mac)                │
└──────────────────────────────────────────────┘
```

### 4.2 Esperar la Ejecución
- Verás un indicador de carga (spinner)
- **NO CIERRES LA VENTANA** mientras se ejecuta
- Puede tardar **10-30 segundos**

### 4.3 Verificar el Resultado

**✅ SI TODO SALIÓ BIEN:**
```
┌──────────────────────────────────────────────┐
│  Results                                     │
├──────────────────────────────────────────────┤
│  ✅ Success                                  │
│  Query executed successfully                 │
│                                               │
│  Rows: 0                                     │
│  Time: 15.3s                                 │
└──────────────────────────────────────────────┘
```

**❌ SI HAY ERRORES:**
```
┌──────────────────────────────────────────────┐
│  Results                                     │
├──────────────────────────────────────────────┤
│  ❌ Error                                    │
│  syntax error at or near "..."              │
│  Line 45                                     │
└──────────────────────────────────────────────┘
```

Si ves errores:
1. Verifica que copiaste TODO el archivo completo
2. Asegúrate de no haber modificado nada
3. Intenta ejecutar nuevamente

---

## ✅ PASO 5: Verificar las Tablas Creadas

### 5.1 Ir a Table Editor
```
┌─────────────────────────────────────┐
│  Menú Lateral                       │
│                                     │
│  📊 Table Editor  ← HAZ CLIC AQUÍ  │
└─────────────────────────────────────┘
```

### 5.2 Verificar que existan estas 12 tablas:
```
┌──────────────────────────────────────────────┐
│  Tables                                      │
├──────────────────────────────────────────────┤
│  ✅ users                        (0 rows)    │
│  ✅ staff                        (0 rows)    │
│  ✅ payments                     (0 rows)    │
│  ✅ attendance                   (0 rows)    │
│  ✅ physical_progress            (0 rows)    │
│  ✅ routine_templates            (0 rows)    │
│  ✅ exercise_templates           (0 rows)    │
│  ✅ user_routine_assignments     (0 rows)    │
│  ✅ workout_sessions             (0 rows)    │
│  ✅ workout_exercise_logs        (0 rows)    │
│  ✅ set_logs                     (0 rows)    │
│  ✅ invoices                     (0 rows)    │
│                                               │
│  Plus: kv_store_104060a1  (tabla de sistema)│
└──────────────────────────────────────────────┘
```

**Si ves las 12 tablas:** ✅ ¡PERFECTO! El schema se ejecutó correctamente

**Si faltan tablas:** ❌ Vuelve al paso 3 y ejecuta el schema nuevamente

---

## 🌱 PASO 6: Ejecutar el Seed (Crear Usuarios de Prueba)

Ahora que las tablas están creadas, necesitas crear usuarios de prueba.

### Opción A: Desde la Interfaz del Sistema (Más fácil)

1. **Ejecuta tu aplicación**
2. **Importa el componente DatabaseSetup:**
   ```tsx
   import { DatabaseSetup } from './components/DatabaseSetup';
   ```
3. **Muéstralo en tu App:**
   ```tsx
   <DatabaseSetup />
   ```
4. **Haz clic en "Inicializar Base de Datos"**
5. **Espera** a que se complete
6. **¡Listo!** Usuarios creados

### Opción B: Desde API directamente

**Usando cURL en terminal:**
```bash
curl -X POST \
  https://TU_PROJECT_ID.supabase.co/functions/v1/make-server-104060a1/seed
```

**Usando JavaScript en consola del navegador:**
```javascript
fetch('https://TU_PROJECT_ID.supabase.co/functions/v1/make-server-104060a1/seed', {
  method: 'POST'
})
.then(r => r.json())
.then(console.log);
```

**Reemplaza `TU_PROJECT_ID`** con el ID de tu proyecto de Supabase.

---

## 🎉 PASO 7: Verificar que Funciona

### 7.1 Verificar Usuarios en Supabase

**Ir a Authentication:**
```
┌─────────────────────────────────────┐
│  Menú Lateral                       │
│                                     │
│  🔐 Authentication  ← HAZ CLIC     │
│      ↳ Users                       │
└─────────────────────────────────────┘
```

**Deberías ver 3 usuarios:**
```
┌──────────────────────────────────────────────┐
│  Users (3)                                   │
├──────────────────────────────────────────────┤
│  📧 admin@gymteques.com                      │
│  📧 trainer@gymteques.com                    │
│  📧 recepcion@gymteques.com                  │
└──────────────────────────────────────────────┘
```

### 7.2 Verificar Miembros en la Tabla

**Ir a Table Editor → users:**
```
┌──────────────────────────────────────────────┐
│  users (5 rows)                              │
├──────────────────────────────────────────────┤
│  GYM-001  Carlos Rodríguez      Activo      │
│  GYM-002  María González        Activo      │
│  GYM-003  José Pérez            Moroso      │
│  GYM-004  Ana Martínez          Activo      │
│  GYM-005  Luis Hernández        Inactivo    │
└──────────────────────────────────────────────┘
```

### 7.3 Probar Login en tu App

**Credenciales de prueba:**
```
Administrador:
Email: admin@gymteques.com
Password: Admin123!

Entrenador:
Email: trainer@gymteques.com
Password: Trainer123!

Recepción:
Email: recepcion@gymteques.com
Password: Recepcion123!
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS COMUNES

### ❌ Error: "relation already exists"
**Solución:** Las tablas ya fueron creadas. No necesitas ejecutar el schema nuevamente.

### ❌ Error: "permission denied for schema public"
**Solución:** Asegúrate de estar en el proyecto correcto de Supabase.

### ❌ Las tablas no aparecen en Table Editor
**Solución:** 
1. Refresca la página (F5)
2. Verifica que el query se ejecutó sin errores
3. Revisa los logs en la consola

### ❌ Error al ejecutar seed: "table does not exist"
**Solución:** Ejecuta primero el schema SQL (Paso 3-4).

### ❌ Error: "Invalid token" al hacer login
**Solución:** 
1. Verifica que ejecutaste el seed correctamente
2. Los usuarios deben existir en Authentication
3. Revisa que el email y password sean correctos

---

## ✅ CHECKLIST FINAL

Marca cada item cuando lo completes:

- [ ] ✅ Accedí a Supabase Dashboard
- [ ] ✅ Abrí el SQL Editor
- [ ] ✅ Copié el contenido completo de schema.sql
- [ ] ✅ Pegué el contenido en Supabase SQL Editor
- [ ] ✅ Ejecuté el query (botón RUN)
- [ ] ✅ Vi el mensaje "Success"
- [ ] ✅ Verifiqué que las 12 tablas existan en Table Editor
- [ ] ✅ Ejecuté el seed (creé usuarios de prueba)
- [ ] ✅ Verifiqué que los 3 usuarios existan en Authentication
- [ ] ✅ Verifiqué que los 5 miembros existan en la tabla users
- [ ] ✅ Probé el login con admin@gymteques.com
- [ ] ✅ El login funcionó correctamente

---

## 🎓 TIPS IMPORTANTES

### 💡 Tip 1: Guardar la Query
Después de ejecutar el schema exitosamente:
1. Haz clic en el botón **"Save"**
2. Dale un nombre: "Schema Gimnasio Inicial"
3. Así podrás volver a ejecutarlo si es necesario

### 💡 Tip 2: Exportar/Importar
Supabase permite exportar el schema:
1. Ve a: Database → Schema Visualization
2. Puedes ver un diagrama de todas tus tablas y relaciones

### 💡 Tip 3: Backups
Supabase hace backups automáticos:
1. Ve a: Settings → Database
2. Puedes configurar la frecuencia de backups
3. También puedes hacer backups manuales

---

## 📞 ¿NECESITAS MÁS AYUDA?

Si después de seguir esta guía aún tienes problemas:

1. **Revisa los logs:**
   - Supabase Dashboard → Edge Functions → Logs
   - SQL Editor → Results panel

2. **Consulta la documentación oficial:**
   - https://supabase.com/docs

3. **Archivos de ayuda en el proyecto:**
   - `/INSTRUCCIONES_SUPABASE.md`
   - `/SUPABASE_STRUCTURE.md`
   - `/RESUMEN_CONFIGURACION.md`

---

**¡Éxito con tu configuración! 💪🏋️‍♂️**
