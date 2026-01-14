
-- Fix the permissive INSERT policy on notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a more restrictive INSERT policy
CREATE POLICY "Users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL OR
        is_superadmin()
    );
