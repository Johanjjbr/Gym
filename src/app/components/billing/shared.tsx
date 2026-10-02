/**
 * Piezas de facturación compartidas por la página Facturación y la ficha del socio.
 */
import { useEffect, useState } from 'react';
import { Ban, Copy, Eye, MessageCircle, MoreHorizontal, Printer, Trash2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
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
import { useVoidInvoice } from '../../hooks/useInvoices';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import { effectiveStatus, fmtDate, isOpen, whatsappNumber, whatsappUrl, type InvoiceRow, type InvoiceStatus } from '../../lib/billing';
import { formatMoney, toDateOnly } from '../../lib/dashboardHelpers';
import { paidAmountLabel } from '../../lib/currency';

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  Pagada: 'bg-[#10f94e]/10 text-[#10f94e] border-[#10f94e]/30',
  Pendiente: 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30',
  Vencida: 'bg-[#ff3b5c]/10 text-[#ff3b5c] border-[#ff3b5c]/30',
  Anulada: 'bg-muted text-muted-foreground border-border line-through decoration-1',
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

/**
 * Regla de anulación: las facturas sin pagar las puede anular recepción; las
 * pagadas solo con el permiso "Eliminar" de Facturación (también anula el pago).
 * La base de datos (void_invoice) aplica la misma regla.
 */
export function useCanVoidInvoice() {
  const { canAccess } = useModulePermissions();
  const canVoidPaid = canAccess('/facturacion', 'delete');
  return (inv: InvoiceRow) => inv.status !== 'Anulada' && (isOpen(inv) || canVoidPaid);
}

export function InvoiceRowMenu({
  inv, canVoid, onView, onPrint, onVoid,
}: {
  inv: InvoiceRow; canVoid: boolean; onView?: () => void; onPrint: () => void; onVoid: () => void;
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
        {inv.status !== 'Anulada' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onVoid}
              disabled={!canVoid}
              className="text-[#ff3b5c] focus:text-[#ff3b5c]"
              data-testid={`void-${inv.invoice_number}`}
            >
              <Ban className="mr-2 h-4 w-4" /> Anular factura
              {!canVoid && <span className="ml-2 text-xs text-muted-foreground">(requiere permiso)</span>}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Botón visible de anular para las filas de la tabla. */
export function VoidInvoiceButton({ inv, onVoid }: { inv: InvoiceRow; onVoid: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:bg-[#ff3b5c]/10 hover:text-[#ff3b5c]"
      title="Anular factura"
      aria-label={`Anular factura ${inv.invoice_number ?? ''}`}
      onClick={onVoid}
      data-testid={`void-btn-${inv.invoice_number}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

const VOID_REASONS = ['Factura duplicada', 'Monto incorrecto', 'Cobro registrado por error', 'Mes de cortesía', 'Socio se dio de baja'];

export function VoidInvoiceDialog({
  invoice, memberName, onClose, onVoided,
}: {
  invoice: InvoiceRow | null; memberName: string; onClose: () => void; onVoided?: () => void;
}) {
  const voidInv = useVoidInvoice();
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (invoice) setReason('');
  }, [invoice]);
  const valid = reason.trim().length >= 3;
  const paid = invoice?.status === 'Pagada';

  return (
    <AlertDialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Anular la factura {invoice?.invoice_number}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                {memberName} · {invoice?.concept ?? 'Factura'} · <strong>{invoice ? formatMoney(Number(invoice.amount)) : ''}</strong>
              </p>
              {paid ? (
                <p className="rounded-md border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 p-3 text-foreground">
                  Esta factura está <strong>pagada</strong>. Se anula también su pago
                  ({invoice ? paidAmountLabel(Number(invoice.amount), invoice.payments) : ''} del {fmtDate(invoice?.paid_at)}):
                  deja de sumar en los ingresos y {memberName} vuelve a deber ese período si no se le factura de nuevo.
                </p>
              ) : (
                <p>{memberName} dejará de deber este período. El sistema no la vuelve a generar.</p>
              )}
              <p className="text-muted-foreground">No se borra: queda en el historial como <em>Anulada</em> con el motivo y quién lo hizo.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <label htmlFor="void-reason" className="text-sm font-medium">Motivo <span className="text-[#ff3b5c]">*</span></label>
          <div className="flex flex-wrap gap-1.5">
            {VOID_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  reason === r ? 'border-foreground/40 bg-foreground/10' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea
            id="void-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Escribe o elige un motivo"
            data-testid="void-reason"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (!invoice || !valid) return;
              voidInv.mutate({ id: invoice.id, reason }, { onSuccess: () => { onClose(); onVoided?.(); } });
            }}
            disabled={voidInv.isPending || !valid}
            className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white"
            data-testid="void-confirm"
          >
            {voidInv.isPending ? 'Anulando…' : 'Anular factura'}
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
        paid_label: invoice.payments?.currency === 'VES' ? paidAmountLabel(Number(invoice.amount), invoice.payments) : undefined,
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
