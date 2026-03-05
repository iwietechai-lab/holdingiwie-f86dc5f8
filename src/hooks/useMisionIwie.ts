import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface MisionArea {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MisionTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  area_id?: string;
  area?: MisionArea;
  priority: 'urgent' | 'very_important' | 'important';
  estimated_hours?: number;
  planned_time?: string;
  energy_level?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  is_focus_mission: boolean;
  focus_description?: string;
  focus_solution?: string;
  date_for: string;
  original_date?: string;
  completed_at?: string;
  points_earned: number;
  created_at: string;
  updated_at: string;
}

export interface MisionDecision {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: 'urgent' | 'very_important' | 'important' | 'strategic' | 'contributing' | 'not_convenient';
  expected_impact?: string;
  associated_risks?: string;
  real_result_type?: 'positive' | 'neutral' | 'negative';
  real_result_detail?: string;
  real_result_quantitative?: number;
  energy_level?: number;
  is_focus_mission: boolean;
  focus_description?: string;
  focus_solution?: string;
  date_for: string;
  completed_at?: string;
  points_earned: number;
  created_at: string;
  updated_at: string;
  linked_tasks?: MisionTask[];
}

export interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  current_level: number;
  tasks_completed: number;
  decisions_made: number;
  focus_missions_completed: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  weekly_points: number;
  monthly_points: number;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  name_es: string;
  description: string;
  description_es: string;
  requirements?: Record<string, number | boolean>;
  icon: string;
  category: string;
  points_reward: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  shared_in_hall_of_fame: boolean;
  badge?: Badge;
}

export interface Level {
  id: string;
  level_number: number;
  name: string;
  name_es: string;
  icon: string;
  min_points: number;
  max_points?: number;
  color: string;
}

export interface DailyStats {
  id: string;
  user_id: string;
  date: string;
  tasks_created: number;
  tasks_completed: number;
  decisions_made: number;
  focus_completed: boolean;
  total_estimated_hours: number;
  total_actual_hours: number;
  avg_energy_level?: number;
  points_earned: number;
  urgent_count: number;
  very_important_count: number;
  important_count: number;
}

const POINTS = {
  TASK_COMPLETE: 10,
  DECISION_COMPLETE: 15,
  FOCUS_MISSION: 25,
  STREAK_BONUS: 5,
};

