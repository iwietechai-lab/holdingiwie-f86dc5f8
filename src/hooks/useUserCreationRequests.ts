import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardVisibility, DEFAULT_DASHBOARD_VISIBILITY } from '@/types/superadmin';

export interface UserCreationRequest {
  id: string;
  requested_by: string;
  company_id: string;
  full_name: string;
  email: string;
  proposed_role: string;
  department_id: string | null;
  gerencia_id: string | null;
  area_id: string | null;
  position_id: string | null;
  justification: string | null;
  access_permissions: DashboardVisibility;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  requester_name?: string;
  reviewer_name?: string;
}

export function useUserCreationRequests(companyId?: string) {
  const [requests, setRequests] = useState<UserCreationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('user_creation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Get requester names
      if (data && data.length > 0) {
        const requesterIds = [...new Set(data.map(r => r.requested_by))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', requesterIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        const requestsWithNames: UserCreationRequest[] = data.map(req => ({
          id: req.id,
          requested_by: req.requested_by,
          company_id: req.company_id,
          full_name: req.full_name,
          email: req.email,
          proposed_role: req.proposed_role,
          department_id: req.department_id,
          gerencia_id: req.gerencia_id,
          area_id: req.area_id,
          position_id: req.position_id,
          justification: req.justification,
          access_permissions: (req.access_permissions as unknown as DashboardVisibility) || DEFAULT_DASHBOARD_VISIBILITY,
          status: req.status as 'pendiente' | 'aprobada' | 'rechazada',
          reviewed_by: req.reviewed_by,
          reviewed_at: req.reviewed_at,
          review_notes: req.review_notes,
          created_at: req.created_at || new Date().toISOString(),
          updated_at: req.updated_at || new Date().toISOString(),
          requester_name: profileMap.get(req.requested_by) || 'Usuario desconocido',
        }));

        setRequests(requestsWithNames);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Error fetching user creation requests:', err);
      setError('Error al cargar solicitudes');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const createRequest = async (request: {
    company_id: string;
    full_name: string;
    email: string;
    proposed_role: string;
    department_id?: string;
    gerencia_id?: string;
    area_id?: string;
    position_id?: string;
    justification?: string;
    access_permissions?: Partial<DashboardVisibility>;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error: insertError } = await supabase
        .from('user_creation_requests')
        .insert({
          requested_by: user.id,
          company_id: request.company_id,
          full_name: request.full_name,
          email: request.email,
          proposed_role: request.proposed_role,
          department_id: request.department_id || null,
          gerencia_id: request.gerencia_id || null,
          area_id: request.area_id || null,
          position_id: request.position_id || null,
          justification: request.justification || null,
          access_permissions: {
            ...DEFAULT_DASHBOARD_VISIBILITY,
            ...request.access_permissions,
          },
        });

      if (insertError) throw insertError;

      // Create notification for a superadmin in the same company (no hardcoded user IDs)
      try {
        const { data: superadminProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('company_id', request.company_id)
          .eq('role', 'superadmin')
          .limit(1)
          .maybeSingle();

        if (superadminProfile?.id) {
          await supabase.rpc('create_notification', {
            p_user_id: superadminProfile.id,
            p_company_id: request.company_id,
            p_title: 'Nueva solicitud de usuario',
            p_message: `${request.full_name} ha sido solicitado para unirse como ${request.proposed_role}`,
            p_type: 'user_request',
            p_priority: 'alta',
          });
        }
      } catch (notificationError) {
        console.warn('No se pudo notificar al superadmin:', notificationError);
      }

      await fetchRequests();
      return { success: true };
    } catch (err) {
      console.error('Error creating user creation request:', err);
      return { success: false, error: 'Error al crear solicitud' };
    }
  };

  const reviewRequest = async (
    requestId: string,
    status: 'aprobada' | 'rechazada',
    reviewNotes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error: updateError } = await supabase
        .from('user_creation_requests')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, create notification to requester
      const request = requests.find(r => r.id === requestId);
      if (request) {
        await supabase.rpc('create_notification', {
          p_user_id: request.requested_by,
          p_company_id: request.company_id,
          p_title: status === 'aprobada' 
            ? 'Solicitud de usuario aprobada' 
            : 'Solicitud de usuario rechazada',
          p_message: status === 'aprobada'
            ? `Tu solicitud para agregar a ${request.full_name} ha sido aprobada`
            : `Tu solicitud para agregar a ${request.full_name} ha sido rechazada`,
          p_type: 'user_request_response',
          p_priority: 'media',
        });
      }

      await fetchRequests();
      return { success: true };
    } catch (err) {
      console.error('Error reviewing request:', err);
      return { success: false, error: 'Error al procesar solicitud' };
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('user_creation_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_creation_requests',
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
    reviewRequest,
    pendingCount: requests.filter(r => r.status === 'pendiente').length,
  };
}
