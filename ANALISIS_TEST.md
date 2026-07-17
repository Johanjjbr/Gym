# Análisis de Tests — Sistema de Gestión de Gimnasio

## Resumen Ejecutivo

- **Tests Unitarios (Vitest):** 96/96 pasan (14 archivos)
- **Tests E2E (Playwright):** 22/31 pasan (9 fallan)
- **Cobertura:** 34.97% statements, 24.46% branches, 42.46% functions

---

## 1. Problemáticas Detectadas

### 1.1 Tests E2E — Strict Mode Violations

Varios tests usan `getByText()` que resuelve a múltiples elementos, causando errores de strict mode.

| Archivo | Línea | Selector | Elementos que matchea |
|---------|-------|----------|----------------------|
| `attendance.spec.ts` | 15 | `getByText('Asistencia')` | 5: sidebar link, h1, button, card title, empty text |
| `dashboard.spec.ts` | 14 | `getByText('Total Usuarios').or(...)` | 2 stat cards |
| `plans.spec.ts` | 27 | `getByText('Nuevo Plan').or(getByText('Crear Plan'))` | 4: button, dialog title, dialog description, create button |

**Solución:** Usar selectores más específicos con `.first()`, `getByRole('heading', ...)`, o `getByRole('button', ...)`.

### 1.2 Tests E2E — Texto Incorrecto en Selectores

| Archivo | Línea | Selector actual | Texto real en la página |
|---------|-------|-----------------|------------------------|
| `routines.spec.ts` | 15 | `getByText('Rutinas')` | Heading es `"Gestión de Rutinas"` |
| `routines.spec.ts` | 23 | `getByRole('button', { name: /nueva rutina\|crear/i })` | Botón dice `"Nueva Rutina"` (debería matchear con /i, posible timeout) |
| `staff.spec.ts` | 15 | `getByText(/personal\|empleados/i)` | Heading es `"Gestión de Personal"` (debería matchear, posible timeout) |

**Solución:** Actualizar selectores para coincidir con el texto exacto que renderiza la página, y manejar tiempos de carga de datos asíncronos.

### 1.3 Tests E2E — Endpoint de Login Inexistente (user-registration.spec.ts)

```typescript
const res = await request.post('http://localhost:5173/server/auth/login', { ... });
// Error: SyntaxError: Unexpected end of JSON input
```

El endpoint `/server/auth/login` **no existe como ruta local**. El login real se maneja a través de:
1. Supabase Auth (`supabase.auth.signInWithPassword`)
2. Supabase Edge Function (`VITE_SUPABASE_URL/functions/v1/server/auth/login`)

**Solución:** Los tests que usan `request` para autenticarse deben hacer login mediante la UI (rellenar form y submit) en lugar de llamar a un endpoint REST inexistente. O en su defecto, mockear el AuthContext.

### 1.4 Baja Cobertura de Código (34.97%)

| Archivo | Cobertura | Líneas no cubiertas |
|---------|-----------|---------------------|
| `api.ts` | 22.64% | 64-69, 102-107, 114-116, 140-147, 161-243, 257-265, 272-278, 320-341, 370-404, 454-456, 470, 501-528, 578-621, 666-815, 830-1167, 1182-1343, 1357-1444, 1465-1513, 1540-1547 |
| `AuthContext.tsx` | 31.32% | 45-86, 96-106, 115-118, 125-177, 182-198, 205, 224 |
| `useRoutines.ts` | 2.59% | 14-18, 37-280 |
| `usePayments.ts` | 10% | 14, 35-77 |
| `useExercises.ts` | 6.89% | 67-147 |

**Solución:** Agregar tests específicamente para los módulos con menor cobertura. Priorizar `api.ts` (contiene toda la lógica de comunicación con Supabase), `AuthContext.tsx` (manejo de sesión y autenticación), y hooks de datos críticos.

### 1.5 Advertencia `act()` en AuthContext.test.tsx

```
Warning: An update to AuthProvider inside a test was not wrapped in act(...)
```

**Solución:** Envolver las aserciones iniciales en `waitFor()` o usar `act()` explícitamente. El test `"starts with loading state and no user"` verifica estado inmediatamente después de renderizar, pero el AuthProvider realiza una llamada asíncrona (`getSession`) que actualiza el estado después del render.

### 1.6 Dependencia Faltante: `@vitest/coverage-v8`

El paquete `@vitest/coverage-v8` no estaba instalado, por lo que `npx vitest run --coverage` fallaba.

**Solución:** Instalar con `npm install -D @vitest/coverage-v8`.

### 1.7 user-registration.spec.ts — Mala Definición de Tests

El archivo `user-registration.spec.ts` tiene problemas estructurales:
- Usa `test.beforeAll` con `request.post` que falla (endpoint inexistente)
- Define un test dentro de `beforeAll` (`test('token_global', ...)`) que no tiene sentido funcional
- Depende de un servidor backend real para funcionar
- No usa `test.skip` o condiciones para evitar fallos en CI

