-- =====================================================
-- FASE 4: Sistema de Misiones Colaborativas
-- =====================================================

-- 4.1 Agregar campos a brain_galaxy_missions
ALTER TABLE public.brain_galaxy_missions
ADD COLUMN IF NOT EXISTS mission_type TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS project_code TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_intervention_level TEXT DEFAULT 'proactive',
ADD COLUMN IF NOT EXISTS estimated_budget DECIMAL,
ADD COLUMN IF NOT EXISTS actual_budget DECIMAL,
ADD COLUMN IF NOT EXISTS target_end_date TIMESTAMPTZ;

-- 4.2 Crear tabla brain_galaxy_mission_chat
CREATE TABLE IF NOT EXISTS public.brain_galaxy_mission_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.brain_galaxy_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_ai_message BOOLEAN DEFAULT false,
  ai_model TEXT,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  detected_context TEXT,
  detected_intents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.3 Crear tabla brain_galaxy_mission_workspace_state
CREATE TABLE IF NOT EXISTS public.brain_galaxy_mission_workspace_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.brain_galaxy_missions(id) ON DELETE CASCADE,
  current_context TEXT DEFAULT 'general',
  sub_context TEXT,
  active_panels JSONB DEFAULT '[]'::jsonb,
  panel_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mission_id)
);

-- 4.4 Crear tabla brain_galaxy_mission_artifacts
CREATE TABLE IF NOT EXISTS public.brain_galaxy_mission_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.brain_galaxy_missions(id) ON DELETE CASCADE,
  chat_message_id UUID REFERENCES public.brain_galaxy_mission_chat(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  version_number INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  parent_artifact_id UUID REFERENCES public.brain_galaxy_mission_artifacts(id),
  file_url TEXT,
  preview_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_ai_generated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.5 Crear tabla brain_galaxy_mission_cost_estimates
CREATE TABLE IF NOT EXISTS public.brain_galaxy_mission_cost_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.brain_galaxy_missions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL DEFAULT 1,
  unit_price DECIMAL NOT NULL,
  total_price DECIMAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
  currency TEXT DEFAULT 'USD',
  category TEXT,
  source TEXT,
  confidence_score DECIMAL,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.6 Crear tabla brain_galaxy_mission_time_estimates
CREATE TABLE IF NOT EXISTS public.brain_galaxy_mission_time_estimates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.brain_galaxy_missions(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  description TEXT,
  estimated_days INTEGER NOT NULL,
  estimated_hours INTEGER,
  dependencies JSONB DEFAULT '[]'::jsonb,
  confidence_score DECIMAL,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.7 Crear tabla brain_galaxy_mission_context_history
CREATE TABLE IF NOT EXISTS public.brain_galaxy_mission_context_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.brain_galaxy_missions(id) ON DELETE CASCADE,
  chat_message_id UUID REFERENCES public.brain_galaxy_mission_chat(id) ON DELETE SET NULL,
  detected_context TEXT NOT NULL,
  sub_context TEXT,
  confidence DECIMAL,
  active_panels JSONB DEFAULT '[]'::jsonb,
  panel_data_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 4.8 Habilitar RLS en todas las tablas
-- =====================================================

ALTER TABLE public.brain_galaxy_mission_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_mission_workspace_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_mission_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_mission_cost_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_mission_time_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_galaxy_mission_context_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4.9 Crear políticas RLS
-- =====================================================

-- Políticas para brain_galaxy_mission_chat
CREATE POLICY "Users can view chat in missions they participate in"
ON public.brain_galaxy_mission_chat
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_chat.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_chat.mission_id
    AND m.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can insert chat messages in their missions"
ON public.brain_galaxy_mission_chat
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.brain_galaxy_mission_participants mp
      WHERE mp.mission_id = brain_galaxy_mission_chat.mission_id
      AND mp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.brain_galaxy_missions m
      WHERE m.id = brain_galaxy_mission_chat.mission_id
      AND m.creator_id = auth.uid()
    )
  )
);

-- Políticas para workspace_state
CREATE POLICY "Users can view workspace state of their missions"
ON public.brain_galaxy_mission_workspace_state
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_workspace_state.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_workspace_state.mission_id
    AND m.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can update workspace state of their missions"
ON public.brain_galaxy_mission_workspace_state
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_workspace_state.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_workspace_state.mission_id
    AND m.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can insert workspace state for their missions"
ON public.brain_galaxy_mission_workspace_state
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_workspace_state.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_workspace_state.mission_id
    AND m.creator_id = auth.uid()
  )
);

-- Políticas para artifacts
CREATE POLICY "Users can view artifacts of their missions"
ON public.brain_galaxy_mission_artifacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_artifacts.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_artifacts.mission_id
    AND m.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can create artifacts in their missions"
ON public.brain_galaxy_mission_artifacts
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    EXISTS (
      SELECT 1 FROM public.brain_galaxy_mission_participants mp
      WHERE mp.mission_id = brain_galaxy_mission_artifacts.mission_id
      AND mp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.brain_galaxy_missions m
      WHERE m.id = brain_galaxy_mission_artifacts.mission_id
      AND m.creator_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own artifacts"
ON public.brain_galaxy_mission_artifacts
FOR UPDATE
USING (auth.uid() = created_by);

-- Políticas para cost_estimates
CREATE POLICY "Users can view cost estimates of their missions"
ON public.brain_galaxy_mission_cost_estimates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_cost_estimates.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_cost_estimates.mission_id
    AND m.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can manage cost estimates in their missions"
ON public.brain_galaxy_mission_cost_estimates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_cost_estimates.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_cost_estimates.mission_id
    AND m.creator_id = auth.uid()
  )
);

-- Políticas para time_estimates
CREATE POLICY "Users can view time estimates of their missions"
ON public.brain_galaxy_mission_time_estimates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_time_estimates.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_time_estimates.mission_id
    AND m.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can manage time estimates in their missions"
ON public.brain_galaxy_mission_time_estimates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_time_estimates.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_time_estimates.mission_id
    AND m.creator_id = auth.uid()
  )
);

-- Políticas para context_history
CREATE POLICY "Users can view context history of their missions"
ON public.brain_galaxy_mission_context_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_context_history.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_context_history.mission_id
    AND m.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can insert context history for their missions"
ON public.brain_galaxy_mission_context_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_mission_participants mp
    WHERE mp.mission_id = brain_galaxy_mission_context_history.mission_id
    AND mp.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.brain_galaxy_missions m
    WHERE m.id = brain_galaxy_mission_context_history.mission_id
    AND m.creator_id = auth.uid()
  )
);

-- =====================================================
-- 4.10 Habilitar Realtime
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_galaxy_mission_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_galaxy_mission_workspace_state;

-- =====================================================
-- Índices para mejor rendimiento
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_mission_chat_mission_id ON public.brain_galaxy_mission_chat(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_chat_created_at ON public.brain_galaxy_mission_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mission_artifacts_mission_id ON public.brain_galaxy_mission_artifacts(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_cost_estimates_mission_id ON public.brain_galaxy_mission_cost_estimates(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_time_estimates_mission_id ON public.brain_galaxy_mission_time_estimates(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_context_history_mission_id ON public.brain_galaxy_mission_context_history(mission_id);