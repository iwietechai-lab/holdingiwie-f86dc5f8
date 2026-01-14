-- Table for CEO chatbot sessions (grouped conversations)
CREATE TABLE public.ceo_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT DEFAULT 'Nueva conversación',
    company_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ceo_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.ceo_chat_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own sessions
CREATE POLICY "Users can create own sessions"
ON public.ceo_chat_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON public.ceo_chat_sessions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add session_id to chat_messages for grouping
ALTER TABLE public.chat_messages 
ADD COLUMN session_id UUID REFERENCES public.ceo_chat_sessions(id) ON DELETE CASCADE;

-- Table for company knowledge contributions
CREATE TABLE public.company_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL,
    contributor_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    document_name TEXT,
    document_type TEXT,
    document_url TEXT,
    -- Analysis status
    is_analyzed BOOLEAN DEFAULT false,
    analysis_summary TEXT,
    key_points JSONB,
    analyzed_at TIMESTAMPTZ,
    -- Approval for CEO knowledge
    is_approved_for_ceo BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_knowledge ENABLE ROW LEVEL SECURITY;

-- Users can view knowledge from their company
CREATE POLICY "Users can view company knowledge"
ON public.company_knowledge
FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'superadmin')
    OR public.has_role(auth.uid(), 'admin')
);

-- Users can contribute knowledge to their company
CREATE POLICY "Users can contribute knowledge"
ON public.company_knowledge
FOR INSERT
TO authenticated
WITH CHECK (
    contributor_id = auth.uid()
    AND company_id IN (
        SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
);

-- Users can update their own contributions
CREATE POLICY "Users can update own contributions"
ON public.company_knowledge
FOR UPDATE
TO authenticated
USING (contributor_id = auth.uid());

-- Superadmin can update any knowledge (for approval)
CREATE POLICY "Superadmin can update knowledge"
ON public.company_knowledge
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'superadmin')
    OR public.has_role(auth.uid(), 'admin')
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ceo_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_knowledge;

-- Indexes
CREATE INDEX idx_ceo_chat_sessions_user ON public.ceo_chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_company_knowledge_company ON public.company_knowledge(company_id);
CREATE INDEX idx_company_knowledge_status ON public.company_knowledge(is_analyzed, is_approved_for_ceo);