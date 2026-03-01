/**
 * Custom Hooks para gestionar Ejercicios
 * Biblioteca centralizada de ejercicios reutilizables
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { exercises } from '../lib/api';

// ============================================
// VALIDACIÓN CON ZOD
// ============================================

export const exerciseSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(100, 'Máximo 100 caracteres'),
  description: z.string().optional(),
  muscle_group: z.string().min(1, 'El grupo muscular es obligatorio'),
  equipment: z.string().optional(),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_group: string;
  equipment: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Hook para obtener todos los ejercicios
 */
export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: exercises.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener un ejercicio específico
 */
export function useExercise(id: string) {
  return useQuery({
    queryKey: ['exercises', id],
    queryFn: () => exercises.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para crear un nuevo ejercicio
 */
export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExerciseInput) => {
      // Validar datos con Zod antes de enviar
      const validated = exerciseSchema.parse(data);
      return exercises.create(validated);
    },
    onSuccess: (newExercise) => {
      // Invalidar y refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      
      // Agregar optimísticamente a la caché
      queryClient.setQueryData<Exercise[]>(['exercises'], (old = []) => [...old, newExercise]);

      toast.success('Ejercicio creado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error al crear ejercicio:', error);
      toast.error(error.message || 'Error al crear el ejercicio');
    },
  });
}

/**
 * Hook para actualizar un ejercicio
 */
export function useUpdateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExerciseInput> }) =>
      exercises.update(id, data),
    onSuccess: (updatedExercise) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises', updatedExercise.id] });

      toast.success('Ejercicio actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error al actualizar ejercicio:', error);
      toast.error(error.message || 'Error al actualizar el ejercicio');
    },
  });
}

/**
 * Hook para eliminar un ejercicio
 */
export function useDeleteExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exercises.delete,
    onSuccess: (_, deletedId) => {
      // Actualizar caché optimísticamente
      queryClient.setQueryData<Exercise[]>(['exercises'], (old = []) =>
        old.filter((ex) => ex.id !== deletedId)
      );

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['exercises'] });

      toast.success('Ejercicio eliminado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error al eliminar ejercicio:', error);
      toast.error(error.message || 'No se pudo eliminar el ejercicio. Puede estar en uso en rutinas activas.');
    },
  });
}