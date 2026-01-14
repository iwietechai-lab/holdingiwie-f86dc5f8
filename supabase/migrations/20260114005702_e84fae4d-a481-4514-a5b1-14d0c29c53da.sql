-- Recreate is_superadmin function as SECURITY DEFINER (using CREATE OR REPLACE)
-- The function already exists, so this will just update it
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'superadmin'::app_role
    )
$$;