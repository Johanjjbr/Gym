/**
 * Componente de ejemplo: Formulario de Usuario con Zod + React Query
 * Muestra cómo integrar validación y mutaciones correctamente
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../lib/validations';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import { useStaff } from '../hooks/useStaff';
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
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);

  // Función para obtener categoría de IMC
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Bajo peso', color: 'text-yellow-400' };
    if (bmi < 25) return { label: 'Normal', color: 'text-[#10f94e]' };
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-orange-400' };
    return { label: 'Obesidad', color: 'text-[#ff3b5c]' };
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      status: 'Activo',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  // Observar cambios en peso y altura para calcular IMC
  const weight = watch('weight');
  const height = watch('height');

  // Calcular IMC automáticamente
  useEffect(() => {
    if (weight && height) {
      const weightNum = typeof weight === 'string' ? parseFloat(weight) : weight;
      const heightNum = typeof height === 'string' ? parseFloat(height) : height;
      
      if (!isNaN(weightNum) && !isNaN(heightNum) && heightNum > 0) {
        // IMC = peso(kg) / (altura(m))^2
        const heightInMeters = heightNum / 100;
        const bmi = weightNum / (heightInMeters * heightInMeters);
        const roundedBMI = Math.round(bmi * 100) / 100;
        setCalculatedBMI(roundedBMI);
        setValue('bmi', roundedBMI);
      }
    } else {
      setCalculatedBMI(null);
      setValue('bmi', undefined);
    }
  }, [weight, height, setValue]);

  // Actualizar formulario cuando cambia el usuario
  useEffect(() => {
    if (user && open) {
      // Resetear el formulario con los datos del usuario
      reset({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        birth_date: user.birth_date || '',
        gender: user.gender || '',
        address: user.address || '',
        plan: user.plan || '',
        status: user.status || 'Activo',
        start_date: user.start_date || new Date().toISOString().split('T')[0],
        next_payment: user.next_payment || '',
        weight: user.weight?.toString() || '',
        height: user.height?.toString() || '',
        emergency_contact: user.emergency_contact || '',
        notes: user.notes || '',
        medical_notes: user.medical_notes || '',
        member_number: user.member_number || '',
      });
    } else if (!open) {
      // Limpiar formulario al cerrar
      reset({
        status: 'Activo',
        start_date: new Date().toISOString().split('T')[0],
      });
      setCalculatedBMI(null);
    }
  }, [user, open, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      // Si es nuevo usuario y no tiene member_number, generar uno
      if (!isEdit && !data.member_number) {
        // Generar número de miembro basado en timestamp
        const timestamp = Date.now().toString().slice(-6);
        data.member_number = `GM${timestamp}`;
      }

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
                <Label htmlFor="plan" className="text-gray-300">
                  Tipo de Membresía <span className="text-[#ff3b5c]">*</span>
                </Label>
                <select
                  id="plan"
                  {...register('plan')}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
                >
                  <option value="Mensual">Mensual</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                </select>
                {errors.plan && (
                  <p className="text-xs text-[#ff3b5c]">{errors.plan.message}</p>
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

            <div className="space-y-2">
              <Label htmlFor="medical_notes" className="text-gray-300">
                Notas Médicas
              </Label>
              <Textarea
                id="medical_notes"
                {...register('medical_notes')}
                disabled={isSubmitting}
                className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                placeholder="Observaciones médicas, alergias, etc."
              />
              {errors.medical_notes && (
                <p className="text-xs text-[#ff3b5c]">{errors.medical_notes.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_number" className="text-gray-300">
                Número de Miembro {!isEdit && <span className="text-gray-500 text-xs"> (se genera automáticamente)</span>}
              </Label>
              <Input
                id="member_number"
                {...register('member_number')}
                disabled={true}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder={isEdit ? user?.member_number : "Se generará automáticamente"}
              />
              {errors.member_number && (
                <p className="text-xs text-[#ff3b5c]">{errors.member_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-gray-300">
                Fecha de Inicio
              </Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                disabled={isEdit || isSubmitting}
                className="bg-gray-800 border-gray-700 text-white"
              />
              {errors.start_date && (
                <p className="text-xs text-[#ff3b5c]">{errors.start_date.message}</p>
              )}
              {isEdit && (
                <p className="text-xs text-gray-500">La fecha de inicio no se puede modificar</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_payment" className="text-gray-300">
                Próximo Pago
              </Label>
              <Input
                id="next_payment"
                type="date"
                {...register('next_payment')}
                disabled={isSubmitting}
                className="bg-gray-800 border-gray-700 text-white"
              />
              {errors.next_payment && (
                <p className="text-xs text-[#ff3b5c]">{errors.next_payment.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight" className="text-gray-300">
                Peso (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                {...register('weight', { valueAsNumber: false })}
                disabled={isSubmitting}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="70.5"
              />
              {errors.weight && (
                <p className="text-xs text-[#ff3b5c]">{errors.weight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="height" className="text-gray-300">
                Altura (cm)
              </Label>
              <Input
                id="height"
                type="number"
                step="0.01"
                {...register('height', { valueAsNumber: false })}
                disabled={isSubmitting}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="175.5"
              />
              {errors.height && (
                <p className="text-xs text-[#ff3b5c]">{errors.height.message}</p>
              )}
            </div>

            {calculatedBMI !== null && (
              <div className="space-y-2">
                <Label htmlFor="bmi" className="text-gray-300">
                  IMC (Indice de Masa Corporal)
                </Label>
                <Input
                  id="bmi"
                  type="number"
                  step="0.01"
                  {...register('bmi', { valueAsNumber: false })}
                  disabled={isSubmitting}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="22.5"
                  value={calculatedBMI}
                />
                {errors.bmi && (
                  <p className="text-xs text-[#ff3b5c]">{errors.bmi.message}</p>
                )}
                <p className={getBMICategory(calculatedBMI).color}>
                  {getBMICategory(calculatedBMI).label}
                </p>
              </div>
            )}
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