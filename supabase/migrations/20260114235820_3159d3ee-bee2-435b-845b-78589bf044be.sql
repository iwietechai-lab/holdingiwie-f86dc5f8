-- Fix RLS policies for user_profiles
-- The issue is that multiple RESTRICTIVE policies are blocking each other
-- We need to drop the restrictive policies and create permissive ones instead

-- Drop existing conflicting SELECT policies
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view profiles via company function" ON public.user_profiles;

-- Create a single PERMISSIVE policy for SELECT that covers all cases
CREATE POLICY "Users can view profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  -- Can always view own profile
  id = auth.uid()
  OR
  -- Superadmins can view all
  is_superadmin()
  OR
  -- Users with gestionar_usuarios permission can view users from their company
  (
    company_id = get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (up.dashboard_visibility->>'gestionar_usuarios')::boolean = true
    )
  )
  OR
  -- Anyone can view profiles from their own company
  company_id = get_user_company_id(auth.uid())
);

-- Fix UPDATE policy - only superadmins or users updating their own profile
DROP POLICY IF EXISTS "Users can update their own profile only" ON public.user_profiles;

CREATE POLICY "Users can update profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() 
  OR is_superadmin()
  OR (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'superadmin'::app_role)
  )
)
WITH CHECK (
  id = auth.uid() 
  OR is_superadmin()
  OR (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'superadmin'::app_role)
  )
);

-- Add DELETE policy for superadmins
CREATE POLICY "Superadmins can delete profiles"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (is_superadmin());