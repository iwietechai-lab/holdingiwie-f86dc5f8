import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { SUPERADMIN_USER_ID } from '@/types/superadmin';

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  company_id: string;
  department: string;
  has_full_access: boolean;
  avatar_url?: string;
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

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // Use RPC function to get profile (bypasses RLS recursion)
      const { data, error } = await supabase.rpc('get_my_profile');

      if (error) {
        console.error('Error fetching user profile via RPC:', error);
        
        // Fallback: try direct query for superadmin
        if (userId === SUPERADMIN_USER_ID) {
          // Return hardcoded profile for superadmin to avoid blocking
          return {
            id: userId,
            full_name: 'Mauricio Ortiz Tamayo',
            role: 'superadmin',
            company_id: '',
            department: '',
            has_full_access: true,
          };
        }
        
        // Try direct query as fallback (may work for users with simple RLS)
        const { data: directData, error: directError } = await supabase
          .from('user_profiles')
          .select('id, full_name, role, company_id, department, has_full_access, avatar_url')
          .eq('id', userId)
          .maybeSingle();
        
        if (directError) {
          console.error('Direct query also failed:', directError);
          // For superadmin, return default profile
          if (userId === SUPERADMIN_USER_ID) {
            return {
              id: userId,
              full_name: 'Mauricio Ortiz Tamayo',
              role: 'superadmin',
              company_id: '',
              department: '',
              has_full_access: true,
            };
          }
          return null;
        }
        
        return directData;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // For superadmin, always return a profile to prevent blocking
      if (userId === SUPERADMIN_USER_ID) {
        return {
          id: userId,
          full_name: 'Mauricio Ortiz Tamayo',
          role: 'superadmin',
          company_id: '',
          department: '',
          has_full_access: true,
        };
      }
      return null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
    supabase.auth.getSession().then(({ data: { session } }) => {
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
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const getLocation = useCallback(async (): Promise<LocationData> => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false,
        });
      });

      // Try to get city/country from coordinates using reverse geocoding
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=es`
        );
        const data = await response.json();
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: data.city || data.locality || 'Desconocida',
          country: data.countryName || 'Desconocido',
        };
      } catch {
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
        // If login fails with specific errors, try auto-signup (for development)
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('invalid login credentials') || errorMsg.includes('email not confirmed')) {
          console.log('Login failed, attempting auto-signup for development...');
          
          // Try to sign up the user
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                full_name: email.split('@')[0],
              },
            },
          });

          if (signUpError && !signUpError.message.includes('already registered')) {
            return { success: false, error: signUpError.message };
          }

          // After signup, try to sign in again
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryError) {
            // If still failing, might need email confirmation
            if (retryError.message.toLowerCase().includes('email not confirmed')) {
              return { success: false, error: 'Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.' };
            }
            return { success: false, error: retryError.message };
          }

          // Don't log access here - it will be logged after facial recognition
          return { success: true };
        }

        return { success: false, error: error.message };
      }

      // Don't log access here - it will be logged after facial recognition
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  }, [logAccess]);

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
    await supabase.auth.signOut();
    setAuthState({
      user: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return {
    ...authState,
    login,
    signUp,
    logout,
    logAccess,
  };
};
