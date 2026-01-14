-- Create app_role enum if not exists
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'manager', 'employee', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create SECURITY DEFINER function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create SECURITY DEFINER function to get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
$$;

-- Create SECURITY DEFINER function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'superadmin'::app_role
    )
$$;

-- RLS Policies for user_roles
-- Superadmins can view all roles
CREATE POLICY "Superadmins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_superadmin() OR user_id = auth.uid());

-- Superadmins can insert roles
CREATE POLICY "Superadmins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin());

-- Superadmins can update roles
CREATE POLICY "Superadmins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_superadmin());

-- Superadmins can delete roles
CREATE POLICY "Superadmins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_superadmin());

-- Insert superadmin role for mauricio@iwie.space
INSERT INTO public.user_roles (user_id, role)
VALUES ('e5251256-2f23-4613-8f07-22b149fbad72', 'superadmin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update RLS on user_profiles to allow superadmin to view all profiles
CREATE POLICY "Superadmins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_superadmin() OR auth.uid() = id);

-- Allow superadmins to update any profile
CREATE POLICY "Superadmins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_superadmin() OR auth.uid() = id);

-- Allow superadmins to view all access logs
CREATE POLICY "Superadmins can view all access logs"
ON public.access_logs
FOR SELECT
TO authenticated
USING (public.is_superadmin() OR auth.uid() = user_id);