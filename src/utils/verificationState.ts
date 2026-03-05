/**
 * FACIAL VERIFICATION STATE MANAGER
 */

import { logger } from '@/utils/logger';

let globalVerificationComplete = false;

export const isGlobalVerificationComplete = (): boolean => {
  return globalVerificationComplete;
};

export const setGlobalVerificationComplete = (complete: boolean = true): void => {
  logger.log('🔐 VerificationState: Setting global verification to', complete);
  globalVerificationComplete = complete;
};

export const resetGlobalVerification = (): void => {
  logger.log('🔓 VerificationState: Resetting global verification');
  globalVerificationComplete = false;
};

export const clearVerificationStorage = (): void => {
  try {
    sessionStorage.removeItem('facial_verification_done');
    sessionStorage.removeItem('facial_verification_timestamp');
    sessionStorage.removeItem('facial_verification_session');
  } catch {
    // Ignore storage errors
  }
};