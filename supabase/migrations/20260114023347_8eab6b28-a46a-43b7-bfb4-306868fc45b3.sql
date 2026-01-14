
-- ============================================
-- COMPLETE ORGANIZATIONAL STRUCTURE FOR IWIE
-- ============================================

-- 1. ENUM Types for priorities and statuses
DO $$ BEGIN
    CREATE TYPE approval_priority AS ENUM ('baja', 'media', 'alta', 'urgente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meeting_status AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. GERENCIAS Table (Management Departments)
CREATE TABLE IF NOT EXISTS public.gerencias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, name)
);

ALTER TABLE public.gerencias ENABLE ROW LEVEL SECURITY;

-- RLS for gerencias
CREATE POLICY "Authenticated users can view gerencias" ON public.gerencias
    FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage gerencias" ON public.gerencias
    FOR ALL USING (is_superadmin());

-- 3. SUB_GERENCIAS Table (Sub-management positions)
CREATE TABLE IF NOT EXISTS public.sub_gerencias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gerencia_id UUID REFERENCES public.gerencias(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(gerencia_id, name)
);

ALTER TABLE public.sub_gerencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sub_gerencias" ON public.sub_gerencias
    FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage sub_gerencias" ON public.sub_gerencias
    FOR ALL USING (is_superadmin());

-- 4. AREAS Table (Work areas within gerencias)
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gerencia_id UUID REFERENCES public.gerencias(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(gerencia_id, name)
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view areas" ON public.areas
    FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage areas" ON public.areas
    FOR ALL USING (is_superadmin());

-- 5. POSITIONS Table (Operational roles/positions)
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    gerencia_id UUID REFERENCES public.gerencias(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    level TEXT DEFAULT 'operacional', -- gerencial, sub_gerencial, operacional
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view positions" ON public.positions
    FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage positions" ON public.positions
    FOR ALL USING (is_superadmin());

-- 6. Update USER_PROFILES to include organizational structure
ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS gerencia_id UUID REFERENCES public.gerencias(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sub_gerencia_id UUID REFERENCES public.sub_gerencias(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS can_upload_documents BOOLEAN DEFAULT false;

-- 7. NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info', -- document, meeting, ticket, approval, info
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority approval_priority DEFAULT 'media',
    is_read BOOLEAN DEFAULT false,
    document_id UUID,
    meeting_id UUID,
    ticket_id UUID,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id OR is_superadmin());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- 8. DOCUMENT_SHARES Table (for shared_with functionality)
CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    shared_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(document_id, user_id)
);

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares they're part of" ON public.document_shares
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = shared_by OR 
        is_superadmin()
    );

CREATE POLICY "Users can insert shares for docs they own" ON public.document_shares
    FOR INSERT WITH CHECK (auth.uid() = shared_by OR is_superadmin());

CREATE POLICY "Sharers can delete their shares" ON public.document_shares
    FOR DELETE USING (auth.uid() = shared_by OR is_superadmin());

-- 9. DOCUMENT_APPROVALS Table
CREATE TABLE IF NOT EXISTS public.document_approvals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    approver_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    status approval_status DEFAULT 'pending',
    priority approval_priority DEFAULT 'media',
    comments TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(document_id, approver_id)
);

ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approvals they're part of" ON public.document_approvals
    FOR SELECT USING (
        auth.uid() = approver_id OR 
        auth.uid() = requested_by OR 
        is_superadmin()
    );

CREATE POLICY "Users can request approvals" ON public.document_approvals
    FOR INSERT WITH CHECK (auth.uid() = requested_by OR is_superadmin());

CREATE POLICY "Approvers can update approval status" ON public.document_approvals
    FOR UPDATE USING (auth.uid() = approver_id OR is_superadmin());

-- 10. CHATBOTS Table
CREATE TABLE IF NOT EXISTS public.chatbots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    knowledge_base JSONB DEFAULT '[]'::jsonb,
    system_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id)
);

ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chatbot for their company" ON public.chatbots
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
        OR is_superadmin()
    );

