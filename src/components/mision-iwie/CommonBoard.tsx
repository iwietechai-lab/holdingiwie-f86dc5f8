import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { PRIORITY_CONFIG, DECISION_CATEGORY_CONFIG, TaskPriority, DecisionCategory } from '@/types/mision-iwie';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Target,
  Trophy,
  Star,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AggregatedStats {
  total_tasks: number;
  completed_tasks: number;
  total_decisions: number;
  completed_decisions: number;
  urgent_count: number;
  very_important_count: number;
  important_count: number;
  avg_energy: number;
  focus_missions: number;
}

interface HallOfFameEntry {
  badge_icon: string;
  badge_name: string;
  count: number;
}

export function CommonBoard() {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAggregatedData();
  }, []);

  const fetchAggregatedData = async () => {
    try {
      // Fetch aggregated task stats (anonymous)
      const { data: tasksData } = await supabase
        .from('mision_iwie_tasks')
        .select('priority, status, is_focus_mission, energy_level');

      const { data: decisionsData } = await supabase
        .from('mision_iwie_decisions')
        .select('category, completed_at, energy_level');

      // Fetch hall of fame badges
      const { data: sharedBadges } = await supabase
        .from('mision_iwie_user_badges')
        .select('badge:mision_iwie_badges(icon, name_es)')
        .eq('shared_in_hall_of_fame', true);

      if (tasksData && decisionsData) {
        const completedTasks = tasksData.filter(t => t.status === 'completed');
        const energyLevels = [...tasksData, ...decisionsData]
          .filter(item => item.energy_level)
          .map(item => item.energy_level as number);

        setStats({
          total_tasks: tasksData.length,
          completed_tasks: completedTasks.length,
          total_decisions: decisionsData.length,
          completed_decisions: decisionsData.filter(d => d.completed_at).length,
          urgent_count: tasksData.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
          very_important_count: tasksData.filter(t => t.priority === 'very_important' && t.status !== 'completed').length,
          important_count: tasksData.filter(t => t.priority === 'important' && t.status !== 'completed').length,
          avg_energy: energyLevels.length > 0 
            ? energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length 
            : 0,
          focus_missions: tasksData.filter(t => t.is_focus_mission).length,
        });
      }

      // Process hall of fame
      if (sharedBadges) {
        const badgeCounts: Record<string, { icon: string; name: string; count: number }> = {};
        sharedBadges.forEach((entry: any) => {
          const badge = entry.badge;
          if (badge) {
            const key = badge.name_es;
            if (!badgeCounts[key]) {
              badgeCounts[key] = { icon: badge.icon, name: badge.name_es, count: 0 };
            }
            badgeCounts[key].count++;
          }
        });
        setHallOfFame(
          Object.values(badgeCounts)
            .map(b => ({ badge_icon: b.icon, badge_name: b.name, count: b.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );
      }
    } catch (error) {
      logger.error('Error fetching aggregated data:', error);
    } finally {
      setLoading(false);
    }
  };

  const balanceData = useMemo(() => {
    if (!stats) return [];
    const total = stats.urgent_count + stats.very_important_count + stats.important_count;
    if (total === 0) return [];
    
    return [
      { 
        name: 'Urgentes', 
        value: stats.urgent_count, 
        percentage: Math.round((stats.urgent_count / total) * 100),
        fill: 'hsl(var(--destructive))',
        status: stats.urgent_count > stats.important_count ? 'danger' : 'ok'
      },
      { 
        name: 'Muy Importantes', 
        value: stats.very_important_count,
        percentage: Math.round((stats.very_important_count / total) * 100),
        fill: 'hsl(25, 95%, 53%)',
        status: 'ok'
      },
      { 
        name: 'Importantes', 
        value: stats.important_count,
        percentage: Math.round((stats.important_count / total) * 100),
        fill: 'hsl(142, 71%, 45%)',
        status: 'ok'
      },
    ];
  }, [stats]);

  const isBalanced = useMemo(() => {
    if (!stats) return true;
    const total = stats.urgent_count + stats.very_important_count + stats.important_count;
    if (total === 0) return true;
    
    // Check if urgent tasks are more than 30% of total
    const urgentPercentage = (stats.urgent_count / total) * 100;
    return urgentPercentage <= 30;
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Tablero Común Galáctico
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Datos agregados y anónimos del equipo • Visibilidad para fomentar equilibrio colectivo
          </p>
        </div>
        <Badge variant={isBalanced ? 'default' : 'destructive'} className="gap-2">
          {isBalanced ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Equilibrio Órbital
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              Desequilibrio Detectado
            </>
          )}
        </Badge>
      </div>

      {/* Balance Alert */}
      {!isBalanced && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <h3 className="font-bold">⚠️ Alerta de Desequilibrio</h3>
              <p className="text-sm text-muted-foreground">
                El equipo tiene una alta proporción de tareas urgentes. 
                Considera revisar prioridades y redistribuir cargas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Rocket className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{stats?.total_tasks || 0}</p>
            <p className="text-xs text-muted-foreground">Misiones Totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold">
              {stats ? Math.round((stats.completed_tasks / Math.max(stats.total_tasks, 1)) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Tasa de Completitud</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-3xl font-bold">{stats?.total_decisions || 0}</p>
            <p className="text-xs text-muted-foreground">Decisiones Tomadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-3xl font-bold">{stats?.focus_missions || 0}</p>
            <p className="text-xs text-muted-foreground">Misiones Focus</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Balance de Prioridades (Equipo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balanceData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      {item.name}
                    </span>
                    <span className={cn(
                      "font-bold",
                      item.status === 'danger' && "text-destructive"
                    )}>
                      {item.value} ({item.percentage}%)
                    </span>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className={cn(
                      "h-2",
                      item.status === 'danger' && "[&>div]:bg-destructive"
                    )}
                  />
                </div>
              ))}
              
              {balanceData.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No hay datos suficientes
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Energy Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Energía Promedio del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="text-6xl mb-4">
              {stats && stats.avg_energy > 0 ? (
                stats.avg_energy >= 4 ? '🚀' :
                stats.avg_energy >= 3 ? '😊' :
                stats.avg_energy >= 2 ? '😐' : '😴'
              ) : '📊'}
            </div>
            <p className="text-2xl font-bold">
              {stats?.avg_energy ? stats.avg_energy.toFixed(1) : '--'}/5
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats && stats.avg_energy >= 4 ? '¡Excelente energía colectiva!' :
               stats && stats.avg_energy >= 3 ? 'Buena energía general' :
               stats && stats.avg_energy >= 2 ? 'Energía moderada' :
               'Considera revisar cargas de trabajo'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hall of Fame */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            🏆 Salón de la Fama Galáctica
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hallOfFame.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {hallOfFame.map((entry, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-lg border",
                    index === 0 && "bg-yellow-500/10 border-yellow-500",
                    index === 1 && "bg-gray-400/10 border-gray-400",
                    index === 2 && "bg-amber-600/10 border-amber-600"
                  )}
                >
                  <span className="text-3xl">{entry.badge_icon}</span>
                  <span className="text-sm font-medium mt-2 text-center">{entry.badge_name}</span>
                  <Badge variant="secondary" className="mt-1">
                    {entry.count} {entry.count === 1 ? 'piloto' : 'pilotos'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Aún no hay insignias compartidas en el Salón de la Fama
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ¡Sé el primero en compartir tus logros!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">💡 Consejos para el Equilibrio Galáctico</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Mantén las tareas urgentes por debajo del 30% del total</li>
            <li>• Usa el Modo Focus para concentrarte en lo más importante</li>
            <li>• Registra tu energía para identificar patrones de productividad</li>
            <li>• Comparte tus logros para motivar al equipo</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
