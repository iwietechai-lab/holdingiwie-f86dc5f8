import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color?: 'blue' | 'purple' | 'cyan' | 'pink' | 'green' | 'orange';
}

const colorClasses = {
  blue: 'from-neon-blue/20 to-neon-blue/5 border-neon-blue/30',
  purple: 'from-primary/20 to-primary/5 border-primary/30',
  cyan: 'from-neon-cyan/20 to-neon-cyan/5 border-neon-cyan/30',
  pink: 'from-neon-pink/20 to-neon-pink/5 border-neon-pink/30',
  green: 'from-green-500/20 to-green-500/5 border-green-500/30',
  orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
};

const iconColorClasses = {
  blue: 'text-neon-blue',
  purple: 'text-primary',
  cyan: 'text-neon-cyan',
  pink: 'text-neon-pink',
  green: 'text-green-400',
  orange: 'text-orange-400',
};

export const KPICard = ({ title, value, change, icon: Icon, color = 'purple' }: KPICardProps) => {
  return (
    <div 
      className={cn(
        "relative p-6 rounded-xl border bg-gradient-to-br backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] group",
        colorClasses[color]
      )}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 neon-glow-purple" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change !== undefined && (
            <p className={cn(
              "text-sm flex items-center gap-1",
              change >= 0 ? "text-green-400" : "text-destructive"
            )}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
              <span className="text-muted-foreground ml-1">vs mes anterior</span>
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg bg-card/50",
          iconColorClasses[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
