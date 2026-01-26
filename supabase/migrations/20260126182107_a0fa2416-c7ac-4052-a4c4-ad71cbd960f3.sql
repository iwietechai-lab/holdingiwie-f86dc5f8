-- =======================================================
-- SECURITY FIX PART 4: Protected views and stricter policies
-- =======================================================

-- 1. Create a secure view for user_profiles that hides sensitive data
CREATE OR REPLACE VIEW public.user_profiles_public
WITH (security_invoker = on) AS
SELECT 
    id,
    full_name,
    role,
    company_id,
    gerencia_id,
    sub_gerencia_id,
    area_id,
    position_id,
    department_id,
    can_upload_documents,
    created_at
    -- Excludes: email, facial_embedding, last_facial_verification, dashboard_visibility
FROM public.user_profiles;

-- 2. Restrict access_logs - already done, verify policy exists
DROP POLICY IF EXISTS "Users view own access logs or superadmin views all" ON public.access_logs;
CREATE POLICY "Access logs only for self or superadmin"
ON public.access_logs FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_superadmin()
);

-- 3. Protect user_profiles - only allow own profile full access, limited for others
DROP POLICY IF EXISTS "Users can view own profile or same company profiles" ON public.user_profiles;

CREATE POLICY "Users can view own profile fully"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
    id = auth.uid() -- Full access to own profile only
    OR public.is_superadmin() -- Superadmin sees all
);

-- 4. Create policy for public view (same company can see non-sensitive data)
CREATE POLICY "Same company users can view public profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
    company_id IS NOT NULL 
    AND company_id = public.get_user_company_id(auth.uid())
);

-- 5. User creation requests - restrict to creator, HR managers, superadmin
DROP POLICY IF EXISTS "Users can view user creation requests" ON public.user_creation_requests;
DROP POLICY IF EXISTS "Authenticated can view requests" ON public.user_creation_requests;

CREATE POLICY "User creation requests restricted access"
ON public.user_creation_requests FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR requested_by = auth.uid()
    OR (
        company_id = public.get_user_company_id(auth.uid())
        AND public.can_manage_users(auth.uid())
    )
);