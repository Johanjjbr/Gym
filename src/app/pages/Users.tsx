/**
 * Gestión de Usuarios (socios)
 *  - Filtros rápidos con conteo: Todos · Activos · Con deuda · Vencen pronto · Suspendidos · Inactivos
 *  - Búsqueda por nombre (sin acentos), cédula, N° de socio, teléfono o email
 *  - Columnas útiles para recepción: estado de pago y última visita; orden por columna
 *  - Fila clicable -> perfil; menú con Cobrar, Editar, Avisar, Dar de baja / Reactivar, Eliminar
 * Parámetros de URL: ?filtro=deuda  ·  ?q=texto
 */
import { useEffect, useMemo, useState } from 'react';
import { moneyWithBs } from '../lib/currency';
import { useCurrentRate } from '../hooks/useExchangeRates';
import { useNavigate, useSearchParams } from 'react-router';
import {
  AlertCircle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, MessageCircle, MoreHorizontal, Pencil, Plus,
  RotateCcw, Search, Trash2, UserMinus, UserRound, Wallet, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMembersOverview, useSetMemberStatus } from '../hooks/useMembers';
import { DeactivateMemberDialog, DeleteMemberDialog } from '../components/member/MemberLifecycleDialogs';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { UserFormDialog } from '../components/UserFormDialog';
import { CollectPaymentDialog } from '../components/billing/CollectPaymentDialog';
import { useGymInfo } from '../components/billing/shared';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  matchesQuick, matchesSearch, quickCounts, QUICK_FILTERS, sortRows,
  type MemberRow, type QuickFilter, type SortKey,
} from '../lib/members';
import {
  dueInWords, fmtDate, membersWithDebt, overdueReminderText, upcomingReminderText, whatsappNumber, whatsappUrl,
} from '../lib/billing';
import { formatMoney, toDateOnly } from '../lib/dashboardHelpers';
import { lastVisitInWords } from '../lib/attendanceStats';

const PAGE_SIZE = 25;

const STATUS_PILL: Record<string, string> = {
  Activo: 'bg-[#10f94e]/10 text-[#10f94e] border-[#10f94e]/30',
  Suspendido: 'bg-[#ff3b5c]/10 text-[#ff3b5c] border-[#ff3b5c]/30',
  Inactivo: 'bg-muted text-muted-foreground border-border',
};

