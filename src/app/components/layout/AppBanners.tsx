/**
 * Avisos sobre el contenido:
 *  - Modo soporte (súper admin viendo a un cliente).
 *  - Mensualidad del sistema por vencer / vencida / suspendida (solo Dueño y Admin).
 *    Solo avisa: nunca bloquea el sistema.
 */
import { AlertTriangle, LifeBuoy, Loader2, LogOut, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { useOrgContext, useSupportMode } from '../../hooks/useOrgContext';
import { subscriptionNotice } from '../../lib/orgContext';

const dismissKey = (due: string | null | undefined, state: string) => `sub-notice:${state}:${due ?? ''}`;

export function AppBanners() {
  const { data: ctx } = useOrgContext();
  const { exit } = useSupportMode();
  const navigate = useNavigate();
  const notice = subscriptionNotice(ctx?.subscription ?? null);
  const key = ctx?.subscription ? dismissKey(ctx.subscription.next_due_date, ctx.subscription.state) : '';
  const [dismissed, setDismissed] = useState(() => {
    try { return !!key && sessionStorage.getItem(key) === '1'; } catch { return false; }
  });

  return (
    <>
      {ctx?.support_mode && (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#3b82f6]/40 bg-[#3b82f6]/10 px-4 py-3 text-sm"
          role="status"
          data-testid="support-banner"
        >
          <span className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-[#3b82f6]" />
            Modo soporte: estás viendo <strong>{ctx.organization.name}</strong>. Lo que hagas queda registrado en esa empresa.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={exit.isPending}
            onClick={() => exit.mutate(undefined, { onSuccess: () => navigate('/plataforma') })}
          >
            {exit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Salir del modo soporte
          </Button>
        </div>
      )}

      {notice && !ctx?.support_mode && !(dismissed && notice.tone === 'warning') && (
        <div
          className={`mb-6 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            notice.tone === 'danger'
              ? 'border-[#ff3b5c]/40 bg-[#ff3b5c]/10'
              : 'border-[#eab308]/40 bg-[#eab308]/10'
          }`}
          role="alert"
          data-testid="subscription-banner"
        >
          <div className="flex items-start gap-2">
            {notice.tone === 'danger' ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff3b5c]" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#eab308]" />
            )}
            <div>
              <p className="font-medium">{notice.title}</p>
              <p className="text-muted-foreground">{notice.message}</p>
            </div>
          </div>
          {notice.tone === 'warning' && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                try { sessionStorage.setItem(key, '1'); } catch { /* sin almacenamiento */ }
                setDismissed(true);
              }}
            >
              Ocultar
            </button>
          )}
        </div>
      )}
    </>
  );
}
