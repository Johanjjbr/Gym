/**
 * Componente de ejemplo: Formulario de Usuario con Zod + React Query
 * Muestra cómo integrar validación y mutaciones correctamente
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../lib/validations';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Loader2 } from 'lucide-react';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any; // Usuario existente para editar (opcional)
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: user || {
      status: 'Activo',
      membership_type: 'Mensual',
      registration_date: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEdit) {
        await updateUser.mutateAsync({ id: user.id, data });
      } else {
        await createUser.mutateAsync(data);
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      // El error ya se muestra en toast automáticamente
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEdit
              ? 'Modifica los datos del usuario. Los campos con * son obligatorios.'
              : 'Completa los datos del nuevo usuario. Los campos con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Información Personal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Nombre Completo <span className="text-[#ff3b5c]">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  disabled={isSubmitting}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Juan Pérez"
                />
                {errors.name && (
                  <p className="text-xs text-[#ff3b5c]">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email <span className="text-[#ff3b5c]">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled={isSubmitting}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="juan@ejemplo.com"
                />
                {errors.email && (
                  <p className="text-xs text-[#ff3b5c]">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  disabled={isSubmitting}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="04121234567"
                />
                {errors.phone && (
                  <p className="text-xs text-[#ff3b5c]">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-gray-300">
                  Fecha de Nacimiento
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...register('birth_date')}
                  disabled={isSubmitting}
                  className="bg-gray-800 border-gray-700 text-white"
                />
                {errors.birth_date && (
                  <p className="text-xs text-[#ff3b5c]">{errors.birth_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-gray-300">
                  Género
                </Label>
                <select
                  id="gender"
                  {...register('gender')}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
                {errors.gender && (
                  <p className="text-xs text-[#ff3b5c]">{errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-300">
                  Dirección
                </Label>
                <Input
                  id="address"
                  {...register('address')}
                  disabled={isSubmitting}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Los Teques, Lagunetica"
                />
                {errors.address && (
                  <p className="text-xs text-[#ff3b5c]">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información de Membresía */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Información de Membresía
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="membership_type" className="text-gray-300">
                  Tipo de Membresía <span className="text-[#ff3b5c]">*</span>
                </Label>
                <select
                  id="membership_type"
                  {...register('membership_type')}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
                >
                  <option value="Mensual">Mensual</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                </select>
                {errors.membership_type && (
                  <p className="text-xs text-[#ff3b5c]">{errors.membership_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-gray-300">
                  Estado <span className="text-[#ff3b5c]">*</span>
                </Label>
                <select
                  id="status"
                  {...register('status')}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Suspendido">Suspendido</option>
                </select>
                {errors.status && (
                  <p className="text-xs text-[#ff3b5c]">{errors.status.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
              Información Adicional
            </h3>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact" className="text-gray-300">
                Contacto de Emergencia
              </Label>
              <Input
                id="emergency_contact"
                {...register('emergency_contact')}
                disabled={isSubmitting}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Nombre: María Pérez, Tel: 0412-9876543"
              />
              {errors.emergency_contact && (
                <p className="text-xs text-[#ff3b5c]">{errors.emergency_contact.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-300">
                Notas
              </Label>
              <Textarea
                id="notes"
                {...register('notes')}
                disabled={isSubmitting}
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                placeholder="Observaciones médicas, alergias, etc."
              />
              {errors.notes && (
                <p className="text-xs text-[#ff3b5c]">{errors.notes.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
              className="border-gray-700 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#10f94e] hover:bg-[#0ed145] text-black font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>{isEdit ? 'Actualizar' : 'Crear'} Usuario</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
