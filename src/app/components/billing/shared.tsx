/**
 * Piezas de facturación compartidas por la página Facturación y la ficha del socio.
 */
import { useEffect, useState } from 'react';
import { useOrgContext } from '../../hooks/useOrgContext';
import { Ban, Copy, CreditCard, Eye, MessageCircle, MoreHorizontal, Printer, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
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
import { anchorDate, billingDayOf, effectiveStatus, fmtDate, isOpen, monthLabel, periodLabel, whatsappNumber, whatsappUrl, type InvoiceRow, type InvoiceStatus } from '../../lib/billing';
import { daysBetween, formatMoney, toDateOnly } from '../../lib/dashboardHelpers';
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

interface GymInfo { name: string; address?: string; phone?: string; email?: string; logo_url?: string; rif?: string }

/**
 * Encabezado de facturas, recibos y mensajes: nombre, RIF y logo de la empresa,
 * dirección y teléfono de la sede con la que se trabaja.
 */
export function useGymInfo(): GymInfo {
  const { data: ctx } = useOrgContext();
  if (!ctx) return { name: 'Gimnasio' };
  const org = ctx.organization;
  const branch = ctx.branches.find((b) => b.id === ctx.current_gym_id) ?? ctx.branches[0];
  return {
    name: org.name,
    rif: org.rif ?? undefined,
    address: branch?.address ?? undefined,
    phone: branch?.phone || org.phone || undefined,
    email: org.email ?? undefined,
    logo_url: org.logo_url ?? undefined,
  };
}

export interface PrintMember {
  id?: string;
  name: string;
  cedula?: string | null;
  member_number?: string | null;
  phone?: string | null;
  start_date?: string | null;
  billing_day?: number | null;
  plans?: { name: string; duration_days: number; type?: string | null } | null;
  /** Nombre del plan si no viene `plans` */
  plan?: string | null;
}

/** Período que cubre la factura según el plan y el día de pago del socio. */
export function invoicePeriod(invoice: InvoiceRow, member?: PrintMember | null): string | null {
  const due = invoice.due_date.slice(0, 10);
  // Las facturas guardan el período en el concepto: "Premium Plus · 24 oct – 23 nov"
  const fromConcept = invoice.concept?.split(' · ')[1];
  if (fromConcept) return fromConcept;
  if (!member?.plans) return null;
  // Día de pago del socio, salvo que la factura venza otro día (facturas antiguas)
  const day = billingDayOf(member);
  const useDay = anchorDate(due, day) === due ? day : Number(due.slice(8, 10));
  return periodLabel(due, member.plans.duration_days, useDay, member.plans.type);
}

/** "Factura - Kevin Raga - Octubre 2026" (socio + mes pagado) */
export function invoiceFileName(invoice: InvoiceRow, memberName: string): string {
  return `Factura - ${memberName} - ${monthLabel(invoice.due_date.slice(0, 10))}`;
}

export function InvoicePrint({ invoice, member, onClose }: { invoice: InvoiceRow | null; member: PrintMember | undefined; onClose: () => void }) {
  const gymInfo = useGymInfo();
  if (!invoice) return null;
  const today = toDateOnly(new Date());
  const name = member?.name ?? 'Socio';
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
        concept: invoice.concept ?? undefined,
        period: invoicePeriod(invoice, member) ?? undefined,
        notes: [invoice.notes, invoice.status === 'Anulada' && invoice.void_reason ? `Anulada: ${invoice.void_reason}` : null].filter(Boolean).join('\n') || undefined,
        paid_at: invoice.paid_at ?? undefined,
        paid_label: invoice.payments?.currency === 'VES' ? paidAmountLabel(Number(invoice.amount), invoice.payments) : undefined,
        file_name: invoiceFileName(invoice, name),
      }}
      userInfo={{
        name,
        cedula: member?.cedula ?? undefined,
        member_number: member?.member_number ?? undefined,
        plan: member?.plans?.name ?? member?.plan ?? undefined,
        phone: member?.phone ?? undefined,
      }}
    />
  );
}

/**
 * Detalle completo de la factura (lo mismo que se imprime, en pantalla):
 * socio, período, fechas, monto, cómo y quién la cobró, notas y anulación.
 */
