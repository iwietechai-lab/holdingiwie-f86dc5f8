-- Table for company sales/revenue tracking
CREATE TABLE public.company_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for company KPIs/metrics snapshots
CREATE TABLE public.company_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_users INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,
  total_documents INTEGER DEFAULT 0,
  total_meetings INTEGER DEFAULT 0,
  total_tickets INTEGER DEFAULT 0,
  monthly_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, metric_date)
);

-- Enable RLS on new tables
ALTER TABLE public.company_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_sales
CREATE POLICY "Superadmins can manage all sales"
ON public.company_sales FOR ALL
USING (public.is_superadmin());

CREATE POLICY "Company users can view their company sales"
ON public.company_sales FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.company_id = company_sales.company_id
  )
);

CREATE POLICY "Company managers can insert sales"
ON public.company_sales FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.user_roles ur ON ur.user_id = up.id
    WHERE up.id = auth.uid()
    AND up.company_id = company_sales.company_id
    AND ur.role IN ('admin', 'manager')
  )
);

-- RLS policies for company_metrics
CREATE POLICY "Superadmins can manage all metrics"
ON public.company_metrics FOR ALL
USING (public.is_superadmin());

CREATE POLICY "Company users can view their company metrics"
ON public.company_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.company_id = company_metrics.company_id
  )
);

-- Enable realtime for sales
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_sales;