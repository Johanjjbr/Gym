# Documentación CRUD - Sistema de Gimnasio

## Funcionalidades Implementadas

### Gestión de Usuarios (Members)

El módulo de usuarios permite la administración completa de los miembros del gimnasio con las siguientes funcionalidades:

#### ✅ Crear Usuario
- Formulario modal con validación completa
- Campos requeridos:
  - Nombre completo
  - Email (con validación de formato)
  - Teléfono
  - Plan (Básico Mensual, Premium Mensual, VIP Trimestral, VIP Anual)
  - Estado (Activo, Inactivo, Moroso)
  - Fecha de inicio
  - Próximo pago
  - Peso (kg)
  - Estatura (cm)
- **Funcionalidades automáticas:**
  - Generación automática de número de miembro (GYM-XXX)
  - Cálculo automático del IMC en tiempo real
  - Validación de rangos (peso: 30-300kg, estatura: 100-250cm)
- Notificación toast de confirmación

#### ✅ Leer/Ver Usuarios
- Tabla completa con información principal
- Búsqueda en tiempo real por nombre o número de miembro
- Vista detallada en modal con:
  - Información personal completa
  - Datos físicos (peso, estatura, IMC)
  - Información de pagos
- Contador dinámico de usuarios filtrados

#### ✅ Editar Usuario
- Formulario modal pre-cargado con datos existentes
- Mismas validaciones que crear
- Mantiene el número de miembro original
- Recalcula IMC automáticamente
- Notificación de actualización exitosa

#### ✅ Eliminar Usuario
- Diálogo de confirmación (AlertDialog)
- Notificación de eliminación
- Actualización automática de la lista

---

### Gestión de Personal (Staff)

El módulo de personal permite administrar el equipo del gimnasio con las siguientes funcionalidades:

#### ✅ Crear Empleado
- Formulario modal con validación completa
- Campos requeridos:
  - Nombre completo
  - Rol (Administrador, Entrenador, Recepción)
  - Email (con validación de formato)
  - Teléfono
  - Estado (Activo, Inactivo)
  - Turno (Mañana 6am-2pm, Tarde 2pm-10pm, Completo 6am-10pm)
- Notificación toast de confirmación
- Vista de tarjetas con avatares generados por iniciales

#### ✅ Leer/Ver Personal
- Vista en grid de tarjetas (responsive)
- Búsqueda en tiempo real por nombre o rol
- Vista detallada en modal
- Indicadores visuales:
  - Badges de colores por rol (Administrador: rojo, Entrenador: verde, Recepción: azul)
  - Badges de estado (Activo: verde)
- Panel de horarios con conteo por turno

#### ✅ Editar Empleado
- Formulario modal pre-cargado con datos existentes
- Mismas validaciones que crear
- Botón de edición en cada tarjeta
- Notificación de actualización exitosa

#### ✅ Eliminar Empleado
- Diálogo de confirmación individual por empleado
- Notificación de eliminación
- Actualización automática del grid

---

## Características Técnicas

### Validaciones
- **react-hook-form**: Manejo de formularios con validación en tiempo real
- Validación de emails con expresiones regulares
- Validación de rangos numéricos
- Campos requeridos marcados con asterisco (*)
- Mensajes de error específicos en español

### Notificaciones
- **Sonner (toast)**: Notificaciones elegantes en la esquina inferior derecha
- Notificaciones con título y descripción
- Colores ricos (richColors) para mejor UX
- Notificaciones para: crear, editar y eliminar

### Diseño Fitness
- Colores neón:
  - Verde (#10f94e) - Elementos activos/primarios
  - Rojo (#ff3b5c) - Alertas/morosos/administradores
  - Azul (#3b82f6) - Recepción
- Tema oscuro consistente
- Transiciones suaves en hover
- Diseño completamente responsive

### Gestión de Estado
- Estado local con React hooks (useState)
- Datos iniciales desde mockData
- Persistencia en memoria durante la sesión
- IDs únicos generados con timestamp

---

## Uso del Sistema

### Usuarios
1. Haz clic en "Nuevo Usuario" en la página de Usuarios
2. Completa todos los campos requeridos
3. El sistema calculará automáticamente el IMC
4. Guarda y verás la notificación de confirmación
5. Usa los iconos de acciones para ver, editar o eliminar

### Personal
1. Haz clic en "Nuevo Empleado" en la página de Personal
2. Completa todos los campos requeridos
3. El empleado aparecerá en el grid de tarjetas
4. Usa los botones de la tarjeta para editar o eliminar
5. Haz clic en "Ver Más" para ver detalles completos

---


