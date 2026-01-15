// Utility functions for device detection

/**
 * Detect if user is on a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  // Check for mobile user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  // Also check screen width as fallback
  const isSmallScreen = window.innerWidth <= 768;
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return mobileRegex.test(userAgent) || (isSmallScreen && hasTouch);
};

/**
 * Check if app is running in standalone mode (installed as PWA)
 */
export const isRunningAsApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari standalone mode
  if ((navigator as any).standalone === true) return true;
  // Check if running in TWA (Trusted Web Activity)
  if (document.referrer.includes('android-app://')) return true;
  return false;
};

/**
 * Check if PWA is installable (beforeinstallprompt event can fire)
 */
export const isPWAInstallable = (): boolean => {
  // PWA is installable if:
  // 1. Not already running as app
  // 2. On a supported browser (Chromium-based, Firefox, Safari)
  if (isRunningAsApp()) return false;
  
  const ua = navigator.userAgent;
  // Check for browsers that support PWA installation
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isSamsung = /SamsungBrowser/.test(ua);
  
  return isChrome || isFirefox || isSafari || isSamsung;
};
