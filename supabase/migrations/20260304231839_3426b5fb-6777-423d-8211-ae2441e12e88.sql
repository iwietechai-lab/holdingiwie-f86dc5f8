
-- Drop duplicate SELECT policies (old subquery-based ones)
-- Keep the efficient get_user_company_id versions

-- gerencias: drop old, keep "View gerencias - company scoped"
DROP POLICY IF EXISTS "Users can view gerencias from their company" ON public.gerencias;

-- areas: drop old, keep "View areas - company scoped"
DROP POLICY IF EXISTS "Users can view areas from their company" ON public.areas;

-- sub_gerencias: drop old, keep "View sub_gerencias - company scoped"
DROP POLICY IF EXISTS "Users can view sub_gerencias from their company" ON public.sub_gerencias;

-- positions: drop old, keep "View positions - company scoped"
DROP POLICY IF EXISTS "Users can view positions from their company" ON public.positions;
