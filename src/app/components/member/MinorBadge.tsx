/**
 * Distintivo "Menor" para socios menores de 18 años; en amarillo si le falta
 * el representante.
 */
import { Baby } from 'lucide-react';
import { isMinor, missingGuardian, type GuardianFields } from '../../lib/minors';

export function MinorBadge({ user, className = '' }: { user: GuardianFields & { birth_date?: string | null }; className?: string }) {
  if (isMinor(user.birth_date) !== true) return null;
  const missing = missingGuardian(user);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
        missing ? 'border-[#eab308]/40 bg-[#eab308]/10 text-[#eab308]' : 'border-[#3b82f6]/40 bg-[#3b82f6]/10 text-[#3b82f6]'
      } ${className}`}
      title={missing ? 'Menor de edad · falta el representante' : 'Menor de edad · debe entrenar con supervisión'}
      data-testid="minor-badge"
    >
      <Baby className="h-3 w-3" aria-hidden />
      {missing ? 'Menor · sin representante' : 'Menor'}
    </span>
  );
}
