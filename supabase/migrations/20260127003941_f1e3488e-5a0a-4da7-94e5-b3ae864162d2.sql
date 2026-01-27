-- Security Hardening Migration v5 - Address remaining scan findings
-- Date: 2026-01-27

-- =====================================================
-- 1. BRAIN_GALAXY_MISSIONS - Change default visibility to private
-- =====================================================

ALTER TABLE public.brain_galaxy_missions 
ALTER COLUMN visibility SET DEFAULT 'private';

COMMENT ON COLUMN public.brain_galaxy_missions.visibility IS 'Mission visibility: private (default), public, company. Private by default to prevent accidental exposure.';

-- =====================================================
-- 2. BRAIN_GALAXY_AREAS - Restrict INSERT to superadmin/managers only
-- =====================================================

DROP POLICY IF EXISTS "Anyone can create areas" ON public.brain_galaxy_areas;
DROP POLICY IF EXISTS "Users can create areas" ON public.brain_galaxy_areas;
DROP POLICY IF EXISTS "brain_galaxy_areas_insert_policy" ON public.brain_galaxy_areas;

-- Only superadmin can create system areas
CREATE POLICY "areas_insert_admin_only"
ON public.brain_galaxy_areas
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin());

-- =====================================================
-- 3. HOLDING_COLLECTIVE_MEMORY - Strict company isolation
-- =====================================================

DROP POLICY IF EXISTS "holding_collective_memory_select_policy" ON public.holding_collective_memory;
DROP POLICY IF EXISTS "Users can view holding memory" ON public.holding_collective_memory;

CREATE POLICY "collective_memory_strict_company"
ON public.holding_collective_memory
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR (
    company_id IS NOT NULL 
    AND company_id = public.get_user_company_id(auth.uid())
    AND COALESCE(is_processed, false) = true
  )
);

COMMENT ON TABLE public.holding_collective_memory IS 'Cross-company memory - only processed entries visible, strict company isolation for non-superadmins.';

-- =====================================================
-- 4. USER_PROFILES_PUBLIC - Ensure requires authentication
-- =====================================================

-- Revoke any public/anon access
REVOKE ALL ON public.user_profiles_public FROM anon;
REVOKE ALL ON public.user_profiles_public FROM public;

-- Only authenticated users can access
GRANT SELECT ON public.user_profiles_public TO authenticated;

-- =====================================================
-- 5. FACIAL EMBEDDING - Add comment about protection
-- =====================================================

COMMENT ON COLUMN public.user_profiles.facial_embedding IS 'Biometric facial embedding data. Protected by RLS (self-only access). Must never be transmitted to clients except via secure functions.';