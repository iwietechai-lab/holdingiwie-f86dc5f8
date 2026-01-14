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
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  // Check superadmin status first
  const checkSuperadminStatus = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('is_superadmin');
      
      if (rpcError) {
        console.error('Error checking superadmin:', rpcError);
        return false;
      }
      
      return data === true;
    } catch (err) {
      console.error('Error in superadmin check:', err);
      return false;
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check superadmin status using SECURITY DEFINER function
      const superadminStatus = await checkSuperadminStatus();
      setIsSuperadmin(superadminStatus);
      
      if (!superadminStatus) {
        throw new Error('No tienes permisos para ver usuarios');
      }

      // Fetch profiles - RLS will allow superadmin to see all
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      const userRoles = rolesError ? [] : (rolesData || []);

      // Fetch access logs - RLS will allow superadmin to see all
      const { data: logsData, error: logsError } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestampt', { ascending: false })
        .limit(500);
      
      const accessLogs = logsError ? [] : (logsData || []);

      // Combine data
      const usersWithDetails: UserWithDetails[] = (profiles || []).map((profile) => {
        const roles = userRoles
          .filter((r: any) => r.user_id === profile.id)
          .map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            role: r.role,
          }));
        
        const userLogs = accessLogs.filter((l) => l.user_id === profile.id);
        const lastAccess = userLogs.length > 0 ? userLogs[0].timestampt : null;
        const hasSuperadminRole = roles.some((r: UserRole) => r.role === 'superadmin');

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          company_id: profile.company_id,
          avatar_url: null,
          created_at: profile.created_at,
          has_full_access: hasSuperadminRole,
          roles: roles,
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
  }, [checkSuperadminStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addRole = async (userId: string, role: 'superadmin' | 'manager' | 'employee') => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

    try {
      // Insert role into user_roles table
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select();

      if (error) throw error;
      
      // Also update role in user_profiles for compatibility
      await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId);

      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error adding role:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al agregar rol' };
    }
  };

  const removeRole = async (userId: string, role: 'superadmin' | 'manager' | 'employee') => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
      
      // Update user_profiles role to 'user'
      await supabase
        .from('user_profiles')
        .update({ role: 'user' })
        .eq('id', userId);

      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error removing role:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar rol' };
    }
  };

  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

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
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

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
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

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
    isSuperadmin,
    fetchUsers,
    addRole,
    removeRole,
    updateUserProfile,
    updateUserWithFullAccess,
    deleteUser,
    getAccessLogsByUser,
  };
}
