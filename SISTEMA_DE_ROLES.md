# 🔐 Sistema de Roles - GYM Lagunetica

## 📊 Resumen del Sistema

El sistema cuenta con 3 roles diferenciados que controlan el acceso a las distintas secciones:

---

## 👨‍💼 ROL: ADMINISTRADOR

### 🔑 Permisos Generales
- Acceso total a todas las funcionalidades del sistema
- Puede crear, editar y eliminar registros en todas las secciones
- Gestiona usuarios, personal y configuraciones

### 📱 Secciones Disponibles

#### ✅ Dashboard
- Vista completa de estadísticas
- Gráficos de ingresos mensuales
- Métricas de usuarios activos, morosos y asistencia
- Estadísticas de personal

#### ✅ Usuarios
- Ver lista completa de usuarios
- Crear nuevos usuarios
- Editar perfiles de usuarios
- Asignar entrenadores
- Ver detalles completos (historial, pagos, progreso)
- Eliminar usuarios

#### ✅ Control de Pagos
- Ver todos los pagos del gimnasio
- Registrar nuevos pagos
- Generar facturas
- Filtrar por usuario, estado, método de pago
- Ver historial completo de facturación

#### ✅ Gestión de Personal
- Crear entrenadores y recepcionistas
- Asignar turnos
- Ver horarios del personal
- Editar información del personal
- Eliminar personal

#### ✅ Registro de Asistencia
- Registrar entrada/salida de usuarios
- Ver asistencia de todos los usuarios
- Generar códigos QR
- Estadísticas de asistencia

#### ✅ Gestión de Rutinas
- Crear plantillas de rutinas
- Editar rutinas existentes
- Asignar rutinas a usuarios
- Ver todas las rutinas del sistema
- Eliminar rutinas

#### ✅ Reportes
- Reportes financieros
- Estadísticas de asistencia
- Reportes de membresías
- Análisis de rendimiento

---

## 🏃 ROL: ENTRENADOR

### 🔑 Permisos Generales
- Gestión de usuarios asignados
- Creación y asignación de rutinas
- Seguimiento de progreso físico
- Sin acceso a datos financieros completos

### 📱 Secciones Disponibles

#### ✅ Dashboard
- Vista limitada con estadísticas de sus usuarios
- Métricas de usuarios asignados
- Próximas sesiones
- Progreso de usuarios

#### ✅ Usuarios (Solo Lectura Ampliada)
- Ver lista de todos los usuarios
- Ver detalles de usuarios
- NO puede crear, editar o eliminar usuarios
- Puede ver progreso físico
- Puede ver historial de asistencia

#### ❌ Control de Pagos
- **NO tiene acceso** a esta sección
- Los pagos son gestionados solo por administradores

#### ❌ Gestión de Personal
- **NO tiene acceso** a esta sección
- No puede crear o gestionar personal

#### ✅ Registro de Asistencia
- Registrar entrada/salida de usuarios
- Ver asistencia general
- NO puede modificar registros pasados

#### ✅ Gestión de Rutinas
- **Acceso completo** a rutinas
- Crear nuevas rutinas personalizadas
- Editar sus rutinas
- Asignar rutinas a usuarios
- Ver todas las rutinas del sistema

#### ❌ Reportes
- **NO tiene acceso** a reportes financieros
- Podría tener acceso a reportes de progreso (a implementar)

---

## 💪 ROL: USUARIO

### 🔑 Permisos Generales
- Acceso solo a su información personal
- No puede ver datos de otros usuarios
- Enfoque en su entrenamiento y progreso

### 📱 Secciones Disponibles

#### ✅ Dashboard Personal
- Vista de sus propias estadísticas
- Próximas sesiones
- Estado de membresía
- Progreso reciente

#### ✅ Mi Perfil
- Ver su información personal
- Actualizar datos de contacto
- Ver datos de emergencia
- Ver entrenador asignado
- NO puede cambiar su tipo de membresía

#### ❌ Usuarios
- **NO tiene acceso** a la lista de usuarios
- Solo puede ver su propio perfil

#### ✅ Mis Pagos (Vista Personal)
- Ver su historial de pagos
- Descargar facturas
- Ver estado de membresía
- NO puede registrar pagos (solo administrador)

#### ❌ Gestión de Personal
- **NO tiene acceso**

#### ✅ Mi Asistencia
- Ver su propio historial de asistencia
- Ver estadísticas personales
- NO puede modificar registros

#### ✅ Mi Entrenamiento
- **Sección principal del usuario**
- Ver rutina asignada
- Iniciar sesiones de entrenamiento
- Registrar series, repeticiones y peso
- Marcar ejercicios como completados
- Ver historial de entrenamientos
- Ver progreso en ejercicios

#### ✅ Mi Progreso Físico
- Ver evolución de peso
- Ver gráficos de progreso
- Ver medidas corporales
- NO puede registrar nuevo progreso (solo entrenador/admin)

#### ❌ Reportes
- **NO tiene acceso**

---

## 🎯 Matriz de Permisos Detallada

