import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const VERIFICATION_TIMEOUT_MINUTES = 30;
const SESSION_KEY = 'facial_verification_session';
const SESSION_VERIFIED_KEY = 'facial_verification_done';

interface FacialVerificationState {
  isVerified: boolean;
  lastVerification: Date | null;
  isLoading: boolean;
  timeRemaining: number | null; // minutes remaining
}

// Helper to check if session is verified (persisted in sessionStorage)
const isSessionVerified = (): boolean => {
  try {
    return sessionStorage.getItem(SESSION_VERIFIED_KEY) === 'true';
  } catch {
    return false;
  }
};

// Helper to mark session as verified
const markSessionVerified = () => {
  try {
    sessionStorage.setItem(SESSION_VERIFIED_KEY, 'true');
  } catch {
    console.warn('Could not save to sessionStorage');
  }
};

export function useFacialVerification(userId: string | undefined) {
  const [state, setState] = useState<FacialVerificationState>({
    isVerified: false,
    lastVerification: null,
    isLoading: true,
    timeRemaining: null,
  });
  
  const initializedRef = useRef<boolean>(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Safety timeout - prevent infinite loading state
  useEffect(() => {
    if (state.isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('useFacialVerification: Loading timeout reached, forcing state update');
        setState(prev => {
          if (prev.isLoading) {
            return { ...prev, isLoading: false };
          }
          return prev;
        });
      }, 5000); // 5 second timeout
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [state.isLoading]);
  
  // Initialize session tracking on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    try {
      // Check if this is a new session
      const existingSession = sessionStorage.getItem(SESSION_KEY);
      if (!existingSession) {
        const newSessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        sessionStorage.setItem(SESSION_KEY, newSessionId);
        // New session, clear verification status
        sessionStorage.removeItem(SESSION_VERIFIED_KEY);
      }
    } catch {
      // sessionStorage might not be available
      console.warn('sessionStorage not available');
    }
  }, []);

  // Check if verification is still valid (must be recent AND in same session)
  const checkVerificationStatus = useCallback(async () => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false, isVerified: false }));
      return;
    }

    try {
      // Use RPC to get facial data (bypasses RLS)
      const { data, error } = await supabase.rpc('get_user_facial_embedding', {
        target_user_id: userId
      });

      if (error) {
        console.error('Error checking facial verification:', error);
        setState(prev => ({ ...prev, isLoading: false, isVerified: false }));
        return;
      }

      // RPC returns array, get first element
      const profile = data?.[0];
      if (!profile?.last_facial_verification) {
        // No verification recorded
        setState({
          isVerified: false,
          lastVerification: null,
          isLoading: false,
          timeRemaining: null,
        });
        return;
      }

      const lastVerification = new Date(profile.last_facial_verification);
      const now = new Date();
      const diffMs = now.getTime() - lastVerification.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      // Check if verified recently AND in this browser session
      if (diffMinutes <= VERIFICATION_TIMEOUT_MINUTES && isSessionVerified()) {
        const remaining = Math.ceil(VERIFICATION_TIMEOUT_MINUTES - diffMinutes);
        setState({
          isVerified: true,
          lastVerification,
          isLoading: false,
          timeRemaining: remaining,
        });
      } else {
        // Verification expired or not done in this session
        setState({
          isVerified: false,
          lastVerification,
          isLoading: false,
          timeRemaining: 0,
        });
      }
    } catch (err) {
      console.error('Facial verification check error:', err);
      setState(prev => ({ ...prev, isLoading: false, isVerified: false }));
    }
  }, [userId]);

  // Update verification timestamp in database using RPC (SECURITY DEFINER)
  const recordVerification = useCallback(async () => {
    if (!userId) return false;

    try {
      // Use RPC to save timestamp (SECURITY DEFINER - bypasses RLS)
      const { error } = await supabase.rpc('save_facial_embedding', {
        target_user_id: userId,
        new_embedding: null,
        update_timestamp: true
      });

      if (error) {
        console.error('Error recording facial verification via RPC:', error);
        return false;
      }

      // Mark this session as verified (persisted in sessionStorage)
      markSessionVerified();

      // Update local state
      setState({
        isVerified: true,
        lastVerification: new Date(),
        isLoading: false,
        timeRemaining: VERIFICATION_TIMEOUT_MINUTES,
      });

      return true;
    } catch (err) {
      console.error('Error recording verification:', err);
      return false;
    }
  }, [userId]);

  // Invalidate verification (force re-verification)
  const invalidateVerification = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_VERIFIED_KEY);
    } catch {
      // ignore
    }
    setState({
      isVerified: false,
      lastVerification: null,
      isLoading: false,
      timeRemaining: null,
    });
  }, []);

  // Format time since last verification
  const getTimeSinceVerification = useCallback(() => {
    if (!state.lastVerification) return null;

    const now = new Date();
    const diffMs = now.getTime() - state.lastVerification.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'hace unos segundos';
    if (diffMinutes === 1) return 'hace 1 minuto';
    if (diffMinutes < 60) return `hace ${diffMinutes} minutos`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return 'hace 1 hora';
    if (diffHours < 24) return `hace ${diffHours} horas`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'hace 1 día';
    return `hace ${diffDays} días`;
  }, [state.lastVerification]);

  // Initial check on mount
  useEffect(() => {
    checkVerificationStatus();
  }, [checkVerificationStatus]);

  // Periodic check every minute to update time remaining
  useEffect(() => {
    if (!userId || !state.isVerified) return;

    const interval = setInterval(() => {
      checkVerificationStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [userId, state.isVerified, checkVerificationStatus]);

  return {
    ...state,
    checkVerificationStatus,
    recordVerification,
    invalidateVerification,
    getTimeSinceVerification,
    VERIFICATION_TIMEOUT_MINUTES,
  };
}
