-- =====================================================
-- FIX 1: Add authorization checks to RPC functions
-- =====================================================

-- Recreate get_user_facial_embedding with auth check
CREATE OR REPLACE FUNCTION public.get_user_facial_embedding(target_user_id uuid)
RETURNS TABLE(facial_embedding jsonb, last_facial_verification timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: only self or superadmin can access biometric data
  IF target_user_id != auth.uid() AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: no puede acceder a datos biométricos de otros usuarios';
  END IF;
  
  RETURN QUERY
  SELECT up.facial_embedding, up.last_facial_verification
  FROM user_profiles up
  WHERE up.id = target_user_id;
END;
$$;

-- Recreate save_facial_embedding with auth check
CREATE OR REPLACE FUNCTION public.save_facial_embedding(
  target_user_id uuid,
  new_embedding jsonb DEFAULT NULL,
  update_timestamp boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: only self or superadmin can modify biometric data
  IF target_user_id != auth.uid() AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: no puede modificar datos biométricos de otros usuarios';
  END IF;
  
  -- Ensure profile exists
  INSERT INTO user_profiles (id)
  VALUES (target_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- Update embedding and/or timestamp
  IF new_embedding IS NOT NULL THEN
    UPDATE user_profiles 
    SET 
      facial_embedding = new_embedding,
      last_facial_verification = CASE WHEN update_timestamp THEN NOW() ELSE last_facial_verification END,
      updated_at = NOW()
    WHERE id = target_user_id;
  ELSIF update_timestamp THEN
    UPDATE user_profiles 
    SET 
      last_facial_verification = NOW(),
      updated_at = NOW()
    WHERE id = target_user_id;
  END IF;
END;
$$;

-- =====================================================
-- FIX 2: Create documentos table with RLS
-- =====================================================

-- Create documentos table if not exists
CREATE TABLE IF NOT EXISTS public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text NOT NULL,
  empresa_id text NOT NULL,
  area_id text NOT NULL,
  version integer DEFAULT 1,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  is_development boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Company-scoped SELECT policy
CREATE POLICY "Users access own company documents" ON public.documentos
FOR SELECT TO authenticated
USING (
  empresa_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  OR public.is_superadmin()
);

-- Company-scoped INSERT policy
CREATE POLICY "Users insert own company documents" ON public.documentos
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  OR public.is_superadmin()
);

-- Company-scoped UPDATE policy
CREATE POLICY "Users update own company documents" ON public.documentos
FOR UPDATE TO authenticated
USING (
  empresa_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  OR public.is_superadmin()
);

-- Company-scoped DELETE policy
CREATE POLICY "Users delete own company documents" ON public.documentos
FOR DELETE TO authenticated
USING (
  empresa_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  OR public.is_superadmin()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_documentos_empresa ON public.documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_user ON public.documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_documentos_area ON public.documentos(area_id);

-- =====================================================
-- FIX 3: Create storage bucket with RLS policies
-- =====================================================

-- Create documentos bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documentos', 'documentos', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Storage SELECT policy - company isolation
CREATE POLICY "Company storage read access" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos' AND (
    public.is_superadmin() OR
    (storage.foldername(name))[1] = (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- Storage INSERT policy - company isolation
CREATE POLICY "Company storage upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND (
    public.is_superadmin() OR
    (storage.foldername(name))[1] = (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- Storage UPDATE policy - company isolation
CREATE POLICY "Company storage update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documentos' AND (
    public.is_superadmin() OR
    (storage.foldername(name))[1] = (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- Storage DELETE policy - company isolation
CREATE POLICY "Company storage delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos' AND (
    public.is_superadmin() OR
    (storage.foldername(name))[1] = (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);