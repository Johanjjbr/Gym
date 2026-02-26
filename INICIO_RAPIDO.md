# 🚀 Inicio Rápido - Sistema Gimnasio Los Teques

## ¡Bienvenido! 

Tu sistema de gestión de gimnasio está **casi listo**. Sigue estos pasos rápidos para comenzar.

---

## ⚡ 3 Pasos para Empezar

### 1️⃣ Ejecuta el Schema SQL en Supabase

**¿Qué hace?** Crea todas las tablas necesarias en tu base de datos.

**Cómo hacerlo:**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Click en **SQL Editor** (menú lateral)
4. Click en **"New Query"**
5. Copia TODO el contenido de `/supabase/migrations/schema.sql`
6. Pégalo en el editor
7. Click en **"RUN"** o presiona `Ctrl + Enter`
8. Espera el mensaje: `✅ Success`

**Tiempo estimado:** 1 minuto

---

### 2️⃣ Crea los Usuarios de Prueba

**¿Qué hace?** Crea 3 cuentas de staff y 5 usuarios de ejemplo.

**Opción A - Desde terminal (Recomendado):**
```bash
curl -X POST https://jhzgcfvshnjgktajspqo.supabase.co/functions/v1/make-server-104060a1/seed
```

**Opción B - Desde la app:**
1. Ejecuta: `npm run dev`
2. Abre: `http://localhost:5173/test-supabase`
3. Baja hasta "Utilidades"
4. Click en "Ejecutar Seed"

**Tiempo estimado:** 30 segundos

---

### 3️⃣ Inicia Sesión

**Credenciales de prueba:**

```
👤 ADMINISTRADOR
Email:    admin@gymteques.com
Password: Admin123!

👤 ENTRENADOR
Email:    trainer@gymteques.com
Password: Trainer123!

👤 RECEPCIÓN
Email:    recepcion@gymteques.com
Password: Recepcion123!
```

**Cómo hacerlo:**
1. Ve a: `http://localhost:5173`
2. Click en **"+ Mostrar credenciales de prueba"**
3. Click en **"Administrador"** (o el rol que prefieras)
4. Click en **"Iniciar Sesión"**

**Tiempo estimado:** 10 segundos

---

## ✅ Verificación Rápida

Después de los 3 pasos, deberías:

- ✅ Ver el **Dashboard** con gráficos y estadísticas
- ✅ Ver tu **nombre** en la esquina inferior izquierda (Sidebar)
- ✅ Poder **navegar** entre todas las secciones
- ✅ Poder **cerrar sesión** con el botón de logout

---

## 🧪 Test de Conexión (Opcional pero Recomendado)

**Para verificar que todo funciona:**

1. Ve a: `http://localhost:5173/test-supabase`
   - O desde Sidebar: Click en **"Test Supabase"** (sección Desarrollo)

2. Click en **"Ejecutar Todos los Tests"**

3. Verifica que todos estén en verde ✅:
   - Health Check ✅
   - Login ✅
   - Obtener Usuarios ✅
   - Obtener Pagos ✅
   - Obtener Staff ✅
   - Obtener Asistencia ✅
   - Obtener Rutinas ✅
   - Estadísticas ✅

**Si alguno falla ❌:** Ve a `GUIA_INTEGRACION_FRONTEND.md` para debugging.

---

## 📚 Estructura del Proyecto

```
Gimnasio Los Teques/
├── 📁 src/app/
│   ├── App.tsx                    # Punto de entrada
│   ├── routes.ts                  # Rutas de la app
│   ├── 📁 pages/
│   │   ├── Login.tsx              # Pantalla de inicio
│   │   ├── Dashboard.tsx          # Panel principal ⭐
│   │   ├── Users.tsx              # Gestión de usuarios
│   │   ├── Payments.tsx           # Control de pagos
│   │   ├── Staff.tsx              # Gestión de personal
│   │   ├── Attendance.tsx         # Registro de asistencia
│   │   ├── Routines.tsx           # Rutinas de ejercicio
│   │   └── TestSupabase.tsx       # Tests de conexión
│   ├── 📁 components/
│   │   ├── Sidebar.tsx            # Menú lateral
│   │   └── ProtectedRoute.tsx     # Seguridad de rutas
│   ├── 📁 contexts/
│   │   └── AuthContext.tsx        # Gestión de autenticación
│   └── 📁 lib/
│       └── api.ts                 # Cliente API ⭐
├── 📁 supabase/
│   ├── 📁 migrations/
│   │   └── schema.sql             # Schema de la BD ⭐
│   └── 📁 functions/
│       └── 📁 server/
│           ├── index.tsx          # Edge Function ⭐
│           └── seed.tsx           # Datos de prueba ⭐
└── 📄 Documentación/
    ├── INICIO_RAPIDO.md           # Este archivo 👈
    ├── GUIA_INTEGRACION_FRONTEND.md
    ├── CHECKLIST_SETUP.md
    ├── CRUD_DOCUMENTATION.md
    └── ...más archivos de ayuda
```

