-- Add category and soft delete fields to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS deleted_by UUID;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Add multi-scope participants fields
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS participant_scope TEXT DEFAULT 'single'; -- single, multi_user, multi_company
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;

-- Add responsible/requester info to user_creation_requests
ALTER TABLE public.user_creation_requests ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.user_creation_requests ADD COLUMN IF NOT EXISTS responsible_email TEXT;

-- Add scope/visibility fields to documentos
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS visibility_scope TEXT DEFAULT 'company'; -- company, multi_company, multi_area, multi_user
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS shared_companies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS shared_areas JSONB DEFAULT '[]'::jsonb;

-- Create ticket categories enum values (will use TEXT field for flexibility)
COMMENT ON COLUMN public.tickets.category IS 'comercial, operaciones, mantenimiento, reparacion, administrativo, corporativo, fondos, finanzas, contable, legal, rrhh';

-- Create index on is_deleted for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tickets_is_deleted ON public.tickets(is_deleted);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category);