# 📋 INSTRUCCIONES PARA CONFIGURAR SUPABASE

## ¡Bienvenido al Sistema de Gestión de Gimnasio! 💪

Este documento te guiará paso a paso para configurar completamente la base de datos en Supabase.

---

## 🔧 PASO 1: Ejecutar Schema SQL en Supabase

### Instrucciones:

1. **Accede a Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, busca "SQL Editor"
   - Haz clic en "New Query"

3. **Copia y pega el Schema SQL**
   - Abre el archivo: `/supabase/migrations/schema.sql`
   - Copia **TODO** el contenido del archivo
   - Pégalo en el editor SQL de Supabase

4. **Ejecuta el Query**
   - Haz clic en el botón "Run" o presiona `Ctrl + Enter`
   - Verifica que se ejecute sin errores

✅ **¡Listo!** Las 12 tablas han sido creadas con todas las políticas de seguridad (RLS).

---

## 👥 PASO 2: Crear Usuarios de Prueba Automáticamente

### Opción Recomendada: Endpoint de Seed Automático

Para crear todos los usuarios de prueba automáticamente, simplemente necesitas llamar al endpoint de seed:

### Desde tu navegador o Postman:

```
POST https://[TU_PROJECT_ID].supabase.co/functions/v1/make-server-104060a1/seed
Content-Type: application/json
```

**Nota:** No requiere autenticación la primera vez.

### Usando `curl` desde terminal:

```bash
curl -X POST https://[TU_PROJECT_ID].supabase.co/functions/v1/make-server-104060a1/seed
```

### Esto creará automáticamente:

✅ **3 usuarios de staff con autenticación:**
- **Administrador**: admin@gymteques.com / Admin123!
- **Entrenador**: trainer@gymteques.com / Trainer123!
- **Recepción**: recepcion@gymteques.com / Recepcion123!

✅ **5 miembros de prueba** con diferentes estados (Activo, Moroso, Inactivo)

✅ **Algunos pagos de ejemplo**

---

## 🔐 PASO 3: Probar el Sistema

### Inicia sesión con cualquiera de estos usuarios:

**Administrador (Acceso Total)**
- Email: `admin@gymteques.com`
- Password: `Admin123!`

**Entrenador (Gestión de Rutinas)**
- Email: `trainer@gymteques.com`
- Password: `Trainer123!`

**Recepción (Pagos y Asistencia)**
- Email: `recepcion@gymteques.com`
- Password: `Recepcion123!`

---

## 📊 Tablas Creadas

El sistema incluye las siguientes tablas:

1. **users** - Miembros del gimnasio
2. **staff** - Personal (Administrador, Entrenador, Recepción)
3. **payments** - Control de pagos/mensualidades
4. **attendance** - Registro de asistencia
5. **physical_progress** - Seguimiento físico (peso, IMC, grasa corporal)
6. **routine_templates** - Plantillas de rutinas de entrenamiento
7. **exercise_templates** - Ejercicios dentro de las rutinas
8. **user_routine_assignments** - Asignación de rutinas a usuarios
9. **workout_sessions** - Sesiones de entrenamiento
10. **workout_exercise_logs** - Registro de ejercicios completados
11. **set_logs** - Registro de series y repeticiones
12. **invoices** - Facturas generadas

---

## 🔒 Seguridad (Row Level Security - RLS)

Todas las tablas tienen políticas de seguridad configuradas:

- **Administrador**: Acceso total a todas las operaciones
- **Entrenador**: Puede crear y gestionar rutinas, ver usuarios
- **Recepción**: Puede gestionar pagos, asistencia y usuarios

---

## 🆘 Solución de Problemas

### Error: "Database error querying schema"

**Solución:** Asegúrate de haber ejecutado el schema SQL completo en el Paso 1.

### Error: "Usuario no encontrado en staff"

**Solución:** Ejecuta el endpoint de seed (Paso 2) para crear los usuarios de prueba.

### Error al crear usuarios manualmente

**Solución:** Solo el Administrador puede crear nuevos usuarios de staff. Inicia sesión como `admin@gymteques.com` primero.

---

## 📝 Crear Usuarios Adicionales

Una vez que hayas iniciado sesión como Administrador, puedes:

1. Ir a la sección **Personal**
2. Hacer clic en **"Nuevo Staff"**
3. Completar el formulario con:
   - Nombre
   - Email
   - Contraseña
   - Rol (Administrador, Entrenador, Recepción)
   - Teléfono
   - Turno

---

## 🎯 Próximos Pasos

1. ✅ Ejecutar Schema SQL
2. ✅ Ejecutar Seed de usuarios
3. ✅ Iniciar sesión con admin@gymteques.com
4. 🚀 ¡Comenzar a usar el sistema!

---

## 📞 Soporte

Si tienes algún problema durante la configuración, revisa los logs del servidor en:
- Supabase Dashboard → Edge Functions → Logs

---

**¡Listo! Tu sistema de gestión de gimnasio está configurado y funcionando. 💪🏋️‍♂️**
