/**
 * Piezas de facturación compartidas por la página Facturación y la ficha del socio.
 */
import { useEffect, useState } from 'react';
import { Copy, Eye, MessageCircle, MoreHorizontal, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { PrintInvoice } from '../../../components/PrintInvoice';
import { supabase } from '../../lib/supabase';
import { useDeleteInvoice } from '../../hooks/useInvoices';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import { effectiveStatus, fmtDate, isOpen, whatsappNumber, whatsappUrl, type InvoiceRow, type InvoiceStatus } from '../../lib/billing';
import { formatMoney, toDateOnly } from '../../lib/dashboardHelpers';

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  Pagada: 'bg-[#10f94e]/10 text-[#10f94e] border-[#10f94e]/30',
  Pendiente: 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30',
  Vencida: 'bg-[#ff3b5c]/10 text-[#ff3b5c] border-[#ff3b5c]/30',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

/**
 * Regla de eliminación: las facturas sin pagar se pueden eliminar; las pagadas
 * solo con el permiso "Eliminar" de Facturación (borran también el pago).
 */
export function useCanDeleteInvoice() {
  const { canAccess } = useModulePermissions();
  const canDeletePaid = canAccess('/facturacion', 'delete');
  return (inv: InvoiceRow) => isOpen(inv) || canDeletePaid;
}

export function InvoiceRowMenu({
  inv, canDelete, onView, onPrint, onDelete,
}: {
  inv: InvoiceRow; canDelete: boolean; onView?: () => void; onPrint: () => void; onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Acciones de ${inv.invoice_number}`} data-testid={`menu-${inv.invoice_number}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onSelect={onView}>
            <Eye className="mr-2 h-4 w-4" /> Ver detalle
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onPrint} data-testid={`print-${inv.invoice_number}`}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-[#ff3b5c] focus:text-[#ff3b5c]">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DeleteInvoiceDialog({
  invoice, memberName, onClose, onDeleted,
}: {
  invoice: InvoiceRow | null; memberName: string; onClose: () => void; onDeleted?: () => void;
}) {
  const del = useDeleteInvoice();
  return (
    <AlertDialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la factura {invoice?.invoice_number}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {invoice?.status === 'Pagada' ? (
                <p className="rounded-md border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 p-3 text-foreground">
                  Esta factura está <strong>pagada</strong>. Al eliminarla también se borra el pago de{' '}
                  {formatMoney(Number(invoice.amount))} registrado el {fmtDate(invoice.paid_at)}, y {memberName} volverá a
                  figurar como deudor de ese período.
                </p>
              ) : (
                <p>{invoice && `${memberName} dejará de deber ${invoice.concept ?? 'este período'}.`}</p>
              )}
              <p>Esta acción no se puede deshacer.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (!invoice) return;
              del.mutate(invoice.id, { onSuccess: () => { onClose(); onDeleted?.(); } });
            }}
            disabled={del.isPending}
            className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white"
          >
            {del.isPending ? 'Eliminando…' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface GymInfo { name: string; address?: string; phone?: string; email?: string; logo_url?: string }

export function useGymInfo() {
  const [gym, setGym] = useState<GymInfo>({ name: 'Gimnasio' });
  useEffect(() => {
    supabase.from('gyms').select('name, address, phone, email, logo_url').eq('is_active', true).limit(1).maybeSingle()
      .then(({ data }) => data && setGym(data));
  }, []);
  return gym;
}

export interface PrintMember {
  name: string;
  cedula?: string | null;
  member_number?: string | null;
  plan?: string | null;
  phone?: string | null;
}

export function InvoicePrint({ invoice, member, onClose }: { invoice: InvoiceRow | null; member: PrintMember | undefined; onClose: () => void }) {
  const gymInfo = useGymInfo();
  if (!invoice) return null;
  const today = toDateOnly(new Date());
  return (
    <PrintInvoice
      isOpen
      onClose={onClose}
      gymInfo={gymInfo}
      invoice={{
        id: invoice.id,
        invoice_number: invoice.invoice_number || 'S/N',
        date: invoice.created_at || invoice.due_date,
        due_date: invoice.due_date,
        status: effectiveStatus(invoice, today),
        amount: Number(invoice.amount),
        method: invoice.method ?? undefined,
        reference: invoice.reference ?? undefined,
        notes: invoice.notes || invoice.concept || undefined,
        paid_at: invoice.paid_at ?? undefined,
      }}
      userInfo={{
        name: member?.name ?? 'Socio',
        cedula: member?.cedula ?? undefined,
        member_number: member?.member_number ?? undefined,
        plan: member?.plan ?? undefined,
        phone: member?.phone ?? undefined,
      }}
    />
  );
}

/**
 * Aviso al socio por WhatsApp (lo envía recepción). Abre WhatsApp con el
 * mensaje ya escrito; si el socio no tiene un teléfono válido, copia el texto.
 */
export function NotifyButton({ phone, message, size = 'sm' }: { phone?: string | null; message: string; size?: 'sm' | 'icon' }) {
  const number = whatsappNumber(phone);
  if (!number) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        title="El socio no tiene un teléfono válido: se copia el mensaje"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(message);
            toast.success('Mensaje copiado', { description: 'El socio no tiene un teléfono válido cargado.' });
          } catch {
            toast.error('No se pudo copiar el mensaje');
          }
        }}
      >
        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar aviso
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="sm" className="h-8 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
      <a href={whatsappUrl(number, message)} target="_blank" rel="noopener noreferrer" data-testid="btn-avisar">
        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Avisar
      </a>
    </Button>
  );
}
