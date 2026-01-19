-- Drop the existing INSERT policy for documentos
DROP POLICY IF EXISTS "Users insert own company documents" ON public.documentos;

-- Create a more permissive INSERT policy that allows:
-- 1. Users to insert documents for their own company
-- 2. Users with upload permission (can_upload_documents) to insert for any company
-- 3. Superadmins to insert for any company
CREATE POLICY "Users can insert documents" 
ON public.documentos 
FOR INSERT 
WITH CHECK (
  -- User must be authenticated and setting their own user_id
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND (
    -- Can insert for their own company
    empresa_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    -- Or has upload permission for any company
    OR (SELECT can_upload_documents FROM user_profiles WHERE id = auth.uid()) = true
    -- Or is superadmin
    OR is_superadmin()
  )
);