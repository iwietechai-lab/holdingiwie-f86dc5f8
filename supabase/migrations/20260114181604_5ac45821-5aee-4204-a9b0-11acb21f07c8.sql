-- Create chat type enum
CREATE TYPE public.chat_type AS ENUM ('one_to_one', 'group_company', 'group_multi_company', 'global');

-- Create chats table (company_id as TEXT to match companies.id)
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.chat_type NOT NULL,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  CONSTRAINT chats_company_required CHECK (
    (type = 'group_company' AND company_id IS NOT NULL) OR
    (type != 'group_company')
  )
);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (chat_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_summaries table
CREATE TABLE public.chat_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  summary TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on all tables
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_summaries ENABLE ROW LEVEL SECURITY;

-- RLS for chats: users see chats they participate in, superadmin sees all
CREATE POLICY "Users can view chats they participate in"
ON public.chats FOR SELECT
USING (
  public.is_superadmin() OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chats"
ON public.chats FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    type IN ('one_to_one', 'group_multi_company') OR
    (type = 'global' AND public.is_superadmin()) OR
    (type = 'group_company' AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.company_id = chats.company_id
    ))
  )
);

CREATE POLICY "Creators and superadmin can update chats"
ON public.chats FOR UPDATE
USING (public.is_superadmin() OR created_by = auth.uid());

CREATE POLICY "Creators and superadmin can delete chats"
ON public.chats FOR DELETE
USING (public.is_superadmin() OR created_by = auth.uid());

-- RLS for chat_participants
CREATE POLICY "Users can view participants of their chats"
ON public.chat_participants FOR SELECT
USING (
  public.is_superadmin() OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp2
    WHERE cp2.chat_id = chat_participants.chat_id AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Chat creators and superadmin can add participants"
ON public.chat_participants FOR INSERT
WITH CHECK (
  public.is_superadmin() OR
  EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_participants.chat_id AND c.created_by = auth.uid()
  ) OR
  chat_participants.user_id = auth.uid()
);

CREATE POLICY "Chat creators and superadmin can remove participants"
ON public.chat_participants FOR DELETE
USING (
  public.is_superadmin() OR
  EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_participants.chat_id AND c.created_by = auth.uid()
  ) OR
  chat_participants.user_id = auth.uid()
);

-- RLS for messages
CREATE POLICY "Users can view messages in their chats"
ON public.messages FOR SELECT
USING (
  public.is_superadmin() OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their chats"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  (
    public.is_superadmin() OR
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
USING (
  public.is_superadmin() OR sender_id = auth.uid()
);

-- RLS for chat_summaries
CREATE POLICY "Users can view summaries of their chats"
ON public.chat_summaries FOR SELECT
USING (
  public.is_superadmin() OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = chat_summaries.chat_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create summaries for their chats"
ON public.chat_summaries FOR INSERT
WITH CHECK (
  generated_by = auth.uid() AND
  (
    public.is_superadmin() OR
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_summaries.chat_id AND cp.user_id = auth.uid()
    )
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;

-- Create indexes for performance
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_sent_at ON public.messages(sent_at DESC);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_chats_last_message_at ON public.chats(last_message_at DESC);

-- Function to update last_message_at on chats
CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET last_message_at = NEW.sent_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_chat_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_last_message();