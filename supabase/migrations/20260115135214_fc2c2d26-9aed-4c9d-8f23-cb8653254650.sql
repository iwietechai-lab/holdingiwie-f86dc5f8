-- Create table for document access permissions
CREATE TABLE public.document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    granted_by UUID NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(document_id, user_id)
);

-- Create table for document access requests
CREATE TABLE public.document_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(document_id, requester_id)
);

-- Enable RLS on both tables
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_permissions
-- Users can view permissions for their own documents or where they have access
CREATE POLICY "Users can view their own document permissions"
ON public.document_permissions FOR SELECT
USING (
    user_id = auth.uid() OR 
    granted_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.documentos WHERE id = document_id AND user_id = auth.uid())
);

-- Document owners can insert permissions
CREATE POLICY "Document owners can grant permissions"
ON public.document_permissions FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM public.documentos WHERE id = document_id AND user_id = auth.uid())
);

-- Document owners can delete permissions
CREATE POLICY "Document owners can revoke permissions"
ON public.document_permissions FOR DELETE
USING (
    EXISTS (SELECT 1 FROM public.documentos WHERE id = document_id AND user_id = auth.uid())
);

-- RLS Policies for document_access_requests
-- Users can view requests they created or requests for their documents
CREATE POLICY "Users can view their own access requests"
ON public.document_access_requests FOR SELECT
USING (
    requester_id = auth.uid() OR 
    owner_id = auth.uid()
);

-- Users can create access requests
CREATE POLICY "Users can create access requests"
ON public.document_access_requests FOR INSERT
WITH CHECK (
    requester_id = auth.uid() AND
    NOT EXISTS (SELECT 1 FROM public.document_permissions WHERE document_id = document_access_requests.document_id AND user_id = auth.uid())
);

-- Document owners can update requests (approve/reject)
CREATE POLICY "Document owners can update requests"
ON public.document_access_requests FOR UPDATE
USING (owner_id = auth.uid());

-- Function to check if user has document access
CREATE OR REPLACE FUNCTION public.has_document_access(doc_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        -- User is the document owner
        SELECT 1 FROM public.documentos WHERE id = doc_id AND user_id = check_user_id
    ) OR EXISTS (
        -- User has explicit permission
        SELECT 1 FROM public.document_permissions WHERE document_id = doc_id AND user_id = check_user_id
    ) OR EXISTS (
        -- User is superadmin
        SELECT 1 FROM public.user_roles WHERE user_id = check_user_id AND role = 'superadmin'
    )
$$;

-- Add index for performance
CREATE INDEX idx_document_permissions_document_id ON public.document_permissions(document_id);
CREATE INDEX idx_document_permissions_user_id ON public.document_permissions(user_id);
CREATE INDEX idx_document_access_requests_document_id ON public.document_access_requests(document_id);
CREATE INDEX idx_document_access_requests_status ON public.document_access_requests(status);