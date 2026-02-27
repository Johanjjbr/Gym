/**
 * Componente para imprimir recibos de pago
 */

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';

interface PrintPaymentProps {
  payment: {
    id: string;
    amount: number;
    date: string;
    next_payment: string;
    status: string;
    method: string;
    reference?: string;
    user_id: string;
  };
  userName: string;
  userMemberNumber?: string;
}

export function PrintPayment({ payment, userName, userMemberNumber }: PrintPaymentProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Recibo-${payment.id}`,
  });

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="hover:bg-[#10f94e]/10 hover:text-[#10f94e]"
        onClick={handlePrint}
      >
        <Printer className="w-4 h-4" />
      </Button>

      {/* Component for printing */}
      <div style={{ display: 'none' }}>
        <div ref={componentRef} className="p-8 bg-white text-black">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-bold mb-2">GYM LAGUNETICA</h1>
              <p className="text-sm">Los Teques, Sector Lagunetica</p>
              <p className="text-sm">Teléfono: (0212) 123-4567</p>
            </div>

            {/* Receipt Info */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">RECIBO DE PAGO</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Recibo N°:</p>
                  <p>{payment.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="font-semibold">Fecha de Emisión:</p>
                  <p>
                    {format(new Date(), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="mb-6 bg-gray-100 p-4 rounded">
              <h3 className="font-bold mb-2">DATOS DEL CLIENTE</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Nombre:</p>
                  <p>{userName}</p>
                </div>
                {userMemberNumber && (
                  <div>
                    <p className="font-semibold">N° de Miembro:</p>
                    <p>{userMemberNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-6">
              <h3 className="font-bold mb-3">DETALLE DEL PAGO</h3>
              <table className="w-full text-sm border border-black">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 text-left">Concepto</th>
                    <th className="border border-black p-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2">Mensualidad de Gimnasio</td>
                    <td className="border border-black p-2 text-right font-bold">
                      Bs {payment.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100">
                    <td className="border border-black p-2 font-bold">TOTAL</td>
                    <td className="border border-black p-2 text-right font-bold text-lg">
                      Bs {payment.amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment Info */}
            <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">Fecha de Pago:</p>
                <p>
                  {format(new Date(payment.date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <p className="font-semibold">Método de Pago:</p>
                <p>{payment.method}</p>
              </div>
              {payment.reference && (
                <div className="col-span-2">
                  <p className="font-semibold">Referencia:</p>
                  <p className="font-mono">{payment.reference}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="font-semibold">Próximo Pago:</p>
                <p>
                  {format(new Date(payment.next_payment), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="mb-6 p-4 bg-green-100 border border-green-500 rounded text-center">
              <p className="font-bold text-green-800">ESTADO: {payment.status.toUpperCase()}</p>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-center text-gray-600">
              <p>Este es un recibo válido de pago.</p>
              <p>Conserve este documento como comprobante.</p>
              <p className="mt-2">Gracias por su preferencia.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}