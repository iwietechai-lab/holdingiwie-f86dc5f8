-- Create companies table
CREATE TABLE public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add dashboard_visibility column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS dashboard_visibility JSONB DEFAULT '{
  "ver_perfiles": false,
  "ver_empresas": false,
  "ver_reportes": false,
  "ver_documentos": true,
  "ver_chatbot": true,
  "ver_logs": false,
  "editar_usuarios": false,
  "gestionar_roles": false
}'::jsonb;

-- Add department_id column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Authenticated users can view companies"
ON public.companies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Superadmins can insert companies"
ON public.companies FOR INSERT
WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can update companies"
ON public.companies FOR UPDATE
USING (is_superadmin());

CREATE POLICY "Superadmins can delete companies"
ON public.companies FOR DELETE
USING (is_superadmin());

-- Departments policies
CREATE POLICY "Authenticated users can view departments"
ON public.departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Superadmins can insert departments"
ON public.departments FOR INSERT
WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can update departments"
ON public.departments FOR UPDATE
USING (is_superadmin());

CREATE POLICY "Superadmins can delete departments"
ON public.departments FOR DELETE
USING (is_superadmin());

-- Insert initial companies from existing data
INSERT INTO public.companies (id, name, icon, color, description) VALUES
  ('iwie-holding', 'IWIE Holding', '🚀', 'hsl(250, 89%, 65%)', 'Holding principal - Dirección General'),
  ('iwie-drones', 'IWIE Drones', '🚁', 'hsl(200, 100%, 60%)', 'Tecnología de drones avanzada para industria y agricultura'),
  ('iwie-agro', 'IWIE Agro', '🌾', 'hsl(120, 70%, 50%)', 'Soluciones agrícolas innovadoras con IA'),
  ('iwie-factory', 'IWIE Factory', '🏭', 'hsl(30, 90%, 55%)', 'Manufactura inteligente y automatización'),
  ('iwie-energy', 'IWIE Energy', '⚡', 'hsl(50, 100%, 50%)', 'Energías renovables y almacenamiento'),
  ('iwie-legal', 'IWIE Legal', '⚖️', 'hsl(220, 60%, 50%)', 'Servicios legales y asesoría corporativa'),
  ('iwie-motors', 'IWIE Motors', '🚗', 'hsl(0, 85%, 55%)', 'Vehículos eléctricos y movilidad sostenible'),
  ('beeflee', 'Beeflee', '🐝', 'hsl(45, 100%, 50%)', 'Apicultura tecnológica y polinización'),
  ('udelem', 'Udelem', '🎓', 'hsl(220, 80%, 60%)', 'Educación online y capacitación'),
  ('busia', 'Busia', '💼', 'hsl(280, 70%, 55%)', 'Consultoría empresarial y negocios'),
  ('aipasajes', 'AIPasajes', '✈️', 'hsl(190, 90%, 50%)', 'Viajes inteligentes con IA')
ON CONFLICT (id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department_id ON public.user_profiles(department_id);