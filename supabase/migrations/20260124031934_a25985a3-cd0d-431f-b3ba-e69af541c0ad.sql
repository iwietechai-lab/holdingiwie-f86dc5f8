-- =============================================
-- MISIÓN IWIE - Complete Database Schema
-- =============================================

-- 1. User Areas (custom areas created by users)
CREATE TABLE public.mision_iwie_areas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tasks (Kanban tasks)
CREATE TABLE public.mision_iwie_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    area_id UUID REFERENCES public.mision_iwie_areas(id) ON DELETE SET NULL,
    priority TEXT NOT NULL CHECK (priority IN ('urgent', 'very_important', 'important')),
    estimated_hours DECIMAL(5,2),
    planned_time TIME,
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
    is_focus_mission BOOLEAN DEFAULT false,
    focus_description TEXT,
    focus_solution TEXT,
    date_for DATE NOT NULL DEFAULT CURRENT_DATE,
    original_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Task Comments/Annotations
CREATE TABLE public.mision_iwie_task_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.mision_iwie_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    movement_from TEXT,
    movement_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Decisions
CREATE TABLE public.mision_iwie_decisions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('urgent', 'very_important', 'important', 'strategic', 'contributing', 'not_convenient')),
    expected_impact TEXT,
    associated_risks TEXT,
    real_result_type TEXT CHECK (real_result_type IN ('positive', 'neutral', 'negative')),
    real_result_detail TEXT,
    real_result_quantitative DECIMAL(15,2),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    is_focus_mission BOOLEAN DEFAULT false,
    focus_description TEXT,
    focus_solution TEXT,
    date_for DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Decision-Task Links
CREATE TABLE public.mision_iwie_decision_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    decision_id UUID NOT NULL REFERENCES public.mision_iwie_decisions(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.mision_iwie_tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(decision_id, task_id)
);

-- 6. Gamification Levels
CREATE TABLE public.mision_iwie_levels (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    level_number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_es TEXT NOT NULL,
    icon TEXT NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Badges/Insignias
CREATE TABLE public.mision_iwie_badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_es TEXT NOT NULL,
    description TEXT NOT NULL,
    description_es TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    points_reward INTEGER DEFAULT 0,
    requirements JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. User Badges (earned badges)
CREATE TABLE public.mision_iwie_user_badges (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL REFERENCES public.mision_iwie_badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    shared_in_hall_of_fame BOOLEAN DEFAULT false,
    UNIQUE(user_id, badge_id)
);

-- 9. User Stats/Progress
CREATE TABLE public.mision_iwie_user_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    tasks_completed INTEGER DEFAULT 0,
    decisions_made INTEGER DEFAULT 0,
    focus_missions_completed INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Daily Stats (for historical tracking)
CREATE TABLE public.mision_iwie_daily_stats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    tasks_created INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    decisions_made INTEGER DEFAULT 0,
    focus_completed BOOLEAN DEFAULT false,
    total_estimated_hours DECIMAL(5,2) DEFAULT 0,
    total_actual_hours DECIMAL(5,2) DEFAULT 0,
    avg_energy_level DECIMAL(3,2),
    points_earned INTEGER DEFAULT 0,
    urgent_count INTEGER DEFAULT 0,
    very_important_count INTEGER DEFAULT 0,
    important_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, date)
);

-- 11. AI Suggestions Log
CREATE TABLE public.mision_iwie_ai_suggestions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    suggestion_type TEXT NOT NULL,
    content TEXT NOT NULL,
    context JSONB,
    was_accepted BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. Weekly Missions (gamification)
CREATE TABLE public.mision_iwie_weekly_missions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    week_start DATE NOT NULL,
    mission_type TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    points_reward INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_start, mission_type)
);

-- Enable RLS on all tables
ALTER TABLE public.mision_iwie_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_decision_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mision_iwie_weekly_missions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user-owned tables
CREATE POLICY "Users can manage their own areas" ON public.mision_iwie_areas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tasks" ON public.mision_iwie_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own task comments" ON public.mision_iwie_task_comments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own decisions" ON public.mision_iwie_decisions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own decision-task links" ON public.mision_iwie_decision_tasks FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.mision_iwie_decisions d WHERE d.id = decision_id AND d.user_id = auth.uid()));
CREATE POLICY "Users can manage their own badges" ON public.mision_iwie_user_badges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own stats" ON public.mision_iwie_user_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own daily stats" ON public.mision_iwie_daily_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own AI suggestions" ON public.mision_iwie_ai_suggestions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own weekly missions" ON public.mision_iwie_weekly_missions FOR ALL USING (auth.uid() = user_id);

-- Public read access for levels and badges (system data)
CREATE POLICY "Anyone can view levels" ON public.mision_iwie_levels FOR SELECT USING (true);
CREATE POLICY "Anyone can view badges" ON public.mision_iwie_badges FOR SELECT USING (true);

-- Policy for Hall of Fame (shared badges)
CREATE POLICY "Anyone can view shared badges in Hall of Fame" ON public.mision_iwie_user_badges 
    FOR SELECT USING (shared_in_hall_of_fame = true OR auth.uid() = user_id);

