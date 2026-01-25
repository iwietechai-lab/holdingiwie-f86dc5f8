
-- 1. Áreas de conocimiento del Brain Galaxy
CREATE TABLE public.brain_galaxy_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'BookOpen',
  color TEXT DEFAULT '#8B5CF6',
  is_system_default BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar áreas por defecto
INSERT INTO public.brain_galaxy_areas (name, description, icon, color, is_system_default, order_index) VALUES
  ('Comercial', 'Ventas, marketing y desarrollo de negocios', 'TrendingUp', '#10B981', true, 1),
  ('Finanzas', 'Gestión financiera, inversiones y análisis', 'DollarSign', '#F59E0B', true, 2),
  ('Ingenierías', 'Ingeniería de software, civil, mecánica y más', 'Wrench', '#3B82F6', true, 3),
  ('Tributario-Contable', 'Impuestos, contabilidad y auditoría', 'Calculator', '#EF4444', true, 4),
  ('Legal', 'Derecho corporativo, contratos y regulaciones', 'Scale', '#8B5CF6', true, 5),
  ('Corporativo', 'Gobernanza, estrategia y gestión empresarial', 'Building2', '#6366F1', true, 6),
  ('Agrícola', 'Agricultura, agronomía y tecnología rural', 'Leaf', '#22C55E', true, 7),
  ('Drones', 'Operación, regulación y aplicaciones de drones', 'Plane', '#06B6D4', true, 8),
  ('Inteligencia Artificial', 'Machine learning, deep learning y aplicaciones', 'Brain', '#EC4899', true, 9),
  ('Proceso de Datos', 'Análisis de datos, ETL y visualización', 'Database', '#14B8A6', true, 10);

-- 2. Niveles de conocimiento
CREATE TABLE public.brain_galaxy_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_es TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar niveles
INSERT INTO public.brain_galaxy_levels (level_number, name, name_es, icon, color, min_points, max_points) VALUES
  (1, 'Apprentice', 'Aprendiz', '🌱', '#9CA3AF', 0, 500),
  (2, 'Student', 'Estudiante', '📚', '#60A5FA', 501, 1500),
  (3, 'Researcher', 'Investigador', '🔬', '#34D399', 1501, 3500),
  (4, 'Specialist', 'Especialista', '🎯', '#FBBF24', 3501, 7000),
  (5, 'Expert', 'Experto', '💡', '#F97316', 7001, 12000),
  (6, 'Mentor', 'Mentor', '🎓', '#A78BFA', 12001, 20000),
  (7, 'Master', 'Maestro', '🏛️', '#EC4899', 20001, 35000),
  (8, 'Sage', 'Sabio', '🌟', '#14B8A6', 35001, 55000),
  (9, 'Galactic Counselor', 'Consejero Galáctico', '🪐', '#8B5CF6', 55001, 80000),
  (10, 'Knowledge Guardian', 'Guardián del Conocimiento', '🌌', '#EAB308', 80001, NULL);

-- 3. Badges de conocimiento
CREATE TABLE public.brain_galaxy_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description TEXT NOT NULL,
  description_es TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirements JSONB,
  points_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar badges iniciales
INSERT INTO public.brain_galaxy_badges (code, name, name_es, description, description_es, category, icon, points_reward) VALUES
  ('first_course', 'First Course', 'Primer Curso', 'Complete your first course', 'Completa tu primer curso', 'learning', '📖', 50),
  ('knowledge_seeker', 'Knowledge Seeker', 'Buscador de Conocimiento', 'Upload 10 pieces of content', 'Sube 10 contenidos', 'contribution', '🔍', 75),
  ('quiz_master', 'Quiz Master', 'Maestro de Cuestionarios', 'Pass 10 quizzes with 90%+', 'Pasa 10 cuestionarios con 90%+', 'learning', '✅', 100),
  ('mission_contributor', 'Mission Contributor', 'Contribuidor de Misiones', 'Contribute to 5 collaborative missions', 'Contribuye a 5 misiones colaborativas', 'collaboration', '🤝', 100),
  ('course_creator', 'Course Creator', 'Creador de Cursos', 'Create a public course', 'Crea un curso público', 'creation', '🎨', 150),
  ('brain_feeder', 'Brain Feeder', 'Alimentador del Cerebro', 'Upload 50 pieces of content', 'Sube 50 contenidos', 'contribution', '🧠', 200),
  ('mission_leader', 'Mission Leader', 'Líder de Misión', 'Create and complete a collaborative mission', 'Crea y completa una misión colaborativa', 'leadership', '🚀', 250),
  ('area_expert', 'Area Expert', 'Experto de Área', 'Complete 10 courses in one area', 'Completa 10 cursos en un área', 'mastery', '🏆', 300);

