-- Tabla de perfiles de usuario con reconocimiento facial
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  company_id TEXT,
  facial_embedding JSONB,
  last_facial_verification TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios vean su propio perfil
CREATE POLICY "Users can view own profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = id);

-- Política para que usuarios actualicen su propio perfil
CREATE POLICY "Users can update own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = id);

-- Política para insertar perfil propio
CREATE POLICY "Users can insert own profile" ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Función SECURITY DEFINER para obtener embedding (evita RLS recursivo)
CREATE OR REPLACE FUNCTION public.get_user_facial_embedding(target_user_id UUID)
RETURNS TABLE(facial_embedding JSONB, last_facial_verification TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT up.facial_embedding, up.last_facial_verification
  FROM user_profiles up
  WHERE up.id = target_user_id;
END;
$$;

-- Función SECURITY DEFINER para guardar embedding (evita RLS recursivo)
CREATE OR REPLACE FUNCTION public.save_facial_embedding(
  target_user_id UUID,
  new_embedding JSONB DEFAULT NULL,
  update_timestamp BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Asegurar que el perfil existe
  INSERT INTO user_profiles (id)
  VALUES (target_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- Actualizar embedding y/o timestamp
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

-- Permisos para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_user_facial_embedding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_facial_embedding(UUID, JSONB, BOOLEAN) TO authenticated;

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabla de logs de acceso
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestampt TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  country TEXT,
  device_info TEXT,
  success BOOLEAN DEFAULT false
);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own access logs" ON public.access_logs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own access logs" ON public.access_logs
FOR SELECT USING (auth.uid() = user_id);