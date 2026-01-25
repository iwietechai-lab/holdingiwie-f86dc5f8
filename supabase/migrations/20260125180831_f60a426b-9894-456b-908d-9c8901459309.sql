-- Create storage bucket for notification sounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('notification-sounds', 'notification-sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access to notification sounds
CREATE POLICY "notification_sounds_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'notification-sounds');

-- Create notification_sounds table for the catalog
CREATE TABLE public.notification_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for notification_sounds
ALTER TABLE public.notification_sounds ENABLE ROW LEVEL SECURITY;

-- Public read access for notification sounds catalog
CREATE POLICY "notification_sounds_select_policy"
ON public.notification_sounds FOR SELECT
USING (true);

-- Create user_notification_preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  sound_id UUID REFERENCES public.notification_sounds(id) ON DELETE SET NULL,
  is_enabled BOOLEAN DEFAULT true,
  volume INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_type),
  CONSTRAINT volume_range CHECK (volume >= 0 AND volume <= 100)
);

-- Enable RLS for user_notification_preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "user_notification_preferences_select"
ON public.user_notification_preferences FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "user_notification_preferences_insert"
ON public.user_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "user_notification_preferences_update"
ON public.user_notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "user_notification_preferences_delete"
ON public.user_notification_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for preferences
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notification_preferences;