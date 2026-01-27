-- Security Hardening Migration v4 - Final with correct column names
-- Date: 2026-01-27

-- =====================================================
-- 4. USER_PROFILES_PUBLIC view - Remove sensitive fields  
-- =====================================================

DROP VIEW IF EXISTS public.user_profiles_public;

CREATE VIEW public.user_profiles_public AS
SELECT 
  id,
  full_name,
  role,
  company_id
FROM public.user_profiles
WHERE id IS NOT NULL;

GRANT SELECT ON public.user_profiles_public TO authenticated;

COMMENT ON VIEW public.user_profiles_public IS 'Public view with only non-sensitive user data. No emails, no embeddings, no department details.';

-- =====================================================
-- 5. CEO_KNOWLEDGE - Enforce approval workflow
-- =====================================================

DROP POLICY IF EXISTS "Users can view knowledge with access" ON public.ceo_knowledge;
DROP POLICY IF EXISTS "ceo_knowledge_select_authorized" ON public.ceo_knowledge;

CREATE POLICY "ceo_knowledge_select_authorized"
ON public.ceo_knowledge
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR (
    NOT COALESCE(is_confidential, false)
    AND created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.ceo_knowledge_access cka
    WHERE cka.company_id = ceo_knowledge.company_id
    AND cka.user_id = auth.uid()
    AND cka.access_level IN ('global_holding'::knowledge_access_level, 'empresa'::knowledge_access_level, 'proyecto'::knowledge_access_level)
  )
);

-- =====================================================
-- 6. COMPANY_KNOWLEDGE - Using correct column: contributor_id
-- =====================================================

DROP POLICY IF EXISTS "Users can view approved knowledge" ON public.company_knowledge;
DROP POLICY IF EXISTS "company_knowledge_select_policy" ON public.company_knowledge;
DROP POLICY IF EXISTS "company_knowledge_select_approved_or_own" ON public.company_knowledge;

CREATE POLICY "company_knowledge_select_approved_or_own"
ON public.company_knowledge
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR contributor_id = auth.uid()
  OR (
    COALESCE(is_approved_for_ceo, false) = true
    AND company_id = public.get_user_company_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "company_knowledge_update_policy" ON public.company_knowledge;
DROP POLICY IF EXISTS "company_knowledge_update_own_or_admin" ON public.company_knowledge;

CREATE POLICY "company_knowledge_update_own_or_admin"
ON public.company_knowledge
FOR UPDATE
TO authenticated
USING (
  contributor_id = auth.uid()
  OR public.is_superadmin()
  OR public.can_manage_users(auth.uid())
)
WITH CHECK (
  contributor_id = auth.uid()
  OR public.is_superadmin()
  OR public.can_manage_users(auth.uid())
);

-- =====================================================
-- 7. CHAT_MESSAGES - Add audit comment
-- =====================================================

COMMENT ON TABLE public.chat_messages IS 'Internal chat messages. Protected by RLS. Admin access should be audited.';

-- =====================================================
-- 8. MISION_IWIE_TASKS - Uses user_id (already correct)
-- =====================================================

DROP POLICY IF EXISTS "mision_iwie_tasks_select_policy" ON public.mision_iwie_tasks;
DROP POLICY IF EXISTS "mision_iwie_tasks_select_authorized" ON public.mision_iwie_tasks;

-- mision_iwie_missions table doesn't exist, so simplify policy
CREATE POLICY "mision_iwie_tasks_select_authorized"
ON public.mision_iwie_tasks
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR user_id = auth.uid()
);