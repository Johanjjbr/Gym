import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../lib/validations';
import { useCreateUser, useUpdateUser } from '../hooks/useUsers';
import { usePlans } from '../hooks/usePlans';
import { useStaff } from '../hooks/useStaff';
import { ActivationModal } from './ActivationModal';
import { uploadFile } from '../lib/upload';
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
import { Loader2, Camera, Trash2 } from 'lucide-react';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any; // Usuario existente para editar (opcional)
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: plans } = usePlans();
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);
  const [activationData, setActivationData] = useState<{
    token: string;
    userName: string;
    userEmail: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función para obtener categoría de IMC
  const getBMICategory = (imc: number) => {
    if (imc < 18.5) return { label: 'Bajo peso', color: 'text-yellow-400' };
    if (imc < 25) return { label: 'Normal', color: 'text-primary' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'text-orange-400' };
    return { label: 'Obesidad', color: 'text-destructive' };
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

  // Actualizar formulario cuando cambia el usuario
  useEffect(() => {
    if (user && open) {
      // Resetear el formulario con los datos del usuario
      const selectedPlan = plans?.find((p: any) => p.id === user.plan_id) || plans?.find((p: any) => p.name === user.plan);
      reset({
        cedula: user.cedula || '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        birth_date: user.birth_date || '',
        gender: user.gender || '',
        address: user.address || '',
        plan_id: user.plan_id || (selectedPlan?.id || ''),
        plan: selectedPlan?.name || user.plan || '',
        status: user.status || 'Activo',
        start_date: user.start_date
          ? new Date(user.start_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        next_payment: user.next_payment
          ? new Date(user.next_payment).toISOString().split('T')[0]
          : '',
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadFile(file, 'user-photos', 'users');
      setValue('photo', url);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setValue('photo', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      const selectedPlan = plans?.find((p: any) => p.id === data.plan_id);
      const submitData = {
        ...data,
        plan: selectedPlan?.name || data.plan,
        plan_id: data.plan_id || null,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
      };
      if (isEdit) {
        await updateUser.mutateAsync({ id: user.id, data: submitData });
        reset();
        onOpenChange(false);
      } else {
        const result = await createUser.mutateAsync(submitData);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground">
              {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEdit
                ? 'Modifica los datos del usuario. Los campos con * son obligatorios.'
                : 'Completa los datos del nuevo usuario. Los campos con * son obligatorios.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                Información Personal
              </h3>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/70">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="px-3 py-1.5 text-sm rounded-md bg-muted border border-border text-foreground/80 hover:bg-gray-700 inline-block">
                      {uploading ? 'Subiendo...' : 'Cambiar foto'}
                    </div>
                  </Label>
                  <input type="hidden" {...register('photo')} />
                  {photoPreview && (
                    <button type="button" onClick={removePhoto} className="block text-xs text-red-400 hover:text-red-300 mt-1">
                      Eliminar foto
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cedula" className="text-foreground/80">
                    Cédula <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cedula"
                    {...register('cedula')}
                    disabled={isSubmitting}
                    className="bg-muted border-border text-foreground"
                    placeholder="V-12345678"
                  />
                  {errors.cedula && (
                    <p className="text-xs text-destructive">{errors.cedula.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground/80">
                    Nombre Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register('name')}
                    disabled={isSubmitting}
                    className="bg-muted border-border text-foreground"
                    placeholder="Juan Pérez"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/80">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    disabled={isSubmitting}
                    className="bg-muted border-border text-foreground"
                    placeholder="juan@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground/80">
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    disabled={isSubmitting}
                    className="bg-muted border-border text-foreground"
                    placeholder="04121234567"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date" className="text-foreground/80">
                    Fecha de Nacimiento
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    {...register('birth_date')}
                    disabled={isSubmitting}
                    className="bg-muted border-border text-foreground"
                  />
                  {errors.birth_date && (
                    <p className="text-xs text-destructive">{errors.birth_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-foreground/80">
                    Género
                  </Label>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <SelectTrigger className="bg-muted border-border text-foreground">
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
                    <p className="text-xs text-destructive">{errors.gender.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground/80">
                    Dirección
                  </Label>
                  <Input
                    id="address"
                    {...register('address')}
                    disabled={isSubmitting}
                    className="bg-muted border-border text-foreground"
                    placeholder="Los Teques, Lagunetica"
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive">{errors.address.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información de Membresía */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                Información de Membresía
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan_id" className="text-foreground/80">
                    Tipo de Membresía <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="plan_id"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <SelectTrigger className="bg-muted border-border text-foreground">
                          <SelectValue placeholder="Seleccionar plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans?.filter((p: any) => p.is_active !== false).map((plan: any) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} — Bs {plan.price.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.plan_id && (
                    <p className="text-xs text-destructive">{errors.plan_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-foreground/80">
                    Estado <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <SelectTrigger className="bg-muted border-border text-foreground">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Activo">Activo</SelectItem>
                          <SelectItem value="Inactivo">Inactivo</SelectItem>
                          <SelectItem value="Suspendido">Suspendido</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && (
                    <p className="text-xs text-destructive">{errors.status.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                Información Adicional
              </h3>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact" className="text-foreground/80">
                  Contacto de Emergencia
                </Label>
                <Input
                  id="emergency_contact"
                  {...register('emergency_contact')}
                  disabled={isSubmitting}
                  className="bg-muted border-border text-foreground"
                  placeholder="Nombre: María Pérez, Tel: 0412-9876543"
                />
                {errors.emergency_contact && (
                  <p className="text-xs text-destructive">{errors.emergency_contact.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground/80">
                  Notas
                </Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  disabled={isSubmitting}
                  className="bg-muted border-border text-foreground min-h-[80px]"
                  placeholder="Observaciones médicas, alergias, etc."
                />
                {errors.notes && (
                  <p className="text-xs text-destructive">{errors.notes.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_notes" className="text-foreground/80">
                  Notas Médicas
                </Label>
                <Textarea
                  id="medical_notes"
                  {...register('medical_notes')}
                  disabled={isSubmitting}
                  className="bg-muted border-border text-foreground min-h-[80px]"
                  placeholder="Observaciones médicas, alergias, etc."
                />
                {errors.medical_notes && (
                  <p className="text-xs text-destructive">{errors.medical_notes.message}</p>
                )}
              </div>

              {/* Solo mostrar el número de miembro cuando se edita un usuario */}
              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="member_number" className="text-foreground/80">
                    Número de Miembro
                  </Label>
                  <Input
                    id="member_number"
                    {...register('member_number')}
                    disabled={true}
                    className="bg-muted border-border text-foreground"
                    placeholder={user?.member_number}
                  />
                  {errors.member_number && (
                    <p className="text-xs text-destructive">{errors.member_number.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-foreground/80">
                  Fecha de Inicio
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                  disabled={isEdit || isSubmitting}
                  className="bg-muted border-border text-foreground"
                />
                {errors.start_date && (
                  <p className="text-xs text-destructive">{errors.start_date.message}</p>
                )}
                {isEdit && (
                  <p className="text-xs text-muted-foreground/70">La fecha de inicio no se puede modificar</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_payment" className="text-foreground/80">
                  Próximo Pago
                </Label>
                <Input
                  id="next_payment"
                  type="date"
                  {...register('next_payment')}
                  disabled={isSubmitting}
                  className="bg-muted border-border text-foreground"
                />
                {errors.next_payment && (
                  <p className="text-xs text-destructive">{errors.next_payment.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-foreground/80">
                  Peso (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  {...register('weight', { valueAsNumber: false })}
                  disabled={isSubmitting}
                  className="bg-muted border-border text-foreground"
                  placeholder="70.5"
                />
                {errors.weight && (
                  <p className="text-xs text-destructive">{errors.weight.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="height" className="text-foreground/80">
                  Altura (cm)
                </Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  {...register('height', { valueAsNumber: false })}
                  disabled={isSubmitting}
                  className="bg-muted border-border text-foreground"
                  placeholder="175.5"
                />
                {errors.height && (
                  <p className="text-xs text-destructive">{errors.height.message}</p>
                )}
              </div>

              {calculatedBMI !== null && (
                <div className="space-y-2">
                  <Label htmlFor="imc" className="text-foreground/80">
                    IMC (Indice de Masa Corporal)
                  </Label>
                  <Input
                    id="imc"
                    type="number"
                    step="0.01"
                    {...register('imc', { valueAsNumber: false })}
                    disabled={isSubmitting}
                    className="bg-muted border-border text-foreground"
                    placeholder="22.5"
                    value={calculatedBMI}
                  />
                  {errors.imc && (
                    <p className="text-xs text-destructive">{errors.imc.message}</p>
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
                className="border-border hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-black font-bold"
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