-- Insert default levels
INSERT INTO public.mision_iwie_levels (level_number, name, name_es, icon, min_points, max_points, color) VALUES
(1, 'Space Cadet', 'Cadete Espacial', '🚀', 0, 99, '#64748b'),
(2, 'Orbital Pilot', 'Piloto Orbital', '🛸', 100, 299, '#3b82f6'),
(3, 'Star Navigator', 'Navegante Estelar', '⭐', 300, 599, '#8b5cf6'),
(4, 'Nebula Explorer', 'Explorador de Nebulosa', '🌌', 600, 999, '#ec4899'),
(5, 'Galaxy Commander', 'Comandante Galáctico', '🌟', 1000, 1499, '#f59e0b'),
(6, 'Cosmic Admiral', 'Almirante Cósmico', '💫', 1500, 2499, '#10b981'),
(7, 'Universal Master', 'Maestro Universal', '🪐', 2500, 3999, '#06b6d4'),
(8, 'Dimension Architect', 'Arquitecto Dimensional', '✨', 4000, 5999, '#f43f5e'),
(9, 'Infinity Guardian', 'Guardián del Infinito', '🌠', 6000, 9999, '#a855f7'),
(10, 'Supreme Overlord', 'Supremo Señor del Cosmos', '👑', 10000, NULL, '#fbbf24');

-- Insert default badges
INSERT INTO public.mision_iwie_badges (code, name, name_es, description, description_es, icon, category, points_reward, requirements) VALUES
('first_task', 'First Launch', 'Primer Lanzamiento', 'Complete your first task', 'Completa tu primera tarea', '🚀', 'milestone', 10, '{"tasks_completed": 1}'),
('first_decision', 'First Command', 'Primera Orden', 'Make your first decision', 'Toma tu primera decisión', '📍', 'milestone', 10, '{"decisions_made": 1}'),
('focus_master', 'Focus Master', 'Maestro del Enfoque', 'Complete 5 Focus Missions', 'Completa 5 Misiones de Enfoque', '🎯', 'focus', 50, '{"focus_missions": 5}'),
('stable_orbit', 'Stable Orbit', 'Órbita Estable', 'Maintain balance for 7 days', 'Mantén equilibrio por 7 días', '🌍', 'balance', 100, '{"balanced_days": 7}'),
('lunar_impact', 'Lunar Impact', 'Impacto Lunar', 'Strategic decision with positive result', 'Decisión estratégica con resultado positivo', '🌙', 'decisions', 75, '{"strategic_positive": 1}'),
('streak_3', 'Ignition Sequence', 'Secuencia de Ignición', '3-day streak', 'Racha de 3 días', '🔥', 'streak', 25, '{"streak": 3}'),
('streak_7', 'Week Warrior', 'Guerrero Semanal', '7-day streak', 'Racha de 7 días', '⚡', 'streak', 75, '{"streak": 7}'),
('streak_30', 'Eternal Flame', 'Llama Eterna', '30-day streak', 'Racha de 30 días', '💎', 'streak', 300, '{"streak": 30}'),
('task_10', 'Mission Accomplished', 'Misión Cumplida', 'Complete 10 tasks', 'Completa 10 tareas', '✅', 'tasks', 30, '{"tasks_completed": 10}'),
('task_50', 'Task Champion', 'Campeón de Tareas', 'Complete 50 tasks', 'Completa 50 tareas', '🏆', 'tasks', 100, '{"tasks_completed": 50}'),
('task_100', 'Productivity Legend', 'Leyenda de Productividad', 'Complete 100 tasks', 'Completa 100 tareas', '👑', 'tasks', 250, '{"tasks_completed": 100}'),
('early_bird', 'Early Bird', 'Madrugador', 'Complete a task before 8 AM', 'Completa una tarea antes de las 8 AM', '🌅', 'special', 20, '{"early_task": true}'),
('night_owl', 'Night Owl', 'Búho Nocturno', 'Complete a task after 10 PM', 'Completa una tarea después de las 10 PM', '🦉', 'special', 20, '{"night_task": true}'),
('perfect_day', 'Perfect Day', 'Día Perfecto', 'Complete all planned tasks in a day', 'Completa todas las tareas planificadas en un día', '🌟', 'special', 50, '{"perfect_day": true}'),
('energy_master', 'Energy Master', 'Maestro de Energía', 'Track energy for 14 days', 'Registra energía por 14 días', '💪', 'wellness', 60, '{"energy_tracked_days": 14}');

-- Create indexes for performance
CREATE INDEX idx_mision_tasks_user_date ON public.mision_iwie_tasks(user_id, date_for);
CREATE INDEX idx_mision_tasks_priority ON public.mision_iwie_tasks(priority);
CREATE INDEX idx_mision_decisions_user_date ON public.mision_iwie_decisions(user_id, date_for);
CREATE INDEX idx_mision_daily_stats_user_date ON public.mision_iwie_daily_stats(user_id, date);
CREATE INDEX idx_mision_user_badges_shared ON public.mision_iwie_user_badges(shared_in_hall_of_fame) WHERE shared_in_hall_of_fame = true;

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_mision_iwie_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply timestamp triggers
CREATE TRIGGER update_mision_iwie_areas_updated_at BEFORE UPDATE ON public.mision_iwie_areas FOR EACH ROW EXECUTE FUNCTION public.update_mision_iwie_updated_at();
CREATE TRIGGER update_mision_iwie_tasks_updated_at BEFORE UPDATE ON public.mision_iwie_tasks FOR EACH ROW EXECUTE FUNCTION public.update_mision_iwie_updated_at();
CREATE TRIGGER update_mision_iwie_decisions_updated_at BEFORE UPDATE ON public.mision_iwie_decisions FOR EACH ROW EXECUTE FUNCTION public.update_mision_iwie_updated_at();
CREATE TRIGGER update_mision_iwie_user_stats_updated_at BEFORE UPDATE ON public.mision_iwie_user_stats FOR EACH ROW EXECUTE FUNCTION public.update_mision_iwie_updated_at();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.mision_iwie_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mision_iwie_decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mision_iwie_user_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mision_iwie_user_badges;