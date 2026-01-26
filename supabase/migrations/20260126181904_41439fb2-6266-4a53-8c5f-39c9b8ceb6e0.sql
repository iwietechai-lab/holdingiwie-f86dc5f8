-- SECURITY FIX PART 2A: Core tables first
-- 6. CEO_KNOWLEDGE
DROP POLICY IF EXISTS "Users can view non-confidential knowledge" ON public.ceo_knowledge;
DROP POLICY IF EXISTS "Authenticated users can view knowledge" ON public.ceo_knowledge;
DROP POLICY IF EXISTS "Users with access can view knowledge" ON public.ceo_knowledge;

CREATE POLICY "CEO knowledge restricted access"
ON public.ceo_knowledge FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR created_by = auth.uid()
    OR (
        is_confidential = false
        AND (
            company_id IS NULL
            OR company_id = public.get_user_company_id(auth.uid())
        )
    )
);

-- 7. CEO_FEEDBACK
DROP POLICY IF EXISTS "Users can view feedback sent to them" ON public.ceo_feedback;
DROP POLICY IF EXISTS "CEO can view all feedback" ON public.ceo_feedback;
DROP POLICY IF EXISTS "Superadmins can view all feedback" ON public.ceo_feedback;

CREATE POLICY "Feedback visible only to sender and recipient"
ON public.ceo_feedback FOR SELECT
TO authenticated
USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
);

DROP POLICY IF EXISTS "CEO can send feedback" ON public.ceo_feedback;
CREATE POLICY "Superadmin can send feedback"
ON public.ceo_feedback FOR INSERT
TO authenticated
WITH CHECK (
    public.is_superadmin() AND from_user_id = auth.uid()
);

-- 8. HOLDING_COLLECTIVE_MEMORY
DROP POLICY IF EXISTS "Authenticated users can read processed memory" ON public.holding_collective_memory;
DROP POLICY IF EXISTS "Users can read collective memory" ON public.holding_collective_memory;

CREATE POLICY "Collective memory restricted to company or superadmin"
ON public.holding_collective_memory FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR (
        is_processed = true
        AND (
            company_id IS NULL
            OR company_id = public.get_user_company_id(auth.uid())
            OR user_id = auth.uid()
        )
    )
);

-- 9. COMPANY_KNOWLEDGE
DROP POLICY IF EXISTS "Company members can view knowledge" ON public.company_knowledge;
DROP POLICY IF EXISTS "Users can view company knowledge" ON public.company_knowledge;

CREATE POLICY "Company knowledge restricted access"
ON public.company_knowledge FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR contributor_id = auth.uid()
    OR (
        company_id = public.get_user_company_id(auth.uid())
        AND is_approved_for_ceo = true
    )
);