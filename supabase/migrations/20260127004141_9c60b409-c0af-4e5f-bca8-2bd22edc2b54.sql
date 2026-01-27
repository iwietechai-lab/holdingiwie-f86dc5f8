-- Security Hardening Migration v6 - Resolve conflicting policies
-- Date: 2026-01-27

-- =====================================================
-- 1. BRAIN_GALAXY_AREAS - Remove conflicting INSERT policies
-- =====================================================

-- Drop ALL insert policies first
DROP POLICY IF EXISTS "areas_insert_admin_only" ON public.brain_galaxy_areas;
DROP POLICY IF EXISTS "Anyone can create areas" ON public.brain_galaxy_areas;
DROP POLICY IF EXISTS "Users can create areas" ON public.brain_galaxy_areas;
DROP POLICY IF EXISTS "Authenticated can insert" ON public.brain_galaxy_areas;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.brain_galaxy_areas;

-- Single clear INSERT policy
CREATE POLICY "areas_insert_superadmin"
ON public.brain_galaxy_areas
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin());

-- =====================================================
-- 2. CEO_KNOWLEDGE - Consolidate to single SELECT policy
-- =====================================================

-- Drop ALL existing select policies
DROP POLICY IF EXISTS "ceo_knowledge_select_authorized" ON public.ceo_knowledge;
DROP POLICY IF EXISTS "Users can view own knowledge" ON public.ceo_knowledge;
DROP POLICY IF EXISTS "ceo_knowledge_select_policy" ON public.ceo_knowledge;
DROP POLICY IF EXISTS "Anyone can view knowledge" ON public.ceo_knowledge;

-- Single consolidated SELECT policy
CREATE POLICY "ceo_knowledge_select_consolidated"
ON public.ceo_knowledge
FOR SELECT
TO authenticated
USING (
  -- Superadmin has full access
  public.is_superadmin()
  OR
  -- Creator can always see their own non-confidential
  (created_by = auth.uid() AND NOT COALESCE(is_confidential, false))
  OR
  -- Explicit access grant required for any viewing by others
  EXISTS (
    SELECT 1 FROM public.ceo_knowledge_access cka
    WHERE cka.company_id = ceo_knowledge.company_id
    AND cka.user_id = auth.uid()
  )
);

-- =====================================================
-- 3. HOLDING_COLLECTIVE_MEMORY - Remove conflicting policies
-- =====================================================

DROP POLICY IF EXISTS "collective_memory_strict_company" ON public.holding_collective_memory;
DROP POLICY IF EXISTS "holding_collective_memory_select_policy" ON public.holding_collective_memory;
DROP POLICY IF EXISTS "Users can view memory" ON public.holding_collective_memory;

-- Single clear policy: processed + company match OR superadmin
CREATE POLICY "collective_memory_select_strict"
ON public.holding_collective_memory
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR
  (
    user_id = auth.uid()
  )
  OR
  (
    company_id IS NOT NULL
    AND company_id = public.get_user_company_id(auth.uid())
    AND COALESCE(is_processed, false) = true
  )
);

-- =====================================================
-- 4. BUDGET_QUOTES - Restrict to creator/approver/managers
-- =====================================================

DROP POLICY IF EXISTS "budget_quotes_select_policy" ON public.budget_quotes;
DROP POLICY IF EXISTS "Users can view quotes" ON public.budget_quotes;

CREATE POLICY "budget_quotes_select_restricted"
ON public.budget_quotes
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR created_by = auth.uid()
  OR approved_by = auth.uid()
  OR public.can_manage_users(auth.uid())
);

-- =====================================================
-- 5. COMPANY_SALES - Restrict to managers only
-- =====================================================

DROP POLICY IF EXISTS "company_sales_select_policy" ON public.company_sales;
DROP POLICY IF EXISTS "Users can view sales" ON public.company_sales;

CREATE POLICY "company_sales_select_managers"
ON public.company_sales
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR public.can_manage_users(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.company_id = company_sales.company_id
    AND (up.dashboard_visibility->>'ver_ventas')::boolean = true
  )
);

-- =====================================================
-- 6. COMPANY_METRICS - Restrict to executives with ver_reportes
-- =====================================================

DROP POLICY IF EXISTS "company_metrics_select_policy" ON public.company_metrics;
DROP POLICY IF EXISTS "Users can view metrics" ON public.company_metrics;

CREATE POLICY "company_metrics_select_restricted"
ON public.company_metrics
FOR SELECT
TO authenticated
USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.company_id = company_metrics.company_id
    AND (up.dashboard_visibility->>'ver_reportes')::boolean = true
  )
);