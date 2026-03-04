import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DashboardVisibility, DEFAULT_DASHBOARD_VISIBILITY } from '@/types/superadmin';
import { resetGlobalVerification, clearVerificationStorage } from '@/utils/verificationState';

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string | null;
  company_id: string | null;
  has_full_access: boolean;
  avatar_url?: string | null;
  dashboard_visibility: DashboardVisibility;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface LocationData {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

export const useSupabaseAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const checkIsSuperadmin = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_superadmin');
      if (error) {
        console.error('Error checking superadmin status:', error);
        return false;
      }
      return !!data;
    } catch {
      return false;
    }
  }, []);

  const FULL_ACCESS_VISIBILITY: DashboardVisibility = {
    ...DEFAULT_DASHBOARD_VISIBILITY,
    ver_dashboard: true,
    ver_ventas: true,
    ver_documentos: true,
    ver_chat_interno: true,
    ver_tareas: true,
    ver_tickets: true,
    ver_reuniones: true,
    ver_estructura_org: true,
    acceso_chatbot_empresa: true,
    acceso_chatbot_ceo: true,
    gestionar_usuarios: true,
    gestionar_conocimiento: true,
    ver_reportes: true,
    ver_logs: true,
  };

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // Check superadmin status via RPC
      const isSuperadmin = await checkIsSuperadmin(userId);

      // Direct query for user profile including dashboard_visibility
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, company_id, dashboard_visibility')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        if (isSuperadmin) {
          return {
            id: userId,
            full_name: null,
            role: 'superadmin',
            company_id: null,
            has_full_access: true,
            dashboard_visibility: FULL_ACCESS_VISIBILITY,
          };
        }
        return null;
      }

      // Parse dashboard_visibility from JSON, with defaults
      const rawVisibility = data?.dashboard_visibility;
      const dashboardVisibility: DashboardVisibility = rawVisibility && typeof rawVisibility === 'object' && !Array.isArray(rawVisibility)
        ? { ...DEFAULT_DASHBOARD_VISIBILITY, ...(rawVisibility as unknown as Partial<DashboardVisibility>) }
        : DEFAULT_DASHBOARD_VISIBILITY;

      // For superadmin, grant all permissions
      if (isSuperadmin) {
        return {
          id: data?.id || userId,
          full_name: data?.full_name || null,
          role: 'superadmin',
          company_id: data?.company_id || null,
          has_full_access: true,
          dashboard_visibility: FULL_ACCESS_VISIBILITY,
        };
      }

      return {
        id: data?.id || userId,
        full_name: data?.full_name || null,
        role: data?.role || 'user',
        company_id: data?.company_id || null,
        has_full_access: false,
        dashboard_visibility: dashboardVisibility,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, [checkIsSuperadmin]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session ? 'has session' : 'no session');
        
        setAuthState(prev => ({
          ...prev,
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
          isLoading: false,
        }));

        // Fetch profile in background when user logs in
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id).then(profile => {
              setAuthState(prev => ({
                ...prev,
                profile,
              }));
            });
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            profile: null,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Handle session errors (like invalid refresh token)
      if (error) {
        console.error('Error getting session:', error);
        // Clear any invalid session state and redirect to login
        setAuthState({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }
      
      setAuthState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
      }));

      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setAuthState(prev => ({
            ...prev,
            profile,
          }));
        });
      }
    }).catch(err => {
      // Catch any unhandled errors
      console.error('Unhandled session error:', err);
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // Security: Geocoding is now proxied through Edge Function to hide user IP from third-party
  const getLocation = useCallback(async (): Promise<LocationData> => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false,
        });
      });

      // Use Edge Function proxy for geocoding (privacy-safe approach)
      // This hides user IP from third-party geocoding service
      try {
        const { data, error } = await supabase.functions.invoke('reverse-geocode', {
          body: { 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude 
          }
        });
        
        if (error) throw error;
        
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: data?.city || 'Desconocida',
          country: data?.country || 'Desconocido',
        };
      } catch {
        // Fallback: store coordinates without city/country if geocoding fails
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }
    } catch {
      return {};
    }
  }, []);

  const logAccess = useCallback(async (userId: string, success: boolean) => {
    try {
      const location = await getLocation();
      
      const { error } = await supabase.from('access_logs').insert({
        user_id: userId,
        timestampt: new Date().toISOString(), // Note: column name has typo in DB
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        city: location.city || null,
        country: location.country || null,
        device_info: navigator.userAgent,
        success,
      });

      if (error) {
        console.error('Error logging access:', error);
      }
    } catch (error) {
      console.error('Error logging access:', error);
    }
  }, [getLocation]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // First attempt: try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return { success: false, error: 'Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' };
        }
        return { success: false, error: error.message };
      }

      // Don't log access here - it will be logged after facial recognition
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'Este correo ya está registrado' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  }, []);

  const logout = useCallback(async () => {
    // Reset global verification state
    resetGlobalVerification();
    clearVerificationStorage();
    
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const isSuperadmin = authState.profile?.has_full_access === true;

  return {
    ...authState,
    isSuperadmin,
    login,
    signUp,
    logout,
    logAccess,
  };
};
