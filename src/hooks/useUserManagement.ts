import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPERADMIN_USER_ID } from '@/types/superadmin';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  company_id: string | null;
  department: string | null;
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
      // Get current user to verify superadmin status
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Check if current user is superadmin using RPC (avoids RLS recursion)
      const { data: isSuperadmin } = await supabase.rpc('has_role', {
        _user_id: currentUser.id,
        _role: 'superadmin'
      });

      // Also check by UUID for hardcoded superadmin
      const isHardcodedSuperadmin = currentUser.id === SUPERADMIN_USER_ID;
      
      if (!isSuperadmin && !isHardcodedSuperadmin) {
        throw new Error('No tienes permisos para ver usuarios');
      }

      // Try to fetch using RPC function first (if it exists)
      // This bypasses RLS for superadmin
      let profiles: any[] = [];
      let roles: any[] = [];
      let accessLogs: any[] = [];

      // Try RPC call for profiles (security definer)
      const { data: rpcProfiles, error: rpcProfilesError } = await supabase.rpc('get_all_user_profiles');
      
      if (rpcProfilesError) {
        console.log('RPC get_all_user_profiles not available, using direct query');
        // Fallback to direct query - will work if user has RLS permissions
        const { data: directProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }
        profiles = directProfiles || [];
      } else {
        profiles = rpcProfiles || [];
      }

      // Try RPC call for roles (security definer)
      const { data: rpcRoles, error: rpcRolesError } = await supabase.rpc('get_all_user_roles');
      
      if (rpcRolesError) {
        console.log('RPC get_all_user_roles not available, using direct query');
        // Fallback - this may fail with RLS recursion
        const { data: directRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');
        
        if (rolesError) {
          console.warn('Could not fetch roles:', rolesError);
          // Don't throw - continue with empty roles
        } else {
          roles = directRoles || [];
        }
      } else {
        roles = rpcRoles || [];
      }

      // Fetch access logs (usually has simpler RLS)
      const { data: logsData, error: logsError } = await supabase
        .from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      
      if (!logsError) {
        accessLogs = logsData || [];
      }

      // Combine data
      const usersWithDetails: UserWithDetails[] = profiles.map((profile) => {
        const userRoles = roles.filter((r) => r.user_id === profile.id);
        const userLogs = accessLogs.filter((l) => l.user_id === profile.id);
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
      // Remove has_full_access from updates if it exists - it's stored separately
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
      department: string;
      has_full_access: boolean;
    }
  ) => {
    try {
      const { has_full_access, ...profileUpdates } = updates;
      
      // Update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          ...profileUpdates,
          has_full_access,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

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
    updateUserWithFullAccess,
    deleteUser,
    getAccessLogsByUser,
  };
}
