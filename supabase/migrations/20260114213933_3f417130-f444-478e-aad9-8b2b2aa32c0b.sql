-- =====================================================
-- MÓDULO DE TAREAS MEJORADO: Añadir campos Eisenhower
-- =====================================================
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS eisenhower_priority TEXT CHECK (eisenhower_priority IN ('urgente_importante', 'no_urgente_importante', 'urgente_no_importante', 'no_urgente_no_importante')),
ADD COLUMN IF NOT EXISTS alert_status TEXT CHECK (alert_status IN ('al_dia', 'por_vencer', 'vencida')),
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS days_planned INTEGER;

-- =====================================================
-- MÓDULO DE PRESUPUESTOS/INVENTARIO
-- =====================================================

-- Tabla de categorías de presupuesto
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  parent_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de items de presupuesto (catálogo de productos/repuestos)
CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  part_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  price_rmb NUMERIC(12,2) DEFAULT 0,
  price_clp NUMERIC(12,2) DEFAULT 0,
  checklist_checked BOOLEAN DEFAULT FALSE,
  stock_status TEXT DEFAULT 'disponible' CHECK (stock_status IN ('disponible', 'agotado', 'bajo_stock', 'pedido')),
  image_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS public.budget_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'facturada')),
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_percentage NUMERIC(5,2) DEFAULT 19,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  rmb_to_clp_rate NUMERIC(10,4) DEFAULT 140,
  notes TEXT,
  valid_until DATE,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de items en cotizaciones
CREATE TABLE IF NOT EXISTS public.budget_quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.budget_quotes(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL,
  custom_name TEXT,
  custom_description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_quote_items ENABLE ROW LEVEL SECURITY;

-- Policies for budget_categories
CREATE POLICY "Users can view budget categories of their company" 
ON public.budget_categories FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

CREATE POLICY "Managers can manage budget categories" 
ON public.budget_categories FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND role IN ('gerente_area', 'lider_area', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- Policies for budget_items
CREATE POLICY "Users can view budget items of their company" 
ON public.budget_items FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

CREATE POLICY "Managers can manage budget items" 
ON public.budget_items FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND role IN ('gerente_area', 'lider_area', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- Policies for budget_quotes
CREATE POLICY "Users can view quotes of their company" 
ON public.budget_quotes FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

CREATE POLICY "Managers can manage quotes" 
ON public.budget_quotes FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND role IN ('gerente_area', 'lider_area', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- Policies for budget_quote_items
CREATE POLICY "Users can view quote items" 
ON public.budget_quote_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.budget_quotes bq 
    WHERE bq.id = quote_id 
    AND (
      bq.company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    )
  )
);

CREATE POLICY "Managers can manage quote items" 
ON public.budget_quote_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.budget_quotes bq 
    WHERE bq.id = quote_id 
    AND (
      bq.company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND role IN ('gerente_area', 'lider_area', 'admin'))
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_items_company ON public.budget_items(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON public.budget_items(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_quotes_company ON public.budget_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_quote_items_quote ON public.budget_quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_tasks_eisenhower ON public.tasks(eisenhower_priority);
CREATE INDEX IF NOT EXISTS idx_tasks_alert ON public.tasks(alert_status);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_quotes;