**Solución:** Reestructurar completamente este archivo:
1. Usar login a través de la UI en lugar de requests HTTP directos
2. O mockear la autenticación para tests de integración
3. Agregar DataTestId a elementos clave para selectores más robustos

---

## 2. Soluciones Propuestas

### 2.1 Correcciones Inmediatas (Archivos E2E)

```typescript
// attendance.spec.ts — línea 15
await expect(page.getByRole('heading', { name: 'Control de Asistencia' })).toBeVisible();

// dashboard.spec.ts — línea 14
await expect(page.getByText('Total Usuarios').first()).toBeVisible();

// plans.spec.ts — línea 27
await expect(page.getByRole('heading', { name: 'Nuevo Plan' })).toBeVisible();

// routines.spec.ts — línea 15
await expect(page.getByRole('heading', { name: 'Gestión de Rutinas' })).toBeVisible();

// routines.spec.ts — línea 23
await expect(page.getByRole('button', { name: 'Nueva Rutina' })).toBeVisible({ timeout: 10000 });

// staff.spec.ts — línea 15
await expect(page.getByRole('heading', { name: 'Gestión de Personal' })).toBeVisible();
```

### 2.2 Reestructurar user-registration.spec.ts

Las 3 opciones viables:
1. **Mock AuthContext**: Proveer un contexto simulado en lugar de hacer login real
2. **Login por UI**: Usar `page.fill()` y `page.click()` para autenticarse a través de la interfaz
3. **Skip condicional**: Marcar los tests como `skip` si no hay backend disponible

### 2.3 Mejorar Cobertura

| Prioridad | Módulo | Tests sugeridos |
|-----------|--------|-----------------|
| Alta | `api.ts` | Testear funciones no cubiertas: uploadFile, generatePdf, reportEndpoints |
| Alta | `AuthContext.tsx` | Testear login real con mock de Supabase, logout, role checking |
| Media | `useRoutines.ts` | Agregar tests para createRoutine, updateRoutine, deleteRoutine |
| Media | `usePayments.ts` | Agregar tests para createPayment, processPayment |
| Baja | Componentes UI | Testear Card, Button, Alert, Input con RTL |

### 2.4 Agregar DataTestId a la Aplicación

Agregar atributos `data-testid` a elementos clave para evitar dependencia de texto visible:

```tsx
<Card data-testid="login-card">
<h1 data-testid="page-title">Gestión de Rutinas</h1>
<button data-testid="btn-create-plan">Nuevo Plan</button>
```

---

## 3. Estado Actual por Archivo

| Archivo | Tests | Estado |
|---------|-------|--------|
| `format.test.ts` | 7/7 | ✅ |
| `validations.test.ts` | 30/30 | ✅ |
| `api.test.ts` | 20/20 | ✅ |
| `useUsers.test.ts` | 6/6 | ✅ |
| `usePlans.test.ts` | 5/5 | ✅ |
| `useStaff.test.ts` | 5/5 | ✅ |
| `useAttendance.test.ts` | 2/2 | ✅ |
| `useInvoices.test.ts` | 3/3 | ✅ |
| `usePayments.test.ts` | 1/1 | ✅ |
| `useExercises.test.ts` | 1/1 | ✅ |
| `useRoutines.test.ts` | 1/1 | ✅ |
| `useStats.test.ts` | 1/1 | ✅ |
| `AuthContext.test.tsx` | 3/3 | ✅ |
| `Login.test.tsx` | 6/6 | ✅ |
| `login.spec.ts` (E2E) | 5/5 | ✅ |
| `navigation.spec.ts` (E2E) | 4/4 | ✅ |
| `responsive.spec.ts` (E2E) | 3/3 | ✅ |
| `dashboard.spec.ts` (E2E) | 3/4 | ❌ 1 falla |
| `plans.spec.ts` (E2E) | 2/3 | ❌ 1 falla |
| `attendance.spec.ts` (E2E) | 1/2 | ❌ 1 falla |
| `routines.spec.ts` (E2E) | 1/3 | ❌ 2 fallan |
| `staff.spec.ts` (E2E) | 1/2 | ❌ 1 falla |
| `user-registration.spec.ts` (E2E) | 0/3 | ❌ 3 fallan |

---

## 4. Resumen de Acciones

| # | Acción | Prioridad | Impacto |
|---|--------|-----------|---------|
| 1 | Corregir selectores en tests E2E (strict mode, texto incorrecto) | Alta | 6 tests → ✅ |
| 2 | Reestructurar `user-registration.spec.ts` (login por UI) | Alta | 3 tests → ✅ |
| 3 | Agregar tests para `api.ts` (upload, reportes, PDF) | Media | Cobertura +15% |
| 4 | Agregar tests para `AuthContext.tsx` (login, logout, roles) | Media | Cobertura +5% |
| 5 | Agregar tests para `useRoutines.ts` y `usePayments.ts` | Media | Cobertura +3% |
| 6 | Envolver AuthContext.test.tsx en `waitFor` para eliminar warning act() | Baja | Mejora DX |
| 7 | Agregar `data-testid` a elementos clave en componentes | Baja | Tests más robustos |
