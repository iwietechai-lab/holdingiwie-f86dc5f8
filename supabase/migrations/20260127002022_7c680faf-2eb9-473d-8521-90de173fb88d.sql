-- =====================================================
-- SECURITY HARDENING: Final RLS Fixes v7
-- Fix company_metrics policy
-- =====================================================

-- company_metrics - Restrict to managers only
DROP POLICY IF EXISTS "Users can view company metrics" ON company_metrics;
DROP POLICY IF EXISTS "Company users can view metrics" ON company_metrics;

CREATE POLICY "Hardened company metrics access v7"
ON company_metrics FOR SELECT
USING (
  public.is_superadmin()
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role IN ('superadmin', 'admin', 'manager')
        OR (up.dashboard_visibility->>'ver_ventas')::boolean = true
      )
    )
  )
);