import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

const VERIFICATION_TIMEOUT_MINUTES = 30;
const SESSION_KEY = 'facial_verification_session';
const SESSION_VERIFIED_KEY = 'facial_verification_done';
const SESSION_TIMESTAMP_KEY = 'facial_verification_timestamp';

interface FacialVerificationState {
  isVerified: boolean;
  lastVerification: Date | null;
  isLoading: boolean;
  timeRemaining: number | null; // minutes remaining
}

// Helper to check if session is verified (persisted in sessionStorage)
const isSessionVerified = (): boolean => {
  try {
    if (sessionStorage.getItem(SESSION_VERIFIED_KEY) !== 'true') {
      return false;
    }
    
    // Also check timestamp hasn't expired
    const timestamp = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
    if (!timestamp) return false;
    
    const verifiedAt = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - verifiedAt.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    return diffMinutes <= VERIFICATION_TIMEOUT_MINUTES;
  } catch {
    return false;
  }
};

// Helper to mark session as verified with timestamp
const markSessionVerified = () => {
  try {
    sessionStorage.setItem(SESSION_VERIFIED_KEY, 'true');
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, new Date().toISOString());
    logger.log('✅ useFacialVerification: Session marked as verified');
  } catch {
    logger.warn('Could not save to sessionStorage');
  }
};

// Helper to clear session verification
const clearSessionVerification = () => {
  try {
    sessionStorage.removeItem(SESSION_VERIFIED_KEY);
    sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
  } catch {
    // ignore
  }
};

export function useFacialVerification(userId: string | undefined) {
  const [state, setState] = useState<FacialVerificationState>(() => {
    // CRITICAL: Initialize with session storage state to prevent flickering
    const isVerifiedInSession = isSessionVerified();
    logger.log('🔍 useFacialVerification: Initial state - session verified:', isVerifiedInSession);
    
    return {
      isVerified: isVerifiedInSession,
      lastVerification: null,
      isLoading: !isVerifiedInSession, // Skip loading if already verified in session
      timeRemaining: null,
    };
  });
  
  const checkStartedRef = useRef(false);
  const verifiedLockedRef = useRef(false); // Lock to prevent state regression
  
  // Initialize session tracking
  useEffect(() => {
    try {
      const existingSession = sessionStorage.getItem(SESSION_KEY);
      if (!existingSession) {
        const newSessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        sessionStorage.setItem(SESSION_KEY, newSessionId);
        clearSessionVerification();
      }
    } catch {
      // sessionStorage not available
    }
  }, []);

  // Check verification status
  const checkVerificationStatus = useCallback(async () => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false, isVerified: false }));
      return;
    }

    // CRITICAL: If already verified and locked, don't re-check to prevent flickering
    if (verifiedLockedRef.current) {
      logger.log('🔒 useFacialVerification: Verification locked, skipping check');
      return;
    }

    // Fast path: If session says verified, trust it immediately
    if (isSessionVerified()) {
      logger.log('✅ useFacialVerification: Session verified, locking state');
      verifiedLockedRef.current = true;
      setState({
        isVerified: true,
        lastVerification: new Date(),
        isLoading: false,
        timeRemaining: VERIFICATION_TIMEOUT_MINUTES,
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_facial_embedding', {
        target_user_id: userId
      });

      if (error) {
        logger.error('Facial verification RPC error:', error);
        setState(prev => ({ ...prev, isLoading: false, isVerified: false }));
        return;
      }

      const profile = data?.[0];
      if (!profile?.last_facial_verification) {
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

      // IMPORTANT: Only require session verification for timeouts within limit
      // This handles the case where user was verified in DB but session is new
      if (diffMinutes <= VERIFICATION_TIMEOUT_MINUTES) {
        // Within time limit - check if session says verified
        if (isSessionVerified()) {
          const remaining = Math.ceil(VERIFICATION_TIMEOUT_MINUTES - diffMinutes);
          verifiedLockedRef.current = true;
          setState({
            isVerified: true,
            lastVerification,
            isLoading: false,
            timeRemaining: remaining,
          });
        } else {
          // DB says valid, but session doesn't - require re-verification
          // This is the expected case for new browser sessions
          setState({
            isVerified: false,
            lastVerification,
            isLoading: false,
            timeRemaining: 0,
          });
        }
      } else {
        // Verification expired - clear session and require re-verification
        clearSessionVerification();
        setState({
          isVerified: false,
          lastVerification,
          isLoading: false,
          timeRemaining: 0,
        });
      }
    } catch (err) {
      logger.error('Facial verification check error:', err);
      setState(prev => ({ ...prev, isLoading: false, isVerified: false }));
    }
  }, [userId]);

  // Update verification timestamp using RPC
  const recordVerification = useCallback(async () => {
    if (!userId) return false;

    logger.log('📝 useFacialVerification: Recording verification...');
    
    // CRITICAL: Mark session verified FIRST before async DB call
    markSessionVerified();
    verifiedLockedRef.current = true;
    
    // Update local state IMMEDIATELY (before DB)
    setState({
      isVerified: true,
      lastVerification: new Date(),
      isLoading: false,
      timeRemaining: VERIFICATION_TIMEOUT_MINUTES,
    });

    try {
      const { error } = await supabase.rpc('save_facial_embedding', {
        target_user_id: userId,
        new_embedding: null,
        update_timestamp: true
      });

      if (error) {
        logger.error('Error recording facial verification via RPC:', error);
        // Don't revert state - session storage is source of truth
        return false;
      }

      logger.log('✅ useFacialVerification: DB updated successfully');
      return true;
    } catch (err) {
      logger.error('Error recording verification:', err);
      // Don't revert state - session storage is source of truth
      return false;
    }
  }, [userId]);

  // Invalidate verification (force re-verification)
  const invalidateVerification = useCallback(() => {
    logger.log('🔓 useFacialVerification: Invalidating verification');
    clearSessionVerification();
    verifiedLockedRef.current = false;
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

  // Initial check - run only once when userId becomes available
  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }
    
    // Skip if already verified in session (fast path)
    if (isSessionVerified()) {
      logger.log('⚡ useFacialVerification: Fast path - session already verified');
      verifiedLockedRef.current = true;
      setState({
        isVerified: true,
        lastVerification: new Date(),
        isLoading: false,
        timeRemaining: VERIFICATION_TIMEOUT_MINUTES,
      });
      return;
    }
    
    if (checkStartedRef.current) return;
    checkStartedRef.current = true;
    
    checkVerificationStatus();
  }, [userId, checkVerificationStatus]);

  // Periodic check every minute to update time remaining
  // IMPORTANT: Only run if verified to prevent unwanted state changes
  useEffect(() => {
    if (!userId || !state.isVerified) return;

    const interval = setInterval(() => {
      // Check if session is still valid
      if (!isSessionVerified()) {
        logger.log('⏰ useFacialVerification: Session expired, invalidating');
        invalidateVerification();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [userId, state.isVerified, invalidateVerification]);

  return {
    ...state,
    checkVerificationStatus,
    recordVerification,
    invalidateVerification,
    getTimeSinceVerification,
    VERIFICATION_TIMEOUT_MINUTES,
  };
}

// Export helpers for use in other components
export { markSessionVerified, isSessionVerified };
