-- Create storage bucket for company knowledge documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-knowledge', 'company-knowledge', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for company knowledge storage
CREATE POLICY "Authenticated users can upload to company-knowledge"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-knowledge' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view company-knowledge files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-knowledge');

CREATE POLICY "Users can update their own uploaded files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-knowledge' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploaded files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-knowledge' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);