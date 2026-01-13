import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPERADMIN_USER_ID } from '@/types/superadmin';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  company_id: string | null;
  avatar_url: string | null;
  created_at: string | null;
  has_full_access: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'superadmin' | 'manager' | 'employee';
}

export interface AccessLog {
  id: string;
  user_id: string;
  timestampt: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  device_info: string | null;
  success: boolean | null;
}

export interface UserWithDetails extends UserProfile {
  roles: UserRole[];
  accessLogs: AccessLog[];
  lastAccess: string | null;
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current user to verify superadmin status
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Check by UUID for hardcoded superadmin
      const isHardcodedSuperadmin = currentUser.id === SUPERADMIN_USER_ID;
      
      if (!isHardcodedSuperadmin) {
        throw new Error('No tienes permisos para ver usuarios');
      }

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Fetch access logs
      const { data: logsData, error: logsError } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestampt', { ascending: false })
        .limit(500);
      
      const accessLogs = logsError ? [] : (logsData || []);

      // Combine data
      const usersWithDetails: UserWithDetails[] = (profiles || []).map((profile) => {
        const userLogs = accessLogs.filter((l) => l.user_id === profile.id);
        const lastAccess = userLogs.length > 0 ? userLogs[0].timestampt : null;

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          company_id: profile.company_id,
          avatar_url: null,
          created_at: profile.created_at,
          has_full_access: profile.id === SUPERADMIN_USER_ID,
          roles: [],
          accessLogs: userLogs as AccessLog[],
          lastAccess,
        };
      });

      setUsers(usersWithDetails);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addRole = async (userId: string, role: 'superadmin' | 'manager' | 'employee') => {
    try {
      // Update role in user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error adding role:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al agregar rol' };
    }
  };

  const removeRole = async (userId: string, role: 'superadmin' | 'manager' | 'employee') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: 'user' })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error removing role:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar rol' };
    }
  };

  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      // Remove has_full_access from updates if it exists - it's computed
      const { has_full_access, ...profileUpdates } = updates as any;
      
      const { error } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error updating user:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar usuario' };
    }
  };

  const updateUserWithFullAccess = async (
    userId: string,
    updates: {
      full_name: string;
      role: string;
      company_id: string;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: updates.full_name,
          role: updates.role,
          company_id: updates.company_id,
        })
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error updating user:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar usuario' };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete profile
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error deleting user:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar usuario' };
    }
  };

  const getAccessLogsByUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestampt', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('Error fetching access logs:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al cargar logs', data: [] };
    }
  };

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    addRole,
    removeRole,
    updateUserProfile,
    updateUserWithFullAccess,
    deleteUser,
    getAccessLogsByUser,
  };
}
