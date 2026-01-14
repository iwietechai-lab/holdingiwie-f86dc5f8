-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view chats they participate in" ON public.chats;
DROP POLICY IF EXISTS "Users can view participants of their chats" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can view summaries of their chats" ON public.chat_summaries;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can create summaries for their chats" ON public.chat_summaries;

-- Create security definer function to check chat participation
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE chat_id = p_chat_id
      AND user_id = p_user_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view chats they participate in"
ON public.chats FOR SELECT
USING (
  public.is_superadmin() OR
  public.is_chat_participant(id, auth.uid())
);

CREATE POLICY "Users can view participants of their chats"
ON public.chat_participants FOR SELECT
USING (
  public.is_superadmin() OR
  public.is_chat_participant(chat_id, auth.uid())
);

CREATE POLICY "Users can view messages in their chats"
ON public.messages FOR SELECT
USING (
  public.is_superadmin() OR
  public.is_chat_participant(chat_id, auth.uid())
);

CREATE POLICY "Users can send messages to their chats"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  (
    public.is_superadmin() OR
    public.is_chat_participant(chat_id, auth.uid())
  )
);

CREATE POLICY "Users can view summaries of their chats"
ON public.chat_summaries FOR SELECT
USING (
  public.is_superadmin() OR
  public.is_chat_participant(chat_id, auth.uid())
);

CREATE POLICY "Users can create summaries for their chats"
ON public.chat_summaries FOR INSERT
WITH CHECK (
  generated_by = auth.uid() AND
  (
    public.is_superadmin() OR
    public.is_chat_participant(chat_id, auth.uid())
  )
);