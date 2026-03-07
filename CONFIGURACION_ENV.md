# 🔐 Configuración de Variables de Entorno

Esta guía te ayudará a configurar correctamente las variables de entorno para mantener tus credenciales seguras.

---

## 📋 ¿Qué son las Variables de Entorno?

Las variables de entorno son valores de configuración que se almacenan fuera del código fuente. Esto permite:

- 🔒 **Seguridad**: Tus credenciales no se suben a GitHub
- 🔄 **Flexibilidad**: Diferentes configuraciones para desarrollo y producción
- 👥 **Colaboración**: Cada desarrollador usa sus propias credenciales

---

## 🚀 Configuración Inicial

### Paso 1: Obtener tus Credenciales de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** (⚙️) → **API**
4. Copia los siguientes valores:

   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Project ID**: La parte `xxxxxxxxxxxxx` de la URL
   - **anon/public key**: Una llave JWT muy larga

### Paso 2: Crear tu archivo .env

El proyecto ya incluye un archivo `.env` con valores por defecto. Para usar tus propias credenciales:

```bash
# Opción 1: Editar el archivo .env existente
# Reemplaza los valores con tus credenciales

# Opción 2: Copiar desde el ejemplo
cp .env.example .env
# Luego edita .env con tus valores
```

### Paso 3: Editar el archivo .env

Abre el archivo `.env` y reemplaza los valores:

```bash
# ============================================
# CONFIGURACIÓN DE SUPABASE
# ============================================

# Project ID (solo la parte alfanumérica)
VITE_SUPABASE_PROJECT_ID=ihyeytzmrgfglsdpsvzb

# Public Anon Key (la llave JWT completa)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URL de Supabase (se construye automáticamente)
VITE_SUPABASE_URL=https://ihyeytzmrgfglsdpsvzb.supabase.co

# ============================================
# CONFIGURACIÓN DE LA APLICACIÓN
# ============================================

# Personalización (opcional)
VITE_GYM_NAME=GYM Lagunetica
VITE_GYM_LOCATION=Los Teques, Sector Lagunetica
VITE_APP_URL=http://localhost:5173
```

---

## 🔍 Estructura de Archivos

### `.env`
- ❌ **NO SE SUBE A GITHUB**
- ✅ Contiene tus credenciales reales
- ✅ Es personal de cada desarrollador
- ✅ Está en `.gitignore`

### `.env.example`
- ✅ **SE SUBE A GITHUB**
- ✅ Plantilla de ejemplo
- ✅ Sin valores reales
- ✅ Sirve como documentación

### `.gitignore`
- ✅ Protege tu `.env`
- ✅ Evita que se suban credenciales
- ✅ Ya está configurado

---

## 📖 Variables Disponibles

### Obligatorias (Supabase)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_PROJECT_ID` | ID de tu proyecto Supabase | `ihyeytzmrgfglsdpsvzb` |
| `VITE_SUPABASE_ANON_KEY` | Llave pública anónima | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_SUPABASE_URL` | URL completa del proyecto | `https://xxx.supabase.co` |

### Opcionales (Personalización)

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_GYM_NAME` | Nombre del gimnasio | `GYM Lagunetica` |
| `VITE_GYM_LOCATION` | Ubicación del gym | `Los Teques, Sector Lagunetica` |
| `VITE_APP_URL` | URL de la app | `http://localhost:5173` |

---

## ⚙️ Uso en el Código

### Leer Variables de Entorno

```typescript
// En cualquier archivo TypeScript/React
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const gymName = import.meta.env.VITE_GYM_NAME || 'GYM Lagunetica';
```

### Validación de Variables

El archivo `/utils/supabase/info.tsx` valida automáticamente:

```typescript
if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_SUPABASE_PROJECT_ID) {
    console.warn('⚠️ VITE_SUPABASE_PROJECT_ID no está configurado');
  }
}
```

---

## 🛡️ Seguridad

### ✅ Buenas Prácticas

1. **NUNCA** subas el archivo `.env` a GitHub
2. **NUNCA** compartas tus credenciales públicamente
3. **SIEMPRE** usa variables de entorno para datos sensibles
4. **SIEMPRE** mantén actualizado `.gitignore`
5. **REVISA** que `.env` esté en `.gitignore` antes de hacer commit

### ❌ Errores Comunes

```bash
# ❌ MAL - Hardcodear credenciales en el código
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

# ✅ BIEN - Usar variables de entorno
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### 🔐 Verificar que .env no se suba

```bash
# Ver archivos que se subirán
git status

# .env NO debe aparecer en la lista
# Si aparece, verifica tu .gitignore
```

---

## 🐛 Solución de Problemas

### Problema: "Las variables no se cargan"

**Solución:**
1. Verifica que el archivo se llame exactamente `.env` (con el punto)
2. Reinicia el servidor de desarrollo (`npm run dev`)
3. Las variables deben empezar con `VITE_` para ser accesibles en el frontend

### Problema: "Warning de variables no configuradas"

**Solución:**
```bash
# Asegúrate de que .env existe
ls -la | grep .env

# Verifica que tiene contenido
cat .env

# Reinicia el servidor
npm run dev
```

### Problema: "Cannot find module '/utils/supabase/info'"

**Solución:**
El archivo `/utils/supabase/info.tsx` ahora lee desde `.env`. Asegúrate de tener las variables configuradas.

---

## 🚀 Entornos Diferentes

### Desarrollo Local

```bash
# .env
VITE_APP_URL=http://localhost:5173
```

### Producción

```bash
# .env.production (crear nuevo archivo)
VITE_APP_URL=https://tu-dominio.com
VITE_SUPABASE_PROJECT_ID=tu_project_id_produccion
```

---

## 📝 Checklist de Configuración

- [ ] Archivo `.env` creado
- [ ] Variables de Supabase configuradas
- [ ] Servidor de desarrollo reiniciado
- [ ] No aparecen warnings en consola
- [ ] `.env` está en `.gitignore`
- [ ] Aplicación funciona correctamente
- [ ] Login exitoso con credenciales

---

## 🆘 Ayuda Adicional

Si tienes problemas:

1. Verifica la consola del navegador (F12 → Console)
2. Revisa los logs del servidor (`npm run dev`)
3. Confirma que tus credenciales de Supabase son correctas
4. Asegúrate de que el proyecto de Supabase está activo

---

## 📚 Referencias

- [Vite - Variables de Entorno](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase - API Keys](https://supabase.com/docs/guides/api/api-keys)
- [GitHub - .gitignore](https://git-scm.com/docs/gitignore)

---

**✅ ¡Configuración completa!** Ahora tus credenciales están seguras y tu aplicación está lista para funcionar.
