-- =====================================================
-- DATOS INICIALES PARA TESTING
-- =====================================================

-- NOTA: Estos usuarios se crean con contraseña "Admin123!" para todos
-- En producción, cada usuario debería tener su propia contraseña segura

-- =====================================================
-- INSERTAR USUARIOS ADMINISTRADORES
-- =====================================================
-- Se crearán desde la aplicación o Supabase Auth UI
-- Aquí solo dejamos la estructura para perfiles que se crearán

-- =====================================================
-- INSERTAR RUTINAS DE EJEMPLO
-- =====================================================

-- Primero necesitamos IDs de entrenadores, estos se crearán cuando se registren
-- Por ahora usamos IDs de placeholder que se actualizarán

-- Rutina 1: Fuerza para Principiantes
INSERT INTO public.routine_templates (id, name, description, level, category, duration, days_per_week, is_active)
VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'Rutina de Fuerza para Principiantes',
  'Programa diseñado para desarrollar fuerza base en personas que inician en el gimnasio',
  'Principiante',
  'Fuerza',
  '8 semanas',
  3,
  TRUE
);

-- Ejercicios para Rutina 1
INSERT INTO public.routine_exercises (routine_id, name, muscle_group, sets, reps, rest_time, weight, instructions, order_index)
VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'Press de Banca',
  'Pecho',
  3,
  '10-12',
  '90s',
  'Barra vacía o 10kg',
  'Mantén los pies firmes en el suelo, baja la barra hasta el pecho y empuja hacia arriba controladamente',
  1
),
(
  '11111111-1111-1111-1111-111111111111',
  'Sentadillas',
  'Piernas',
  3,
  '12-15',
  '90s',
  'Barra vacía',
  'Baja hasta que los muslos estén paralelos al suelo, mantén la espalda recta',
  2
),
(
  '11111111-1111-1111-1111-111111111111',
  'Remo con Barra',
  'Espalda',
  3,
  '10-12',
  '90s',
  '10kg',
  'Inclina el torso, tira de la barra hacia el abdomen manteniendo los codos cerca del cuerpo',
  3
),
(
  '11111111-1111-1111-1111-111111111111',
  'Press Militar',
  'Hombros',
  3,
  '10-12',
  '90s',
  'Barra vacía',
  'Empuja la barra desde los hombros hasta extender completamente los brazos',
  4
);

-- Rutina 2: Hipertrofia Intermedia
INSERT INTO public.routine_templates (id, name, description, level, category, duration, days_per_week, is_active)
VALUES 
(
  '22222222-2222-2222-2222-222222222222',
  'Hipertrofia Intermedia',
  'Rutina enfocada en ganancia muscular para nivel intermedio',
  'Intermedio',
  'Hipertrofia',
  '12 semanas',
  4,
  TRUE
);

-- Ejercicios para Rutina 2
INSERT INTO public.routine_exercises (routine_id, name, muscle_group, sets, reps, rest_time, weight, instructions, order_index)
VALUES
(
  '22222222-2222-2222-2222-222222222222',
  'Press Inclinado con Mancuernas',
  'Pecho',
  4,
  '8-10',
  '120s',
  '12-15kg cada mancuerna',
  'Banco inclinado a 30-45 grados, baja las mancuernas hasta sentir estiramiento',
  1
),
(
  '22222222-2222-2222-2222-222222222222',
  'Peso Muerto',
  'Espalda',
  4,
  '6-8',
  '180s',
  '40-60kg',
  'Mantén la espalda recta, levanta la barra pegada al cuerpo',
  2
),
(
  '22222222-2222-2222-2222-222222222222',
  'Sentadilla Búlgara',
  'Piernas',
  3,
  '10-12 por pierna',
  '90s',
  'Mancuernas 10kg',
  'Pie trasero elevado, baja controladamente hasta 90 grados',
  3
),
(
  '22222222-2222-2222-2222-222222222222',
  'Dominadas',
  'Espalda',
  4,
  '6-10',
  '120s',
  'Peso corporal',
  'Agarre prono, tira hasta que la barbilla pase la barra',
  4
);

