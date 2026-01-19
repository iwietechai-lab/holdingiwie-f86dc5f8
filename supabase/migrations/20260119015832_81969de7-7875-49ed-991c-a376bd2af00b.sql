-- Drop conflicting policies on ceo_team_submissions table
DROP POLICY IF EXISTS "Users can insert own team submissions" ON public.ceo_team_submissions;
DROP POLICY IF EXISTS "Users can submit and view own submissions" ON public.ceo_team_submissions;
DROP POLICY IF EXISTS "Users can view own team submissions" ON public.ceo_team_submissions;
DROP POLICY IF EXISTS "Superadmins can view all submissions" ON public.ceo_team_submissions;

-- Create proper RLS policies for authenticated users
CREATE POLICY "Authenticated users can insert submissions"
ON public.ceo_team_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view own submissions"
ON public.ceo_team_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = submitted_by OR is_superadmin());

CREATE POLICY "Superadmins can update submissions"
ON public.ceo_team_submissions
FOR UPDATE
TO authenticated
USING (is_superadmin());

CREATE POLICY "Superadmins can delete submissions"
ON public.ceo_team_submissions
FOR DELETE
TO authenticated
USING (is_superadmin());

-- Fix storage policies for ceo-team-submissions bucket
DROP POLICY IF EXISTS "Authenticated users can upload team submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload submissions" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view team submissions" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can manage all submissions" ON storage.objects;

-- Recreate proper storage policies
CREATE POLICY "Allow authenticated upload to ceo-team-submissions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ceo-team-submissions');

CREATE POLICY "Allow authenticated read from ceo-team-submissions"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ceo-team-submissions');

CREATE POLICY "Allow superadmin delete from ceo-team-submissions"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ceo-team-submissions' AND is_superadmin());