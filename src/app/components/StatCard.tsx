import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'green' | 'red' | 'blue' | 'purple';
}

export function StatCard({ title, value, icon: Icon, trend, color = 'green' }: StatCardProps) {
  const colorClasses = {
    green: 'text-[#10f94e]',
    red: 'text-[#ff3b5c]',
    blue: 'text-[#3b82f6]',
    purple: 'text-[#a855f7]',
  };

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground text-sm mb-2">{title}</p>
            <p className="text-3xl tracking-tight mb-1">{value}</p>
            {trend && (
              <p className={`text-sm ${trend.isPositive ? 'text-[#10f94e]' : 'text-[#ff3b5c]'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs mes anterior
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-card-foreground/5 ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
