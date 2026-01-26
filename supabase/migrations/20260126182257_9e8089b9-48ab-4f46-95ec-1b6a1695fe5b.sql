-- =======================================================
-- SECURITY FIX PART 5B: Remaining policies (corrected)
-- =======================================================

-- 1. chat_messages - chatbot messages, restrict to own messages
DROP POLICY IF EXISTS "Users can view their messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.chat_messages;

CREATE POLICY "Users can view own chatbot messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR user_id = auth.uid()
);

-- 2. notification_sounds - add write protection for superadmin only
DROP POLICY IF EXISTS "notification_sounds_insert_policy" ON public.notification_sounds;
DROP POLICY IF EXISTS "notification_sounds_update_policy" ON public.notification_sounds;
DROP POLICY IF EXISTS "notification_sounds_delete_policy" ON public.notification_sounds;

CREATE POLICY "Only superadmin can manage sounds"
ON public.notification_sounds FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- 3. departments - restrict to same company
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

CREATE POLICY "Users can view same company departments"
ON public.departments FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR company_id = public.get_user_company_id(auth.uid())
);