-- =====================================================
-- SECURITY FIX: Make company-knowledge bucket private
-- =====================================================

-- Update the company-knowledge bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'company-knowledge';

-- =====================================================
-- SECURITY FIX: Restrict organizational structure access
-- by company - only users from same company can view
-- =====================================================

-- Drop existing overly permissive policies on gerencias
DROP POLICY IF EXISTS "Authenticated users can view gerencias" ON public.gerencias;

-- Create company-scoped policy for gerencias
CREATE POLICY "Users can view gerencias from their company" ON public.gerencias
FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
  OR public.is_superadmin()
);

-- Drop existing overly permissive policies on sub_gerencias
DROP POLICY IF EXISTS "Authenticated users can view sub_gerencias" ON public.sub_gerencias;

-- Create company-scoped policy for sub_gerencias (via gerencia relationship)
CREATE POLICY "Users can view sub_gerencias from their company" ON public.sub_gerencias
FOR SELECT TO authenticated
USING (
  gerencia_id IN (
    SELECT g.id FROM public.gerencias g
    JOIN public.user_profiles up ON g.company_id = up.company_id
    WHERE up.id = auth.uid()
  )
  OR public.is_superadmin()
);

-- Drop existing overly permissive policies on areas
DROP POLICY IF EXISTS "Authenticated users can view areas" ON public.areas;

-- Create company-scoped policy for areas (via gerencia relationship)
CREATE POLICY "Users can view areas from their company" ON public.areas
FOR SELECT TO authenticated
USING (
  gerencia_id IN (
    SELECT g.id FROM public.gerencias g
    JOIN public.user_profiles up ON g.company_id = up.company_id
    WHERE up.id = auth.uid()
  )
  OR public.is_superadmin()
);

-- Drop existing overly permissive policies on positions
DROP POLICY IF EXISTS "Authenticated users can view positions" ON public.positions;

-- Create company-scoped policy for positions (via gerencia relationship)
CREATE POLICY "Users can view positions from their company" ON public.positions
FOR SELECT TO authenticated
USING (
  gerencia_id IN (
    SELECT g.id FROM public.gerencias g
    JOIN public.user_profiles up ON g.company_id = up.company_id
    WHERE up.id = auth.uid()
  )
  OR public.is_superadmin()
);

-- =====================================================
-- SECURITY FIX: Restrict user_profiles access by company
-- =====================================================

-- Drop existing policy that allows all authenticated users to view
DROP POLICY IF EXISTS "Users can view profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

-- Create company-scoped policy for user_profiles
CREATE POLICY "Users can view profiles in their company" ON public.user_profiles
FOR SELECT TO authenticated
USING (
  -- User can see their own profile
  id = auth.uid()
  -- Or profiles from the same company
  OR company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  )
  -- Or superadmin can see all
  OR public.is_superadmin()
);

-- =====================================================
-- SECURITY FIX: Prevent privilege escalation on UPDATE
-- =====================================================

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Superadmins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create restricted update policy for regular users (safe fields only)
-- Using a function to prevent users from changing critical fields
CREATE OR REPLACE FUNCTION public.check_profile_update_allowed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Superadmins can update anything
  IF public.is_superadmin() THEN
    RETURN NEW;
  END IF;
  
  -- Regular users can only update their own profile
  IF OLD.id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot update other users profiles';
  END IF;
  
  -- Prevent changing critical fields
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Cannot change company_id';
  END IF;
  
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot change role';
  END IF;
  
  IF NEW.gerencia_id IS DISTINCT FROM OLD.gerencia_id THEN
    RAISE EXCEPTION 'Cannot change gerencia_id';
  END IF;
  
  IF NEW.area_id IS DISTINCT FROM OLD.area_id THEN
    RAISE EXCEPTION 'Cannot change area_id';
  END IF;
  
  IF NEW.position_id IS DISTINCT FROM OLD.position_id THEN
    RAISE EXCEPTION 'Cannot change position_id';
  END IF;
  
  IF NEW.sub_gerencia_id IS DISTINCT FROM OLD.sub_gerencia_id THEN
    RAISE EXCEPTION 'Cannot change sub_gerencia_id';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce update restrictions
DROP TRIGGER IF EXISTS enforce_profile_update_restrictions ON public.user_profiles;
CREATE TRIGGER enforce_profile_update_restrictions
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_update_allowed();

-- Now create simple update policies
CREATE POLICY "Users can update own profile" ON public.user_profiles
FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_superadmin())
WITH CHECK (id = auth.uid() OR public.is_superadmin());