export function useMisionIwie() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MisionTask[]>([]);
  const [decisions, setDecisions] = useState<MisionDecision[]>([]);
  const [areas, setAreas] = useState<MisionArea[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [todayTaskCount, setTodayTaskCount] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tasks for today and accumulated
      const { data: tasksData } = await supabase
        .from('mision_iwie_tasks')
        .select('*')
        .eq('user_id', user.id)
        .or(`date_for.eq.${today},and(status.neq.completed,status.neq.archived)`)
        .order('created_at', { ascending: false });

      // Fetch areas
      const { data: areasData } = await supabase
        .from('mision_iwie_areas')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      // Fetch decisions
      const { data: decisionsData } = await supabase
        .from('mision_iwie_decisions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch user stats
      let { data: statsData } = await supabase
        .from('mision_iwie_user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Create stats if not exists
      if (!statsData) {
        const { data: newStats } = await supabase
          .from('mision_iwie_user_stats')
          .insert({ user_id: user.id })
          .select()
          .single();
        statsData = newStats;
      }

      // Fetch levels
      const { data: levelsData } = await supabase
        .from('mision_iwie_levels')
        .select('*')
        .order('level_number');

      // Fetch all badges
      const { data: badgesData } = await supabase
        .from('mision_iwie_badges')
        .select('*');

      // Fetch user badges
      const { data: userBadgesData } = await supabase
        .from('mision_iwie_user_badges')
        .select('*, badge:mision_iwie_badges(*)')
        .eq('user_id', user.id);

      // Count today's tasks
      const todayTasks = tasksData?.filter(t => t.date_for === today && !t.original_date) || [];
      setTodayTaskCount(todayTasks.length);

      // Map areas to tasks
      const tasksWithAreas = (tasksData || []).map(task => ({
        ...task,
        area: areasData?.find(a => a.id === task.area_id)
      }));

      setTasks(tasksWithAreas as MisionTask[]);
      setAreas(areasData as MisionArea[] || []);
      setDecisions(decisionsData as MisionDecision[] || []);
      setUserStats(statsData as UserStats);
      setLevels(levelsData as Level[] || []);
      setBadges(badgesData as Badge[] || []);
      setUserBadges(userBadgesData as UserBadge[] || []);

    } catch (error) {
      logger.error('Error fetching Misión Iwie data:', error);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create default areas for new users
  const initializeDefaultAreas = async (userId: string) => {
    const defaultAreas = [
      { name: 'Trabajo', color: '#3b82f6', user_id: userId, is_default: true },
      { name: 'Personal', color: '#22c55e', user_id: userId, is_default: true },
      { name: 'Educación', color: '#8b5cf6', user_id: userId, is_default: true },
      { name: 'Salud', color: '#ef4444', user_id: userId, is_default: true },
    ];

    await supabase.from('mision_iwie_areas').insert(defaultAreas);
  };

  // Area functions
  const createArea = async (name: string, color?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const randomColor = color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    
    const { data, error } = await supabase
      .from('mision_iwie_areas')
      .insert({ user_id: user.id, name, color: randomColor })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear el área', variant: 'destructive' });
      return null;
    }

    setAreas(prev => [...prev, data as MisionArea]);
    return data as MisionArea;
  };

  const updateArea = async (id: string, updates: Partial<MisionArea>) => {
    const { data, error } = await supabase
      .from('mision_iwie_areas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el área', variant: 'destructive' });
      return null;
    }

    setAreas(prev => prev.map(a => a.id === id ? data as MisionArea : a));
    return data as MisionArea;
  };

  // Task functions
  const createTask = async (task: Partial<MisionTask>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check daily limit (15 new tasks)
    if (todayTaskCount >= 15 && task.date_for === today) {
      toast({ 
        title: 'Límite diario alcanzado', 
        description: 'Has alcanzado el límite de 15 tareas nuevas por día',
        variant: 'destructive'
      });
      return null;
    }

    const insertData = {
      user_id: user.id,
      title: task.title || '',
      priority: task.priority || 'important',
      description: task.description,
      area_id: task.area_id,
      estimated_hours: task.estimated_hours,
      planned_time: task.planned_time,
      date_for: task.date_for || new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase
      .from('mision_iwie_tasks')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la tarea', variant: 'destructive' });
      return null;
    }

    const newTask = {
      ...data,
      area: areas.find(a => a.id === data.area_id)
    } as MisionTask;

    setTasks(prev => [newTask, ...prev]);
    setTodayTaskCount(prev => prev + 1);
    
    toast({ title: '🚀 Tarea creada', description: 'Tu misión ha sido registrada' });
    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<MisionTask>) => {
    const { data, error } = await supabase
      .from('mision_iwie_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la tarea', variant: 'destructive' });
      return null;
    }

    const updatedTask = {
      ...data,
      area: areas.find(a => a.id === data.area_id)
    } as MisionTask;

    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    return updatedTask;
  };

  const completeTask = async (id: string, energyLevel?: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const points = task.is_focus_mission ? POINTS.FOCUS_MISSION : POINTS.TASK_COMPLETE;

    const { data, error } = await supabase
      .from('mision_iwie_tasks')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        energy_level: energyLevel,
        points_earned: points
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return;

    // Update user stats
    await updateUserStats(points, 'task', task.is_focus_mission);

    const updatedTask = { ...data, area: task.area } as MisionTask;
    setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));

    toast({ 
      title: '✨ ¡Misión completada!', 
      description: `+${points} puntos galácticos` 
    });

    // Check for badges
    checkBadges();
  };

  const moveTaskPriority = async (taskId: string, newPriority: MisionTask['priority'], comment?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    await updateTask(taskId, { priority: newPriority });

    if (comment) {
      await supabase.from('mision_iwie_task_comments').insert({
        task_id: taskId,
        user_id: task.user_id,
        content: comment,
        movement_from: task.priority,
        movement_to: newPriority
      });
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('mision_iwie_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la tarea', variant: 'destructive' });
      return;
    }

    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Decision functions
  const createDecision = async (decision: Partial<MisionDecision>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const insertData = {
      user_id: user.id,
      title: decision.title || '',
      category: decision.category || 'important',
      description: decision.description,
      expected_impact: decision.expected_impact,
      associated_risks: decision.associated_risks,
      date_for: decision.date_for || new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase
      .from('mision_iwie_decisions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo registrar la decisión', variant: 'destructive' });
      return null;
    }

    setDecisions(prev => [data as MisionDecision, ...prev]);
    toast({ title: '📍 Decisión registrada', description: 'Tu comando ha sido documentado' });
    return data as MisionDecision;
  };

  const updateDecision = async (id: string, updates: Partial<MisionDecision>) => {
    const { data, error } = await supabase
      .from('mision_iwie_decisions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la decisión', variant: 'destructive' });
      return null;
    }

    setDecisions(prev => prev.map(d => d.id === id ? data as MisionDecision : d));
    return data as MisionDecision;
  };

  const completeDecision = async (id: string, resultType?: 'positive' | 'neutral' | 'negative', detail?: string) => {
    const decision = decisions.find(d => d.id === id);
    if (!decision) return;

    const points = decision.is_focus_mission ? POINTS.FOCUS_MISSION : POINTS.DECISION_COMPLETE;

    const { data, error } = await supabase
      .from('mision_iwie_decisions')
      .update({ 
        completed_at: new Date().toISOString(),
        real_result_type: resultType,
        real_result_detail: detail,
        points_earned: points
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return;

    await updateUserStats(points, 'decision', decision.is_focus_mission);

    setDecisions(prev => prev.map(d => d.id === id ? data as MisionDecision : d));

    toast({ 
      title: '🎯 ¡Decisión ejecutada!', 
      description: `+${points} puntos galácticos` 
    });

    checkBadges();
  };

  const linkTaskToDecision = async (decisionId: string, taskId: string) => {
    const { error } = await supabase
      .from('mision_iwie_decision_tasks')
      .insert({ decision_id: decisionId, task_id: taskId });

    if (error && error.code !== '23505') { // Ignore duplicate
      toast({ title: 'Error', description: 'No se pudo vincular la tarea', variant: 'destructive' });
    }
  };

  // Stats functions
  const updateUserStats = async (points: number, type: 'task' | 'decision', isFocusMission: boolean) => {
    if (!userStats) return;

    const updates: Partial<UserStats> = {
      total_points: userStats.total_points + points,
      weekly_points: userStats.weekly_points + points,
      monthly_points: userStats.monthly_points + points,
      last_activity_date: today,
    };

    if (type === 'task') {
      updates.tasks_completed = userStats.tasks_completed + 1;
    } else {
      updates.decisions_made = userStats.decisions_made + 1;
    }

    if (isFocusMission) {
      updates.focus_missions_completed = userStats.focus_missions_completed + 1;
    }

    // Update streak
    const lastDate = userStats.last_activity_date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr || lastDate === today) {
      updates.current_streak = lastDate === today ? userStats.current_streak : userStats.current_streak + 1;
      if ((updates.current_streak || 0) > userStats.longest_streak) {
        updates.longest_streak = updates.current_streak;
      }
    } else if (lastDate !== today) {
      updates.current_streak = 1;
    }

    // Check level up
    const newPoints = userStats.total_points + points;
    const newLevel = levels.find(l => newPoints >= l.min_points && (!l.max_points || newPoints <= l.max_points));
    if (newLevel && newLevel.level_number > userStats.current_level) {
      updates.current_level = newLevel.level_number;
      toast({
        title: `🎉 ¡Nivel ${newLevel.level_number}!`,
        description: `Has alcanzado el rango de ${newLevel.name_es}`,
      });
    }

    const { data } = await supabase
      .from('mision_iwie_user_stats')
      .update(updates)
      .eq('id', userStats.id)
      .select()
      .single();

    if (data) {
      setUserStats(data as UserStats);
    }
  };

  const checkBadges = async () => {
    if (!userStats) return;
    
    const earnedBadgeCodes = userBadges.map(ub => ub.badge?.code);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const badge of badges) {
      if (earnedBadgeCodes.includes(badge.code)) continue;

      const req = badge.requirements || {};
      let earned = false;

      if (typeof req.tasks_completed === 'number' && userStats.tasks_completed >= req.tasks_completed) earned = true;
      if (typeof req.decisions_made === 'number' && userStats.decisions_made >= req.decisions_made) earned = true;
      if (typeof req.focus_missions === 'number' && userStats.focus_missions_completed >= req.focus_missions) earned = true;
      if (typeof req.streak === 'number' && userStats.current_streak >= req.streak) earned = true;

      if (earned) {
        const { data } = await supabase
          .from('mision_iwie_user_badges')
          .insert({ user_id: user.id, badge_id: badge.id })
          .select('*, badge:mision_iwie_badges(*)')
          .single();

        if (data) {
          setUserBadges(prev => [...prev, data as UserBadge]);
          toast({
            title: `🏅 ¡Nueva insignia!`,
            description: `Has desbloqueado: ${badge.name_es}`,
          });

          // Add badge points
          if (badge.points_reward > 0) {
            await updateUserStats(badge.points_reward, 'task', false);
          }
        }
      }
    }
  };

  const toggleBadgeShare = async (userBadgeId: string, shared: boolean) => {
    const { data, error } = await supabase
      .from('mision_iwie_user_badges')
      .update({ shared_in_hall_of_fame: shared })
      .eq('id', userBadgeId)
      .select('*, badge:mision_iwie_badges(*)')
      .single();

    if (!error && data) {
      setUserBadges(prev => prev.map(ub => ub.id === userBadgeId ? data as UserBadge : ub));
    }
  };

  // Focus mode
  const setFocusMission = async (type: 'task' | 'decision', id: string, focusData: { description: string; solution: string }) => {
    // First, clear any existing focus mission
    await supabase
      .from('mision_iwie_tasks')
      .update({ is_focus_mission: false })
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('date_for', today);

    await supabase
      .from('mision_iwie_decisions')
      .update({ is_focus_mission: false })
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('date_for', today);

    if (type === 'task') {
      await updateTask(id, { 
        is_focus_mission: true, 
        focus_description: focusData.description,
        focus_solution: focusData.solution 
      });
    } else {
      await updateDecision(id, { 
        is_focus_mission: true, 
        focus_description: focusData.description,
        focus_solution: focusData.solution 
      });
    }

    toast({ title: '🎯 Modo Focus activado', description: 'Concéntrate en tu misión del día' });
  };

  // Get stats for dashboard
  const getOverloadStatus = useCallback(() => {
    const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
    const totalHours = pendingTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const urgentCount = pendingTasks.filter(t => t.priority === 'urgent').length;
    const veryImportantCount = pendingTasks.filter(t => t.priority === 'very_important').length;
    const importantCount = pendingTasks.filter(t => t.priority === 'important').length;

    return {
      totalPending: pendingTasks.length,
      totalHours,
      urgentCount,
      veryImportantCount,
      importantCount,
      isOverloaded: pendingTasks.length > 15,
      isHoursOverloaded: totalHours > 8,
      columnStatus: {
        urgent: (urgentCount > 5 ? 'danger' : urgentCount > 3 ? 'warning' : 'ok') as 'danger' | 'warning' | 'ok',
        very_important: (veryImportantCount > 5 ? 'danger' : veryImportantCount > 3 ? 'warning' : 'ok') as 'danger' | 'warning' | 'ok',
        important: (importantCount > 5 ? 'danger' : importantCount > 3 ? 'warning' : 'ok') as 'danger' | 'warning' | 'ok',
      }
    };
  }, [tasks]);

  const getCurrentLevel = useCallback(() => {
    if (!userStats) return levels[0];
    return levels.find(l => l.level_number === userStats.current_level) || levels[0];
  }, [userStats, levels]);

  const getProgressToNextLevel = useCallback(() => {
    if (!userStats) return 0;
    const currentLevel = getCurrentLevel();
    const nextLevel = levels.find(l => l.level_number === userStats.current_level + 1);
    
    if (!nextLevel) return 100; // Max level
    
    const pointsInLevel = userStats.total_points - currentLevel.min_points;
    const levelRange = nextLevel.min_points - currentLevel.min_points;
    
    return Math.min(100, Math.round((pointsInLevel / levelRange) * 100));
  }, [userStats, levels, getCurrentLevel]);

  return {
    loading,
    tasks,
    decisions,
    areas,
    userStats,
    userBadges,
    levels,
    badges,
    dailyStats,
    todayTaskCount,
    
    // Area functions
    createArea,
    updateArea,
    initializeDefaultAreas,
    
    // Task functions
    createTask,
    updateTask,
    completeTask,
    moveTaskPriority,
    deleteTask,
    
    // Decision functions
    createDecision,
    updateDecision,
    completeDecision,
    linkTaskToDecision,
    
    // Gamification
    toggleBadgeShare,
    setFocusMission,
    
    // Stats
    getOverloadStatus,
    getCurrentLevel,
    getProgressToNextLevel,
    
    // Refresh
    refetch: fetchData,
  };
}