-- 4. Contenido del Brain Galaxy (memoria del cerebro)
CREATE TABLE public.brain_galaxy_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  area_id UUID REFERENCES public.brain_galaxy_areas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('document', 'video', 'article', 'paper', 'url', 'audio', 'image')),
  content_text TEXT,
  file_url TEXT,
  external_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  ai_summary TEXT,
  ai_key_points JSONB,
  source_metadata JSONB,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'company', 'holding')),
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Cursos
CREATE TABLE public.brain_galaxy_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  area_id UUID REFERENCES public.brain_galaxy_areas(id) ON DELETE SET NULL,
  learning_objectives JSONB,
  difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  estimated_hours NUMERIC(5,2),
  curriculum_structure JSONB,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  total_enrollments INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Módulos de curso
CREATE TABLE public.brain_galaxy_course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.brain_galaxy_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  content_ids UUID[],
  estimated_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Cuestionarios
CREATE TABLE public.brain_galaxy_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.brain_galaxy_courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.brain_galaxy_course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER,
  max_attempts INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Progreso del usuario en cursos
CREATE TABLE public.brain_galaxy_user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.brain_galaxy_courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.brain_galaxy_course_modules(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  score INTEGER,
  time_spent_minutes INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, course_id, module_id)
);

-- 9. Resultados de cuestionarios
CREATE TABLE public.brain_galaxy_quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.brain_galaxy_quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  answers JSONB,
  time_taken_minutes INTEGER,
  passed BOOLEAN NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Misiones colaborativas
CREATE TABLE public.brain_galaxy_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  challenge_text TEXT NOT NULL,
  area_id UUID REFERENCES public.brain_galaxy_areas(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'archived')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'company', 'invite_only')),
  deadline TIMESTAMP WITH TIME ZONE,
  reward_points INTEGER DEFAULT 50,
  min_participants INTEGER DEFAULT 1,
  max_participants INTEGER,
  solution_summary TEXT,
  ai_final_analysis TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. Participantes de misiones
CREATE TABLE public.brain_galaxy_mission_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.brain_galaxy_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'contributor' CHECK (role IN ('creator', 'contributor', 'reviewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mission_id, user_id)
);

-- 12. Contribuciones a misiones
CREATE TABLE public.brain_galaxy_mission_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.brain_galaxy_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('document', 'link', 'idea', 'solution', 'feedback')),
  title TEXT,
  content TEXT,
  content_id UUID REFERENCES public.brain_galaxy_content(id) ON DELETE SET NULL,
  external_url TEXT,
  votes INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 13. Estadísticas de usuario en Brain Galaxy
CREATE TABLE public.brain_galaxy_user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  knowledge_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  courses_created INTEGER DEFAULT 0,
  courses_completed INTEGER DEFAULT 0,
  modules_completed INTEGER DEFAULT 0,
  quizzes_passed INTEGER DEFAULT 0,
  content_uploaded INTEGER DEFAULT 0,
  missions_created INTEGER DEFAULT 0,
  missions_contributed INTEGER DEFAULT 0,
  missions_completed INTEGER DEFAULT 0,
  learning_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 14. Badges ganados por usuario
CREATE TABLE public.brain_galaxy_user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.brain_galaxy_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- 15. Historial de chat con IA
CREATE TABLE public.brain_galaxy_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  brain_model TEXT DEFAULT 'brain-4',
  context_area_id UUID REFERENCES public.brain_galaxy_areas(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.brain_galaxy_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_mission_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_mission_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Areas: Everyone can read
CREATE POLICY "Anyone can view areas" ON public.brain_galaxy_areas FOR SELECT USING (true);

-- Levels: Everyone can read
CREATE POLICY "Anyone can view levels" ON public.brain_galaxy_levels FOR SELECT USING (true);

-- Badges: Everyone can read
CREATE POLICY "Anyone can view badges" ON public.brain_galaxy_badges FOR SELECT USING (true);

-- Content: User can manage their own, view holding-wide content
CREATE POLICY "Users can view own content" ON public.brain_galaxy_content FOR SELECT USING (auth.uid() = user_id OR visibility = 'holding');
CREATE POLICY "Users can create content" ON public.brain_galaxy_content FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own content" ON public.brain_galaxy_content FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own content" ON public.brain_galaxy_content FOR DELETE USING (auth.uid() = user_id);

-- Courses: User manages own, view public courses
CREATE POLICY "Users can view courses" ON public.brain_galaxy_courses FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can create courses" ON public.brain_galaxy_courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON public.brain_galaxy_courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON public.brain_galaxy_courses FOR DELETE USING (auth.uid() = user_id);

-- Course modules: Access based on course access
CREATE POLICY "Users can view modules" ON public.brain_galaxy_course_modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.brain_galaxy_courses c WHERE c.id = course_id AND (c.user_id = auth.uid() OR c.is_public = true))
);
CREATE POLICY "Users can manage own course modules" ON public.brain_galaxy_course_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brain_galaxy_courses c WHERE c.id = course_id AND c.user_id = auth.uid())
);

