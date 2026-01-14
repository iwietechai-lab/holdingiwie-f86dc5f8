-- Create availability_slots table for specific dates (superadmin only)
CREATE TABLE public.availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, available_date, start_time)
);

-- Enable RLS
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- Only superadmin can manage their availability
CREATE POLICY "Superadmin can manage own availability"
ON public.availability_slots
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin') AND user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'superadmin') AND user_id = auth.uid());

-- Everyone can read availability (to see when to book)
CREATE POLICY "Everyone can view availability"
ON public.availability_slots
FOR SELECT
TO authenticated
USING (true);

-- Create meeting request status enum
CREATE TYPE public.meeting_request_status AS ENUM ('pendiente', 'aprobada', 'rechazada', 'completada');

-- Create new meeting_requests table with proper structure
DROP TABLE IF EXISTS public.meeting_requests CASCADE;
CREATE TABLE public.meeting_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL,
    participants JSONB NOT NULL DEFAULT '[]',
    title TEXT NOT NULL,
    description TEXT,
    requested_date DATE NOT NULL,
    requested_start_time TIME NOT NULL,
    requested_end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    priority approval_priority DEFAULT 'media',
    status meeting_request_status DEFAULT 'pendiente',
    video_url TEXT,
    room_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;

-- Users can see requests where they are creator or participant
CREATE POLICY "Users can view own meeting requests"
ON public.meeting_requests
FOR SELECT
TO authenticated
USING (
    creator_id = auth.uid() 
    OR participants::jsonb ? auth.uid()::text
    OR public.has_role(auth.uid(), 'superadmin')
);

-- Users can create meeting requests
CREATE POLICY "Users can create meeting requests"
ON public.meeting_requests
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Only superadmin can update/manage all requests, users can update their own
CREATE POLICY "Manage meeting requests"
ON public.meeting_requests
FOR UPDATE
TO authenticated
USING (
    creator_id = auth.uid() 
    OR public.has_role(auth.uid(), 'superadmin')
);

-- Only creator or superadmin can delete
CREATE POLICY "Delete meeting requests"
ON public.meeting_requests
FOR DELETE
TO authenticated
USING (
    creator_id = auth.uid() 
    OR public.has_role(auth.uid(), 'superadmin')
);

-- Create video call signaling table for WebRTC
CREATE TABLE public.video_call_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    signal_type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate'
    signal_data JSONB NOT NULL,
    target_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.video_call_signals ENABLE ROW LEVEL SECURITY;

-- Participants can read/write signals in their rooms
CREATE POLICY "Participants can manage signals"
ON public.video_call_signals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (user_id = auth.uid());

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_requests;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_meeting_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_meeting_requests_updated_at
BEFORE UPDATE ON public.meeting_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_meeting_request_updated_at();