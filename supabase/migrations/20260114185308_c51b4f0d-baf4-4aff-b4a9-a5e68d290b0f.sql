-- Create table for CEO knowledge entries with company access control
CREATE TABLE IF NOT EXISTS public.ceo_knowledge (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('estrategia', 'proyeccion', 'directriz', 'idea', 'informacion', 'proyecto')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_confidential BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for controlling which users can access which company's knowledge
CREATE TABLE IF NOT EXISTS public.ceo_knowledge_access (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.ceo_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceo_knowledge_access ENABLE ROW LEVEL SECURITY;

-- Policies for ceo_knowledge: superadmins can do anything
CREATE POLICY "Superadmins can manage all knowledge"
ON public.ceo_knowledge FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Users can read knowledge they have access to
CREATE POLICY "Users can read authorized knowledge"
ON public.ceo_knowledge FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'superadmin') OR
    EXISTS (
        SELECT 1 FROM public.ceo_knowledge_access 
        WHERE ceo_knowledge_access.user_id = auth.uid() 
        AND ceo_knowledge_access.company_id = ceo_knowledge.company_id
    ) OR
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.company_id = ceo_knowledge.company_id
    )
);

-- Policies for ceo_knowledge_access: only superadmins can manage
CREATE POLICY "Superadmins can manage access"
ON public.ceo_knowledge_access FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Users can see their own access grants
CREATE POLICY "Users can see their own access"
ON public.ceo_knowledge_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ceo_knowledge_company ON public.ceo_knowledge(company_id);
CREATE INDEX IF NOT EXISTS idx_ceo_knowledge_access_user ON public.ceo_knowledge_access(user_id);
CREATE INDEX IF NOT EXISTS idx_ceo_knowledge_access_company ON public.ceo_knowledge_access(company_id);