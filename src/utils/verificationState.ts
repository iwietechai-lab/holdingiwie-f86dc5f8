/**
 * FACIAL VERIFICATION STATE MANAGER
 * 
 * This module manages global state for facial verification across the app.
 * It's separated to avoid circular dependencies between components and hooks.
 */

// Global state for tracking verification completion
let globalVerificationComplete = false;

/**
 * Check if global verification is complete
 */
export const isGlobalVerificationComplete = (): boolean => {
  return globalVerificationComplete;
};

/**
 * Mark global verification as complete
 * Called after successful facial recognition
 */
export const setGlobalVerificationComplete = (complete: boolean = true): void => {
  console.log('🔐 VerificationState: Setting global verification to', complete);
  globalVerificationComplete = complete;
};

/**
 * Reset global verification state
 * Called on logout or when session expires
 */
export const resetGlobalVerification = (): void => {
  console.log('🔓 VerificationState: Resetting global verification');
  globalVerificationComplete = false;
};

/**
 * Clear all verification-related session storage
 */
export const clearVerificationStorage = (): void => {
  try {
    sessionStorage.removeItem('facial_verification_done');
    sessionStorage.removeItem('facial_verification_timestamp');
    sessionStorage.removeItem('facial_verification_session');
  } catch {
    // Ignore storage errors
  }
};
