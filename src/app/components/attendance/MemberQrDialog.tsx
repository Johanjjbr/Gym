/**
 * Carnet QR del socio. Se genera en el navegador (sin servicios externos) y se
 * descarga como una tarjeta PNG con nombre y N° de socio.
 */
import { useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { matchesSearch, type MemberRow } from '../../lib/members';
import { memberCode } from '../../lib/attendanceDay';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rows: MemberRow[];
  gymName?: string;
}

export function MemberQrDialog({ open, onOpenChange, rows, gymName = 'Gimnasio' }: Props) {
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const results = useMemo(
    () => (term.trim().length < 2 ? [] : rows.filter((r) => r.user.status !== 'Inactivo' && matchesSearch(r, term)).slice(0, 6)),
    [rows, term],
  );

  const download = () => {
    const qr = qrRef.current;
    if (!qr || !selected) return;
    const W = 600;
    const H = 760;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText(gymName, W / 2, 60);
    ctx.drawImage(qr, 75, 100, 450, 450);
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText(selected.user.name, W / 2, 620, W - 40);
    ctx.font = '400 24px system-ui, sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText([selected.user.member_number, selected.user.cedula && `CI ${selected.user.cedula}`].filter(Boolean).join('  ·  '), W / 2, 665);
    ctx.font = '400 18px system-ui, sans-serif';
    ctx.fillText('Muestra este código en recepción', W / 2, 720);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `Carnet_${selected.user.member_number ?? ''}_${selected.user.name.replace(/\s+/g, '_')}.png`;
    a.click();
    toast.success('Carnet descargado');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) { setTerm(''); setSelected(null); }
      }}
    >
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carnet QR del socio</DialogTitle>
          <DialogDescription>El socio lo muestra en recepción y se registra su entrada al escanearlo.</DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar socio…" className="pl-9 bg-input border-border" />
            </div>
            {results.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {results.map((r) => (
                  <li key={r.user.id}>
                    <button type="button" className="w-full px-3 py-2.5 text-left hover:bg-muted/50" onClick={() => setSelected(r)}>
                      <span className="block font-medium">{r.user.name}</span>
                      <span className="block text-xs text-muted-foreground">{[r.user.member_number, r.user.cedula && `CI ${r.user.cedula}`].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {term.trim().length >= 2 && results.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Sin resultados.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-5 text-black">
              <QRCodeCanvas ref={qrRef} value={memberCode(selected.user.id)} size={220} level="M" marginSize={2} />
              <div className="text-center">
                <p className="font-semibold">{selected.user.name}</p>
                <p className="text-xs text-neutral-600">{[selected.user.member_number, selected.user.cedula && `CI ${selected.user.cedula}`].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={download}><Download className="mr-2 h-4 w-4" /> Descargar carnet</Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(memberCode(selected.user.id));
                    toast.success('Código copiado');
                  } catch {
                    toast.error('No se pudo copiar');
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar código
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setSelected(null)}>Elegir otro socio</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
