-- =====================================================
-- SECURITY HARDENING: Final RLS Fixes v5
-- Handle JSONB columns correctly
-- =====================================================

-- 1. meeting_summaries - participants is JSONB
DROP POLICY IF EXISTS "Participants can view meeting summaries" ON meeting_summaries;
DROP POLICY IF EXISTS "Secure meeting summaries access" ON meeting_summaries;
DROP POLICY IF EXISTS "Hardened meeting summaries access v2" ON meeting_summaries;
DROP POLICY IF EXISTS "Hardened meeting summaries access v3" ON meeting_summaries;
DROP POLICY IF EXISTS "Hardened meeting summaries access v4" ON meeting_summaries;

CREATE POLICY "Hardened meeting summaries access v5"
ON meeting_summaries FOR SELECT
USING (
  public.is_superadmin()
  OR created_by = auth.uid()
  OR participants ? auth.uid()::text
);

-- 2. tasks - assigned_to and team_members are JSONB
DROP POLICY IF EXISTS "Company users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view their company tasks" ON tasks;
DROP POLICY IF EXISTS "Secure task access" ON tasks;
DROP POLICY IF EXISTS "Hardened task access v2" ON tasks;
DROP POLICY IF EXISTS "Hardened task access v3" ON tasks;
DROP POLICY IF EXISTS "Hardened task access v4" ON tasks;

CREATE POLICY "Hardened task access v5"
ON tasks FOR SELECT
USING (
  public.is_superadmin()
  OR created_by = auth.uid()
  OR assigned_to ? auth.uid()::text
  OR team_members ? auth.uid()::text
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('superadmin', 'admin', 'manager')
    )
  )
);

-- 3. ceo_feedback - Fix policy
DROP POLICY IF EXISTS "Users can view their feedback" ON ceo_feedback;
DROP POLICY IF EXISTS "Secure feedback access" ON ceo_feedback;
DROP POLICY IF EXISTS "Hardened feedback access v2" ON ceo_feedback;
DROP POLICY IF EXISTS "Hardened feedback access v3" ON ceo_feedback;
DROP POLICY IF EXISTS "Hardened feedback access v4" ON ceo_feedback;

CREATE POLICY "Hardened feedback access v5"
ON ceo_feedback FOR SELECT
USING (
  public.is_superadmin()
  OR from_user_id = auth.uid()
  OR to_user_id = auth.uid()
);

-- 4. holding_collective_memory - Fix policy
DROP POLICY IF EXISTS "Users can view collective memory" ON holding_collective_memory;
DROP POLICY IF EXISTS "Secure collective memory access" ON holding_collective_memory;
DROP POLICY IF EXISTS "Hardened collective memory access v2" ON holding_collective_memory;
DROP POLICY IF EXISTS "Hardened collective memory access v3" ON holding_collective_memory;
DROP POLICY IF EXISTS "Hardened collective memory access v4" ON holding_collective_memory;

CREATE POLICY "Hardened collective memory access v5"
ON holding_collective_memory FOR SELECT
USING (
  public.is_superadmin()
  OR company_id IS NULL
  OR company_id = public.get_user_company_id(auth.uid())
);

-- 5. brain_galaxy_content - Fix policy
DROP POLICY IF EXISTS "Users can view content" ON brain_galaxy_content;
DROP POLICY IF EXISTS "Users can view brain galaxy content" ON brain_galaxy_content;
DROP POLICY IF EXISTS "Secure brain galaxy content access" ON brain_galaxy_content;
DROP POLICY IF EXISTS "Hardened brain galaxy content access v2" ON brain_galaxy_content;
DROP POLICY IF EXISTS "Hardened brain galaxy content access v3" ON brain_galaxy_content;
DROP POLICY IF EXISTS "Hardened brain galaxy content access v4" ON brain_galaxy_content;

CREATE POLICY "Hardened brain galaxy content access v5"
ON brain_galaxy_content FOR SELECT
USING (
  public.is_superadmin()
  OR user_id = auth.uid()
  OR visibility = 'public'
  OR (visibility = 'holding' AND is_processed = true)
);

-- 6. ceo_knowledge - Fix policy
DROP POLICY IF EXISTS "Company users can view non-confidential knowledge" ON ceo_knowledge;
DROP POLICY IF EXISTS "Users can view CEO knowledge" ON ceo_knowledge;
DROP POLICY IF EXISTS "Secure CEO knowledge access" ON ceo_knowledge;
DROP POLICY IF EXISTS "Hardened CEO knowledge access v2" ON ceo_knowledge;
DROP POLICY IF EXISTS "Hardened CEO knowledge access v3" ON ceo_knowledge;
DROP POLICY IF EXISTS "Hardened CEO knowledge access v4" ON ceo_knowledge;

CREATE POLICY "Hardened CEO knowledge access v5"
ON ceo_knowledge FOR SELECT
USING (
  public.is_superadmin()
  OR (
    is_confidential = false
    AND (
      company_id IS NULL 
      OR company_id = public.get_user_company_id(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (up.dashboard_visibility->>'acceso_chatbot_ceo')::boolean = true
    )
  )
  OR (is_confidential = true AND public.is_superadmin())
);

-- 7. user_creation_requests - Fix policy
DROP POLICY IF EXISTS "Managers can view requests" ON user_creation_requests;
DROP POLICY IF EXISTS "Users can view their requests" ON user_creation_requests;
DROP POLICY IF EXISTS "Secure user creation request access" ON user_creation_requests;
DROP POLICY IF EXISTS "Hardened user request access v2" ON user_creation_requests;
DROP POLICY IF EXISTS "Hardened user request access v3" ON user_creation_requests;
DROP POLICY IF EXISTS "Hardened user request access v4" ON user_creation_requests;

CREATE POLICY "Hardened user request access v5"
ON user_creation_requests FOR SELECT
USING (
  public.is_superadmin()
  OR requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND (up.dashboard_visibility->>'gestionar_usuarios')::boolean = true
  )
);