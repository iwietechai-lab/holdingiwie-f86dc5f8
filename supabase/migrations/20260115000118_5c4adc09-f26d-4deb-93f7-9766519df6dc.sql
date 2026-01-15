-- Create a security definer function to check if user has gestionar_usuarios permission
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.can_manage_users(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = _user_id
    AND (dashboard_visibility->>'gestionar_usuarios')::boolean = true
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles" ON public.user_profiles;

-- Create a new policy without recursion using the security definer function
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
  -- Users can view profiles from their same company
  company_id = get_user_company_id(auth.uid())
  OR
  -- Users with gestionar_usuarios permission can view all users from their company
  (
    can_manage_users(auth.uid())
    AND company_id = get_user_company_id(auth.uid())
  )
);