# 🔧 Solución de Errores de Lock - Supabase

## ❌ Error: "Acquiring an exclusive Navigator LockManager lock timed out"

Este error ocurre cuando hay conflictos con el sistema de bloqueo de Supabase en el navegador.

---

## 🛠️ Soluciones Inmediatas

### Solución 1: Limpiar localStorage (Más Rápida)

1. Abre las **DevTools** del navegador (F12)
2. Ve a la pestaña **Application** (o Aplicación)
3. En el menú lateral, busca **Local Storage**
4. Haz clic en tu dominio (localhost:5173)
5. Haz clic derecho y selecciona **Clear**
6. Recarga la página (F5)

**O desde la consola:**
```javascript
localStorage.clear();
location.reload();
```

### Solución 2: Borrar Cookies del Sitio

1. DevTools (F12) > Application
2. Cookies > http://localhost:5173
3. Borrar todas las cookies que empiecen con `sb-`
4. Recargar la página

### Solución 3: Modo Incógnito

1. Abre una ventana de incógnito (Ctrl+Shift+N)
2. Accede a http://localhost:5173
3. Prueba el login nuevamente

---

## 🔍 Causas Comunes

### 1. **Múltiples pestañas abiertas**
- **Problema:** Varias pestañas compitiendo por el mismo lock
- **Solución:** Cierra todas las pestañas de localhost:5173 excepto una

### 2. **Hot Module Replacement (HMR)**
- **Problema:** Vite recarga el módulo pero mantiene las sesiones antiguas
- **Solución:** Recarga completa (Ctrl+Shift+R) en lugar de F5

### 3. **Sesión corrupta**
- **Problema:** Datos de sesión inconsistentes en localStorage
- **Solución:** Limpiar localStorage y volver a hacer login

### 4. **Navegador bloqueando localStorage**
- **Problema:** Configuración de privacidad del navegador
- **Solución:** Verifica permisos de cookies y almacenamiento

---

## ✅ Cambios Ya Implementados

El código ya incluye las siguientes mejoras:

### 1. **Configuración del Cliente Supabase** (`/src/app/lib/supabase.ts`)
```typescript
export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    lock: {
      retryInterval: 100,
      acquireTimeout: 10000,
    },
  },
});
```

### 2. **Manejo de Errores en AuthContext**
- ✅ Prevención de cargas duplicadas de perfil
- ✅ Detección automática de errores de lock
- ✅ Limpieza automática de localStorage si detecta el error
- ✅ Recarga automática de la página

### 3. **SignOut Mejorado**
```typescript
const handleSignOut = async () => {
  await supabase.auth.signOut();
  localStorage.clear(); // Limpia todo
};
```

---

## 🚨 Procedimiento de Emergencia

Si el error persiste después de intentar todo:

### Paso 1: Reset Completo del Navegador
```javascript
// En la consola del navegador (F12 > Console):
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});
location.reload();
```

### Paso 2: Verificar Estado de Supabase
1. Ve a Supabase Dashboard
2. Authentication > Users
3. Verifica que el usuario existe
4. Intenta resetear la contraseña si es necesario

### Paso 3: Probar en Otro Navegador
- Chrome → Firefox
- Firefox → Edge
- Usar modo incógnito

---

## 🔒 Prevención

### Buenas Prácticas

1. **Cerrar sesión correctamente**
   - Siempre usa el botón de logout
   - No cierres la pestaña sin cerrar sesión

2. **Una pestaña a la vez**
   - Evita tener múltiples pestañas del mismo sitio abiertas
   - Cierra pestañas no utilizadas

3. **Recarga completa en desarrollo**
   - Usa Ctrl+Shift+R en lugar de F5
   - Esto evita cache de HMR

4. **Limpiar periódicamente**
   - En desarrollo, limpia localStorage cada cierto tiempo
   - Esto evita acumulación de sesiones viejas

---

## 🧪 Testing del Fix

### Verificar que el problema está resuelto:

1. **Test de Login:**
   ```
   1. Abre http://localhost:5173/login
   2. Ingresa credenciales
   3. Click en "Iniciar Sesión"
   4. Deberías ver el Dashboard sin errores
   ```

2. **Test de Múltiples Logins:**
   ```
   1. Login con usuario A
   2. Logout
   3. Login con usuario B
   4. No debería haber errores de lock
   ```

3. **Test de Recarga:**
   ```
   1. Login exitoso
   2. F5 para recargar
   3. Debería mantener sesión sin errores
   ```

---

## 🐛 Debugging

### Ver estado de localStorage:
```javascript
// En consola:
console.log('LocalStorage:', Object.keys(localStorage));
console.log('Session Storage:', Object.keys(sessionStorage));

// Ver items de Supabase específicamente:
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    console.log(key, localStorage.getItem(key));
  }
});
```

### Ver estado de la sesión:
```javascript
// En consola:
import { supabase } from './src/app/lib/supabase';

supabase.auth.getSession().then(({ data, error }) => {
  console.log('Session:', data.session);
  console.log('Error:', error);
});
```

---

## 📋 Checklist de Solución

Cuando encuentres el error, sigue este orden:

- [ ] Cierra todas las pestañas de localhost excepto una
- [ ] Abre DevTools (F12)
- [ ] Application > Local Storage > Clear
- [ ] Recarga la página (Ctrl+Shift+R)
- [ ] Intenta login nuevamente
- [ ] Si persiste: Modo incógnito
- [ ] Si persiste: Otro navegador
- [ ] Si persiste: Reset completo (ver arriba)

---

## 🔧 Configuraciones Alternativas

### Si el problema persiste en producción:

Puedes modificar `/src/app/lib/supabase.ts`:

```typescript
// Opción 1: Desactivar persistencia (solo para debugging)
export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: false, // ⚠️ La sesión no se guardará
    autoRefreshToken: false,
  },
});

// Opción 2: Usar storage personalizado
export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    storage: {
      getItem: (key) => sessionStorage.getItem(key),
      setItem: (key, value) => sessionStorage.setItem(key, value),
      removeItem: (key) => sessionStorage.removeItem(key),
    },
  },
});
```

⚠️ **NOTA:** Estas son soluciones temporales solo para debugging. La configuración actual debería funcionar correctamente.

---

## 📞 Soporte Adicional

Si el problema persiste después de todos estos pasos:

1. **Verifica la versión de Supabase:**
   ```bash
   npm list @supabase/supabase-js
   ```
   Debería ser >= 2.97.0

2. **Actualiza Supabase:**
   ```bash
   npm update @supabase/supabase-js
   ```

3. **Verifica logs de Supabase:**
   - Dashboard > Project Settings > API
   - Revisa los logs de autenticación

---

## ✅ Resolución

El código ya está configurado para manejar estos errores automáticamente. Si ves el error en consola:

1. La aplicación detectará el error
2. Limpiará localStorage automáticamente
3. Recargará la página
4. Deberías poder hacer login normalmente

**Si esto ocurre frecuentemente:**
- Verifica que no tengas extensiones de navegador interfiriendo
- Desactiva extensiones de bloqueo de ads/privacy
- Verifica permisos del navegador para cookies y almacenamiento

---

**¡El error debería estar resuelto! 🎉**
