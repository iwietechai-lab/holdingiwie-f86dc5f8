-- Create table for Brain Galaxy Studio sessions persistence
CREATE TABLE public.brain_galaxy_studio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nueva sesión',
  mode TEXT NOT NULL DEFAULT 'studio',
  messages JSONB DEFAULT '[]'::jsonb,
  sources JSONB DEFAULT '[]'::jsonb,
  outputs JSONB DEFAULT '[]'::jsonb,
  course_proposal JSONB,
  course_id UUID REFERENCES public.brain_galaxy_courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.brain_galaxy_studio_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own studio sessions
CREATE POLICY "Users can view own studio sessions"
  ON public.brain_galaxy_studio_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own studio sessions"
  ON public.brain_galaxy_studio_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own studio sessions"
  ON public.brain_galaxy_studio_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own studio sessions"
  ON public.brain_galaxy_studio_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_brain_galaxy_studio_sessions_updated_at
  BEFORE UPDATE ON public.brain_galaxy_studio_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_brain_galaxy_studio_sessions_user_id ON public.brain_galaxy_studio_sessions(user_id);
CREATE INDEX idx_brain_galaxy_studio_sessions_updated_at ON public.brain_galaxy_studio_sessions(updated_at DESC);