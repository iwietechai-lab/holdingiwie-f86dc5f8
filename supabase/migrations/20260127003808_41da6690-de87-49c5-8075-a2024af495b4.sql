-- Fix SECURITY DEFINER view warning
-- The user_profiles_public view should NOT use security definer
-- Recreate as a simple view (without security definer by default)

DROP VIEW IF EXISTS public.user_profiles_public;

-- Create as SECURITY INVOKER (default, runs with caller's permissions)
CREATE VIEW public.user_profiles_public 
WITH (security_invoker = on)
AS
SELECT 
  id,
  full_name,
  role,
  company_id
FROM public.user_profiles
WHERE id IS NOT NULL;

GRANT SELECT ON public.user_profiles_public TO authenticated;

COMMENT ON VIEW public.user_profiles_public IS 'Public view with only non-sensitive user data. Uses SECURITY INVOKER - respects RLS of querying user.';