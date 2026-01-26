-- SECURITY FIX PART 3: Fix INSERT policies with WITH CHECK(true)

-- Fix brain_galaxy_areas INSERT policy (should require authenticated)
DROP POLICY IF EXISTS "All authenticated users can create areas" ON public.brain_galaxy_areas;

CREATE POLICY "Authenticated users can create areas"
ON public.brain_galaxy_areas FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix video_call_signals (ALL with qual true is dangerous)
DROP POLICY IF EXISTS "Participants can manage signals" ON public.video_call_signals;

CREATE POLICY "Users can manage own signals"
ON public.video_call_signals FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());