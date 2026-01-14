import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Meeting } from '@/types/organization';
import { useSupabaseAuth } from './useSupabaseAuth';

interface UseMeetingsReturn {
  meetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  fetchMeetings: () => Promise<void>;
  createMeeting: (meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<{ success: boolean; error?: string }>;
  deleteMeeting: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function useMeetings(): UseMeetingsReturn {
  const { user, profile } = useSupabaseAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('meetings')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMeetings((data || []) as unknown as Meeting[]);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError(err instanceof Error ? err.message : 'Error loading meetings');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createMeeting = useCallback(async (
    meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: insertError } = await supabase
        .from('meetings')
        .insert({
          ...meeting,
          created_by: user?.id,
          company_id: profile?.company_id,
        });

      if (insertError) throw insertError;
      await fetchMeetings();
      return { success: true };
    } catch (err) {
      console.error('Error creating meeting:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error creating meeting' };
    }
  }, [user, profile, fetchMeetings]);

  const updateMeeting = useCallback(async (
    id: string,
    updates: Partial<Meeting>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchMeetings();
      return { success: true };
    } catch (err) {
      console.error('Error updating meeting:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error updating meeting' };
    }
  }, [fetchMeetings]);

  const deleteMeeting = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchMeetings();
      return { success: true };
    } catch (err) {
      console.error('Error deleting meeting:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error deleting meeting' };
    }
  }, [fetchMeetings]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    isLoading,
    error,
    fetchMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };
}
