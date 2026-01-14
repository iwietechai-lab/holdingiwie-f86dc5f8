-- Add new fields for task management
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_end_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS early_completion_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS extension_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS collaborating_companies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Drop the old execution_time column if it exists (we're replacing it with estimated_hours)
-- Note: keeping execution_time for backward compatibility, data will migrate naturally