---

## 🎯 Próximos Pasos

Una vez que hayas completado los 3 pasos y todo funcione:

### Desarrollo Inmediato
1. **Conectar Usuarios** con datos reales
   - Edita `/src/app/pages/Users.tsx`
   - Usa `api.users.getAll()` para obtener usuarios
   - Implementa formularios de creación/edición

2. **Implementar Pagos**
   - Edita `/src/app/pages/Payments.tsx`
   - Usa `api.payments.getAll()` y `api.payments.create()`
   - Agrega filtros y búsqueda

3. **Sistema de Asistencia**
   - Edita `/src/app/pages/Attendance.tsx`
   - Implementa QR Code con `qrcode.react` (ya instalado)
   - Conecta con `api.attendance.create()`

### Mejoras a Mediano Plazo
- Dashboard con datos en tiempo real
- Sistema completo de rutinas
- Reportes y exportación de datos
- Notificaciones de pagos vencidos
- Panel de métricas de rendimiento físico

---

## 🆘 ¿Problemas?

### Login no funciona
➡️ Verifica que ejecutaste el **Paso 2** (Seed de usuarios)  
➡️ Ve a Supabase → Authentication → Users  
➡️ Deben existir 3 usuarios

### Tests fallan
➡️ Verifica que ejecutaste el **Paso 1** (Schema SQL)  
➡️ Ve a Supabase → Table Editor  
➡️ Deben existir 12 tablas

### Error "Network" o "Failed to fetch"
➡️ Verifica tu `PROJECT_ID` en `/utils/supabase/info.tsx`  
➡️ Confirma que la Edge Function esté desplegada  
➡️ Revisa la consola del navegador (F12)

### Más ayuda
📖 Lee: `GUIA_INTEGRACION_FRONTEND.md` - Guía completa de debugging  
📖 Lee: `CHECKLIST_SETUP.md` - Checklist paso a paso detallado  
📖 Lee: `CRUD_DOCUMENTATION.md` - Ejemplos de código

---

## 💡 Tips Útiles

### 🔑 Gestión de Sesión
- El token se guarda en `localStorage`
- La sesión expira después de 24 horas
- Puedes ver el token en DevTools → Application → Local Storage

### 🎨 Personalización
- Colores del tema: `/src/styles/theme.css`
- Fuentes: Rajdhani (títulos) + Inter (texto)
- Colores principales:
  - Verde Neón: `#10f94e`
  - Rojo Neón: `#ff3b5c`
  - Fondo oscuro: `#0a0a0f`

### 🔐 Seguridad
- **RLS (Row Level Security)** está activo
- Cada tabla tiene políticas de acceso
- Los roles controlan los permisos:
  - **Administrador**: Acceso total
  - **Entrenador**: Rutinas y usuarios
  - **Recepción**: Asistencia y pagos

---

## 📞 Información del Proyecto

**Nombre:** Sistema de Gestión Gimnasio Los Teques  
**Ubicación:** Sector Lagunetica, Los Teques  
**Versión:** 1.0  
**Framework:** React + TypeScript + Tailwind CSS  
**Backend:** Supabase (PostgreSQL + Auth + Edge Functions)  
**Estado:** ✅ Integración Frontend-Backend Completa

---

## ✨ Características Implementadas

✅ Sistema de autenticación completo  
✅ Gestión de usuarios (miembros del gym)  
✅ Control de pagos y mensualidades  
✅ Registro de asistencia  
✅ Gestión de personal (staff)  
✅ Sistema de roles y permisos  
✅ Dashboard con estadísticas  
✅ Interfaz moderna y responsive  
✅ Base de datos con RLS  
✅ API REST completa  

🚧 En desarrollo:  
- Sistema completo de rutinas de ejercicio  
- Seguimiento de progreso físico (peso, IMC, etc.)  
- Generación de códigos QR  
- Sistema de reportes avanzados  
- Notificaciones automáticas  

---

## 🎉 ¡Listo para Empezar!

Ejecuta estos comandos y comienza:

```bash
# 1. Instalar dependencias (si no lo has hecho)
npm install

# 2. Ejecutar en modo desarrollo
npm run dev

# 3. Abrir navegador
# http://localhost:5173
```

**¡Mucho éxito con tu gimnasio! 💪🏋️‍♂️**

---

*Última actualización: Febrero 2026*
