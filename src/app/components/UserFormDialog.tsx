/**
 * Componente de ejemplo: Formulario de Usuario con Zod + React Query
 * Muestra cómo integrar validación y mutaciones correctamente
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../lib/validations';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import { useStaff } from '../hooks/useStaff';
import { usePlans } from '../hooks/usePlans';
import { ActivationModal } from './ActivationModal';
import { formatCurrency } from '../../lib/format';
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
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { Loader2, Calendar } from 'lucide-react';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any; // Usuario existente para editar (opcional)
}

// Formatear YYYY-MM-DD -> DD/MM/YYYY
function formatToDisplay(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Formatear DD/MM/YYYY -> YYYY-MM-DD (para BD)
function formatToISO(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

// Componente de input fecha DD/MM/YYYY con picker nativo
function DateInput({ 
  id, 
  label, 
  register, 
  error, 
  disabled, 
  required = false,
  value 
}: { 
  id: string; 
  label: string; 
  register: any; 
  error?: any; 
  disabled?: boolean; 
  required?: boolean;
  value?: string;
}) {
  const [displayValue, setDisplayValue] = useState(() => formatToDisplay(value || ''));
  const pickerRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
    if (val.length >= 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);
    setDisplayValue(val.slice(0, 10));
    register(id).onChange({ target: { name: id, value: formatToISO(val.slice(0, 10)) } });
  };

  const handleBlur = () => {
    if (displayValue && !/^\d{2}\/\d{2}\/\d{4}$/.test(displayValue)) {
      setDisplayValue('');
      register(id).onChange({ target: { name: id, value: '' } });
    }
  };

  const openPicker = () => {
    if (pickerRef.current) {
      // Usar showPicker() API moderna si está disponible
      if (pickerRef.current.showPicker) {
        pickerRef.current.showPicker();
      } else {
        pickerRef.current.focus();
        pickerRef.current.click();
      }
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(formatToDisplay(e.target.value));
    register(id).onChange({ target: { name: id, value: e.target.value } });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-300">
        {label} {required && <span className="text-[#ff3b5c]">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          placeholder="DD/MM/YYYY"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="bg-gray-800 border-gray-700 text-white pr-12"
        />
        <div className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center">
          <button
            type="button"
            onClick={openPicker}
            className="w-full h-full text-[#10f94e] hover:text-[#0ed145] p-1"
            disabled={disabled}
            aria-label="Abrir calendario"
          >
            <Calendar className="h-5 w-5" />
          </button>
          <input
            ref={pickerRef}
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={value || ''}
            onChange={handlePickerChange}
            disabled={disabled}
            tabIndex={-1}
          />
        </div>
      </div>
      {error && <p className="text-xs text-[#ff3b5c]">{error.message}</p>}
    </div>
  );
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: plans = [], isLoading: loadingPlans } = usePlans({ is_active: true });
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);
  const [activationData, setActivationData] = useState<{
    token: string;
    userName: string;
    userEmail: string;
  } | null>(null);

  // Función para obtener categoría de IMC
  const getBMICategory = (imc: number) => {
    if (imc < 18.5) return { label: 'Bajo peso', color: 'text-yellow-400' };
    if (imc < 25) return { label: 'Normal', color: 'text-[#10f94e]' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'text-orange-400' };
    return { label: 'Obesidad', color: 'text-[#ff3b5c]' };
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      status: 'Activo',
      start_date: new Date().toISOString().split('T')[0],
      is_free_user: false,
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
        const imc = weightNum / (heightInMeters * heightInMeters);
        const roundedIMC = Math.round(imc * 100) / 100;
        setCalculatedBMI(roundedIMC);
        setValue('imc', roundedIMC);
      }
    } else {
      setCalculatedBMI(null);
      setValue('imc', undefined);
    }
  }, [weight, height, setValue]);

  // Handler para cambio de plan - actualiza plan_id, plan name y next_payment
  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setValue('plan_id', plan.id);
      setValue('plan', plan.name);
      // Calcular next_payment automático: hoy + duration_days
      const nextPayment = new Date();
      nextPayment.setDate(nextPayment.getDate() + plan.duration_days);
      setValue('next_payment', nextPayment.toISOString().split('T')[0]);
    }
  };

  // Función para formatear fecha a YYYY-MM-DD
  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    // Si ya está en formato YYYY-MM-DD, devolverlo (necesario para type="date")
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Si es DD/MM/YYYY, convertir a YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }
    // Si es timestamp ISO, extraer y formatear
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Actualizar formulario cuando cambia el usuario
  useEffect(() => {
    if (user && open) {
      // Resetear el formulario con los datos del usuario
      reset({
        name: user.name || '',
        email: user.email || '',
        cedula: user.cedula || '',
        phone: user.phone || '',
        birth_date: formatDateForInput(user.birth_date),
        gender: user.gender || '',
        address: user.address || '',
        plan: user.plan || '',
        plan_id: user.plan_id || '',
        status: user.status || 'Activo',
        start_date: formatDateForInput(user.start_date),
        next_payment: formatDateForInput(user.next_payment),
        weight: user.weight?.toString() || '',
        height: user.height?.toString() || '',
        emergency_contact: user.emergency_contact || '',
        notes: user.notes || '',
        medical_notes: user.medical_notes || '',
        member_number: user.member_number || '',
        is_free_user: user.is_free_user === true,
      });
    } else if (!open) {
      // Limpiar formulario al cerrar
      reset({
        status: 'Activo',
        start_date: new Date().toISOString().split('T')[0],
        is_free_user: false,
      });
      setCalculatedBMI(null);
    }
  }, [user, open, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      // El número de miembro se genera automáticamente en el backend
      // No es necesario enviarlo en la creación
      if (isEdit) {
        await updateUser.mutateAsync({ id: user.id, data });
        toast.success('Usuario actualizado exitosamente');
        reset();
        onOpenChange(false);
      } else {
        const result = await createUser.mutateAsync(data);
        reset();
        onOpenChange(false);
        
        // Mostrar modal de activación con el token generado
        setActivationData({
          token: result.activationToken,
          userName: data.name,
          userEmail: data.email,
        });
      }
    } catch (error) {
      // El error ya se muestra en toast automáticamente
      console.error(error);
    }
  };

  return (
    <>
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
                  <Label htmlFor="cedula" className="text-gray-300">
                    Cédula <span className="text-[#ff3b5c]">*</span>
                  </Label>
                  <Input
                    id="cedula"
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    {...register('cedula')}
                    disabled={isSubmitting}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="12345678"
                  />
                  {errors.cedula && (
                    <p className="text-xs text-[#ff3b5c]">{errors.cedula.message}</p>
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

                <DateInput
                    id="birth_date"
                    label="Fecha de Nacimiento"
                    register={register}
                    error={errors.birth_date}
                    disabled={isSubmitting}
                    value={watch('birth_date')}
                  />

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-gray-300">
                    Género
                  </Label>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Femenino">Femenino</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
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
                  {loadingPlans ? (
                    <Select disabled>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Cargando planes..." />
                      </SelectTrigger>
                    </Select>
                  ) : (
                    <Select
                      onValueChange={handlePlanChange}
                      defaultValue={watch('plan_id')}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white" disabled={isSubmitting}>
                        <SelectValue placeholder="Seleccionar plan..." />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {formatCurrency(Number(plan.price))} ({plan.duration_days} días)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.plan && (
                    <p className="text-xs text-[#ff3b5c]">{errors.plan.message}</p>
                  )}
                  {errors.plan_id && (
                    <p className="text-xs text-[#ff3b5c]">{errors.plan_id.message}</p>
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

              <Controller
                name="is_free_user"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                    <div>
                      <Label htmlFor="is_free_user" className="text-gray-200">Exento de pago</Label>
                      <p className="text-xs text-gray-400 mt-1">
                        {field.value
                          ? 'No se le generan facturas ni se le suspende por falta de pago. Las facturas pendientes que ya tenga no se borran.'
                          : 'Se le factura según su plan. Si estaba exento, la factura del mes se genera en el próximo proceso nocturno o al cobrarle.'}
                      </p>
                    </div>
                    <Switch
                      id="is_free_user"
                      checked={field.value === true}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                      data-testid="switch-free-user"
                    />
                  </div>
                )}
              />
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

              {/* Solo mostrar el número de miembro cuando se edita un usuario */}
              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="member_number" className="text-gray-300">
                    Número de Miembro
                  </Label>
                  <Input
                    id="member_number"
                    {...register('member_number')}
                    disabled={true}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder={user?.member_number}
                  />
                  {errors.member_number && (
                    <p className="text-xs text-[#ff3b5c]">{errors.member_number.message}</p>
                  )}
                </div>
              )}

              <DateInput
                  id="start_date"
                  label="Fecha de Inicio"
                  register={register}
                  error={errors.start_date}
                  disabled={isEdit || isSubmitting}
                  value={watch('start_date')}
                />
                {isEdit && (
                  <p className="text-xs text-gray-500">La fecha de inicio no se puede modificar</p>
                )}

              <DateInput
                  id="next_payment"
                  label="Próximo Pago"
                  register={register}
                  error={errors.next_payment}
                  disabled={isSubmitting}
                  value={watch('next_payment')}
                />

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
                  <Label htmlFor="imc" className="text-gray-300">
                    IMC (Indice de Masa Corporal)
                  </Label>
                  <Input
                    id="imc"
                    type="number"
                    step="0.01"
                    {...register('imc', { valueAsNumber: false })}
                    disabled={isSubmitting}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="22.5"
                    value={calculatedBMI}
                  />
                  {errors.imc && (
                    <p className="text-xs text-[#ff3b5c]">{errors.imc.message}</p>
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
      {activationData && (
        <ActivationModal
          open={true}
          onOpenChange={() => setActivationData(null)}
          activationToken={activationData.token}  // ✅ corregido
          userName={activationData.userName}
          userEmail={activationData.userEmail}
        />
      )}
    </>
  );
}
