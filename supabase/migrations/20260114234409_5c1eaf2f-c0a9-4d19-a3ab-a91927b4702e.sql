-- Fix infinite recursion in user_profiles RLS policies
-- Drop the problematic policies and replace with correct ones

-- First, create a helper function to get user's company_id without recursion
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = user_id
$$;

-- Drop existing user_profiles policies that cause recursion
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Prevent role escalation" ON public.user_profiles;

-- Drop policies on other tables that depend on user_profiles
DROP POLICY IF EXISTS "View gerencias for own company" ON public.gerencias;
DROP POLICY IF EXISTS "View sub_gerencias for own company" ON public.sub_gerencias;
DROP POLICY IF EXISTS "View areas for own company" ON public.areas;
DROP POLICY IF EXISTS "View positions for own company" ON public.positions;

-- Recreate user_profiles policies using the helper function (no recursion)
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can view profiles via company function"
ON public.user_profiles FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  OR public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Users can update their own profile only"
ON public.user_profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Recreate org structure policies using the helper function
CREATE POLICY "View gerencias - company scoped"
ON public.gerencias FOR SELECT
USING (
  company_id = public.get_user_company_id(auth.uid())
  OR public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "View sub_gerencias - company scoped"
ON public.sub_gerencias FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gerencias g 
    WHERE g.id = gerencia_id 
    AND (g.company_id = public.get_user_company_id(auth.uid()) OR public.has_role(auth.uid(), 'superadmin'))
  )
);

CREATE POLICY "View areas - company scoped"
ON public.areas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gerencias g 
    WHERE g.id = gerencia_id 
    AND (g.company_id = public.get_user_company_id(auth.uid()) OR public.has_role(auth.uid(), 'superadmin'))
  )
);

CREATE POLICY "View positions - company scoped"
ON public.positions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gerencias g 
    WHERE g.id = gerencia_id 
    AND (g.company_id = public.get_user_company_id(auth.uid()) OR public.has_role(auth.uid(), 'superadmin'))
  )
  OR EXISTS (
    SELECT 1 FROM public.areas a
    JOIN public.gerencias g ON g.id = a.gerencia_id
    WHERE a.id = area_id
    AND (g.company_id = public.get_user_company_id(auth.uid()) OR public.has_role(auth.uid(), 'superadmin'))
  )
);