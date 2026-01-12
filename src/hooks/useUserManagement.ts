import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  company_id: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'superadmin' | 'manager' | 'employee';
}

export interface AccessLog {
  id: string;
  user_id: string;
  timestamp: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  user_agent: string | null;
  success: boolean;
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
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      // Fetch access logs (last 100 per user)
      const { data: accessLogs, error: logsError } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      // Combine data
      const usersWithDetails: UserWithDetails[] = (profiles || []).map((profile) => {
        const userRoles = (roles || []).filter((r) => r.user_id === profile.id);
        const userLogs = (accessLogs || []).filter((l) => l.user_id === profile.id);
        const lastAccess = userLogs.length > 0 ? userLogs[0].timestamp : null;

        return {
          ...profile,
          roles: userRoles,
          accessLogs: userLogs,
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
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

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
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

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
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
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
      // First delete roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Delete profile (this may cascade delete other related data)
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
        .order('timestamp', { ascending: false })
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
    deleteUser,
    getAccessLogsByUser,
  };
}
