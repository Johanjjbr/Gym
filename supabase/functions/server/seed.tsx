/**
 * SCRIPT DE SEED PARA CREAR USUARIOS DE PRUEBA
 * 
 * Este script debe ejecutarse MANUALMENTE en Supabase SQL Editor
 * Copia y pega el contenido SQL de abajo en: 
 * https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new
 */

export const SEED_SQL = `
-- =============================================
-- SCRIPT DE SEED: USUARIOS DE PRUEBA
-- =============================================

-- PASO 1: Crear usuarios en Auth (ejecutar desde código backend)
-- Este paso se ejecuta desde el endpoint /make-server-104060a1/auth/seed

-- PASO 2: Insertar usuarios de miembros de prueba
INSERT INTO users (member_number, name, email, phone, status, plan, start_date, next_payment, weight, height, imc) VALUES
('GYM-001', 'Carlos Rodríguez', 'carlos@example.com', '0414-1234567', 'Activo', 'Plan Mensual', '2025-02-01', '2025-03-01', 75.5, 1.75, 24.65),
('GYM-002', 'María González', 'maria@example.com', '0424-2345678', 'Activo', 'Plan Trimestral', '2025-01-15', '2025-04-15', 62.0, 1.65, 22.77),
('GYM-003', 'José Pérez', 'jose@example.com', '0412-3456789', 'Moroso', 'Plan Mensual', '2024-12-01', '2025-02-01', 80.0, 1.80, 24.69),
('GYM-004', 'Ana Martínez', 'ana@example.com', '0426-4567890', 'Activo', 'Plan Anual', '2025-01-01', '2026-01-01', 58.5, 1.62, 22.30),
('GYM-005', 'Luis Hernández', 'luis@example.com', '0414-5678901', 'Inactivo', 'Plan Mensual', '2024-11-15', '2024-12-15', 88.0, 1.78, 27.76)
ON CONFLICT (member_number) DO NOTHING;

-- PASO 3: Insertar rutinas de ejemplo
-- Nota: Los IDs de staff deben existir primero (se crean con el signup)

-- PASO 4: Insertar pagos de ejemplo
-- Estos se crearán después de tener usuarios

-- Mensaje de éxito
SELECT 'Seed ejecutado correctamente' as message;
`;

/**
 * Datos para crear usuarios de staff vía API
 * Usar el endpoint POST /make-server-104060a1/auth/signup
 */
export const STAFF_SEED_DATA = [
  {
    email: 'admin@gymteques.com',
    password: 'Admin123!',
    name: 'Roberto Administrador',
    role: 'Administrador',
    phone: '0414-9999999',
    shift: 'Tiempo Completo'
  },
  {
    email: 'trainer@gymteques.com',
    password: 'Trainer123!',
    name: 'Laura Entrenadora',
    role: 'Entrenador',
    phone: '0424-8888888',
    shift: 'Mañana (6am - 2pm)'
  },
  {
    email: 'recepcion@gymteques.com',
    password: 'Recepcion123!',
    name: 'Pedro Recepcionista',
    role: 'Recepción',
    phone: '0412-7777777',
    shift: 'Tarde (2pm - 10pm)'
  }
];

console.log(`
=====================================================
INSTRUCCIONES PARA SEED DE BASE DE DATOS
=====================================================

📋 PASO 1: Ejecutar Schema SQL en Supabase
----------------------------------------------------
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Crea un nuevo query
5. Copia y pega el contenido de: /supabase/migrations/schema.sql
6. Ejecuta el query

📋 PASO 2: Crear usuarios de Staff
----------------------------------------------------
Usa el endpoint: POST /make-server-104060a1/auth/signup
Con cada uno de estos datos:

Administrador:
${JSON.stringify(STAFF_SEED_DATA[0], null, 2)}

Entrenador:
${JSON.stringify(STAFF_SEED_DATA[1], null, 2)}

Recepción:
${JSON.stringify(STAFF_SEED_DATA[2], null, 2)}

📋 PASO 3: Insertar datos de prueba
----------------------------------------------------
Ejecuta el siguiente SQL en Supabase SQL Editor:
${SEED_SQL}

✅ USUARIOS DE PRUEBA CREADOS:
----------------------------------------------------
- admin@gymteques.com / Admin123!
- trainer@gymteques.com / Trainer123!
- recepcion@gymteques.com / Recepcion123!

=====================================================
`);
