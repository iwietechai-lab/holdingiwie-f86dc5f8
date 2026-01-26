-- Create ceo_feedback table for bidirectional communication
CREATE TABLE public.ceo_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.ceo_team_submissions(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    feedback_type TEXT DEFAULT 'comment' CHECK (feedback_type IN ('comment', 'suggestion', 'request_changes', 'approved')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ceo_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for ceo_feedback
CREATE POLICY "CEO can send feedback" 
ON public.ceo_feedback 
FOR INSERT 
WITH CHECK (public.is_superadmin());

CREATE POLICY "CEO can view all feedback" 
ON public.ceo_feedback 
FOR SELECT 
USING (public.is_superadmin());

CREATE POLICY "Users can view feedback sent to them" 
ON public.ceo_feedback 
FOR SELECT 
USING (auth.uid() = to_user_id);

CREATE POLICY "Users can update their own feedback read status" 
ON public.ceo_feedback 
FOR UPDATE 
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);

-- Trigger function to notify user of CEO feedback
CREATE OR REPLACE FUNCTION public.notify_user_of_ceo_feedback()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        action_url
    ) VALUES (
        NEW.to_user_id,
        'ceo_feedback',
        'Retroalimentación del CEO',
        LEFT(NEW.message, 200),
        '/ceo-chat'
    );
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_ceo_feedback_notification
AFTER INSERT ON public.ceo_feedback
FOR EACH ROW
EXECUTE FUNCTION public.notify_user_of_ceo_feedback();

-- Add source_type column to ceo_team_submissions to track where submissions come from
ALTER TABLE public.ceo_team_submissions 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'direct' CHECK (source_type IN ('direct', 'document_manager', 'mission'));

-- Add source_reference_id to track original document/mission
ALTER TABLE public.ceo_team_submissions 
ADD COLUMN IF NOT EXISTS source_reference_id UUID;

-- Add company_id to track which company the submission belongs to
ALTER TABLE public.ceo_team_submissions 
ADD COLUMN IF NOT EXISTS company_id TEXT;