-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('pendiente', 'en_progreso', 'completada', 'bloqueada');

-- Create tasks table with TEXT company_id to match companies table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  area TEXT NOT NULL,
  priority public.approval_priority NOT NULL DEFAULT 'media',
  execution_time INTERVAL,
  assigned_to JSONB NOT NULL DEFAULT '[]'::jsonb,
  team_members JSONB DEFAULT '[]'::jsonb,
  partial_results TEXT,
  final_results TEXT,
  development_notes TEXT,
  problems TEXT,
  new_ideas TEXT,
  improvement_proposals TEXT,
  status public.task_status DEFAULT 'pendiente',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task_comments table for brainstorming
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'comment',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task_history table for tracking changes
CREATE TABLE public.task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Superadmin can do everything with tasks
CREATE POLICY "Superadmin full access tasks"
ON public.tasks FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Users can view tasks from their company where they participate
CREATE POLICY "Users view company tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  NOT public.is_superadmin() AND
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND company_id = tasks.company_id
  ) AND (
    created_by = auth.uid() OR
    assigned_to ? auth.uid()::text OR
    team_members ? auth.uid()::text
  )
);

-- Managers can create tasks for their company
CREATE POLICY "Managers create tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.is_superadmin() AND
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND company_id = tasks.company_id
    AND role IN ('gerente_area', 'lider_area', 'admin')
  )
);

-- Participants can update assigned tasks
CREATE POLICY "Participants update tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (
  NOT public.is_superadmin() AND
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND company_id = tasks.company_id
  ) AND (
    created_by = auth.uid() OR
    assigned_to ? auth.uid()::text OR
    team_members ? auth.uid()::text
  )
);

-- Task comments policies
CREATE POLICY "View task comments"
ON public.task_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND (
      public.is_superadmin() OR
      (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND company_id = t.company_id)
        AND (t.created_by = auth.uid() OR t.assigned_to ? auth.uid()::text OR t.team_members ? auth.uid()::text)
      )
    )
  )
);

CREATE POLICY "Create task comments"
ON public.task_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND (
      public.is_superadmin() OR
      (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND company_id = t.company_id)
        AND (t.created_by = auth.uid() OR t.assigned_to ? auth.uid()::text OR t.team_members ? auth.uid()::text)
      )
    )
  )
);

-- Task history policies
CREATE POLICY "View task history"
ON public.task_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_history.task_id
    AND (
      public.is_superadmin() OR
      (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND company_id = t.company_id)
        AND (t.created_by = auth.uid() OR t.assigned_to ? auth.uid()::text OR t.team_members ? auth.uid()::text)
      )
    )
  )
);

CREATE POLICY "Insert task history"
ON public.task_history FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;