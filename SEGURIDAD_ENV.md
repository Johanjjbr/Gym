# 🔒 Guía de Seguridad - Variables de Entorno

## ⚠️ IMPORTANTE: Protección de Credenciales

Esta guía te ayudará a mantener tus credenciales de Supabase seguras y evitar que se suban accidentalmente a GitHub.

---

## 🎯 Objetivo

El sistema ahora usa **variables de entorno** para proteger tus credenciales:

- ✅ Las credenciales están en `.env` (archivo local)
- ✅ `.env` está en `.gitignore` (NO se sube a GitHub)
- ✅ `.env.example` muestra la estructura (sin valores reales)

---

## 📂 Archivos Importantes

### ✅ Archivo `.gitignore`

Este archivo le dice a Git qué archivos **NO** debe subir:

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

**Status:** ✅ Ya creado y configurado

### ✅ Archivo `.env` (TUS CREDENCIALES)

```bash
# ⚠️ Este archivo NO se sube a GitHub
VITE_SUPABASE_PROJECT_ID=ihyeytzmrgfglsdpsvzb
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Status:** ✅ Ya creado con tus credenciales actuales

### ✅ Archivo `.env.example` (PLANTILLA PÚBLICA)

```bash
# ✅ Este archivo SÍ se sube a GitHub como referencia
VITE_SUPABASE_PROJECT_ID=tu_project_id_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**Status:** ✅ Ya creado sin credenciales reales

---

## 🔍 Verificación de Seguridad

### ✅ Paso 1: Verificar que .env está protegido

```bash
# Ejecutar en la terminal del proyecto
git status

# ❌ Si aparece ".env" en la lista → ¡PELIGRO!
# ✅ Si NO aparece ".env" → Todo bien
```

### ✅ Paso 2: Verificar .gitignore

```bash
# Ver contenido de .gitignore
cat .gitignore | grep .env

# Deberías ver:
# .env
# .env.local
# .env.development.local
# etc.
```

### ✅ Paso 3: Prueba de seguridad

```bash
# Intentar agregar .env manualmente
git add .env

# Deberías ver:
# The following paths are ignored by one of your .gitignore files:
# .env
```

---

## 🚨 Qué hacer si ya subiste credenciales

### Si accidentalmente subiste .env a GitHub:

#### Paso 1: Rotar tus credenciales de Supabase
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. **Settings** → **API**
3. **Generate new anon key**
4. Actualiza tu `.env` con la nueva key

#### Paso 2: Eliminar el archivo del historial de Git
```bash
# Remover .env del tracking de Git
git rm --cached .env

# Commit del cambio
git commit -m "Remove .env from tracking"

# Push
git push
```

#### Paso 3: Verificar que .gitignore funciona
```bash
# .env debe estar en .gitignore
echo ".env" >> .gitignore

# Commit
git add .gitignore
git commit -m "Add .env to gitignore"
git push
```

---

## 🛡️ Mejores Prácticas

### ✅ HACER

1. **Usar variables de entorno** para todas las credenciales
2. **Verificar .gitignore** antes de hacer commit
3. **Nunca** hardcodear credenciales en el código
4. **Compartir .env.example** con el equipo
5. **Rotar credenciales** si se exponen

### ❌ NO HACER

1. ❌ Subir `.env` a GitHub
2. ❌ Compartir credenciales por email/chat
3. ❌ Hardcodear API keys en el código
4. ❌ Hacer commit sin verificar `git status`
5. ❌ Usar las mismas credenciales en producción y desarrollo

---

## 📋 Checklist de Seguridad

### Antes de cada commit:

- [ ] Ejecutar `git status`
- [ ] Verificar que `.env` NO aparece
- [ ] Verificar que `.gitignore` incluye `.env`
- [ ] No hay credenciales hardcodeadas en el código
- [ ] Archivos modificados son solo código fuente

### Configuración inicial:

- [x] `.gitignore` creado y configurado
- [x] `.env` creado con credenciales reales
- [x] `.env.example` creado sin credenciales
- [x] `/utils/supabase/info.tsx` usa variables de entorno
- [x] Servidor reiniciado para cargar variables

---

## 🔐 Validación Automática

El archivo `/utils/supabase/info.tsx` incluye validación:

```typescript
// Validación en desarrollo
if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_SUPABASE_PROJECT_ID) {
    console.warn('⚠️ VITE_SUPABASE_PROJECT_ID no configurado');
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️ VITE_SUPABASE_ANON_KEY no configurado');
  }
}
```

**Si ves estos warnings:**
- Tu `.env` no existe
- Las variables no están definidas
- Necesitas reiniciar el servidor

---

## 📊 Nivel de Seguridad Actual

| Aspecto | Status | Descripción |
|---------|--------|-------------|
| **.gitignore** | ✅ Configurado | `.env` está excluido |
| **Variables de entorno** | ✅ Implementado | Usa `import.meta.env` |
| **Archivo .env** | ✅ Creado | Con tus credenciales |
| **Plantilla .env.example** | ✅ Creado | Sin credenciales reales |
| **Validación** | ✅ Activa | Warnings en consola |
| **Documentación** | ✅ Completa | Este archivo + CONFIGURACION_ENV.md |

---

## 🆘 Comandos Útiles

### Verificar archivos que se subirán
```bash
git status
```

### Ver archivos ignorados
```bash
git status --ignored
```

### Verificar que .env está ignorado
```bash
git check-ignore -v .env
# Debe mostrar: .gitignore:X:.env    .env
```

### Limpiar caché de Git (si .env ya fue tracked)
```bash
git rm -r --cached .
git add .
git commit -m "Apply .gitignore"
```

---

## 📖 Recursos Adicionales

- 📄 [CONFIGURACION_ENV.md](./CONFIGURACION_ENV.md) - Guía de configuración
- 📄 [README.md](./README.md) - Documentación general
- 🌐 [Supabase Security Best Practices](https://supabase.com/docs/guides/api/api-keys)
- 🌐 [GitHub - .gitignore Templates](https://github.com/github/gitignore)

---

## ✅ Estado Final

Tu proyecto ahora tiene:

1. ✅ **Protección de credenciales** con `.env`
2. ✅ **Seguridad de Git** con `.gitignore`
3. ✅ **Documentación completa** para el equipo
4. ✅ **Validación automática** de variables
5. ✅ **Plantilla de ejemplo** para colaboradores

**🎉 ¡Tu configuración de seguridad está completa!**

---

<div align="center">

**🔐 Mantén tus credenciales seguras 🔐**

Si tienes dudas sobre seguridad, consulta este documento antes de hacer commit.

</div>
