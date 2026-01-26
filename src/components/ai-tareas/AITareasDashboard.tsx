import React, { useState, useMemo } from 'react';
import { Tarea, TareaDecision, UserStats, Level, UserBadge } from '@/hooks/useAITareas';
import { PRIORITY_CONFIG, DECISION_CATEGORY_CONFIG, ENERGY_EMOJIS, TaskPriority, DecisionCategory } from '@/types/ai-tareas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Legend
} from 'recharts';
import { 
  CheckSquare, 
  Target, 
  Calendar, 
  TrendingUp, 
  Clock,
  CheckCircle,
  Star,
  Flame,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AITareasDashboardProps {
  tasks: Tarea[];
  decisions: TareaDecision[];
  userStats: UserStats | null;
  userBadges: UserBadge[];
  levels: Level[];
  currentLevel: Level | undefined;
  progressToNextLevel: number;
  overloadStatus: {
    totalPending: number;
    totalHours: number;
    isOverloaded: boolean;
    isHoursOverloaded: boolean;
    urgentCount: number;
    veryImportantCount: number;
    importantCount: number;
  };
  onToggleBadgeShare: (userBadgeId: string, shared: boolean) => Promise<void>;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AITareasDashboard({
  tasks,
  decisions,
  userStats,
  userBadges,
  levels,
  currentLevel,
  progressToNextLevel,
  overloadStatus,
  onToggleBadgeShare,
}: AITareasDashboardProps) {
  const [view, setView] = useState<'today' | 'historical'>('today');
  const today = new Date().toISOString().split('T')[0];

  const todayTasks = useMemo(() => 
    tasks.filter(t => t.date_for === today),
    [tasks, today]
  );

  const todayDecisions = useMemo(() => 
    decisions.filter(d => d.date_for === today),
    [decisions, today]
  );

  const focusMission = useMemo(() => 
    [...tasks, ...decisions].find(item => item.is_focus_mission && item.date_for === today),
    [tasks, decisions, today]
  );

  const completedToday = useMemo(() => ({
    tasks: todayTasks.filter(t => t.status === 'completed').length,
    decisions: todayDecisions.filter(d => d.completed_at).length,
  }), [todayTasks, todayDecisions]);

  const priorityChartData = useMemo(() => [
    { name: 'Urgentes', value: overloadStatus.urgentCount, fill: 'hsl(var(--destructive))' },
    { name: 'Muy Imp.', value: overloadStatus.veryImportantCount, fill: 'hsl(25, 95%, 53%)' },
    { name: 'Importantes', value: overloadStatus.importantCount, fill: 'hsl(142, 71%, 45%)' },
  ], [overloadStatus]);

  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter(t => t.date_for === dateStr);
      const dayDecisions = decisions.filter(d => d.date_for === dateStr);
      
      days.push({
        day: format(date, 'EEE', { locale: es }),
        tareas: dayTasks.filter(t => t.status === 'completed').length,
        decisiones: dayDecisions.filter(d => d.completed_at).length,
        pendientes: dayTasks.filter(t => t.status !== 'completed').length,
      });
    }
    return days;
  }, [tasks, decisions]);

  const nextLevel = useMemo(() => 
    levels.find(l => l.level_number === (userStats?.current_level || 0) + 1),
    [levels, userStats]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{currentLevel?.icon || '✨'}</div>
          <div>
            <h2 className="text-2xl font-bold">{currentLevel?.name_es || 'Principiante'}</h2>
            <p className="text-muted-foreground text-sm">
              Nivel {userStats?.current_level || 1} • {userStats?.total_points || 0} puntos
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={view === 'today' ? 'default' : 'outline'}
            onClick={() => setView('today')}
            size="sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Hoy
          </Button>
          <Button
            variant={view === 'historical' ? 'default' : 'outline'}
            onClick={() => setView('historical')}
            size="sm"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Histórico
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso al siguiente nivel</span>
            <span className="text-sm text-muted-foreground">
              {nextLevel ? `${nextLevel.name_es} (${nextLevel.min_points} pts)` : 'Nivel máximo'}
            </span>
          </div>
          <Progress value={progressToNextLevel} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{userStats?.total_points || 0} pts</span>
            <span>{nextLevel?.min_points || '∞'} pts</span>
          </div>
        </CardContent>
      </Card>

      {view === 'today' ? (
        <>
          {focusMission && (
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary rounded-full">
                    <Target className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">🎯 Tarea del Día</h3>
                    <p className="text-muted-foreground text-sm">Tu enfoque principal para hoy</p>
                  </div>
                </div>
                <h4 className="text-xl font-bold">{focusMission.title}</h4>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-green-500" />}
              label="Tareas Completadas"
              value={`${completedToday.tasks}/${todayTasks.length}`}
            />
            <StatCard
              icon={<Target className="w-5 h-5 text-primary" />}
              label="Decisiones"
              value={`${completedToday.decisions}/${todayDecisions.length}`}
            />
            <StatCard
              icon={<Flame className="w-5 h-5 text-orange-500" />}
              label="Racha Actual"
              value={`${userStats?.current_streak || 0} días`}
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-purple-500" />}
              label="Horas Pendientes"
              value={`${overloadStatus.totalHours.toFixed(1)}h`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Distribución por Prioridad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Insignias ({userBadges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {userBadges.map(ub => (
                  <button
                    key={ub.id}
                    onClick={() => onToggleBadgeShare(ub.id, !ub.shared_in_hall_of_fame)}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-lg border transition-all hover:scale-105",
                      ub.shared_in_hall_of_fame && "ring-2 ring-yellow-500 bg-yellow-500/10"
                    )}
                  >
                    <span className="text-2xl">{ub.badge?.icon}</span>
                    <span className="text-xs font-medium mt-1">{ub.badge?.name_es}</span>
                    {ub.shared_in_hall_of_fame && (
                      <Star className="w-3 h-3 text-yellow-500 mt-1" />
                    )}
                  </button>
                ))}
                {userBadges.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    ¡Completa tareas para ganar insignias!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Actividad Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tareas" name="Tareas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="decisiones" name="Decisiones" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Resumen General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total tareas completadas</span>
                  <span className="font-bold text-xl">{userStats?.tasks_completed || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total decisiones tomadas</span>
                  <span className="font-bold text-xl">{userStats?.decisions_made || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Focus completados</span>
                  <span className="font-bold text-xl">{userStats?.focus_missions_completed || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Racha más larga</span>
                  <span className="font-bold text-xl">{userStats?.longest_streak || 0} días</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Niveles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {levels.map(level => (
                  <div
                    key={level.id}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border",
                      userStats && userStats.current_level >= level.level_number
                        ? "bg-primary/10 border-primary"
                        : "opacity-50"
                    )}
                  >
                    <span className="text-2xl">{level.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{level.name_es}</p>
                      <p className="text-xs text-muted-foreground">{level.min_points}+ pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
