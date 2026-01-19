
-- Create storage bucket for CEO files
INSERT INTO storage.buckets (id, name, public)
VALUES ('ceo-files', 'ceo-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for CEO files
CREATE POLICY "Authenticated users can upload CEO files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ceo-files');

CREATE POLICY "Authenticated users can view CEO files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ceo-files');

CREATE POLICY "Superadmins can delete CEO files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ceo-files' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Create storage bucket for team submissions if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('ceo-team-submissions', 'ceo-team-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for team submissions
CREATE POLICY "Authenticated users can upload team submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ceo-team-submissions');

CREATE POLICY "Authenticated users can view team submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ceo-team-submissions');

-- Add attachments column to ceo_thoughts table
ALTER TABLE public.ceo_thoughts 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Add attachments to ceo_internal_chat
ALTER TABLE public.ceo_internal_chat 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
