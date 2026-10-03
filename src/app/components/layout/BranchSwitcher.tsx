/**
 * Encabezado de la barra lateral: empresa + sede.
 * Dueño/Admin eligen la sede (o "Todas"); Recepción y entrenadores ven la suya fija.
 */
import { useState } from 'react';
import { Dumbbell, Loader2, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useOrgContext, useSetActiveBranch } from '../../hooks/useOrgContext';
import { branchScopeFor, scopeLabel } from '../../lib/orgContext';

const ALL = '__all__';

export function BranchSwitcher() {
  const { data: ctx, isLoading } = useOrgContext();
  const setBranch = useSetActiveBranch();
  const [squareish, setSquareish] = useState(true);

  const orgName = ctx?.organization.name ?? (isLoading ? '' : 'Mi gimnasio');
  const multi = (ctx?.branches.length ?? 0) > 1;
  const value = branchScopeFor(ctx) ?? ALL;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl flex items-center justify-center ${
          ctx?.organization.logo_url ? 'bg-card ring-1 ring-border' : 'bg-primary'
        }`}
      >
        {ctx?.organization.logo_url ? (
          <img
            src={ctx.organization.logo_url}
            alt=""
            // Logos casi cuadrados llenan el recuadro; los alargados se muestran completos
            onLoad={(e) => {
              const img = e.currentTarget;
              const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
              setSquareish(ratio > 0.8 && ratio < 1.25);
            }}
            className={`h-full w-full ${squareish ? 'object-cover' : 'object-contain p-1'}`}
            data-testid="sidebar-logo"
          />
        ) : (
          <Dumbbell className="w-6 h-6 text-primary-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg leading-tight tracking-tight" title={orgName} data-testid="org-name">
          {orgName || <span className="inline-block h-4 w-28 animate-pulse rounded bg-muted" />}
        </h1>
        {ctx && multi && ctx.can_choose_branch ? (
          <Select
            value={value}
            onValueChange={(v) => setBranch.mutate(v === ALL ? null : v)}
            disabled={setBranch.isPending}
          >
            <SelectTrigger
              className="mt-1 h-7 w-full gap-1 border-border bg-card px-2 text-xs [&>span]:truncate"
              aria-label="Sede"
              data-testid="branch-select"
            >
              {setBranch.isPending ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : <MapPin className="h-3 w-3 shrink-0" />}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las sedes</SelectItem>
              {ctx.branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground" data-testid="branch-label">
            {ctx?.is_platform && !ctx.support_mode ? (
              'Proveedor del sistema'
            ) : (
              <>
                {ctx && <MapPin className="h-3 w-3 shrink-0" />}
                {scopeLabel(ctx)}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
