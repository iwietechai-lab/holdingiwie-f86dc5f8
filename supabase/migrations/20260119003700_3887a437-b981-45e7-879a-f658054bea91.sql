
-- ================================================
-- CEO CHAT SYSTEM - Complete Database Schema
-- ================================================

-- 1. CEO PROJECTS - Para organizar conocimiento por proyecto
CREATE TABLE public.ceo_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    company_id TEXT REFERENCES public.companies(id),
    status TEXT DEFAULT 'activo' CHECK (status IN ('activo', 'pausado', 'completado', 'archivado')),
    color TEXT DEFAULT '#8B5CF6',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ceo_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage projects"
ON public.ceo_projects FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

CREATE POLICY "Users can view active projects"
ON public.ceo_projects FOR SELECT
USING (status = 'activo');

-- 2. CEO THOUGHTS - Pensamientos, ideas del CEO
CREATE TABLE public.ceo_thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.ceo_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    thought_type TEXT DEFAULT 'idea' CHECK (thought_type IN ('idea', 'pensamiento', 'estrategia', 'directriz', 'reflexion', 'decision')),
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    ai_summary TEXT,
    ai_key_points JSONB,
    tags JSONB DEFAULT '[]',
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
    created_by UUID DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ceo_thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage thoughts"
ON public.ceo_thoughts FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- 3. CEO INTERNAL CHAT - Chat interno del CEO para trabajar ideas
CREATE TABLE public.ceo_internal_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.ceo_projects(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'debate', 'estrategia', 'conclusion')),
    metadata JSONB,
    created_by UUID DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ceo_internal_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage internal chat"
ON public.ceo_internal_chat FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- 4. CEO INTERNAL REPORTS - Informes generados de conversaciones internas
CREATE TABLE public.ceo_internal_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.ceo_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_decisions JSONB,
    action_items JSONB,
    conclusions TEXT,
    chat_messages_ids JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ceo_internal_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage reports"
ON public.ceo_internal_reports FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- 5. TEAM SUBMISSIONS - Archivos/consultas del equipo para análisis del CEO
CREATE TABLE public.ceo_team_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.ceo_projects(id) ON DELETE SET NULL,
    submitted_by UUID NOT NULL,
    submission_type TEXT DEFAULT 'documento' CHECK (submission_type IN ('documento', 'consulta', 'informe', 'propuesta', 'otro')),
    title TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_revision', 'revisado', 'archivado')),
    ai_analysis TEXT,
    ai_feedback TEXT,
    ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
    ai_improvement_suggestions JSONB,
    ceo_notes TEXT,
    ceo_reviewed_at TIMESTAMPTZ,
    notify_ceo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ceo_team_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit and view own submissions"
ON public.ceo_team_submissions FOR ALL
USING (auth.uid() = submitted_by OR is_superadmin())
WITH CHECK (auth.uid() = submitted_by OR is_superadmin());

CREATE POLICY "Superadmins can view all submissions"
ON public.ceo_team_submissions FOR SELECT
USING (is_superadmin());

-- 6. CEO PENDING REVIEWS - Pendientes del CEO cuando ingresa
CREATE TABLE public.ceo_pending_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_type TEXT NOT NULL CHECK (review_type IN ('submission', 'internal_chat', 'thought', 'other')),
    reference_id UUID NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta', 'urgente')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_actioned BOOLEAN DEFAULT false,
    actioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ceo_pending_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage pending reviews"
ON public.ceo_pending_reviews FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- Add project_id to ceo_knowledge for better organization
ALTER TABLE public.ceo_knowledge 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.ceo_projects(id) ON DELETE SET NULL;

-- Create storage bucket for team submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ceo-team-submissions', 'ceo-team-submissions', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for team submissions
CREATE POLICY "Users can upload submissions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ceo-team-submissions' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own submissions"
ON storage.objects FOR SELECT
USING (bucket_id = 'ceo-team-submissions' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_superadmin()
));

CREATE POLICY "Superadmins can manage all submissions"
ON storage.objects FOR ALL
USING (bucket_id = 'ceo-team-submissions' AND is_superadmin())
WITH CHECK (bucket_id = 'ceo-team-submissions' AND is_superadmin());

-- Function to create pending review when team submits
CREATE OR REPLACE FUNCTION public.create_ceo_pending_review()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.ceo_pending_reviews (
        review_type,
        reference_id,
        title,
        summary,
        priority
    ) VALUES (
        'submission',
        NEW.id,
        NEW.title,
        COALESCE(LEFT(NEW.content, 200), 'Nuevo archivo para revisión'),
        'media'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_pending_review
AFTER INSERT ON public.ceo_team_submissions
FOR EACH ROW
WHEN (NEW.notify_ceo = true)
EXECUTE FUNCTION public.create_ceo_pending_review();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ceo_team_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ceo_pending_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ceo_internal_chat;
