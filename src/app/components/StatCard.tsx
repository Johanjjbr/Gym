import type { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Línea secundaria bajo el valor (contexto, desglose, etc.). */
  subtitle?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    /** Texto tras el porcentaje. Por defecto "vs mes anterior". */
    label?: string;
  };
  color?: 'green' | 'red' | 'blue' | 'purple' | 'amber';
  onClick?: () => void;
}

const colorClasses = {
  green: 'text-[#10f94e] bg-[#10f94e]/10',
  red: 'text-[#ff3b5c] bg-[#ff3b5c]/10',
  blue: 'text-[#3b82f6] bg-[#3b82f6]/10',
  purple: 'text-[#a855f7] bg-[#a855f7]/10',
  amber: 'text-[#eab308] bg-[#eab308]/10',
};

export function StatCard({ title, value, icon: Icon, subtitle, trend, color = 'green', onClick }: StatCardProps) {
  const interactive = !!onClick;
  return (
    <Card
      className={`bg-card border-border transition-all duration-300 ${
        interactive ? 'cursor-pointer hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''
      }`}
      onClick={onClick}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-sm mb-2">{title}</p>
            <p className="text-3xl tracking-tight mb-1 tabular-nums truncate">{value}</p>
            {trend && (
              <p className={`text-sm ${trend.isPositive ? 'text-[#10f94e]' : 'text-[#ff3b5c]'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(Math.round(trend.value))}%{' '}
                <span className="text-muted-foreground">{trend.label ?? 'vs mes anterior'}</span>
              </p>
            )}
            {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          </div>
          <div className={`p-2.5 rounded-lg shrink-0 ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
