-- Add unique constraint to prevent duplicate areas per user
ALTER TABLE mision_iwie_areas 
ADD CONSTRAINT mision_iwie_areas_user_id_name_unique UNIQUE (user_id, name);

-- Add unique constraint to prevent duplicate decisions per user, title, and date
-- This helps prevent accidental double-submissions
ALTER TABLE mision_iwie_decisions 
ADD CONSTRAINT mision_iwie_decisions_user_id_title_date_unique UNIQUE (user_id, title, date_for);