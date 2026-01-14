-- Add DELETE policy for tickets table
-- Only superadmin and the ticket creator can delete tickets

CREATE POLICY "Superadmin and creators can delete tickets"
ON public.tickets
FOR DELETE
USING (
  (auth.uid() = created_by) OR 
  is_superadmin() OR
  has_role(auth.uid(), 'superadmin'::app_role)
);