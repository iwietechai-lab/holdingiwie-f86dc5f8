-- SECURITY FIX PART 2B: Tickets, Tasks, Meetings (CORRECTED)

-- 10. TICKETS: Only assigned, creator, or company managers
DROP POLICY IF EXISTS "Users view company tasks" ON public.tickets;
DROP POLICY IF EXISTS "Users can view company tickets" ON public.tickets;

CREATE POLICY "Tickets visible to involved parties"
ON public.tickets FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (
        company_id = public.get_user_company_id(auth.uid())
        AND public.has_role(auth.uid(), 'superadmin')
    )
);

-- 11. TASKS: assigned_to is JSONB, not UUID!
DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;

CREATE POLICY "Tasks visible to assigned users"
ON public.tasks FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR created_by = auth.uid()
    OR (assigned_to IS NOT NULL AND assigned_to::text = auth.uid()::text)
    OR company_id = public.get_user_company_id(auth.uid())
);

-- 12. MEETINGS: Only organizer or same company
DROP POLICY IF EXISTS "Users can view meetings they attend" ON public.meetings;
DROP POLICY IF EXISTS "Authenticated users can view meetings" ON public.meetings;

CREATE POLICY "Meetings visible to same company"
ON public.meetings FOR SELECT
TO authenticated
USING (
    public.is_superadmin()
    OR created_by = auth.uid()
    OR company_id = public.get_user_company_id(auth.uid())
);