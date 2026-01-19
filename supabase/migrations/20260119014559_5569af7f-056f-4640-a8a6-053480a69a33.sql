-- Make the bucket public so files can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'ceo-team-submissions';

-- Add policy for users to view all their own submissions
DROP POLICY IF EXISTS "Users can view own team submissions" ON public.ceo_team_submissions;
CREATE POLICY "Users can view own team submissions"
ON public.ceo_team_submissions FOR SELECT
USING (auth.uid() = submitted_by OR is_superadmin());

-- Add policy for users to insert their own submissions  
DROP POLICY IF EXISTS "Users can insert own team submissions" ON public.ceo_team_submissions;
CREATE POLICY "Users can insert own team submissions"
ON public.ceo_team_submissions FOR INSERT
WITH CHECK (auth.uid() = submitted_by);

-- Make sure RLS is enabled
ALTER TABLE public.ceo_team_submissions ENABLE ROW LEVEL SECURITY;