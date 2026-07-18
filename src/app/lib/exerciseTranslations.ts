const targetMap: Record<string, string> = {
  'abs': 'Abdominales',
  'pectorals': 'Pectorales',
  'delts': 'Deltoides',
  'biceps': 'Bíceps',
  'triceps': 'Tríceps',
  'glutes': 'Glúteos',
  'upper back': 'Espalda Alta',
  'lats': 'Dorsales',
  'calves': 'Pantorrillas',
  'quads': 'Cuádriceps',
  'forearms': 'Antebrazos',
  'cardiovascular system': 'Cardiovascular',
  'hamstrings': 'Femorales',
  'spine': 'Columna',
  'traps': 'Trapecios',
  'adductors': 'Aductores',
  'abductors': 'Abductores',
  'serratus anterior': 'Serrato',
  'levator scapulae': 'Elevador de la Escápula',
  'pectoralis major': 'Pectoral Mayor',
  'quadriceps': 'Cuádriceps',
  'biceps brachii': 'Bíceps Braquial',
  'triceps brachii': 'Tríceps Braquial',
  'deltoid': 'Deltoides',
  'latissimus dorsi': 'Dorsal Ancho',
  'trapezius': 'Trapecio',
  'erector spinae': 'Erector de la Columna',
  'rectus abdominis': 'Recto Abdominal',
  'transversus abdominis': 'Transverso Abdominal',
  'obliques': 'Oblicuos',
  'gastrocnemius': 'Gemelos',
  'soleus': 'Sóleo',
  'tibialis anterior': 'Tibial Anterior',
  'hip flexors': 'Flexores de Cadera',
  'pectineus': 'Pectíneo',
  'sartorius': 'Sartorio',
  'gracilis': 'Gracilis',
  'popliteus': 'Poplíteo',
};

const equipmentMap: Record<string, string> = {
  'body weight': 'Peso Corporal',
  'dumbbell': 'Mancuerna',
  'cable': 'Polea',
  'barbell': 'Barra',
  'leverage machine': 'Máquina de Palanca',
  'band': 'Banda Elástica',
  'kettlebell': 'Pesa Rusa',
  'weighted': 'Con Peso',
  'stability ball': 'Pelota de Estabilidad',
  'smith machine': 'Máquina Smith',
  'assisted': 'Asistido',
  'sled machine': 'Máquina de Trineo',
  'medicine ball': 'Pelota Medicinal',
  'rope': 'Cuerda',
  'roller': 'Rodillo',
  'resistance band': 'Banda de Resistencia',
  'ez barbell': 'Barra EZ',
  'olympic barbell': 'Barra Olímpica',
  'wheel roller': 'Rueda Abdominal',
  'stationary bike': 'Bicicleta Estática',
  'skierg machine': 'Máquina de Remo',
  'stepmill machine': 'Escaladora',
  'tire': 'Llanta',
  'hammer': 'Martillo',
  'barbell ez': 'Barra EZ',
};

const categoryMap: Record<string, string> = {
  'waist': 'Core',
  'chest': 'Pecho',
  'back': 'Espalda',
  'shoulders': 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  'cardio': 'Cardio',
  'neck': 'Cuello',
};

const muscleGroupMap: Record<string, string> = {
  'chest': 'Pecho',
  'back': 'Espalda',
  'shoulders': 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  'waist': 'Core',
  'neck': 'Cuello',
  'cardio': 'Cardio',
};

export function translateTarget(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.toLowerCase().trim();
  return targetMap[key] || value;
}

export function translateEquipment(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.toLowerCase().trim();
  return equipmentMap[key] || value;
}

export function translateCategory(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.toLowerCase().trim();
  return categoryMap[key] || value;
}

export function translateMuscleGroup(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.toLowerCase().trim();
  return muscleGroupMap[key] || value;
}

export function getAllTargetOptions(): { value: string; label: string }[] {
  return [
    { value: 'abs', label: 'Abdominales' },
    { value: 'pectorals', label: 'Pectorales' },
    { value: 'delts', label: 'Deltoides' },
    { value: 'biceps', label: 'Bíceps' },
    { value: 'triceps', label: 'Tríceps' },
    { value: 'glutes', label: 'Glúteos' },
    { value: 'upper back', label: 'Espalda Alta' },
    { value: 'lats', label: 'Dorsales' },
    { value: 'calves', label: 'Pantorrillas' },
    { value: 'quads', label: 'Cuádriceps' },
    { value: 'forearms', label: 'Antebrazos' },
    { value: 'cardiovascular system', label: 'Cardiovascular' },
    { value: 'hamstrings', label: 'Femorales' },
    { value: 'spine', label: 'Columna' },
    { value: 'traps', label: 'Trapecios' },
    { value: 'adductors', label: 'Aductores' },
    { value: 'abductors', label: 'Abductores' },
    { value: 'serratus anterior', label: 'Serrato' },
  ];
}

export function getAllEquipmentOptions(): { value: string; label: string }[] {
  return [
    { value: 'body weight', label: 'Peso Corporal' },
    { value: 'dumbbell', label: 'Mancuerna' },
    { value: 'cable', label: 'Polea' },
    { value: 'barbell', label: 'Barra' },
    { value: 'leverage machine', label: 'Máquina de Palanca' },
    { value: 'band', label: 'Banda Elástica' },
    { value: 'kettlebell', label: 'Pesa Rusa' },
    { value: 'weighted', label: 'Con Peso' },
    { value: 'stability ball', label: 'Pelota de Estabilidad' },
    { value: 'smith machine', label: 'Máquina Smith' },
    { value: 'assisted', label: 'Asistido' },
    { value: 'sled machine', label: 'Máquina de Trineo' },
    { value: 'medicine ball', label: 'Pelota Medicinal' },
    { value: 'rope', label: 'Cuerda' },
    { value: 'roller', label: 'Rodillo' },
    { value: 'resistance band', label: 'Banda de Resistencia' },
    { value: 'ez barbell', label: 'Barra EZ' },
    { value: 'olympic barbell', label: 'Barra Olímpica' },
    { value: 'wheel roller', label: 'Rueda Abdominal' },
  ];
}

export function getAllMuscleGroupOptions(): { value: string; label: string }[] {
  return [
    { value: 'Pecho', label: 'Pecho' },
    { value: 'Espalda', label: 'Espalda' },
    { value: 'Hombros', label: 'Hombros' },
    { value: 'Brazos', label: 'Brazos' },
    { value: 'Piernas', label: 'Piernas' },
    { value: 'Antebrazos', label: 'Antebrazos' },
    { value: 'Pantorrillas', label: 'Pantorrillas' },
    { value: 'Core', label: 'Core' },
    { value: 'Cuello', label: 'Cuello' },
    { value: 'Cardio', label: 'Cardio' },
    { value: 'Glúteos', label: 'Glúteos' },
  ];
}
