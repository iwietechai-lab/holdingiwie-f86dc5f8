
-- Fix function search paths for security
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_brain_galaxy_to_mision_iwie()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.mision_iwie_daily_stats
  SET points_earned = COALESCE(points_earned, 0) + (NEW.knowledge_points - COALESCE(OLD.knowledge_points, 0))
  WHERE user_id = NEW.user_id AND date = CURRENT_DATE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix overly permissive RLS policy - make participants view restricted to authenticated users
DROP POLICY IF EXISTS "Anyone can view participants" ON public.brain_galaxy_mission_participants;
CREATE POLICY "Authenticated can view participants" ON public.brain_galaxy_mission_participants 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix contributions policy
DROP POLICY IF EXISTS "Anyone can view contributions" ON public.brain_galaxy_mission_contributions;
CREATE POLICY "Authenticated can view contributions" ON public.brain_galaxy_mission_contributions 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix stats policy for ranking
DROP POLICY IF EXISTS "Anyone can view stats for ranking" ON public.brain_galaxy_user_stats;
CREATE POLICY "Authenticated can view stats for ranking" ON public.brain_galaxy_user_stats 
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix badges policy
DROP POLICY IF EXISTS "Anyone can view badges" ON public.brain_galaxy_user_badges;
CREATE POLICY "Authenticated can view badges" ON public.brain_galaxy_user_badges 
  FOR SELECT USING (auth.uid() IS NOT NULL);
