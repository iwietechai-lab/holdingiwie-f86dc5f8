import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CeoAvailability {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeetingRequest {
  id: string;
  meeting_id: string | null;
  requester_id: string;
  host_id: string;
  requested_date: string;
  requested_time: string;
  duration_minutes: number;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  created_at: string;
  updated_at: string;
}

interface UseCeoAvailabilityReturn {
  availability: CeoAvailability[];
  requests: MeetingRequest[];
  isLoading: boolean;
  error: string | null;
  fetchAvailability: (userId?: string) => Promise<void>;
  fetchRequests: () => Promise<void>;
  addAvailability: (data: Omit<CeoAvailability, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  updateAvailability: (id: string, updates: Partial<CeoAvailability>) => Promise<{ success: boolean; error?: string }>;
  deleteAvailability: (id: string) => Promise<{ success: boolean; error?: string }>;
  createMeetingRequest: (data: Omit<MeetingRequest, 'id' | 'created_at' | 'updated_at' | 'meeting_id'>) => Promise<{ success: boolean; error?: string }>;
  updateMeetingRequest: (id: string, status: 'approved' | 'rejected') => Promise<{ success: boolean; error?: string }>;
}

export function useCeoAvailability(): UseCeoAvailabilityReturn {
  const [availability, setAvailability] = useState<CeoAvailability[]>([]);
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async (userId?: string) => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('ceo_availability')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAvailability(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('meeting_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRequests((data || []) as MeetingRequest[]);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const addAvailability = useCallback(async (data: Omit<CeoAvailability, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error: insertError } = await supabase
        .from('ceo_availability')
        .insert(data);

      if (insertError) throw insertError;
      await fetchAvailability(data.user_id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchAvailability]);

  const updateAvailability = useCallback(async (id: string, updates: Partial<CeoAvailability>) => {
    try {
      const { error: updateError } = await supabase
        .from('ceo_availability')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchAvailability();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchAvailability]);

  const deleteAvailability = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('ceo_availability')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setAvailability(prev => prev.filter(a => a.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  const createMeetingRequest = useCallback(async (data: Omit<MeetingRequest, 'id' | 'created_at' | 'updated_at' | 'meeting_id'>) => {
    try {
      const { error: insertError } = await supabase
        .from('meeting_requests')
        .insert(data);

      if (insertError) throw insertError;

      // Create notification for the host
      await supabase.rpc('create_notification', {
        p_user_id: data.host_id,
        p_title: 'Nueva solicitud de reunión',
        p_message: `Tienes una nueva solicitud de reunión para el ${data.requested_date} a las ${data.requested_time}`,
        p_type: 'meeting_request',
        p_priority: 'media',
        p_company_id: null,
      });

      await fetchRequests();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchRequests]);

  const updateMeetingRequest = useCallback(async (id: string, status: 'approved' | 'rejected') => {
    try {
      const request = requests.find(r => r.id === id);
      
      const { error: updateError } = await supabase
        .from('meeting_requests')
        .update({ status })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify the requester
      if (request) {
        await supabase.rpc('create_notification', {
          p_user_id: request.requester_id,
          p_title: status === 'approved' ? 'Reunión aprobada' : 'Reunión rechazada',
          p_message: status === 'approved' 
            ? `Tu solicitud de reunión para el ${request.requested_date} ha sido aprobada`
            : `Tu solicitud de reunión para el ${request.requested_date} ha sido rechazada`,
          p_type: 'meeting_response',
          p_priority: 'alta',
          p_company_id: null,
        });

        // If approved, create the actual meeting
        if (status === 'approved') {
          const scheduledAt = new Date(`${request.requested_date}T${request.requested_time}`);
          
          const { data: meeting } = await supabase
            .from('meetings')
            .insert({
              title: `Reunión solicitada`,
              scheduled_at: scheduledAt.toISOString(),
              duration_minutes: request.duration_minutes,
              status: 'confirmed',
              created_by: request.host_id,
              attendees: [request.requester_id],
            })
            .select()
            .single();

          if (meeting) {
            await supabase
              .from('meeting_requests')
              .update({ meeting_id: meeting.id })
              .eq('id', id);
          }
        }
      }

      await fetchRequests();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [requests, fetchRequests]);

  useEffect(() => {
    fetchAvailability();
    fetchRequests();
  }, [fetchAvailability, fetchRequests]);

  return {
    availability,
    requests,
    isLoading,
    error,
    fetchAvailability,
    fetchRequests,
    addAvailability,
    updateAvailability,
    deleteAvailability,
    createMeetingRequest,
    updateMeetingRequest,
  };
}
