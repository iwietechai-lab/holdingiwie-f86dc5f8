import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  company_id: string;
  department: string;
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
        timestamp: new Date().toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        country: location.country,
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Log access in background
        setTimeout(() => {
          logAccess(data.user.id, true);
        }, 0);
      }

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