CREATE POLICY "Superadmins can manage chatbots" ON public.chatbots
    FOR ALL USING (is_superadmin());

-- 11. CHAT_MESSAGES Table (for chatbot conversations)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_id UUID REFERENCES public.chatbots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- user, assistant
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages" ON public.chat_messages
    FOR SELECT USING (auth.uid() = user_id OR is_superadmin());

CREATE POLICY "Users can insert own messages" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chatbot_user ON public.chat_messages(chatbot_id, user_id);

-- 12. MEETINGS Table
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    meeting_url TEXT,
    status meeting_status DEFAULT 'scheduled',
    attendees JSONB DEFAULT '[]'::jsonb, -- array of user_ids
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meetings they attend" ON public.meetings
    FOR SELECT USING (
        auth.uid() = created_by OR
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(attendees)) OR
        is_superadmin()
    );

CREATE POLICY "Users can create meetings" ON public.meetings
    FOR INSERT WITH CHECK (auth.uid() = created_by OR is_superadmin());

CREATE POLICY "Creators can update meetings" ON public.meetings
    FOR UPDATE USING (auth.uid() = created_by OR is_superadmin());

CREATE POLICY "Creators can delete meetings" ON public.meetings
    FOR DELETE USING (auth.uid() = created_by OR is_superadmin());

CREATE INDEX IF NOT EXISTS idx_meetings_company ON public.meetings(company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON public.meetings(created_by);

-- 13. TICKETS Table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    assigned_to UUID,
    title TEXT NOT NULL,
    description TEXT,
    priority approval_priority DEFAULT 'media',
    status ticket_status DEFAULT 'open',
    points INTEGER DEFAULT 0,
    due_date TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company tickets" ON public.tickets
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
        OR is_superadmin()
    );

CREATE POLICY "Users can create tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = created_by OR is_superadmin());

CREATE POLICY "Assigned users can update tickets" ON public.tickets
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() = assigned_to OR 
        is_superadmin()
    );

CREATE INDEX IF NOT EXISTS idx_tickets_company ON public.tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

-- 14. TICKET_COMMENTS Table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket comments" ON public.ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = ticket_id
            AND (
                t.company_id = (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
                OR is_superadmin()
            )
        )
    );