-- Quizzes: Access based on course access
CREATE POLICY "Users can view quizzes" ON public.brain_galaxy_quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.brain_galaxy_courses c WHERE c.id = course_id AND (c.user_id = auth.uid() OR c.is_public = true))
);
CREATE POLICY "Users can manage own quizzes" ON public.brain_galaxy_quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.brain_galaxy_courses c WHERE c.id = course_id AND c.user_id = auth.uid())
);

-- User progress: User manages own
CREATE POLICY "Users can view own progress" ON public.brain_galaxy_user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own progress" ON public.brain_galaxy_user_progress FOR ALL USING (auth.uid() = user_id);

-- Quiz results: User manages own
CREATE POLICY "Users can view own results" ON public.brain_galaxy_quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create results" ON public.brain_galaxy_quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Missions: Public by default
CREATE POLICY "Anyone can view public missions" ON public.brain_galaxy_missions FOR SELECT USING (visibility = 'public' OR creator_id = auth.uid());
CREATE POLICY "Users can create missions" ON public.brain_galaxy_missions FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update missions" ON public.brain_galaxy_missions FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete missions" ON public.brain_galaxy_missions FOR DELETE USING (auth.uid() = creator_id);

-- Mission participants
CREATE POLICY "Anyone can view participants" ON public.brain_galaxy_mission_participants FOR SELECT USING (true);
CREATE POLICY "Users can join missions" ON public.brain_galaxy_mission_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave missions" ON public.brain_galaxy_mission_participants FOR DELETE USING (auth.uid() = user_id);

-- Mission contributions
CREATE POLICY "Anyone can view contributions" ON public.brain_galaxy_mission_contributions FOR SELECT USING (true);
CREATE POLICY "Users can contribute" ON public.brain_galaxy_mission_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contributions" ON public.brain_galaxy_mission_contributions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contributions" ON public.brain_galaxy_mission_contributions FOR DELETE USING (auth.uid() = user_id);

-- User stats: User manages own, everyone can view for ranking
CREATE POLICY "Anyone can view stats for ranking" ON public.brain_galaxy_user_stats FOR SELECT USING (true);
CREATE POLICY "Users can manage own stats" ON public.brain_galaxy_user_stats FOR ALL USING (auth.uid() = user_id);

-- User badges: User manages own, everyone can view
CREATE POLICY "Anyone can view badges" ON public.brain_galaxy_user_badges FOR SELECT USING (true);
CREATE POLICY "Users can earn badges" ON public.brain_galaxy_user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat sessions: User manages own
CREATE POLICY "Users can view own chats" ON public.brain_galaxy_chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create chats" ON public.brain_galaxy_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON public.brain_galaxy_chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON public.brain_galaxy_chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Function to update user stats when points change
CREATE OR REPLACE FUNCTION public.update_brain_galaxy_level()
RETURNS TRIGGER AS $$
DECLARE
  new_level INTEGER;
BEGIN
  SELECT level_number INTO new_level
  FROM public.brain_galaxy_levels
  WHERE NEW.knowledge_points >= min_points
    AND (max_points IS NULL OR NEW.knowledge_points <= max_points)
  ORDER BY level_number DESC
  LIMIT 1;
  
  IF new_level IS NOT NULL AND new_level != NEW.current_level THEN
    NEW.current_level := new_level;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_brain_galaxy_user_level
  BEFORE UPDATE OF knowledge_points ON public.brain_galaxy_user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_brain_galaxy_level();

-- Function to sync points with Mision Iwie
CREATE OR REPLACE FUNCTION public.sync_brain_galaxy_to_mision_iwie()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert into mision_iwie equivalent if it exists
  -- This creates a bridge between Brain Galaxy and Mision Iwie points
  UPDATE public.mision_iwie_daily_stats
  SET points_earned = COALESCE(points_earned, 0) + (NEW.knowledge_points - COALESCE(OLD.knowledge_points, 0))
  WHERE user_id = NEW.user_id AND date = CURRENT_DATE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_brain_galaxy_points
  AFTER UPDATE OF knowledge_points ON public.brain_galaxy_user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_brain_galaxy_to_mision_iwie();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_galaxy_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_galaxy_mission_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_galaxy_user_stats;
