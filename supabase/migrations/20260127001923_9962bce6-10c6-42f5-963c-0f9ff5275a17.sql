-- =====================================================
-- SECURITY HARDENING: Final RLS Fixes v6
-- Fix remaining critical issues
-- =====================================================

-- 1. brain_galaxy_missions - Restrict public visibility
DROP POLICY IF EXISTS "Users can view public missions" ON brain_galaxy_missions;
DROP POLICY IF EXISTS "Anyone can view public missions" ON brain_galaxy_missions;
DROP POLICY IF EXISTS "Users can view missions" ON brain_galaxy_missions;

CREATE POLICY "Hardened missions access v6"
ON brain_galaxy_missions FOR SELECT
USING (
  public.is_superadmin()
  OR creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_missions.id
    AND mp.user_id = auth.uid()
  )
  OR (visibility = 'public' AND auth.uid() IS NOT NULL)
);

-- 2. notification_sounds - Restrict to authenticated users only
DROP POLICY IF EXISTS "notification_sounds_select_policy" ON notification_sounds;
DROP POLICY IF EXISTS "Anyone can view notification sounds" ON notification_sounds;

CREATE POLICY "Hardened notification sounds access v6"
ON notification_sounds FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. companies - Restrict to same company or superadmin
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;
DROP POLICY IF EXISTS "Anyone can view companies" ON companies;

CREATE POLICY "Hardened companies access v6"
ON companies FOR SELECT
USING (
  public.is_superadmin()
  OR id = public.get_user_company_id(auth.uid())
);

-- 4. brain_galaxy_areas - Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view brain galaxy areas" ON brain_galaxy_areas;
DROP POLICY IF EXISTS "Users can view all areas" ON brain_galaxy_areas;

CREATE POLICY "Hardened brain galaxy areas access v6"
ON brain_galaxy_areas FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. mision_iwie_levels - Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view levels" ON mision_iwie_levels;
DROP POLICY IF EXISTS "Users can view all levels" ON mision_iwie_levels;

CREATE POLICY "Hardened mision iwie levels access v6"
ON mision_iwie_levels FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 6. mision_iwie_badges - Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view badges" ON mision_iwie_badges;
DROP POLICY IF EXISTS "Users can view all badges" ON mision_iwie_badges;

CREATE POLICY "Hardened mision iwie badges access v6"
ON mision_iwie_badges FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 7. ceo_availability - Restrict to authenticated users who need to schedule
DROP POLICY IF EXISTS "Users can view all availability" ON ceo_availability;

CREATE POLICY "Hardened ceo availability access v6"
ON ceo_availability FOR SELECT
USING (
  public.is_superadmin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND (up.dashboard_visibility->>'ver_reuniones')::boolean = true
  )
);