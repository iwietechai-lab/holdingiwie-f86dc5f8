
-- Table for allowed registration emails (replaces hardcoded allowedEmails.ts)
CREATE TABLE public.allowed_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'colaborador',
  company_id text REFERENCES public.companies(id),
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowed_registrations ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage the table
CREATE POLICY "Superadmins can manage allowed_registrations"
  ON public.allowed_registrations FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Security definer function to check if an email is allowed (does not expose the list)
CREATE OR REPLACE FUNCTION public.check_email_allowed(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'allowed', true,
    'role', ar.role,
    'company_id', ar.company_id,
    'department', ar.department
  ) INTO v_result
  FROM public.allowed_registrations ar
  WHERE lower(ar.email) = lower(p_email)
    AND ar.is_active = true;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute to anon and authenticated (needed during registration before auth)
GRANT EXECUTE ON FUNCTION public.check_email_allowed(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_allowed(text) TO authenticated;
