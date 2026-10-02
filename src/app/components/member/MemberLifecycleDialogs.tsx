/**
 * Dar de baja (Inactivo) y Eliminar socio. Se usan en Gestión de Usuarios y
 * en la ficha del socio.
 *  - Dar de baja: conserva todo y se puede reactivar.
 *  - Eliminar: definitivo; los pagos se conservan en los reportes.
 */
import { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { useDeleteMember, useSetMemberStatus } from '../../hooks/useMembers';
import { formatMoney } from '../../lib/dashboardHelpers';

export interface LifecycleMember {
  id: string;
  name: string;
  status?: string;
  /** Deuda abierta (para avisar) */
  debt?: number;
}

export function DeactivateMemberDialog({ member, onClose }: { member: LifecycleMember | null; onClose: () => void }) {
  const setStatus = useSetMemberStatus();
  return (
    <AlertDialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Dar de baja a {member?.name}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Pasa a <strong>Inactivo</strong>: no se le generan más facturas ni cuenta como socio activo.</p>
              <p>Se conserva todo su historial (pagos, asistencia, progreso). Puedes reactivarlo cuando vuelva.</p>
              {!!member?.debt && member.debt > 0 && (
                <p className="text-[#ff3b5c]">Tiene una deuda de {formatMoney(member.debt)} que seguirá registrada.</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => member && setStatus.mutate({ id: member.id, status: 'Inactivo' }, { onSettled: onClose })}
            data-testid="confirm-deactivate"
          >
            Dar de baja
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DeleteMemberDialog({
  member, onClose, onDeactivate, onDeleted,
}: {
  member: LifecycleMember | null;
  onClose: () => void;
  /** Ofrecer "Dar de baja" como alternativa */
  onDeactivate?: (m: LifecycleMember) => void;
  onDeleted?: () => void;
}) {
  const del = useDeleteMember();
  const [typed, setTyped] = useState('');
  useEffect(() => setTyped(''), [member]);
  const matches = !!member && typed.trim().toLowerCase() === member.name.trim().toLowerCase();

  return (
    <AlertDialog open={!!member} onOpenChange={(o) => !o && !del.isPending && onClose()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar a {member?.name}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Se borra <strong>definitivamente</strong> con sus facturas, asistencia, progreso, rutinas y su acceso a la app.
                No se puede deshacer.
              </p>
              <p className="rounded-md border border-border bg-muted/40 p-3 text-foreground">
                Los <strong>pagos que hizo se conservan</strong> en los ingresos y cierres de caja, con su nombre.
              </p>
              {member?.status !== 'Inactivo' && onDeactivate && (
                <p>
                  Si solo dejó de venir, mejor{' '}
                  <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => member && onDeactivate(member)}>
                    dalo de baja
                  </button>{' '}
                  (se puede reactivar).
                </p>
              )}
              <label className="block space-y-1.5 text-foreground">
                <span className="text-sm">Escribe <strong>{member?.name}</strong> para confirmar</span>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus data-testid="delete-member-confirm-input" />
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || del.isPending}
            onClick={(e) => {
              e.preventDefault();
              if (!member) return;
              del.mutate(member.id, { onSuccess: () => { onClose(); onDeleted?.(); } });
            }}
            className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white"
            data-testid="confirm-delete-member"
          >
            {del.isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
