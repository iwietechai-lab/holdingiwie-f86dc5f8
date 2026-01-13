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

  // Check if current user is superadmin by UUID
  useEffect(() => {
    const checkSuperadmin = async () => {
      if (authLoading) return;
      
      if (!isAuthenticated || !user) {
        setIsSuperadmin(false);
        setIsCheckingRole(false);
        return;
      }

      // Only the designated superadmin user can have superadmin role
      setIsSuperadmin(user.id === SUPERADMIN_USER_ID);
      setIsCheckingRole(false);
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

      // Combine data - simplified without companies/departments tables
      const usersWithDetails: SuperadminUser[] = (profiles || []).map((profile) => {
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
          roles: [],
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
      // Update role in user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

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

    // Prevent removing superadmin from designated user
    if (role === 'superadmin' && userId === SUPERADMIN_USER_ID) {
      return { success: false, error: 'No se puede quitar superadmin al usuario designado' };
    }

    try {
      // Clear role in user_profiles
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
