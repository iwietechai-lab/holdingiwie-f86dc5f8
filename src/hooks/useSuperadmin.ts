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

  // Check if current user is superadmin using SECURITY DEFINER function
  useEffect(() => {
    const checkSuperadmin = async () => {
      if (authLoading) return;
      
      if (!isAuthenticated || !user) {
        setIsSuperadmin(false);
        setIsCheckingRole(false);
        return;
      }

      try {
        // Use the SECURITY DEFINER function to check superadmin status
        const { data, error: rpcError } = await supabase.rpc('is_superadmin');
        
        if (rpcError) {
          console.error('Error checking superadmin status:', rpcError);
          setIsSuperadmin(false);
        } else {
          console.log('Superadmin check result:', data);
          setIsSuperadmin(data === true);
        }
      } catch (err) {
        console.error('Error in superadmin check:', err);
        setIsSuperadmin(false);
      }
      
      setIsCheckingRole(false);
    };

    checkSuperadmin();
  }, [user, isAuthenticated, authLoading]);

  const fetchUsers = useCallback(async () => {
    if (!isSuperadmin) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch user profiles - superadmin can see all due to RLS policy
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.warn('Error fetching roles:', rolesError);
      }

      // Combine data
      const usersWithDetails: SuperadminUser[] = (profiles || []).map((profile) => {
        const userRoles = (roles || [])
          .filter((r: any) => r.user_id === profile.id)
          .map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            role: r.role as AppRole,
            created_at: r.created_at,
          }));

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: null,
          company_id: profile.company_id,
          department_id: null,
          position: null,
          dashboard_visibility: DEFAULT_DASHBOARD_VISIBILITY,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          roles: userRoles,
          company: null,
          department: null,
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
    // Companies table may not exist yet - silently handle
    setCompanies([]);
  }, []);

  const fetchDepartments = useCallback(async () => {
    // Departments table may not exist yet - silently handle
    setDepartments([]);
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
          full_name: updates.full_name,
          company_id: updates.company_id,
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

  // Map AppRole to valid database roles
  const mapAppRoleToDbRole = (appRole: AppRole): 'superadmin' | 'admin' | 'manager' | 'employee' | 'user' => {
    const roleMapping: Record<AppRole, 'superadmin' | 'admin' | 'manager' | 'employee' | 'user'> = {
      'superadmin': 'superadmin',
      'ceo': 'admin',
      'gerente_area': 'manager',
      'lider_area': 'manager',
      'jefe_area': 'manager',
      'jefe_seccion': 'manager',
      'colaborador': 'employee',
      'investigador': 'employee',
      'asesor': 'user',
    };
    return roleMapping[appRole] || 'user';
  };

  const updateUserRole = useCallback(async (
    userId: string,
    newRole: AppRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

    try {
      // Map the app role to a valid database role
      const dbRole = mapAppRoleToDbRole(newRole);
      
      // Remove existing roles for this user (except superadmin if they're not the target)
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .neq('role', 'superadmin');

      if (deleteError) {
        console.error('Error deleting existing roles:', deleteError);
        throw deleteError;
      }

      // Add new role if not superadmin (superadmin role should not be assigned this way)
      if (newRole !== 'superadmin') {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: dbRole });

        if (insertError) {
          console.error('Error inserting new role:', insertError);
          throw insertError;
        }
      }

      // Also update role in user_profiles for display purposes (stores the app role name)
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user_profiles role:', error);
        throw error;
      }
      
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

    // Dashboard visibility not in current schema - log only
    console.log('Dashboard visibility update requested:', userId, visibility);
    return { success: true };
  }, [isSuperadmin]);

  const removeUserRole = useCallback(async (
    userId: string,
    role: AppRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSuperadmin) {
      return { success: false, error: 'No autorizado' };
    }

    try {
      // Map app role to db role
      const dbRole = mapAppRoleToDbRole(role);
      
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', dbRole);

      if (error) throw error;
      
      // Update user_profiles role to 'colaborador' if removing their role
      await supabase
        .from('user_profiles')
        .update({ role: 'colaborador' })
        .eq('id', userId);

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
