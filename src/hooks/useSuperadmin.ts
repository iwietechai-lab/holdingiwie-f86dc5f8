import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from './useSupabaseAuth';
import { 
  AppRole, 
  DbCompany, 
  DbDepartment, 
  SuperadminUser, 
  SuperadminUserProfile,
  DbUserRole,
  DashboardVisibility,
  SUPERADMIN_USER_ID,
  DEFAULT_DASHBOARD_VISIBILITY
} from '@/types/superadmin';

interface UseSuperadminReturn {
  isSuperadmin: boolean;
  isCheckingRole: boolean;
  users: SuperadminUser[];
  companies: DbCompany[];
  departments: DbDepartment[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  fetchCompanies: () => Promise<void>;
  fetchDepartments: () => Promise<void>;
  getDepartmentsByCompany: (companyId: string) => DbDepartment[];
  updateUserProfile: (userId: string, updates: Partial<SuperadminUserProfile>) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (userId: string, newRole: AppRole) => Promise<{ success: boolean; error?: string }>;
  updateDashboardVisibility: (userId: string, visibility: DashboardVisibility) => Promise<{ success: boolean; error?: string }>;
  removeUserRole: (userId: string, role: AppRole) => Promise<{ success: boolean; error?: string }>;
}

export function useSuperadmin(): UseSuperadminReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [users, setUsers] = useState<SuperadminUser[]>([]);
  const [companies, setCompanies] = useState<DbCompany[]>([]);
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is superadmin using RPC to avoid RLS recursion
  useEffect(() => {
    const checkSuperadmin = async () => {
      if (authLoading) return;
      
      if (!isAuthenticated || !user) {
        setIsSuperadmin(false);
        setIsCheckingRole(false);
        return;
      }

      // Only the designated superadmin user can have superadmin role
      if (user.id !== SUPERADMIN_USER_ID) {
        setIsSuperadmin(false);
        setIsCheckingRole(false);
        return;
      }

      try {
        // Use RPC to call the has_role function - avoids RLS recursion
        const { data, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'superadmin' });

        if (error) {
          console.error('Error checking superadmin role:', error);
          setIsSuperadmin(false);
        } else {
          setIsSuperadmin(!!data);
        }
      } catch (err) {
        console.error('Error checking superadmin:', err);
        setIsSuperadmin(false);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkSuperadmin();
  }, [user, isAuthenticated, authLoading]);

  const fetchUsers = useCallback(async () => {
    if (!isSuperadmin) return;
    
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

      if (rolesError) console.warn('Error fetching roles:', rolesError);

      // Fetch companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*');

      // Fetch departments
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('*');

      // Combine data
      const usersWithDetails: SuperadminUser[] = (profiles || []).map((profile) => {
        const userRoles = (roles || []).filter((r) => r.user_id === profile.id) as DbUserRole[];
        const company = companiesData?.find(c => c.id === profile.company_id) || null;
        const department = departmentsData?.find(d => d.id === profile.department_id) || null;

        return {
          ...profile,
          dashboard_visibility: profile.dashboard_visibility || DEFAULT_DASHBOARD_VISIBILITY,
          roles: userRoles,
          company,
          department,
        };
      });

      setUsers(usersWithDetails);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  }, [isSuperadmin]);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }, []);

  const getDepartmentsByCompany = useCallback((companyId: string): DbDepartment[] => {
    return departments.filter(d => d.company_id === companyId);
  }, [departments]);

  const updateUserProfile = useCallback(async (
    userId: string, 
    updates: Partial<SuperadminUserProfile>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error updating user profile:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar' };
    }
  }, [isSuperadmin, fetchUsers]);

  const updateUserRole = useCallback(async (
    userId: string,
    newRole: AppRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

    // Prevent assigning superadmin to anyone except the designated user
    if (newRole === 'superadmin' && userId !== SUPERADMIN_USER_ID) {
      return { success: false, error: 'Solo el usuario designado puede ser superadmin' };
    }

    try {
      // Remove existing roles for this user (except superadmin if it's the designated user)
      if (userId === SUPERADMIN_USER_ID) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .neq('role', 'superadmin');
      } else {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
      }

      // Add new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error updating role:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar rol' };
    }
  }, [isSuperadmin, fetchUsers]);

  const updateDashboardVisibility = useCallback(async (
    userId: string,
    visibility: DashboardVisibility
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          dashboard_visibility: visibility,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
      return { success: true };
    } catch (err) {
      console.error('Error updating visibility:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar visibilidad' };
    }
  }, [isSuperadmin, fetchUsers]);

  const removeUserRole = useCallback(async (
    userId: string,
    role: AppRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

    // Prevent removing superadmin from designated user
    if (role === 'superadmin' && userId === SUPERADMIN_USER_ID) {
      return { success: false, error: 'No se puede quitar superadmin al usuario designado' };
    }

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
  }, [isSuperadmin, fetchUsers]);

  // Initial data fetch when superadmin is confirmed
  useEffect(() => {
    if (isSuperadmin) {
      fetchUsers();
      fetchCompanies();
      fetchDepartments();
    }
  }, [isSuperadmin, fetchUsers, fetchCompanies, fetchDepartments]);

  return {
    isSuperadmin,
    isCheckingRole,
    users,
    companies,
    departments,
    isLoading,
    error,
    fetchUsers,
    fetchCompanies,
    fetchDepartments,
    getDepartmentsByCompany,
    updateUserProfile,
    updateUserRole,
    updateDashboardVisibility,
    removeUserRole,
  };
}