export function Users() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = toDateOnly(new Date());

  const { data, isLoading, error, refetch } = useMembersOverview();
  const setStatus = useSetMemberStatus();
  const { canAccess } = useModulePermissions();
  const canDelete = canAccess('/usuarios', 'delete');
  const gym = useGymInfo();
  const curRate = useCurrentRate();

  const quick = (QUICK_FILTERS.find((f) => f.key === params.get('filtro'))?.key ?? 'todos') as QuickFilter;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [collectFor, setCollectFor] = useState<string | null>(null);
  const [toDeactivate, setToDeactivate] = useState<MemberRow | null>(null);
  const [toDelete, setToDelete] = useState<MemberRow | null>(null);

  const setQuick = (f: QuickFilter) => {
    const next = new URLSearchParams(params);
    if (f === 'todos') next.delete('filtro');
    else next.set('filtro', f);
    setParams(next, { replace: true });
  };

  useEffect(() => setPage(0), [quick, search, sort]);

  const rows = data?.rows ?? [];
  const counts = useMemo(() => quickCounts(rows), [rows]);
  const filtered = useMemo(
    () => sortRows(rows.filter((r) => matchesQuick(r, quick) && matchesSearch(r, search)), sort.key, sort.dir),
    [rows, quick, search, sort],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: MemberRow) => {
    setEditing(r.user);
    setFormOpen(true);
  };

  const notify = async (r: MemberRow) => {
    const remindMoney = moneyWithBs(curRate.rate, curRate.state === 'today');
    const own = (data?.invoices ?? []).filter((i) => i.user_id === r.user.id);
    const debt = membersWithDebt(own, today)[0];
    const message =
      r.payment === 'overdue' && debt
        ? overdueReminderText(r.user.name, debt, gym.name, remindMoney)
        : r.nextDue && r.nextAmount !== null
          ? upcomingReminderText(r.user.name, { due: r.nextDue, amount: r.nextAmount }, gym.name, remindMoney)
          : null;
    if (!message) return;
    const number = whatsappNumber(r.user.phone);
    if (number) window.open(whatsappUrl(number, message), '_blank', 'noopener');
    else {
      try {
        await navigator.clipboard.writeText(message);
        toast.success('Mensaje copiado', { description: 'El socio no tiene un teléfono válido cargado.' });
      } catch {
        toast.error('No se pudo copiar el mensaje');
      }
    }
  };

  return (
    <div className="space-y-6 min-w-0" data-testid="users-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl mb-1">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            {data ? `${counts.activos} socios activos de ${counts.todos}` : 'Socios del gimnasio'}
          </p>
        </div>
        <Button className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-semibold" onClick={openCreate} data-testid="btn-new-user">
          <Plus className="w-4 h-4 mr-2" /> Nuevo socio
        </Button>
      </div>

      {error && (
        <Card className="border-[#ff3b5c]/30">
          <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#ff3b5c]" /> No se pudieron cargar los socios: {(error as Error).message}
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border min-w-0 overflow-hidden">
        <CardContent className="p-0">
          {/* Barra de filtros */}
          <div className="space-y-3 border-b border-border p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, cédula, N° de socio, teléfono o email"
                className="pl-9 pr-9"
                aria-label="Buscar socios"
                data-testid="search-users"
              />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtros rápidos">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={quick === f.key}
                  onClick={() => setQuick(f.key)}
                  data-testid={`quick-${f.key}`}
                  className={`h-8 rounded-full border px-3 text-sm transition-colors ${
                    quick === f.key ? 'border-foreground/40 bg-foreground/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}{' '}
                  <span className={`tabular-nums ${f.key === 'deuda' && counts.deuda > 0 ? 'text-[#ff3b5c]' : f.key === 'vencen' && counts.vencen > 0 ? 'text-[#eab308]' : 'opacity-70'}`}>
                    {counts[f.key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted/60" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <UserRound className="mx-auto mb-3 h-10 w-10 opacity-50" />
              {rows.length === 0 ? (
                <>
                  <p>Todavía no hay socios.</p>
                  <Button className="mt-4" variant="outline" onClick={openCreate}>Crear el primero</Button>
                </>
              ) : (
                <>
                  <p>Ningún socio coincide con la búsqueda.</p>
                  <Button className="mt-4" variant="outline" onClick={() => { setSearch(''); setQuick('todos'); }}>Limpiar filtros</Button>
                </>
              )}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm" data-testid="users-table">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <SortHeader label="Socio" k="name" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <SortHeader label="Pago" k="payment" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Última visita" k="lastVisit" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Estado" k="status" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const u = r.user;
                    const canCollect = !u.is_free_user && !!u.plans;
                    return (
                      <tr
                        key={u.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                        onClick={() => navigate(`/usuarios/${u.id}`)}
                        data-testid="user-row"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10f94e]/10 text-xs font-semibold text-[#10f94e]">
                              {u.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{u.name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {[u.member_number, u.cedula && `CI ${u.cedula}`].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {u.plans?.name ?? u.plan ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3"><PaymentCell r={r} /></td>
                        <td className="px-4 py-3">
                          <span className={u.status === 'Activo' && (r.daysSinceVisit ?? 0) >= 14 ? 'text-[#eab308]' : ''}>
                            {lastVisitInWords(r.daysSinceVisit)}
                          </span>
                          {r.lastVisit && r.daysSinceVisit! > 1 && <span className="block text-xs text-muted-foreground tabular-nums">{fmtDate(r.lastVisit)}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_PILL[u.status] ?? STATUS_PILL.Inactivo}`}>{u.status}</span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Acciones de ${u.name}`} data-testid="user-menu">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onSelect={() => navigate(`/usuarios/${u.id}`)}>
                                <UserRound className="mr-2 h-4 w-4" /> Ver perfil
                              </DropdownMenuItem>
                              {canCollect && (
                                <DropdownMenuItem onSelect={() => setCollectFor(u.id)}>
                                  <Wallet className="mr-2 h-4 w-4" /> Cobrar
                                </DropdownMenuItem>
                              )}
                              {(r.payment === 'overdue' || r.payment === 'due-soon') && (
                                <DropdownMenuItem onSelect={() => notify(r)}>
                                  <MessageCircle className="mr-2 h-4 w-4" /> Avisar por WhatsApp
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => openEdit(r)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {u.status === 'Inactivo' ? (
                                <DropdownMenuItem onSelect={() => setStatus.mutate({ id: u.id, status: 'Activo' })}>
                                  <RotateCcw className="mr-2 h-4 w-4" /> Reactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => setToDeactivate(r)}>
                                  <UserMinus className="mr-2 h-4 w-4" /> Dar de baja
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem onSelect={() => setToDelete(r)} className="text-[#ff3b5c] focus:text-[#ff3b5c]">
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />

      {data && collectFor && (
        <CollectPaymentDialog
          open
          onOpenChange={(o) => !o && setCollectFor(null)}
          members={data.users as any}
          invoices={data.invoices}
          initialUserId={collectFor}
        />
      )}

      <DeactivateMemberDialog
        member={toDeactivate && { id: toDeactivate.user.id, name: toDeactivate.user.name, status: toDeactivate.user.status, debt: toDeactivate.debt }}
        onClose={() => setToDeactivate(null)}
      />

      <DeleteMemberDialog
        member={toDelete && { id: toDelete.user.id, name: toDelete.user.name, status: toDelete.user.status, debt: toDelete.debt }}
        onClose={() => setToDelete(null)}
        onDeactivate={() => { const r = toDelete; setToDelete(null); setToDeactivate(r); }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function SortHeader({ label, k, sort, onSort }: { label: string; k: SortKey; sort: { key: SortKey; dir: 'asc' | 'desc' }; onSort: (k: SortKey) => void }) {
  const active = sort.key === k;
  return (
    <th className="px-4 py-3 font-medium" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground ${active ? 'text-foreground' : ''}`} onClick={() => onSort(k)}>
        {label}
        {active && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function PaymentCell({ r }: { r: MemberRow }) {
  switch (r.payment) {
    case 'overdue':
      return (
        <>
          <span className="font-medium text-[#ff3b5c]">Debe {formatMoney(r.debt)}</span>
          <span className="block text-xs text-muted-foreground">{r.daysLate} día{r.daysLate === 1 ? '' : 's'} de atraso</span>
        </>
      );
    case 'due-soon':
      return (
        <>
          <span className="font-medium text-[#eab308]">{dueInWords(r.daysLeft!)}</span>
          <span className="block text-xs text-muted-foreground">{formatMoney(r.nextAmount ?? 0)}</span>
        </>
      );
    case 'exempt':
      return <span className="text-muted-foreground">Exento</span>;
    case 'no-plan':
      return <span className="text-[#eab308]">Sin plan</span>;
    case 'inactive':
      return <span className="text-muted-foreground">—</span>;
    default:
      return (
        <>
          <span className="text-[#10f94e]">Al día</span>
          {r.nextDue && <span className="block text-xs text-muted-foreground">Próximo {fmtDate(r.nextDue)}</span>}
        </>
      );
  }
}

