import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const VERIFICATION_TIMEOUT_MINUTES = 30;

interface FacialVerificationState {
  isVerified: boolean;
  lastVerification: Date | null;
  isLoading: boolean;
  timeRemaining: number | null; // minutes remaining
}

export function useFacialVerification(userId: string | undefined) {
  const [state, setState] = useState<FacialVerificationState>({
    isVerified: false,
    lastVerification: null,
    isLoading: true,
    timeRemaining: null,
  });

  // Check if verification is still valid
  const checkVerificationStatus = useCallback(async () => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false, isVerified: false }));
      return;
    }

    try {
      // Use RPC to get profile (bypasses RLS)
      const { data: profile, error } = await supabase.rpc('get_my_profile');

      if (error) {
        console.error('Error checking facial verification:', error);
        setState(prev => ({ ...prev, isLoading: false, isVerified: false }));
        return;
      }

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

      if (diffMinutes <= VERIFICATION_TIMEOUT_MINUTES) {
        const remaining = Math.ceil(VERIFICATION_TIMEOUT_MINUTES - diffMinutes);
        setState({
          isVerified: true,
          lastVerification,
          isLoading: false,
          timeRemaining: remaining,
        });
      } else {
        // Verification expired
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

  // Update verification timestamp in database
  const recordVerification = useCallback(async () => {
    if (!userId) return false;

    try {
      const now = new Date().toISOString();
      
      // Use direct update for own profile
      const { error } = await supabase
        .from('user_profiles')
        .update({ last_facial_verification: now })
        .eq('id', userId);

      if (error) {
        console.error('Error recording facial verification:', error);
        return false;
      }

      // Update local state
      setState({
        isVerified: true,
        lastVerification: new Date(now),
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