-- Rutina 3: Cardio y Resistencia
INSERT INTO public.routine_templates (id, name, description, level, category, duration, days_per_week, is_active)
VALUES 
(
  '33333333-3333-3333-3333-333333333333',
  'Cardio y Resistencia',
  'Programa cardiovascular para mejorar resistencia y quemar grasa',
  'Intermedio',
  'Cardio',
  '6 semanas',
  5,
  TRUE
);

-- Ejercicios para Rutina 3
INSERT INTO public.routine_exercises (routine_id, name, muscle_group, sets, reps, rest_time, weight, instructions, order_index)
VALUES
(
  '33333333-3333-3333-3333-333333333333',
  'Cinta de Correr - Intervalos',
  'Cardio',
  1,
  '20 minutos',
  '0s',
  NULL,
  'Alterna 2 min intensidad alta con 1 min intensidad baja',
  1
),
(
  '33333333-3333-3333-3333-333333333333',
  'Burpees',
  'Cuerpo Completo',
  3,
  '15-20',
  '60s',
  'Peso corporal',
  'Movimiento explosivo, desde plancha hasta salto',
  2
),
(
  '33333333-3333-3333-3333-333333333333',
  'Bicicleta Estática',
  'Cardio',
  1,
  '15 minutos',
  '0s',
  NULL,
  'Mantén ritmo constante a intensidad media-alta',
  3
),
(
  '33333333-3333-3333-3333-333333333333',
  'Mountain Climbers',
  'Core',
  3,
  '30 segundos',
  '45s',
  'Peso corporal',
  'Alterna rodillas al pecho rápidamente desde posición de plancha',
  4
);

-- Rutina 4: Full Body Avanzado
INSERT INTO public.routine_templates (id, name, description, level, category, duration, days_per_week, is_active)
VALUES 
(
  '44444444-4444-4444-4444-444444444444',
  'Full Body Avanzado',
  'Entrenamiento completo de cuerpo entero para atletas avanzados',
  'Avanzado',
  'Funcional',
  '10 semanas',
  4,
  TRUE
);

-- Ejercicios para Rutina 4
INSERT INTO public.routine_exercises (routine_id, name, muscle_group, sets, reps, rest_time, weight, instructions, order_index)
VALUES
(
  '44444444-4444-4444-4444-444444444444',
  'Clean and Press',
  'Cuerpo Completo',
  5,
  '5',
  '180s',
  '40-50kg',
  'Movimiento olímpico, desde el suelo hasta overhead en un movimiento fluido',
  1
),
(
  '44444444-4444-4444-4444-444444444444',
  'Front Squat',
  'Piernas',
  4,
  '6-8',
  '150s',
  '50-70kg',
  'Barra en posición frontal, codos arriba, baja profundo',
  2
),
(
  '44444444-4444-4444-4444-444444444444',
  'Muscle Ups',
  'Cuerpo Completo',
  3,
  '5-8',
  '180s',
  'Peso corporal',
  'De dominada a fondo en anillas o barra',
  3
);

-- =====================================================
-- NOTA: Los siguientes datos requieren usuarios reales
-- Se pueden insertar después de crear usuarios en Supabase Auth
-- =====================================================

-- Ejemplo de cómo insertar pagos después de crear usuarios:
-- INSERT INTO public.payments (user_id, amount, payment_date, payment_method, concept, status)
-- VALUES 
-- ('user-uuid-here', 450.00, '2026-02-15', 'Transferencia', 'Mensualidad Premium - Febrero 2026', 'Pagado');

-- Ejemplo de cómo insertar asistencia:
-- INSERT INTO public.attendance (user_id, check_in_time, date)
-- VALUES 
-- ('user-uuid-here', NOW(), CURRENT_DATE);