export function InvoiceDetailDialog({
  invoice, member, onClose, onPrint, onVoid, onCollect, canVoid, onOpenMember,
}: {
  invoice: InvoiceRow | null;
  member?: PrintMember | null;
  onClose: () => void;
  onPrint: (inv: InvoiceRow) => void;
  onVoid?: (inv: InvoiceRow) => void;
  onCollect?: (inv: InvoiceRow) => void;
  canVoid?: boolean;
  onOpenMember?: (userId: string) => void;
}) {
  const today = toDateOnly(new Date());
  if (!invoice) return null;
  const st = effectiveStatus(invoice, today);
  const period = invoicePeriod(invoice, member);
  const pay = invoice.payments;
  const issued = invoice.created_at ? fmtDate(invoice.created_at) : null;
  const daysLate = st === 'Vencida' ? daysBetween(invoice.due_date.slice(0, 10), today) : 0;
  const planName = member?.plans?.name ?? member?.plan ?? invoice.concept?.split(' · ')[0];

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[92vh] overflow-y-auto" data-testid="invoice-detail">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            Factura {invoice.invoice_number ?? ''} <StatusBadge status={st} />
          </DialogTitle>
          <DialogDescription>{invoice.concept ?? (period ? `${planName ?? 'Mensualidad'} · ${period}` : 'Mensualidad')}</DialogDescription>
        </DialogHeader>

        {/* Monto y estado */}
        <div className="flex items-end justify-between rounded-lg border border-border bg-muted/30 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Monto</p>
            <p className={`text-3xl font-semibold tabular-nums ${st === 'Anulada' ? 'line-through text-muted-foreground' : ''}`}>{formatMoney(Number(invoice.amount))}</p>
            {st === 'Pagada' && pay?.currency === 'VES' && (
              <p className="text-sm text-muted-foreground tabular-nums">Cobrado {paidAmountLabel(Number(invoice.amount), pay)}</p>
            )}
          </div>
          <p className={`text-right text-sm ${st === 'Vencida' ? 'text-[#ff3b5c]' : st === 'Pagada' ? 'text-[#10f94e]' : 'text-muted-foreground'}`}>
            {st === 'Pagada' && invoice.paid_at ? `Pagada el ${fmtDate(invoice.paid_at)}`
              : st === 'Vencida' ? `Vencida hace ${daysLate} día${daysLate === 1 ? '' : 's'}`
              : st === 'Pendiente' ? (invoice.due_date.slice(0, 10) === today ? 'Vence hoy' : `Vence el ${fmtDate(invoice.due_date)}`)
              : 'Anulada'}
          </p>
        </div>

        <DetailSection title="Socio">
          <DetailField label="Nombre" wide>
            {onOpenMember ? (
              <button type="button" className="text-left hover:underline" onClick={() => onOpenMember(invoice.user_id)}>{member?.name ?? 'Socio'}</button>
            ) : (member?.name ?? 'Socio')}
          </DetailField>
          {member?.cedula && <DetailField label="Cédula">{member.cedula}</DetailField>}
          {member?.member_number && <DetailField label="N° de socio">{member.member_number}</DetailField>}
          {member?.phone && <DetailField label="Teléfono">{member.phone}</DetailField>}
          {planName && <DetailField label="Plan">{planName}</DetailField>}
        </DetailSection>

        <DetailSection title="Factura">
          {period && <DetailField label="Período" wide>{period}</DetailField>}
          <DetailField label="Vence">{fmtDate(invoice.due_date)}</DetailField>
          {issued && <DetailField label="Emitida">{issued}</DetailField>}
          {invoice.invoice_number && <DetailField label="N° de factura">{invoice.invoice_number}</DetailField>}
        </DetailSection>

        {(st === 'Pagada' || invoice.method) && (
          <DetailSection title="Pago">
            {invoice.paid_at && <DetailField label="Pagado el">{fmtDate(invoice.paid_at)}</DetailField>}
            {invoice.method && <DetailField label="Método">{invoice.method}</DetailField>}
            {invoice.reference && <DetailField label="Referencia">{invoice.reference}</DetailField>}
            {pay && (
              <DetailField label="Cobrado">{paidAmountLabel(Number(invoice.amount), pay)}</DetailField>
            )}
            {pay?.staff?.name && <DetailField label="Registró">{pay.staff.name}</DetailField>}
          </DetailSection>
        )}

        {(invoice.notes || st === 'Anulada') && (
          <DetailSection title={st === 'Anulada' ? 'Notas y anulación' : 'Notas'}>
            {invoice.notes && <DetailField label="Notas" wide>{invoice.notes}</DetailField>}
            {st === 'Anulada' && (
              <>
                <DetailField label="Anulada el">{fmtDate(invoice.voided_at)}</DetailField>
                <DetailField label="Motivo" wide>{invoice.void_reason || '—'}</DetailField>
              </>
            )}
          </DetailSection>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          {canVoid && onVoid && (
            <Button variant="ghost" className="mr-auto text-[#ff3b5c] hover:bg-[#ff3b5c]/10 hover:text-[#ff3b5c]" onClick={() => onVoid(invoice)} data-testid="detail-void">
              <Trash2 className="mr-2 h-4 w-4" /> Anular factura
            </Button>
          )}
          <Button variant="outline" onClick={() => onPrint(invoice)} data-testid="detail-print">
            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
          </Button>
          {isOpen(invoice) && onCollect && (
            <Button className="bg-[#10f94e] text-black hover:bg-[#0ed145]" onClick={() => onCollect(invoice)}>
              <CreditCard className="mr-2 h-4 w-4" /> Cobrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">{children}</dl>
    </section>
  );
}

function DetailField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
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
