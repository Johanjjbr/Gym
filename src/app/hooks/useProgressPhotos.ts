import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { uploadFile, deleteFile } from '../lib/upload';
import { toast } from 'sonner';

export interface ProgressPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  date: string;
  notes: string | null;
  created_at: string;
}

export const progressPhotoKeys = {
  all: ['progress-photos'] as const,
  byUser: (userId: string) => ['progress-photos', userId] as const,
};

export function useProgressPhotos(userId: string) {
  return useQuery({
    queryKey: progressPhotoKeys.byUser(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as ProgressPhoto[];
    },
    enabled: !!userId,
  });
}

export function useUploadProgressPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      file,
      notes,
      date,
    }: {
      userId: string;
      file: File;
      notes?: string;
      date?: string;
    }) => {
      const photoUrl = await uploadFile(file, 'user-photos', `progress/${userId}`);

      const { data, error } = await supabase
        .from('progress_photos')
        .insert([{
          user_id: userId,
          photo_url: photoUrl,
          notes: notes || null,
          date: date || new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: progressPhotoKeys.byUser(data.user_id) });
      toast.success('Foto agregada correctamente');
    },
    onError: (error) => {
      console.error('Error al subir foto:', error);
      toast.error('Error al subir la foto');
    },
  });
}

export function useDeleteProgressPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: ProgressPhoto) => {
      await deleteFile(photo.photo_url);

      const { error } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;
    },
    onSuccess: (_data, photo) => {
      queryClient.invalidateQueries({ queryKey: progressPhotoKeys.byUser(photo.user_id) });
      toast.success('Foto eliminada');
    },
    onError: (error) => {
      console.error('Error al eliminar foto:', error);
      toast.error('Error al eliminar la foto');
    },
  });
}
