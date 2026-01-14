import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type MeetingRequestStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'completada';
export type Priority = 'baja' | 'media' | 'alta' | 'urgente';

export interface MeetingRequest {
  id: string;
  creator_id: string;
  participants: string[];
  title: string;
  description: string | null;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  duration_minutes: number;
  priority: Priority;
  status: MeetingRequestStatus;
  video_url: string | null;
  room_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingRequestInput {
  creator_id: string;
  participants: string[];
  title: string;
  description?: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  duration_minutes: number;
  priority?: Priority;
}

export interface UseMeetingRequestsReturn {
  requests: MeetingRequest[];
  isLoading: boolean;
  error: string | null;
  fetchRequests: () => Promise<void>;
  createRequest: (request: CreateMeetingRequestInput) => Promise<{ success: boolean; error?: string; data?: MeetingRequest }>;
  updateRequest: (id: string, updates: Partial<MeetingRequest>) => Promise<{ success: boolean; error?: string }>;
  deleteRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  approveRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  rejectRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function useMeetingRequests(): UseMeetingRequestsReturn {
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('meeting_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (queryError) throw queryError;
      
      const mappedData = (data || []).map(item => ({
        ...item,
        participants: Array.isArray(item.participants) ? item.participants : [],
      })) as MeetingRequest[];
      
      setRequests(mappedData);
    } catch (err: any) {
      console.error('Error fetching meeting requests:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (request: CreateMeetingRequestInput) => {
    try {
      const { data, error: insertError } = await supabase
        .from('meeting_requests')
        .insert({
          ...request,
          participants: request.participants,
          priority: request.priority || 'media',
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Create notifications for all participants
      for (const participantId of request.participants) {
        if (participantId !== request.creator_id) {
          await supabase.rpc('create_notification', {
            p_user_id: participantId,
            p_title: 'Nueva solicitud de reunión',
            p_message: `Has sido invitado a la reunión: ${request.title}`,
            p_type: 'meeting',
            p_priority: request.priority || 'media',
            p_action_url: '/reuniones',
            p_company_id: null,
          });
        }
      }
      
      await fetchRequests();
      toast.success('Solicitud de reunión creada');
      return { success: true, data: data as MeetingRequest };
    } catch (err: any) {
      console.error('Error creating meeting request:', err);
      toast.error(err.message || 'Error al crear solicitud');
      return { success: false, error: err.message };
    }
  }, [fetchRequests]);

  const updateRequest = useCallback(async (id: string, updates: Partial<MeetingRequest>) => {
    try {
      const { error: updateError } = await supabase
        .from('meeting_requests')
        .update(updates)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      await fetchRequests();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating meeting request:', err);
      toast.error(err.message || 'Error al actualizar solicitud');
      return { success: false, error: err.message };
    }
  }, [fetchRequests]);

  const deleteRequest = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('meeting_requests')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Solicitud eliminada');
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting meeting request:', err);
      toast.error(err.message || 'Error al eliminar solicitud');
      return { success: false, error: err.message };
    }
  }, []);

  const approveRequest = useCallback(async (id: string) => {
    try {
      const request = requests.find(r => r.id === id);
      if (!request) throw new Error('Solicitud no encontrada');
      
      const videoUrl = `/videollamada/${request.room_id}`;
      
      const { error: updateError } = await supabase
        .from('meeting_requests')
        .update({ 
          status: 'aprobada',
          video_url: videoUrl,
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Notify all participants
      for (const participantId of request.participants) {
        await supabase.rpc('create_notification', {
          p_user_id: participantId,
          p_title: 'Reunión aprobada',
          p_message: `La reunión "${request.title}" ha sido aprobada`,
          p_type: 'meeting',
          p_priority: request.priority,
          p_action_url: videoUrl,
          p_company_id: null,
        });
      }
      
      // Notify creator too
      await supabase.rpc('create_notification', {
        p_user_id: request.creator_id,
        p_title: 'Reunión aprobada',
        p_message: `Tu solicitud de reunión "${request.title}" ha sido aprobada`,
        p_type: 'meeting',
        p_priority: request.priority,
        p_action_url: videoUrl,
        p_company_id: null,
      });
      
      await fetchRequests();
      toast.success('Reunión aprobada');
      return { success: true };
    } catch (err: any) {
      console.error('Error approving meeting request:', err);
      toast.error(err.message || 'Error al aprobar solicitud');
      return { success: false, error: err.message };
    }
  }, [requests, fetchRequests]);

  const rejectRequest = useCallback(async (id: string) => {
    try {
      const request = requests.find(r => r.id === id);
      if (!request) throw new Error('Solicitud no encontrada');
      
      const { error: updateError } = await supabase
        .from('meeting_requests')
        .update({ status: 'rechazada' })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Notify creator
      await supabase.rpc('create_notification', {
        p_user_id: request.creator_id,
        p_title: 'Reunión rechazada',
        p_message: `Tu solicitud de reunión "${request.title}" ha sido rechazada`,
        p_type: 'meeting',
        p_priority: request.priority,
        p_action_url: '/reuniones',
        p_company_id: null,
      });
      
      await fetchRequests();
      toast.success('Reunión rechazada');
      return { success: true };
    } catch (err: any) {
      console.error('Error rejecting meeting request:', err);
      toast.error(err.message || 'Error al rechazar solicitud');
      return { success: false, error: err.message };
    }
  }, [requests, fetchRequests]);

  useEffect(() => {
    fetchRequests();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('meeting-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  return {
    requests,
    isLoading,
    error,
    fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    approveRequest,
    rejectRequest,
  };
}
