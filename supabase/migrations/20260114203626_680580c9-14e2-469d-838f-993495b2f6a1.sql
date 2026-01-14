-- Table for user creation requests that need CEO approval
CREATE TABLE public.user_creation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID NOT NULL,
    company_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    proposed_role TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id),
    gerencia_id UUID REFERENCES public.gerencias(id),
    area_id UUID REFERENCES public.areas(id),
    position_id UUID REFERENCES public.positions(id),
    justification TEXT,
    -- Access permissions requested
    access_permissions JSONB DEFAULT '{
        "ver_perfiles": false,
        "ver_empresas": false,
        "ver_reportes": false,
        "ver_documentos": true,
        "ver_chatbot": true,
        "ver_logs": false,
        "editar_usuarios": false,
        "gestionar_roles": false
    }'::jsonb,
    -- Status of the request
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobada', 'rechazada')),
    -- CEO response
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_creation_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view requests from their company
CREATE POLICY "Users can view company requests"
ON public.user_creation_requests
FOR SELECT
TO authenticated
USING (
    company_id IN (
        SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'superadmin')
    OR public.has_role(auth.uid(), 'admin')
);

-- Policy: Managers can create requests for their company
CREATE POLICY "Managers can create requests"
ON public.user_creation_requests
FOR INSERT
TO authenticated
WITH CHECK (
    requested_by = auth.uid()
    AND (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('gerente_area', 'lider_area', 'jefe_area')
            AND company_id = user_creation_requests.company_id
        )
        OR public.has_role(auth.uid(), 'superadmin')
        OR public.has_role(auth.uid(), 'admin')
    )
);

-- Policy: CEO/Superadmin can update requests (approve/reject)
CREATE POLICY "CEO can update requests"
ON public.user_creation_requests
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'superadmin')
    OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    public.has_role(auth.uid(), 'superadmin')
    OR public.has_role(auth.uid(), 'admin')
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_creation_requests;

-- Create index for faster queries
CREATE INDEX idx_user_creation_requests_company ON public.user_creation_requests(company_id);
CREATE INDEX idx_user_creation_requests_status ON public.user_creation_requests(status);