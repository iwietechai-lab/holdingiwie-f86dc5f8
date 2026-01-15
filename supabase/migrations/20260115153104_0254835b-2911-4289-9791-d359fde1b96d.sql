-- Create table for meeting summaries
CREATE TABLE public.meeting_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  title TEXT NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb,
  transcription TEXT,
  summary TEXT,
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_url TEXT
);

-- Enable Row Level Security
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view meeting summaries they participated in" 
ON public.meeting_summaries 
FOR SELECT 
USING (
  auth.uid() = created_by OR 
  auth.uid()::text IN (SELECT jsonb_array_elements_text(participants))
);

CREATE POLICY "Authenticated users can create meeting summaries" 
ON public.meeting_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their meeting summaries" 
ON public.meeting_summaries 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their meeting summaries" 
ON public.meeting_summaries 
FOR DELETE 
USING (auth.uid() = created_by);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_summaries;