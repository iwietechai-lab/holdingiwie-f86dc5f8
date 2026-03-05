import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardVisibility } from '@/types/superadmin';
import { useSupabaseAuth } from './useSupabaseAuth';
import { logger } from '@/utils/logger';

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
  const { user } = useSupabaseAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  const checkSuperadminStatus = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('is_superadmin');
      
      if (rpcError) {
        logger.error('Error checking superadmin:', rpcError);
        return false;
      }
      
      return data === true;
    } catch (err) {
      logger.error('Error in superadmin check:', err);
      return false;
    }
  }, []);

  const checkUserManagementPermission = useCallback(async (): Promise<{ canManage: boolean; companyId: string | null }> => {
    try {
      if (!user) return { canManage: false, companyId: null };

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id, dashboard_visibility')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) return { canManage: false, companyId: null };

      const visibility = profile.dashboard_visibility as unknown as DashboardVisibility | null;
      const hasPermission = visibility?.gestionar_usuarios === true;
      
      return {
        canManage: hasPermission, 
        companyId: profile.company_id 
      };
    } catch (err) {
      logger.error('Error checking management permission:', err);
      return { canManage: false, companyId: null };
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const superadminStatus = await checkSuperadminStatus();
      setIsSuperadmin(superadminStatus);
      
      const { canManage, companyId } = await checkUserManagementPermission();
      setCanManageUsers(canManage);
      setUserCompanyId(companyId);

      if (!superadminStatus && !canManage) {
        throw new Error('No tienes permisos para ver usuarios');
      }

      let query = supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!superadminStatus && canManage && companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data: profiles, error: profilesError } = await query;
      
      if (profilesError) {
        logger.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      const userRoles = rolesError ? [] : (rolesData || []);

      let logsQuery = supabase
        .from('access_logs')
        .select('*')
        .order('timestampt', { ascending: false })
        .limit(500);

      if (!superadminStatus && canManage && companyId && profiles) {
        const userIds = profiles.map(p => p.id);
        if (userIds.length > 0) {
          logsQuery = logsQuery.in('user_id', userIds);
        }
      }

      const { data: logsData, error: logsError } = await logsQuery;
      const accessLogs = logsError ? [] : (logsData || []);

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
      logger.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, [checkSuperadminStatus, checkUserManagementPermission]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addRole = async (userId: string, role: 'superadmin' | 'manager' | 'employee') => {
    if (!isSuperadmin) {
      return { success: false, error: 'Solo superadmin puede modificar roles' };
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select();

      if (error) throw error;
      
      await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId);

      await fetchUsers();
      return { success: true };
    } catch (err) {
      logger.error('Error adding role:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al agregar rol' };
    }
  };

  const removeRole = async (userId: string, role: 'superadmin' | 'manager' | 'employee') => {
    if (!isSuperadmin) {
      return { success: false, error: 'Solo superadmin puede modificar roles' };
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
      
      await supabase
        .from('user_profiles')
        .update({ role: 'user' })
        .eq('id', userId);

      await fetchUsers();
      return { success: true };
    } catch (err) {
      logger.error('Error removing role:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar rol' };
    }
  };

  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    if (!isSuperadmin && !canManageUsers) {
      return { success: false, error: 'No autorizado' };
    }

    if (!isSuperadmin && canManageUsers) {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser?.company_id !== userCompanyId) {
        return { success: false, error: 'Solo puedes editar usuarios de tu empresa' };
      }
    }

    try {
      const { has_full_access, ...profileUpdates } = updates as any;
      
      const { error } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      logger.error('Error updating user:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar usuario' };
    }
  };

  const updateUserWithFullAccess = async (
    userId: string,
    updates: {
      full_name: string;
      role: string;
      company_id: string;
      department?: string;
    }
  ) => {
    if (!isSuperadmin && !canManageUsers) {
      return { success: false, error: 'No autorizado' };
    }

    if (!isSuperadmin && canManageUsers) {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser?.company_id !== userCompanyId) {
        return { success: false, error: 'Solo puedes editar usuarios de tu empresa' };
      }
      if (updates.company_id !== userCompanyId) {
        return { success: false, error: 'No puedes cambiar la empresa del usuario' };
      }
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
      logger.error('Error updating user:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar usuario' };
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isSuperadmin) {
      return { success: false, error: 'Solo superadmin puede eliminar usuarios' };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      logger.error('Error deleting user:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar usuario' };
    }
  };

  const getAccessLogsByUser = async (userId: string) => {
    try {
      if (!isSuperadmin && canManageUsers) {
        const targetUser = users.find(u => u.id === userId);
        if (targetUser?.company_id !== userCompanyId) {
          return { success: false, error: 'No autorizado', data: [] };
        }
      }

      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestampt', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      logger.error('Error fetching access logs:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al cargar logs', data: [] };
    }
  };

  return {
    users,
    isLoading,
    error,
    isSuperadmin,
    canManageUsers,
    userCompanyId,
    fetchUsers,
    addRole,
    removeRole,
    updateUserProfile,
    updateUserWithFullAccess,
    deleteUser,
    getAccessLogsByUser,
  };
}