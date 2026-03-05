import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { logger } from '@/utils/logger';

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ceo_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      logger.error('Error fetching chat sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(async (title?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('ceo_chat_sessions')
        .insert({
          user_id: user.id,
          title: title || `Conversación ${format(new Date(), 'd MMM HH:mm', { locale: es })}`,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data);
      await fetchSessions();
      return data;
    } catch (err) {
      logger.error('Error creating session:', err);
      return null;
    }
  }, [fetchSessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('ceo_chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
      await fetchSessions();
      return true;
    } catch (err) {
      logger.error('Error deleting session:', err);
      return false;
    }
  }, [activeSession, fetchSessions]);

  const groupSessionsByDate = useCallback(() => {
    const groups: Record<string, ChatSession[]> = {};
    
    sessions.forEach(session => {
      const dateKey = format(new Date(session.created_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    });

    return Object.entries(groups).map(([date, sessions]) => ({
      date,
      label: format(new Date(date), "EEEE, d 'de' MMMM", { locale: es }),
      sessions,
    }));
  }, [sessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    activeSession,
    setActiveSession,
    isLoading,
    createSession,
    deleteSession,
    groupedSessions: groupSessionsByDate(),
    fetchSessions,
  };
}
