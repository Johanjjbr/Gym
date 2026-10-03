/**
 * Tasa BCV del día: indicador + panel para cargarla y ver el historial.
 * Recepción y Admin cargan y corrigen la tasa (migración 43).
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useCurrentRate, useSaveRate } from '../../hooks/useExchangeRates';
import { useAuth } from '../../contexts/AuthContext';
import { formatBs, formatRate, toBs } from '../../lib/currency';
import { fmtDate } from '../../lib/billing';

const shortDay = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });

/** Convierte "245,30" o "245.30" a número. */
export function parseRate(text: string): number {
  const t = text.trim().replace(/\s/g, '');
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export function ExchangeRateButton({ autoOpenIfMissing = false }: { autoOpenIfMissing?: boolean }) {
  const cur = useCurrentRate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpenIfMissing && !cur.isLoading && cur.state === 'missing') setOpen(true);
    // solo al cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.isLoading]);

  const tone =
    cur.state === 'today'
      ? 'border-[#10f94e]/30 text-[#10f94e] bg-[#10f94e]/5'
      : cur.state === 'recent'
        ? 'border-[#eab308]/40 text-[#eab308] bg-[#eab308]/5'
        : 'border-[#ff3b5c]/40 text-[#ff3b5c] bg-[#ff3b5c]/5';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors hover:brightness-125 ${tone}`}
        data-testid="rate-button"
        title="Tasa BCV usada para cobrar en bolívares"
      >
        {cur.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : cur.state === 'missing' ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <TrendingUp className="h-4 w-4" />
        )}
        {cur.isLoading ? 'Tasa…' : cur.rate ? (
          <span>
            BCV <span className="font-semibold tabular-nums">{formatRate(cur.rate)}</span>
            <span className="opacity-75"> · {cur.state === 'today' ? 'hoy' : shortDay(cur.rateDate!)}</span>
          </span>
        ) : (
          <span>Cargar tasa BCV</span>
        )}
      </button>
      <ExchangeRateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ExchangeRateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const cur = useCurrentRate();
  const save = useSaveRate();
  const { user } = useAuth();
  // Administración y Recepción cargan y corrigen la tasa (la base lo valida igual)
  const isAdmin = user?.role === 'Dueño' || user?.role === 'Administrador' || user?.role === 'Recepción' || !!(user as any)?.is_super_admin;

  const [date, setDate] = useState(cur.today);
  const [text, setText] = useState('');
  const existing = cur.rates.find((r) => r.rate_date.slice(0, 10) === date);
  const value = parseRate(text);
  const valid = value > 0;
  const locked = !!existing && !isAdmin;

  const rateText = (d: string) => {
    const r = cur.rates.find((x) => x.rate_date.slice(0, 10) === d);
    return r ? formatRate(Number(r.rate)) : '';
  };

  useEffect(() => {
    if (open) {
      setDate(cur.today);
      setText(rateText(cur.today));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const previous = cur.rates.find((r) => r.rate_date.slice(0, 10) < date);
  const change = valid && previous ? ((value - Number(previous.rate)) / Number(previous.rate)) * 100 : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tasa BCV</DialogTitle>
          <DialogDescription>
            Bolívares por 1 dólar. Se usa para cobrar en Bs; las deudas y los precios siguen en dólares.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid || locked) return;
            save.mutate({ date, rate: value, exists: !!existing }, { onSuccess: () => onOpenChange(false) });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rate-date">Fecha</Label>
              <Input
                id="rate-date"
                type="date"
                value={date}
                max={cur.today}
                disabled={!isAdmin}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setDate(e.target.value);
                  setText(rateText(e.target.value));
                }}
                className="bg-input border-border [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate-value">Bs por $1</Label>
              <Input
                id="rate-value"
                inputMode="decimal"
                autoFocus
                placeholder="Ej: 245,30"
                value={text}
                disabled={locked}
                onChange={(e) => setText(e.target.value)}
                className="bg-input border-border tabular-nums"
                data-testid="rate-input"
              />
            </div>
          </div>

          {valid && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p>$20 = <span className="font-semibold tabular-nums">{formatBs(toBs(20, value))}</span></p>
              {change !== null && Math.abs(change) >= 0.01 && (
                <p className={`text-xs ${Math.abs(change) > 10 ? 'text-[#eab308]' : 'text-muted-foreground'}`}>
                  {change > 0 ? '+' : ''}{change.toFixed(2).replace('.', ',')}% respecto a la tasa del {shortDay(previous!.rate_date.slice(0, 10))}
                  {Math.abs(change) > 10 && ' · revisa que esté bien escrita'}
                </p>
              )}
            </div>
          )}

          {locked && (
            <p className="text-xs text-muted-foreground">
              La tasa de este día ya está cargada. Solo Administración o Recepción pueden corregirla.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            {!locked && (
              <Button type="submit" disabled={!valid || save.isPending} data-testid="rate-save">
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {existing ? 'Corregir tasa' : 'Guardar tasa'}
              </Button>
            )}
          </div>
        </form>

        {cur.rates.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Últimas tasas</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {cur.rates.slice(0, 10).map((r) => (
                <li key={r.rate_date} className="flex justify-between">
                  <span className="text-muted-foreground">{fmtDate(r.rate_date)}</span>
                  <span className="tabular-nums">{formatRate(Number(r.rate))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