| Funcionalidad | Admin | Entrenador | Usuario |
|---------------|-------|------------|---------|
| **USUARIOS** |
| Ver lista usuarios | ✅ | ✅ | ❌ |
| Crear usuario | ✅ | ❌ | ❌ |
| Editar usuario | ✅ | ❌ | Propio |
| Eliminar usuario | ✅ | ❌ | ❌ |
| Ver detalles | ✅ | ✅ | Propio |
| **PAGOS** |
| Ver pagos | ✅ Todos | ❌ | Propios |
| Registrar pago | ✅ | ❌ | ❌ |
| Generar factura | ✅ | ❌ | ❌ |
| Descargar factura | ✅ | ❌ | Propias |
| **PERSONAL** |
| Ver personal | ✅ | ❌ | ❌ |
| Crear personal | ✅ | ❌ | ❌ |
| Asignar turnos | ✅ | ❌ | ❌ |
| Editar personal | ✅ | ❌ | ❌ |
| **ASISTENCIA** |
| Registrar asistencia | ✅ | ✅ | ❌ |
| Ver asistencia | ✅ Todos | ✅ Todos | Propia |
| Modificar registro | ✅ | ❌ | ❌ |
| Generar QR | ✅ | ✅ | ❌ |
| **RUTINAS** |
| Ver rutinas | ✅ Todas | ✅ Todas | Asignadas |
| Crear rutina | ✅ | ✅ | ❌ |
| Editar rutina | ✅ | ✅ Propias | ❌ |
| Eliminar rutina | ✅ | ✅ Propias | ❌ |
| Asignar rutina | ✅ | ✅ | ❌ |
| **ENTRENAMIENTO** |
| Iniciar sesión | ✅ | ⚪ | ✅ |
| Registrar ejercicios | ✅ | ⚪ | ✅ |
| Ver historial | ✅ Todos | ✅ Todos | Propio |
| **PROGRESO FÍSICO** |
| Ver progreso | ✅ Todos | ✅ Todos | Propio |
| Registrar progreso | ✅ | ✅ | ❌ |
| Editar progreso | ✅ | ✅ | ❌ |
| **REPORTES** |
| Reportes financieros | ✅ | ❌ | ❌ |
| Reportes asistencia | ✅ | ⚪ | ❌ |
| Reportes progreso | ✅ | ⚪ | ❌ |

**Leyenda:**
- ✅ Acceso completo
- ⚪ Opcional/Limitado
- ❌ Sin acceso
- "Propio/Propias" = Solo sus propios datos
- "Todos" = Todos los registros

---

## 🔒 Seguridad Implementada

### Row Level Security (RLS)
- Todas las tablas tienen RLS habilitado
- Las políticas se aplican automáticamente en Supabase
- Los usuarios solo ven datos permitidos por su rol

### Protección de Rutas
- `ProtectedRoute` component verifica autenticación
- Sidebar muestra solo opciones permitidas
- Redirección automática si no hay permisos

### Validación en Backend
- Las políticas RLS en Supabase validan permisos
- No se puede manipular desde el frontend
- Service role key solo en backend

---

## 📋 Casos de Uso por Rol

### Administrador - Día Típico
1. Revisa dashboard con estadísticas generales
2. Registra pagos de usuarios
3. Crea nuevos usuarios o entrenadores
4. Asigna entrenadores a usuarios
5. Revisa reportes financieros
6. Gestiona horarios del personal

### Entrenador - Día Típico
1. Revisa sus usuarios asignados
2. Crea rutinas personalizadas
3. Asigna rutinas a usuarios específicos
4. Registra progreso físico de usuarios
5. Verifica asistencia de sus usuarios
6. Ajusta rutinas según progreso

### Usuario - Día Típico
1. Hace check-in al llegar al gym
2. Revisa su rutina del día
3. Inicia sesión de entrenamiento
4. Registra cada serie y peso utilizado
5. Marca ejercicios como completados
6. Ve su progreso histórico
7. Descarga facturas de pagos

---

## 🚀 Flujo de Trabajo Recomendado

### Onboarding de Nuevo Usuario
1. **Admin** crea el usuario en el sistema
2. **Admin** registra el pago inicial
3. **Admin** asigna un entrenador
4. **Entrenador** evalúa al usuario
5. **Entrenador** crea y asigna rutina personalizada
6. **Usuario** recibe credenciales y comienza a entrenar

### Seguimiento Continuo
1. **Usuario** registra entrenamientos diarios
2. **Entrenador** revisa progreso semanalmente
3. **Entrenador** ajusta rutinas según necesidad
4. **Admin** gestiona renovaciones de membresía
5. **Admin** genera reportes mensuales

---

## ⚙️ Configuración Técnica

### Variables de Entorno
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### Crear Usuario con Rol Específico
En Supabase Dashboard > Authentication > Users:
```json
{
  "full_name": "Nombre Usuario",
  "role": "usuario"  // o "entrenador" o "administrador"
}
```

---

## 🔄 Próximas Mejoras

### Por Implementar
- [ ] Notificaciones por rol
- [ ] Reportes personalizados por entrenador
- [ ] Calendario de sesiones
- [ ] Chat interno usuario-entrenador
- [ ] Evaluaciones físicas periódicas
- [ ] Metas y objetivos personalizados
- [ ] Badges y logros para usuarios

---

**Sistema diseñado para máxima seguridad y usabilidad por rol** 🎉
