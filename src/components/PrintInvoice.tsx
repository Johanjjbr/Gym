import { useState, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '../app/components/ui/button';
import { formatDate, formatCurrency } from '../lib/format';

interface GymInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

interface UserInfo {
  name: string;
  cedula?: string;
  member_number?: string;
  plan?: string;
  email?: string;
  phone?: string;
}

interface InvoiceItem {
  concept: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: 'Pagada' | 'Pendiente' | 'Vencida';
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
  items?: InvoiceItem[];
  paid_at?: string;
}

interface PrintInvoiceProps {
  invoice: InvoiceData;
  gymInfo: GymInfo;
  userInfo: UserInfo;
  isOpen: boolean;
  onClose: () => void;
  onPrintComplete?: () => void;
}

export function PrintInvoice({
  invoice,
  gymInfo,
  userInfo,
  isOpen,
  onClose,
  onPrintComplete,
}: PrintInvoiceProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsPrinting(true);
    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (error) {
        console.error('Error printing:', error);
      }
      setIsPrinting(false);
      onPrintComplete?.();
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      doPrint();
    } else {
      iframe.addEventListener('load', doPrint, { once: true });
    }
  };

  const getPrintHTML = () => {
    const items = invoice.items || [{
      concept: invoice.notes || 'Mensualidad',
      description: `${userInfo.plan || 'Plan'} - ${formatDate(invoice.date)} al ${formatDate(invoice.due_date)}`,
      quantity: 1,
      unit_price: invoice.amount,
      total: invoice.amount,
    }];

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0;
    const total = subtotal + tax;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1f2937; line-height: 1.4; padding: 20mm; }
    @page { margin: 15mm; size: A4; }
    .header { display: flex; justify-content: space-between; margin-bottom: 24px; border-bottom: 2px solid #1f2937; padding-bottom: 16px; }
    .gym-info h1 { font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
    .gym-info p { font-size: 11px; color: #6b7280; margin: 2px 0; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
    .invoice-title .number { font-size: 14px; color: #6b7280; font-family: monospace; }
    .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .meta-block h4 { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .meta-block p { font-size: 13px; color: #1f2937; margin: 2px 0; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .status-pagada { background: #dcfce7; color: #166534; }
    .status-pendiente { background: #fef3c7; color: #92400e; }
    .status-vencida { background: #fee2e2; color: #991b1b; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 24px; }
    .party { flex: 1; }
    .party h4 { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .party p { font-size: 12px; margin: 3px 0; }
    .party .label { color: #6b7280; font-size: 11px; }
    .party .value { color: #1f2937; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th { background: #f3f4f6; color: #374151; font-weight: 600; text-align: left; padding: 10px 8px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; }
    td:last-child, th:last-child { text-align: right; }
    tr:last-child td { border-bottom: 2px solid #e5e7eb; }
    .totals { width: 100%; max-width: 300px; margin-left: auto; font-size: 12px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
    .totals .row.total { font-weight: 700; font-size: 14px; border-top: 2px solid #1f2937; border-bottom: none; padding-top: 12px; margin-top: 4px; color: #1f2937; }
    .payment-info { margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
    .payment-info h4 { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .payment-info .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 12px; }
    .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .footer p { margin: 4px 0; }
    .no-print { display: none; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="gym-info">
      <h1>${gymInfo.name}</h1>
      ${gymInfo.address ? `<p>${gymInfo.address}</p>` : ''}
      ${gymInfo.phone ? `<p>Tel: ${gymInfo.phone}</p>` : ''}
      ${gymInfo.email ? `<p>Email: ${gymInfo.email}</p>` : ''}
    </div>
    <div class="invoice-title">
      <h2>FACTURA</h2>
      <div class="number">${invoice.invoice_number}</div>
    </div>
  </div>

  <div class="invoice-meta">
    <div class="meta-block">
      <h4>Fecha de Emisión</h4>
      <p>${formatDate(invoice.date)}</p>
    </div>
    <div class="meta-block">
      <h4>Fecha de Vencimiento</h4>
      <p>${formatDate(invoice.due_date)}</p>
    </div>
    <div class="meta-block">
      <h4>Estado</h4>
      <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h4>Facturar a:</h4>
      <p><span class="label">Nombre:</span> <span class="value">${userInfo.name}</span></p>
      ${userInfo.cedula ? `<p><span class="label">Cédula:</span> <span class="value">${userInfo.cedula}</span></p>` : ''}
      ${userInfo.member_number ? `<p><span class="label">Nº Socio:</span> <span class="value">${userInfo.member_number}</span></p>` : ''}
      ${userInfo.email ? `<p><span class="label">Email:</span> <span class="value">${userInfo.email}</span></p>` : ''}
      ${userInfo.phone ? `<p><span class="label">Teléfono:</span> <span class="value">${userInfo.phone}</span></p>` : ''}
      ${userInfo.plan ? `<p><span class="label">Plan:</span> <span class="value">${userInfo.plan}</span></p>` : ''}
    </div>
    <div class="party" style="text-align: right;">
      <h4>Datos de Pago</h4>
      ${invoice.method ? `<p><span class="label">Método:</span> <span class="value">${invoice.method}</span></p>` : ''}
      ${invoice.reference ? `<p><span class="label">Referencia:</span> <span class="value">${invoice.reference}</span></p>` : ''}
      ${invoice.paid_at ? `<p><span class="label">Pagado el:</span> <span class="value">${formatDate(invoice.paid_at)}</span></p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40%;">Concepto</th>
        <th style="width: 30%;">Descripción</th>
        <th style="width: 10%;">Cant.</th>
        <th style="width: 10%;">P. Unit.</th>
        <th style="width: 10%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.concept}</td>
          <td style="color: #6b7280; font-size: 10px;">${item.description || ''}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal:</span> <span>${formatCurrency(subtotal)}</span></div>
    ${tax > 0 ? `<div class="row"><span>IVA (0%):</span> <span>${formatCurrency(tax)}</span></div>` : ''}
    <div class="row total"><span>TOTAL:</span> <span>${formatCurrency(total)}</span></div>
  </div>

  ${invoice.notes ? `
  <div class="payment-info">
    <h4>Notas / Observaciones</h4>
    <p style="font-size: 11px; color: #374151; white-space: pre-wrap;">${invoice.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>${gymInfo.name}</strong> - Sistema de Gestión de Gimnasio</p>
    <p>Esta factura fue generada automáticamente el ${formatDate(new Date().toISOString().split('T')[0])}</p>
    <p>Gracias por su preferencia</p>
  </div>
</body>
</html>
    `;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-lg z-10">
          <h3 className="text-lg font-semibold text-gray-900">Vista Previa de Factura - {invoice.invoice_number}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="no-print"
            >
              <Printer className="w-4 h-4 mr-2" />
              {isPrinting ? 'Imprimiendo...' : 'Imprimir / PDF'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="no-print">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <iframe
            ref={iframeRef}
            title="Factura"
            className="w-full h-[70vh] border border-gray-200 rounded"
            srcDoc={getPrintHTML()}
          />
        </div>
        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-2 no-print">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={handlePrint} disabled={isPrinting}>
            <Printer className="w-4 h-4 mr-2" />
            {isPrinting ? 'Imprimiendo...' : 'Imprimir / Guardar PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}