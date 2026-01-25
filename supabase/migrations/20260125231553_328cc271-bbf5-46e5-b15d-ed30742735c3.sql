-- Create table for collective holding memory/knowledge
CREATE TABLE public.holding_collective_memory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('content', 'chat', 'decision', 'document', 'report')),
    source_id UUID,
    source_table TEXT,
    company_id TEXT,
    user_id UUID,
    title TEXT,
    original_content TEXT,
    processed_summary TEXT,
    key_concepts JSONB DEFAULT '[]'::jsonb,
    embeddings_text TEXT, -- For future vector search
    tags TEXT[] DEFAULT '{}',
    area_category TEXT,
    importance_score INTEGER DEFAULT 5 CHECK (importance_score >= 1 AND importance_score <= 10),
    access_count INTEGER DEFAULT 0,
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_holding_memory_source ON public.holding_collective_memory(source_type, source_id);
CREATE INDEX idx_holding_memory_processed ON public.holding_collective_memory(is_processed);
CREATE INDEX idx_holding_memory_area ON public.holding_collective_memory(area_category);
CREATE INDEX idx_holding_memory_tags ON public.holding_collective_memory USING GIN(tags);
CREATE INDEX idx_holding_memory_key_concepts ON public.holding_collective_memory USING GIN(key_concepts);

-- Enable RLS
ALTER TABLE public.holding_collective_memory ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read processed memory (for AI context)
CREATE POLICY "Authenticated users can read processed memory"
ON public.holding_collective_memory
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_processed = true);

-- Users can insert their own contributions
CREATE POLICY "Users can insert memory entries"
ON public.holding_collective_memory
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only superadmins can update/delete
CREATE POLICY "Superadmins can manage all memory"
ON public.holding_collective_memory
FOR ALL
USING (public.is_superadmin());

-- Create trigger for updated_at
CREATE TRIGGER update_holding_memory_updated_at
    BEFORE UPDATE ON public.holding_collective_memory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to add content to collective memory (called after uploads)
CREATE OR REPLACE FUNCTION public.add_to_collective_memory(
    p_source_type TEXT,
    p_source_id UUID,
    p_source_table TEXT,
    p_company_id TEXT,
    p_user_id UUID,
    p_title TEXT,
    p_content TEXT,
    p_area_category TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_memory_id UUID;
BEGIN
    INSERT INTO holding_collective_memory (
        source_type,
        source_id,
        source_table,
        company_id,
        user_id,
        title,
        original_content,
        area_category,
        tags,
        is_processed
    ) VALUES (
        p_source_type,
        p_source_id,
        p_source_table,
        p_company_id,
        p_user_id,
        p_title,
        p_content,
        p_area_category,
        p_tags,
        false
    )
    RETURNING id INTO v_memory_id;
    
    RETURN v_memory_id;
END;
$$;

-- Create trigger to automatically queue brain_galaxy_content for processing
CREATE OR REPLACE FUNCTION public.queue_brain_galaxy_content_for_memory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only queue if visibility is 'holding' (global knowledge)
    IF NEW.visibility = 'holding' THEN
        INSERT INTO holding_collective_memory (
            source_type,
            source_id,
            source_table,
            user_id,
            title,
            original_content,
            area_category,
            is_processed
        ) VALUES (
            'content',
            NEW.id,
            'brain_galaxy_content',
            NEW.user_id,
            NEW.title,
            COALESCE(NEW.content_text, NEW.description, ''),
            (SELECT name FROM brain_galaxy_areas WHERE id = NEW.area_id),
            false
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_queue_brain_galaxy_content
    AFTER INSERT ON public.brain_galaxy_content
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_brain_galaxy_content_for_memory();

-- Create trigger to queue chat messages that contain valuable insights
CREATE OR REPLACE FUNCTION public.queue_chat_for_memory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only queue assistant responses with substantial content (>200 chars)
    IF NEW.role = 'assistant' AND LENGTH(NEW.content) > 200 THEN
        INSERT INTO holding_collective_memory (
            source_type,
            source_id,
            source_table,
            user_id,
            title,
            original_content,
            is_processed
        ) VALUES (
            'chat',
            NEW.id,
            'chat_messages',
            NEW.user_id,
            LEFT(NEW.content, 100),
            NEW.content,
            false
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_queue_chat_for_memory
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_chat_for_memory();

-- Trigger for mision_iwie decisions
CREATE OR REPLACE FUNCTION public.queue_mision_decision_for_memory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO holding_collective_memory (
        source_type,
        source_id,
        source_table,
        company_id,
        user_id,
        title,
        original_content,
        is_processed
    ) VALUES (
        'decision',
        NEW.id,
        'mision_iwie_decisions',
        NEW.company_id,
        NEW.created_by,
        NEW.title,
        COALESCE(NEW.description, '') || ' | Impacto: ' || COALESCE(NEW.impact, '') || ' | Razón: ' || COALESCE(NEW.rationale, ''),
        false
    )
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_queue_mision_decision_for_memory
    AFTER INSERT ON public.mision_iwie_decisions
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_mision_decision_for_memory();