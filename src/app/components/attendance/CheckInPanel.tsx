/**
 * Panel de recepción: buscar socio y registrar Entrada/Salida en un clic.
 * - Busca por nombre, cédula, N° de socio o teléfono.
 * - Flechas + Enter para registrar sin usar el mouse.
 * - Un lector QR USB que "escribe" GYM-<id> + Enter registra directo.
 * - Muestra estado de pago y bloquea a suspendidos / dados de baja.
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Ban, ExternalLink, Loader2, LogIn, LogOut, ScanLine, Search, Wallet, X } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { matchesSearch, type MemberRow } from '../../lib/members';
import { checkinDecision, parseMemberCode, sourceLabel, time12, type DayRecord, type Session } from '../../lib/attendanceDay';
import { useRegisterAttendance } from '../../hooks/useAttendance';
import { toast } from 'sonner';

interface Props {
  rows: MemberRow[];
  inside: Map<string, Session>;
  /** Registros de hoy, para mostrar los últimos movimientos cuando no se busca. */
  recent?: DayRecord[];
  loading?: boolean;
  onCollect: (userId: string) => void;
}

const MAX_RESULTS = 6;

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function CheckInPanel({ rows, inside, recent = [], loading, onCollect }: Props) {
  const navigate = useNavigate();
  const register = useRegisterAttendance();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = term.trim();
    if (q.length < 2 || parseMemberCode(q)) return [];
    const found = rows.filter((r) => matchesSearch(r, q));
    // Primero los que están dentro y los activos
    const rank = (r: MemberRow) => (inside.has(r.user.id) ? 0 : r.user.status === 'Activo' ? 1 : 2);
    return found.sort((a, b) => rank(a) - rank(b) || a.user.name.localeCompare(b.user.name, 'es')).slice(0, MAX_RESULTS);
  }, [rows, term, inside]);

  const reset = () => {
    setTerm('');
    setActive(0);
    inputRef.current?.focus();
  };

  const run = (row: MemberRow, source = 'manual') => {
    const d = checkinDecision(row, inside.has(row.user.id));
    if (!d.action) {
      toast.error(row.user.name, { description: d.message ?? 'No puede registrar asistencia.' });
      return;
    }
    setPendingId(row.user.id);
    register.mutate(
      { userId: row.user.id, type: d.action, source, name: row.user.name },
      {
        onSuccess: () => {
          if (d.tone === 'warn' && d.action === 'Entrada' && d.message) toast.warning(row.user.name, { description: d.message });
          reset();
        },
        onSettled: () => setPendingId(null),
      },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      reset();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const code = parseMemberCode(term);
      if (code) {
        const row = rows.find((r) => r.user.id === code);
        if (!row) toast.error('Carnet no reconocido', { description: 'El código no corresponde a ningún socio.' });
        else run(row, 'qr');
        setTerm('');
        return;
      }
      const row = results[active];
      if (row) run(row);
    }
  };

  const q = term.trim();

  return (
    <Card className="bg-card border-border" data-testid="checkin-panel">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Registrar entrada o salida</h2>
            <p className="text-sm text-muted-foreground">Busca al socio y confirma con un clic o con Enter.</p>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground" title="Un lector de QR USB funciona como teclado: escanea el carnet con el cursor en el buscador.">
            <ScanLine className="h-4 w-4" /> Lector QR listo
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            autoFocus
            value={term}
            onChange={(e) => { setTerm(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Nombre, cédula o N° de socio…"
            aria-label="Buscar socio"
            className="h-12 pl-11 pr-10 text-base bg-input border-border"
            data-testid="checkin-search"
          />
          {term && (
            <button type="button" onClick={reset} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpiar búsqueda">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {q.length < 2 && (
          <div data-testid="recent-activity">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Últimos movimientos</p>
            {recent.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Todavía no hay registros hoy.</p>
            ) : (
              <ul className="space-y-1">
                {[...recent].sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40">
                    {r.type === 'Entrada' ? <LogIn className="h-4 w-4 shrink-0 text-[#10f94e]" aria-label="Entrada" /> : <LogOut className="h-4 w-4 shrink-0 text-[#ff3b5c]" aria-label="Salida" />}
                    <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => navigate(`/usuarios/${r.user_id}`)}>
                      {r.users?.name ?? 'Socio'}
                    </button>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{sourceLabel(r.source)}</span>
                    <span className="w-16 text-right tabular-nums text-muted-foreground">{time12(r.time)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {q.length >= 2 && !parseMemberCode(q) && (
          loading ? (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando socios…</div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Ningún socio coincide con “{q}”.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border" role="listbox" aria-label="Resultados">
              {results.map((r, i) => {
                const u = r.user;
                const s = inside.get(u.id);
                const d = checkinDecision(r, !!s);
                const busy = pendingId === u.id;
                return (
                  <li
                    key={u.id}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${i === active ? 'bg-muted/50' : ''}`}
                    data-testid="checkin-result"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s ? 'bg-[#10f94e]/20 text-[#10f94e]' : 'bg-muted text-muted-foreground'}`}>
                        {initials(u.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                          <span className="truncate">{u.name}</span>
                          {s && <span className="shrink-0 rounded-full bg-[#10f94e]/15 px-2 py-0.5 text-[11px] text-[#10f94e]">Dentro desde {time12(s.checkIn)}</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[u.member_number, u.cedula && `CI ${u.cedula}`, u.plans?.name].filter(Boolean).join(' · ')}
                        </p>
                        {d.message && (
                          <p className={`mt-0.5 flex items-center gap-1 text-xs ${d.tone === 'blocked' ? 'text-[#ff3b5c]' : 'text-[#eab308]'}`}>
                            {d.tone === 'blocked' ? <Ban className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {d.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                      <Button size="icon" variant="ghost" className="h-9 w-9" title="Ver perfil" aria-label={`Ver perfil de ${u.name}`} onClick={() => navigate(`/usuarios/${u.id}`)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {d.offerCollect && (
                        <Button size="sm" variant="outline" className="h-9" onClick={() => onCollect(u.id)}>
                          <Wallet className="mr-1.5 h-4 w-4" /> Cobrar
                        </Button>
                      )}
                      {d.action === 'Entrada' && (
                        <Button size="sm" className="h-9 min-w-[110px] bg-[#10f94e] text-black hover:bg-[#10f94e]/90" disabled={busy} onClick={() => run(r)} data-testid="checkin-entrada">
                          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LogIn className="mr-1.5 h-4 w-4" />} Entrada
                        </Button>
                      )}
                      {d.action === 'Salida' && (
                        <Button size="sm" variant="outline" className="h-9 min-w-[110px] border-[#ff3b5c]/60 text-[#ff3b5c] hover:bg-[#ff3b5c]/10" disabled={busy} onClick={() => run(r)} data-testid="checkin-salida">
                          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LogOut className="mr-1.5 h-4 w-4" />} Salida
                        </Button>
                      )}
                      {!d.action && (
                        <span className="inline-flex h-9 min-w-[110px] items-center justify-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground">
                          <Ban className="h-4 w-4" /> Sin acceso
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </CardContent>
    </Card>
  );
}
