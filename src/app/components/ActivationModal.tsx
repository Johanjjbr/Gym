import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Mail, MessageCircle, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface ActivationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activationToken: string;
  userName: string;
  userEmail: string;
}

export function ActivationModal({
  open,
  onOpenChange,
  activationToken,
  userName,
  userEmail,
}: ActivationModalProps) {
  const [copied, setCopied] = useState(false);

  // Generar URL de activación
  const activationUrl = `${window.location.origin}/activar/${activationToken}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activationUrl);
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar el link');
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `¡Hola ${userName}! 👋\n\n` +
      `Bienvenido a GYM Lagunetica 💪\n\n` +
      `Para completar tu registro y crear tu contraseña, ingresa al siguiente link:\n\n` +
      `${activationUrl}\n\n` +
      `¡Nos vemos en el gym! 🏋️`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Activa tu cuenta - GYM Lagunetica');
    const body = encodeURIComponent(
      `Hola ${userName},\n\n` +
      `Bienvenido a GYM Lagunetica!\n\n` +
      `Para completar tu registro y crear tu contraseña, ingresa al siguiente link:\n\n` +
      `${activationUrl}\n\n` +
      `Si tienes alguna pregunta, no dudes en contactarnos.\n\n` +
      `¡Nos vemos en el gym!\n\n` +
      `Equipo GYM Lagunetica`
    );
    window.location.href = `mailto:${userEmail}?subject=${subject}&body=${body}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">¡Usuario Creado Exitosamente! 🎉</DialogTitle>
          <DialogDescription>
            El usuario <span className="font-semibold text-foreground">{userName}</span> ha sido registrado. 
            Comparte el código QR o link de activación para que complete su registro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 p-6 bg-muted/50 rounded-lg border border-border">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                value={activationUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-center text-muted-foreground max-w-sm">
              El usuario puede escanear este código QR con su celular para acceder directamente
            </p>
          </div>

          {/* Link de Activación */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Link de Activación</label>
            <div className="flex gap-2">
              <Input
                value={activationUrl}
                readOnly
                className="font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Opciones de Envío */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Enviar Invitación</p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={handleWhatsApp}
                className="flex flex-col gap-2 h-auto py-4"
              >
                <MessageCircle className="w-5 h-5 text-green-500" />
                <span className="text-xs">WhatsApp</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleEmail}
                className="flex flex-col gap-2 h-auto py-4"
              >
                <Mail className="w-5 h-5 text-blue-500" />
                <span className="text-xs">Email</span>
              </Button>

              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex flex-col gap-2 h-auto py-4"
              >
                <Printer className="w-5 h-5 text-gray-500" />
                <span className="text-xs">Imprimir</span>
              </Button>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <span className="font-medium">Importante:</span> El usuario deberá crear su contraseña 
              al acceder al link. El link no tiene fecha de expiración.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
