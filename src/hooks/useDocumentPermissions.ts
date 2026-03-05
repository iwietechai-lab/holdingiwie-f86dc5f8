import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from './useSupabaseAuth';
import { logger } from '@/utils/logger';

interface DocumentPermission {
  id: string;
  document_id: string;
  user_id: string;
  granted_by: string;
  granted_at: string;
}

interface DocumentAccessRequest {
  id: string;
  document_id: string;
  requester_id: string;
  owner_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface UserInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
  role: string | null;
}

export function useDocumentPermissions() {
  const { user } = useSupabaseAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch all users for the permission selector
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, company_id, role')
        .order('full_name');

      if (error) throw error;
      setUsers((data || []) as UserInfo[]);
    } catch (err) {
      logger.error('Error fetching users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Get permissions for a specific document
  const getDocumentPermissions = useCallback(async (documentId: string): Promise<DocumentPermission[]> => {
    try {
      const { data, error } = await supabase
        .from('document_permissions')
        .select('*')
        .eq('document_id', documentId);

      if (error) throw error;
      return (data || []) as DocumentPermission[];
    } catch (err) {
      logger.error('Error getting document permissions:', err);
      return [];
    }
  }, []);

  // Grant permission to a user
  const grantPermission = useCallback(async (documentId: string, userId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('document_permissions')
        .insert({
          document_id: documentId,
          user_id: userId,
          granted_by: user.id,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error granting permission:', err);
      return false;
    }
  }, [user]);

  // Grant permissions to multiple users at once
  const grantPermissions = useCallback(async (documentId: string, userIds: string[], documentName?: string, filePath?: string): Promise<boolean> => {
    if (!user || userIds.length === 0) return true;
    try {
      const permissions = userIds.map(userId => ({
        document_id: documentId,
        user_id: userId,
        granted_by: user.id,
      }));

      const { error } = await supabase
        .from('document_permissions')
        .insert(permissions);

      if (error) throw error;

      // Check if CEO/superadmin is included - send to CEOChat
      const { data: superadmins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'superadmin');
      
      const superadminIds = (superadmins || []).map(s => s.user_id);
      const ceoIncluded = userIds.some(id => superadminIds.includes(id));
      
      if (ceoIncluded && documentName) {
        // Get document URL if available
        let fileUrl = '';
        if (filePath) {
          const { data: urlData } = supabase.storage
            .from('documentos')
            .getPublicUrl(filePath);
          fileUrl = urlData?.publicUrl || '';
        }
        
        // Create CEO submission
        await supabase.from('ceo_team_submissions').insert({
          title: documentName,
          content: `Documento compartido desde Gestor de Documentos`,
          file_url: fileUrl,
          file_name: documentName,
          submission_type: 'documento',
          submitted_by: user.id,
          notify_ceo: true,
          source_type: 'document_manager',
          source_reference_id: documentId,
        });
        
        // Notify user
        logger.log('Document sent to CEOChat for CEO review');
      }

      // Create notifications for users who received access
      for (const userId of userIds) {
        if (userId !== user.id) {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: 'Acceso a documento otorgado',
            message: documentName 
              ? `Se te ha otorgado acceso al documento: "${documentName}"`
              : 'Se te ha otorgado acceso a un nuevo documento',
            type: 'document_access_granted',
            document_id: documentId,
            action_url: '/gestor-documentos',
          });
        }
      }

      return true;
    } catch (err) {
      logger.error('Error granting permissions:', err);
      return false;
    }
  }, [user]);

  // Revoke permission from a user
  const revokePermission = useCallback(async (documentId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('document_permissions')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error revoking permission:', err);
      return false;
    }
  }, []);

  // Check if current user has access to a document
  const hasAccess = useCallback(async (documentId: string, ownerId: string): Promise<boolean> => {
    if (!user) return false;
    
    // Owner always has access
    if (user.id === ownerId) return true;

    try {
      // Check if user has explicit permission
      const { data, error } = await supabase
        .from('document_permissions')
        .select('id')
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (err) {
      logger.error('Error checking access:', err);
      return false;
    }
  }, [user]);

  // Request access to a document
  const requestAccess = useCallback(async (documentId: string, ownerId: string, message?: string): Promise<boolean> => {
    if (!user) return false;
    try {
      // Check if request already exists
      const { data: existing } = await supabase
        .from('document_access_requests')
        .select('id, status')
        .eq('document_id', documentId)
        .eq('requester_id', user.id)
        .single();

      if (existing) {
        if (existing.status === 'pending') {
          // Already has pending request
          return false;
        }
        // Update existing rejected request to pending
        const { error } = await supabase
          .from('document_access_requests')
          .update({ status: 'pending', message, resolved_at: null })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create new request
        const { error } = await supabase
          .from('document_access_requests')
          .insert({
            document_id: documentId,
            requester_id: user.id,
            owner_id: ownerId,
            message,
          });
        if (error) throw error;
      }

      // Create notification for document owner
      await supabase.from('notifications').insert({
        user_id: ownerId,
        title: 'Solicitud de acceso a documento',
        message: `Un usuario ha solicitado acceso a uno de tus documentos${message ? `: "${message}"` : ''}`,
        type: 'document_access_request',
        document_id: documentId,
        action_url: '/gestor-documentos',
      });

      return true;
    } catch (err) {
      logger.error('Error requesting access:', err);
      return false;
    }
  }, [user]);

  // Get pending access requests for documents owned by user
  const getPendingRequests = useCallback(async (): Promise<(DocumentAccessRequest & { requester?: UserInfo, document_name?: string })[]> => {
    if (!user) return [];
    try {
      const { data: requests, error } = await supabase
        .from('document_access_requests')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      // Get requester info and document names
      const requesterIds = [...new Set(requests.map(r => r.requester_id))];
      const documentIds = [...new Set(requests.map(r => r.document_id))];

      const [{ data: userProfiles }, { data: documents }] = await Promise.all([
        supabase.from('user_profiles').select('id, full_name, email').in('id', requesterIds),
        supabase.from('documentos').select('id, nombre').in('id', documentIds),
      ]);

      return (requests as DocumentAccessRequest[]).map(req => ({
        ...req,
        requester: (userProfiles || []).find((u: any) => u.id === req.requester_id) as UserInfo | undefined,
        document_name: (documents || []).find((d: any) => d.id === req.document_id)?.nombre,
      }));
    } catch (err) {
      logger.error('Error getting pending requests:', err);
      return [];
    }
  }, [user]);

  // Approve access request
  const approveRequest = useCallback(async (requestId: string, documentId: string, requesterId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      // Grant permission
      await supabase.from('document_permissions').insert({
        document_id: documentId,
        user_id: requesterId,
        granted_by: user.id,
      });

      // Update request status
      await supabase
        .from('document_access_requests')
        .update({ status: 'approved', resolved_at: new Date().toISOString() })
        .eq('id', requestId);

      // Notify requester
      await supabase.from('notifications').insert({
        user_id: requesterId,
        title: 'Acceso a documento aprobado',
        message: 'Tu solicitud de acceso a un documento ha sido aprobada',
        type: 'document_access_approved',
        document_id: documentId,
        action_url: '/gestor-documentos',
      });

      return true;
    } catch (err) {
      logger.error('Error approving request:', err);
      return false;
    }
  }, [user]);

  // Reject access request
  const rejectRequest = useCallback(async (requestId: string, documentId: string, requesterId: string): Promise<boolean> => {
    try {
      await supabase
        .from('document_access_requests')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', requestId);

      // Notify requester
      await supabase.from('notifications').insert({
        user_id: requesterId,
        title: 'Acceso a documento rechazado',
        message: 'Tu solicitud de acceso a un documento ha sido rechazada',
        type: 'document_access_rejected',
        document_id: documentId,
        action_url: '/gestor-documentos',
      });

      return true;
    } catch (err) {
      logger.error('Error rejecting request:', err);
      return false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  return {
    users,
    isLoadingUsers,
    fetchUsers,
    getDocumentPermissions,
    grantPermission,
    grantPermissions,
    revokePermission,
    hasAccess,
    requestAccess,
    getPendingRequests,
    approveRequest,
    rejectRequest,
  };
}