CREATE POLICY "Users can add comments" ON public.ticket_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 15. Create function to insert default organizational structure for a company
CREATE OR REPLACE FUNCTION public.seed_company_org_structure(p_company_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_gerencia_id UUID;
    v_area_id UUID;
BEGIN
    -- Skip if structure already exists
    IF EXISTS (SELECT 1 FROM gerencias WHERE company_id = p_company_id) THEN
        RETURN;
    END IF;

    -- 1. Gerencia General
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia General', 1) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director Ejecutivo'),
        (v_gerencia_id, 'Asistente de Gerencia General');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Dirección Estratégica'),
        (v_gerencia_id, 'Gabinete de Presidencia');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Asistente Ejecutivo', 'operacional'),
        (v_gerencia_id, 'Coordinador de Agenda', 'operacional'),
        (v_gerencia_id, 'Analista Estratégico', 'operacional');

    -- 2. Gerencia de Finanzas y Administración
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Finanzas y Administración', 2) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director Financiero'),
        (v_gerencia_id, 'Subgerente de Contabilidad'),
        (v_gerencia_id, 'Subgerente de Administración');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Contabilidad General'),
        (v_gerencia_id, 'Tesorería'),
        (v_gerencia_id, 'Presupuestos y Control de Gestión'),
        (v_gerencia_id, 'Administración y Compras');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Contador Senior', 'operacional'),
        (v_gerencia_id, 'Analista Financiero', 'operacional'),
        (v_gerencia_id, 'Cajero/Tesorero', 'operacional'),
        (v_gerencia_id, 'Ejecutiva de Compras', 'operacional'),
        (v_gerencia_id, 'Administrativo de Oficina', 'operacional');

    -- 3. Gerencia de Recursos Humanos
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Recursos Humanos', 3) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Talento Humano'),
        (v_gerencia_id, 'Subgerente de Capacitación y Desarrollo'),
        (v_gerencia_id, 'Subgerente de Remuneraciones');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Selección y Reclutamiento'),
        (v_gerencia_id, 'Capacitación y Desarrollo'),
        (v_gerencia_id, 'Remuneraciones y Beneficios'),
        (v_gerencia_id, 'Relaciones Laborales');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Analista de Reclutamiento', 'operacional'),
        (v_gerencia_id, 'Encargado de Capacitación', 'operacional'),
        (v_gerencia_id, 'Analista de Sueldos', 'operacional'),
        (v_gerencia_id, 'Asistente de RRHH', 'operacional');

    -- 4. Gerencia de Operaciones
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Operaciones', 4) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Operaciones'),
        (v_gerencia_id, 'Subgerente de Mantenimiento'),
        (v_gerencia_id, 'Subgerente de Logística Interna');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Producción y Manufactura'),
        (v_gerencia_id, 'Mantenimiento Industrial'),
        (v_gerencia_id, 'Logística Interna'),
        (v_gerencia_id, 'Seguridad y Salud Ocupacional');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Supervisor de Producción', 'operacional'),
        (v_gerencia_id, 'Técnico de Mantenimiento', 'operacional'),
        (v_gerencia_id, 'Operador de Planta', 'operacional'),
        (v_gerencia_id, 'Inspector de Seguridad', 'operacional');

    -- 5. Gerencia de Producción
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Producción', 5) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Producción'),
        (v_gerencia_id, 'Subgerente de Planta'),
        (v_gerencia_id, 'Subgerente de Control de Calidad');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Línea de Producción'),
        (v_gerencia_id, 'Planificación y Programación'),
        (v_gerencia_id, 'Control de Calidad'),
        (v_gerencia_id, 'Ingeniería de Procesos');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Jefe de Línea', 'operacional'),
        (v_gerencia_id, 'Operario de Producción', 'operacional'),
        (v_gerencia_id, 'Inspector de Calidad', 'operacional'),
        (v_gerencia_id, 'Técnico de Procesos', 'operacional');

    -- 6. Gerencia Comercial y Ventas
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia Comercial y Ventas', 6) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director Comercial'),
        (v_gerencia_id, 'Subgerente de Ventas Nacionales'),
        (v_gerencia_id, 'Subgerente de Exportaciones');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Ventas Nacionales'),
        (v_gerencia_id, 'Ventas Internacionales'),
        (v_gerencia_id, 'Atención al Cliente'),
        (v_gerencia_id, 'Marketing Operativo');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Ejecutivo de Ventas', 'operacional'),
        (v_gerencia_id, 'Ejecutivo de Cuentas', 'operacional'),
        (v_gerencia_id, 'Asistente Comercial', 'operacional'),
        (v_gerencia_id, 'Analista de Mercado', 'operacional');

    -- 7. Gerencia de Marketing
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Marketing', 7) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Marketing'),
        (v_gerencia_id, 'Subgerente de Marca'),
        (v_gerencia_id, 'Subgerente de Marketing Digital');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Estrategia de Marca'),
        (v_gerencia_id, 'Marketing Digital'),
        (v_gerencia_id, 'Publicidad y Medios'),
        (v_gerencia_id, 'Publicidad y Relaciones Públicas');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Community Manager', 'operacional'),
        (v_gerencia_id, 'Diseñador Gráfico', 'operacional'),
        (v_gerencia_id, 'Analista SEO/SEM', 'operacional'),
        (v_gerencia_id, 'Especialista en Contenidos', 'operacional');

    -- 8. Gerencia de Tecnología e Innovación
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Tecnología e Innovación', 8) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de TI'),
        (v_gerencia_id, 'Subgerente de Infraestructura'),
        (v_gerencia_id, 'Subgerente de Desarrollo');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Infraestructura y Soporte'),
        (v_gerencia_id, 'Desarrollo de Software'),
        (v_gerencia_id, 'Ciberseguridad'),
        (v_gerencia_id, 'Innovación Tecnológica');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Administrador de Sistemas', 'operacional'),
        (v_gerencia_id, 'Desarrollador Full Stack', 'operacional'),
        (v_gerencia_id, 'Analista de Ciberseguridad', 'operacional');

    -- 9. Gerencia de Innovación, Desarrollo e Investigación
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Innovación, Desarrollo e Investigación', 9) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de I+D'),
        (v_gerencia_id, 'Subgerente de Investigación Aplicada'),
        (v_gerencia_id, 'Subgerente de Proyectos Innovadores');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Investigación Básica'),
        (v_gerencia_id, 'Desarrollo de Productos'),
        (v_gerencia_id, 'Laboratorio de Pruebas'),
        (v_gerencia_id, 'Patentes e Intelectual');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Investigador Senior', 'operacional'),
        (v_gerencia_id, 'Ingeniero de Desarrollo', 'operacional'),
        (v_gerencia_id, 'Técnico de Laboratorio', 'operacional');

    -- 10. Gerencia Aeroespacial
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia Aeroespacial', 10) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director Aeroespacial'),
        (v_gerencia_id, 'Subgerente de Ingeniería Aeronáutica'),
        (v_gerencia_id, 'Subgerente de Proyectos Espaciales');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Ingeniería Aeronáutica'),
        (v_gerencia_id, 'Sistemas Espaciales'),
        (v_gerencia_id, 'Pruebas de Vuelo'),
        (v_gerencia_id, 'Certificación Aeronáutica');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Ingeniero Aeronáutico', 'operacional'),
        (v_gerencia_id, 'Técnico de Ensamblaje', 'operacional'),
        (v_gerencia_id, 'Analista de Simulación', 'operacional');

    -- 11. Gerencia de Transformación Digital
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Transformación Digital', 11) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Transformación Digital'),
        (v_gerencia_id, 'Subgerente de Datos y Analítica');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Inteligencia Artificial'),
        (v_gerencia_id, 'Big Data y Analítica'),
        (v_gerencia_id, 'Automatización de Procesos'),
        (v_gerencia_id, 'Ciberseguridad Digital');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Data Scientist', 'operacional'),
        (v_gerencia_id, 'Especialista en IA', 'operacional'),
        (v_gerencia_id, 'Analista de Datos', 'operacional');

    -- 12. Gerencia de Calidad y Cumplimiento
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Calidad y Cumplimiento', 12) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Calidad'),
        (v_gerencia_id, 'Subgerente de Cumplimiento Normativo');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Gestión de Calidad'),
        (v_gerencia_id, 'Certificaciones ISO'),
        (v_gerencia_id, 'Auditoría Interna'),
        (v_gerencia_id, 'Cumplimiento Legal');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Auditor Interno', 'operacional'),
        (v_gerencia_id, 'Inspector de Calidad', 'operacional'),
        (v_gerencia_id, 'Analista de Cumplimiento', 'operacional');

    -- 13. Gerencia de Logística y Cadena de Suministro
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Logística y Cadena de Suministro', 13) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Supply Chain'),
        (v_gerencia_id, 'Subgerente de Importaciones/Exportaciones');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Abastecimiento'),
        (v_gerencia_id, 'Transporte y Distribución'),
        (v_gerencia_id, 'Gestión de Inventarios');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Coordinador de Logística', 'operacional'),
        (v_gerencia_id, 'Analista de Inventarios', 'operacional'),
        (v_gerencia_id, 'Chofer/Operador', 'operacional');

    -- 14. Gerencia de Proyectos
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Proyectos', 14) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de PMO'),
        (v_gerencia_id, 'Subgerente de Proyectos Estratégicos');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Oficina de Proyectos'),
        (v_gerencia_id, 'Gestión de Proyectos Ágiles'),
        (v_gerencia_id, 'Control de Avance');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Project Manager', 'operacional'),
        (v_gerencia_id, 'Analista de Proyectos', 'operacional'),
        (v_gerencia_id, 'Coordinador de Equipo', 'operacional');

    -- 15. Gerencia Legal y Asuntos Corporativos
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia Legal y Asuntos Corporativos', 15) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director Legal'),
        (v_gerencia_id, 'Subgerente de Contratos');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Asesoría Legal'),
        (v_gerencia_id, 'Contratos y Negociaciones'),
        (v_gerencia_id, 'Propiedad Intelectual');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Abogado Corporativo', 'operacional'),
        (v_gerencia_id, 'Paralegal', 'operacional'),
        (v_gerencia_id, 'Analista de Contratos', 'operacional');

    -- 16. Gerencia de Sostenibilidad y Responsabilidad Social
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Sostenibilidad y Responsabilidad Social', 16) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Sostenibilidad'),
        (v_gerencia_id, 'Subgerente de Medio Ambiente');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Gestión Ambiental'),
        (v_gerencia_id, 'Responsabilidad Social Empresarial'),
        (v_gerencia_id, 'Economía Circular');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Especialista en Sostenibilidad', 'operacional'),
        (v_gerencia_id, 'Coordinador de RSE', 'operacional');

    -- 17. Gerencia de Riesgos y Seguridad
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Riesgos y Seguridad', 17) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Riesgos'),
        (v_gerencia_id, 'Subgerente de Seguridad Física');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Gestión de Riesgos'),
        (v_gerencia_id, 'Seguridad Física'),
        (v_gerencia_id, 'Continuidad Operativa');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Analista de Riesgos', 'operacional'),
        (v_gerencia_id, 'Vigilante', 'operacional'),
        (v_gerencia_id, 'Inspector de Seguridad', 'operacional');

    -- 18. Gerencia de Estrategia y Desarrollo Corporativo
    INSERT INTO gerencias (company_id, name, order_index) 
    VALUES (p_company_id, 'Gerencia de Estrategia y Desarrollo Corporativo', 18) RETURNING id INTO v_gerencia_id;
    
    INSERT INTO sub_gerencias (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Director de Estrategia'),
        (v_gerencia_id, 'Subgerente de Fusiones y Adquisiciones');
    
    INSERT INTO areas (gerencia_id, name) VALUES 
        (v_gerencia_id, 'Planificación Estratégica'),
        (v_gerencia_id, 'Desarrollo de Nuevos Negocios'),
        (v_gerencia_id, 'Fusiones y Adquisiciones');
    
    INSERT INTO positions (gerencia_id, name, level) VALUES 
        (v_gerencia_id, 'Analista Estratégico', 'operacional'),
        (v_gerencia_id, 'Consultor Interno', 'operacional');

END;
$$;

-- 16. Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_company_id TEXT,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_priority approval_priority DEFAULT 'media',
    p_document_id UUID DEFAULT NULL,
    p_meeting_id UUID DEFAULT NULL,
    p_ticket_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, company_id, type, title, message, priority,
        document_id, meeting_id, ticket_id, action_url
    ) VALUES (
        p_user_id, p_company_id, p_type, p_title, p_message, p_priority,
        p_document_id, p_meeting_id, p_ticket_id, p_action_url
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- 17. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 18. Seed organizational structure for existing companies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM companies
    LOOP
        PERFORM seed_company_org_structure(r.id);
    END LOOP;
END $$;

-- 19. Create default chatbots for existing companies
INSERT INTO chatbots (company_id, name, description, system_prompt)
SELECT 
    c.id,
    'Chatbot CEO para ' || c.name,
    'Asistente virtual del CEO para ' || c.name,
    'Eres el asistente virtual del CEO de ' || c.name || '. Responde de manera profesional, cordial y eficiente. Puedes ayudar con consultas sobre la empresa, crear solicitudes de reunión y generar tickets de trabajo.'
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM chatbots WHERE company_id = c.id);
