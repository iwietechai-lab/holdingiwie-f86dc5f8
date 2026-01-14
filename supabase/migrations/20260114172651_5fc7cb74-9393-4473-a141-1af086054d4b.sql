-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create CEO availability slots table
CREATE TABLE public.ceo_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.ceo_availability ENABLE ROW LEVEL SECURITY;

-- Policies: CEO can manage their own availability, others can view
CREATE POLICY "Users can view all availability"
  ON public.ceo_availability
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own availability"
  ON public.ceo_availability
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create meeting requests table (for booking slots)
CREATE TABLE public.meeting_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  host_id UUID NOT NULL,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;

-- Policies for meeting requests
CREATE POLICY "Users can view their own requests"
  ON public.meeting_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = host_id);

CREATE POLICY "Users can create requests"
  ON public.meeting_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Host can update requests"
  ON public.meeting_requests
  FOR UPDATE
  USING (auth.uid() = host_id);

-- Add triggers for updated_at
CREATE TRIGGER update_ceo_availability_updated_at
  BEFORE UPDATE ON public.ceo_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_requests_updated_at
  BEFORE UPDATE ON public.meeting_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();