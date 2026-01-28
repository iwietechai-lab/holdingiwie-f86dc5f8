import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Source, StudioOutput, ChatMessage } from '@/components/brain-galaxy/studio/types';

// Types for studio sessions
export interface StudioSession {
  id: string;
  user_id: string;
  title: string;
  mode: 'studio' | 'ai' | 'manual';
  messages: ChatMessage[];
  sources: Source[];
  outputs: StudioOutput[];
  course_proposal: CourseProposal | null;
  course_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CourseProposal {
  title: string;
  description: string;
  modules: { title: string; description: string; topics: string[]; content?: string }[];
  sources: { title: string; url?: string; type: 'web' | 'internal' | 'suggested'; description?: string }[];
  suggestedTopics?: string[];
}

interface UseStudioSessionsOptions {
  userId: string | undefined;
  autoSaveDebounce?: number;
}

export function useStudioSessions({ userId, autoSaveDebounce = 2000 }: UseStudioSessionsOptions) {
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all sessions for the user
  const fetchSessions = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('brain_galaxy_studio_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Parse JSONB fields
      const parsedSessions: StudioSession[] = (data || []).map(session => ({
        ...session,
        messages: (session.messages as unknown as ChatMessage[]) || [],
        sources: (session.sources as unknown as Source[]) || [],
        outputs: (session.outputs as unknown as StudioOutput[]) || [],
        course_proposal: session.course_proposal as unknown as CourseProposal | null,
        mode: session.mode as 'studio' | 'ai' | 'manual',
      }));

      setSessions(parsedSessions);
    } catch (error) {
      console.error('Error fetching studio sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Create a new session
  const createSession = useCallback(async (mode: 'studio' | 'ai' | 'manual' = 'studio'): Promise<StudioSession | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('brain_galaxy_studio_sessions')
        .insert({
          user_id: userId,
          title: 'Nueva sesión',
          mode,
          messages: [],
          sources: [],
          outputs: [],
          course_proposal: null,
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: StudioSession = {
        ...data,
        messages: [],
        sources: [],
        outputs: [],
        course_proposal: null,
        mode: mode,
      };

      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      return newSession;
    } catch (error) {
      console.error('Error creating studio session:', error);
      toast.error('Error al crear la sesión');
      return null;
    }
  }, [userId]);

  // Save/update a session
  const saveSession = useCallback(async (
    sessionId: string,
    data: {
      messages?: ChatMessage[];
      sources?: Source[];
      outputs?: StudioOutput[];
      course_proposal?: CourseProposal | null;
      title?: string;
      mode?: 'studio' | 'ai' | 'manual';
    }
  ): Promise<boolean> => {
    if (!userId) return false;

    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.messages !== undefined) updateData.messages = data.messages;
      if (data.sources !== undefined) updateData.sources = data.sources;
      if (data.outputs !== undefined) updateData.outputs = data.outputs;
      if (data.course_proposal !== undefined) updateData.course_proposal = data.course_proposal;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.mode !== undefined) updateData.mode = data.mode;

      const { error } = await supabase
        .from('brain_galaxy_studio_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, ...data, updated_at: new Date().toISOString() }
          : s
      ));

      return true;
    } catch (error) {
      console.error('Error saving studio session:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId]);

  // Load a specific session
  const loadSession = useCallback(async (sessionId: string): Promise<StudioSession | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('brain_galaxy_studio_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const session: StudioSession = {
        ...data,
        messages: (data.messages as unknown as ChatMessage[]) || [],
        sources: (data.sources as unknown as Source[]) || [],
        outputs: (data.outputs as unknown as StudioOutput[]) || [],
        course_proposal: data.course_proposal as unknown as CourseProposal | null,
        mode: data.mode as 'studio' | 'ai' | 'manual',
      };

      setCurrentSessionId(sessionId);
      return session;
    } catch (error) {
      console.error('Error loading studio session:', error);
      toast.error('Error al cargar la sesión');
      return null;
    }
  }, [userId]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('brain_galaxy_studio_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }

      toast.success('Sesión eliminada');
      return true;
    } catch (error) {
      console.error('Error deleting studio session:', error);
      toast.error('Error al eliminar la sesión');
      return false;
    }
  }, [userId, currentSessionId]);

  // Get current session
  const getCurrentSession = useCallback(() => {
    return sessions.find(s => s.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    isLoading,
    isSaving,
    createSession,
    saveSession,
    loadSession,
    deleteSession,
    getCurrentSession,
    refetch: fetchSessions,
  };
}
