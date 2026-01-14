-- Create enum for access levels
CREATE TYPE public.knowledge_access_level AS ENUM ('global_holding', 'empresa', 'proyecto', 'desarrollo', 'confidencial');

-- Add columns to ceo_knowledge_access table for access level and allowed categories
ALTER TABLE public.ceo_knowledge_access
ADD COLUMN access_level knowledge_access_level NOT NULL DEFAULT 'empresa',
ADD COLUMN allowed_categories text[] DEFAULT ARRAY['informacion']::text[],
ADD COLUMN notes text;

-- Update the RLS policy for ceo_knowledge to filter based on access level and categories
DROP POLICY IF EXISTS "Users can read authorized knowledge" ON public.ceo_knowledge;

CREATE POLICY "Users can read authorized knowledge" 
ON public.ceo_knowledge 
FOR SELECT 
USING (
  has_role(auth.uid(), 'superadmin'::app_role) 
  OR (
    EXISTS (
      SELECT 1 FROM ceo_knowledge_access cka
      WHERE cka.user_id = auth.uid() 
      AND (
        -- Global holding access can see everything
        cka.access_level = 'global_holding'
        OR (
          -- Enterprise level - matches company
          cka.access_level = 'empresa' AND cka.company_id = ceo_knowledge.company_id
        )
        OR (
          -- Project/development/confidential level - matches company and category permissions
          cka.access_level IN ('proyecto', 'desarrollo', 'confidencial')
          AND cka.company_id = ceo_knowledge.company_id
          AND (
            -- Category must be in allowed_categories
            ceo_knowledge.category = ANY(cka.allowed_categories)
            -- Confidential level can also see confidential content
            OR (cka.access_level = 'confidencial' AND ceo_knowledge.is_confidential = true)
          )
        )
      )
    )
    OR (
      -- Users from the same company can see non-confidential content of their company
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.company_id = ceo_knowledge.company_id
      )
      AND ceo_knowledge.is_confidential = false
    )
  )
);