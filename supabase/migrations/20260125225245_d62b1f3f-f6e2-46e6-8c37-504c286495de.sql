-- Update RLS policies for Brain Galaxy to allow all authenticated users (holding-wide access)

-- Drop existing restrictive policies and create holding-wide policies

-- brain_galaxy_areas: All authenticated users can read, only admins/creators can insert
DROP POLICY IF EXISTS "Users can view all areas" ON public.brain_galaxy_areas;
DROP POLICY IF EXISTS "Authenticated users can create areas" ON public.brain_galaxy_areas;

CREATE POLICY "All authenticated users can view areas"
ON public.brain_galaxy_areas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can create areas"
ON public.brain_galaxy_areas FOR INSERT
TO authenticated
WITH CHECK (true);

-- brain_galaxy_content: Users see their own + holding visibility
DROP POLICY IF EXISTS "Users can view their own content" ON public.brain_galaxy_content;
DROP POLICY IF EXISTS "Users can view holding content" ON public.brain_galaxy_content;

CREATE POLICY "Users can view own and holding content"
ON public.brain_galaxy_content FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR visibility = 'holding' 
  OR visibility = 'company'
);

-- brain_galaxy_courses: Users see their own + public courses
DROP POLICY IF EXISTS "Users can view their own courses" ON public.brain_galaxy_courses;
DROP POLICY IF EXISTS "Users can view public courses" ON public.brain_galaxy_courses;

CREATE POLICY "Users can view own and public courses"
ON public.brain_galaxy_courses FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_public = true
);

-- brain_galaxy_missions: All authenticated users can see active missions
DROP POLICY IF EXISTS "Users can view active missions" ON public.brain_galaxy_missions;

CREATE POLICY "All users can view active missions"
ON public.brain_galaxy_missions FOR SELECT
TO authenticated
USING (true);

-- brain_galaxy_user_stats: Users see their own + can view leaderboard data
DROP POLICY IF EXISTS "Users can view their own stats" ON public.brain_galaxy_user_stats;
DROP POLICY IF EXISTS "Users can view leaderboard stats" ON public.brain_galaxy_user_stats;

CREATE POLICY "Users can view all stats for leaderboard"
ON public.brain_galaxy_user_stats FOR SELECT
TO authenticated
USING (true);

-- brain_galaxy_levels: All authenticated users can view
DROP POLICY IF EXISTS "Anyone can view levels" ON public.brain_galaxy_levels;

CREATE POLICY "All users can view levels"
ON public.brain_galaxy_levels FOR SELECT
TO authenticated
USING (true);

-- brain_galaxy_badges: All authenticated users can view
DROP POLICY IF EXISTS "Anyone can view badges" ON public.brain_galaxy_badges;

CREATE POLICY "All users can view badges"
ON public.brain_galaxy_badges FOR SELECT
TO authenticated
USING (true);

-- brain_galaxy_chat_sessions: Users manage their own
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.brain_galaxy_chat_sessions;

CREATE POLICY "Users manage their own chat sessions"
ON public.brain_galaxy_chat_sessions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- brain_galaxy_mission_participants: View all, manage own
DROP POLICY IF EXISTS "Users can view mission participants" ON public.brain_galaxy_mission_participants;
DROP POLICY IF EXISTS "Users can manage their own participation" ON public.brain_galaxy_mission_participants;

CREATE POLICY "All users can view participants"
ON public.brain_galaxy_mission_participants FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users manage own participation"
ON public.brain_galaxy_mission_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- brain_galaxy_mission_contributions: View all, manage own
DROP POLICY IF EXISTS "Users can view contributions" ON public.brain_galaxy_mission_contributions;
DROP POLICY IF EXISTS "Users can manage their own contributions" ON public.brain_galaxy_mission_contributions;

CREATE POLICY "All users can view contributions"
ON public.brain_galaxy_mission_contributions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users manage own contributions"
ON public.brain_galaxy_mission_contributions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());