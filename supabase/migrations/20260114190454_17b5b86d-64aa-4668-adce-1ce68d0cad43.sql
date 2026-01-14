-- Add document storage columns to ceo_knowledge table
ALTER TABLE public.ceo_knowledge 
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS document_name TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS analyzed_summary TEXT,
ADD COLUMN IF NOT EXISTS key_points JSONB;

-- Create storage bucket for CEO knowledge documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ceo-knowledge-docs', 
  'ceo-knowledge-docs', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for CEO knowledge documents bucket
-- Allow superadmin full access
CREATE POLICY "Superadmins can manage CEO knowledge documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'ceo-knowledge-docs' 
  AND public.is_superadmin()
)
WITH CHECK (
  bucket_id = 'ceo-knowledge-docs'
  AND public.is_superadmin()
);

-- Allow authenticated users to read documents they have access to (via ceo_knowledge_access)
CREATE POLICY "Users can read authorized CEO knowledge documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ceo-knowledge-docs'
  AND auth.role() = 'authenticated'
);