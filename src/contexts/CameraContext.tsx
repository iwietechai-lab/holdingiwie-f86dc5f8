/**
 * CAMERA CONTEXT PROVIDER v2
 * 
 * Key changes:
 * - Simplified verification loop (max 5 checks, not 10+)
 * - No aggressive re-cleaning after success
 * - Uses global verification state to avoid redundant checks
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { useLocation } from 'react-router-dom';
import cameraService from '@/utils/cameraService';
import { isGlobalVerificationComplete } from '@/utils/verificationState';

interface CameraContextValue {
  registerStream: (stream: MediaStream) => void;
  unregisterStream: (stream: MediaStream) => void;
  forceStopAll: () => void;
  scheduleCleanup: () => void;
  cancelCleanup: () => void;
  isCameraActive: () => boolean;
  verifyStopped: () => boolean;
  logState: () => void;
}

const CameraContext = createContext<CameraContextValue | null>(null);

// Routes that should NEVER have an active camera
const CAMERA_FREE_ROUTES = [
  '/dashboard',
  '/empresa',
  '/chatbot',
  '/ceo-chatbot',
  '/ceo-chat',
  '/ceo-dashboard',
  '/ceo-knowledge',
  '/gestor-documentos',
  '/organizacion',
  '/reuniones',
  '/tickets',
  '/tareas',
  '/presupuestos',
  '/mensajeria',
  '/chatbot-empresa',
  '/usuarios',
  '/superadmin',
  '/mision-iwie',
  '/iwiechat',
  '/configuracion',
];

export const CameraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const lastPathRef = useRef<string>('');
  const verificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCleanedOnRouteRef = useRef(false);

  // ===== ROUTE CHANGE HANDLER =====
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = lastPathRef.current;
    
    // Skip if same path
    if (currentPath === previousPath) return;
    
    lastPathRef.current = currentPath;
    
    // Check if navigating to a camera-free route
    const isCameraFreeRoute = CAMERA_FREE_ROUTES.some(route => 
      currentPath.startsWith(route) || currentPath === route
    );
    
    if (isCameraFreeRoute && !hasCleanedOnRouteRef.current) {
      logger.log('📹 CameraContext: Navigating to', currentPath, '- scheduling cleanup');
      hasCleanedOnRouteRef.current = true;
      
      // Single cleanup - don't keep hammering
      cameraService.forceStopAllCameras();
      cameraService.scheduleCleanup();
      
      // One-time verification after 2 seconds
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
      
      verificationTimeoutRef.current = setTimeout(() => {
        if (cameraService.isCameraActive()) {
          logger.log('📹 CameraContext: Post-navigation camera still active, forcing stop');
          cameraService.forceStopAllCameras();
        } else {
          logger.log('📹 CameraContext: ✅ Camera verified stopped');
        }
        hasCleanedOnRouteRef.current = false;
      }, 2000);
    }
    
    // Reset flag when leaving camera-free routes
    if (!isCameraFreeRoute) {
      hasCleanedOnRouteRef.current = false;
    }
  }, [location.pathname]);

  // ===== WINDOW EVENT HANDLERS =====
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cameraService.scheduleCleanup();
      }
    };

    const handleBeforeUnload = () => {
      cameraService.forceStopAllCameras();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
      
      cameraService.forceStopAllCameras();
    };
  }, []);

  // ===== CONTEXT VALUE =====
  const contextValue: CameraContextValue = {
    registerStream: cameraService.registerStream,
    unregisterStream: cameraService.unregisterStream,
    forceStopAll: cameraService.forceStopAllCameras,
    scheduleCleanup: cameraService.scheduleCleanup,
    cancelCleanup: cameraService.cancelScheduledCleanup,
    isCameraActive: cameraService.isCameraActive,
    verifyStopped: cameraService.verifyCamerasStopped,
    logState: cameraService.logCameraState,
  };

  return (
    <CameraContext.Provider value={contextValue}>
      {children}
    </CameraContext.Provider>
  );
};

// ===== HOOK FOR COMPONENTS =====
export const useCamera = (): CameraContextValue => {
  const context = useContext(CameraContext);
  
  if (!context) {
    // Fallback for use outside provider
    return {
      registerStream: cameraService.registerStream,
      unregisterStream: cameraService.unregisterStream,
      forceStopAll: cameraService.forceStopAllCameras,
      scheduleCleanup: cameraService.scheduleCleanup,
      cancelCleanup: cameraService.cancelScheduledCleanup,
      isCameraActive: cameraService.isCameraActive,
      verifyStopped: cameraService.verifyCamerasStopped,
      logState: cameraService.logCameraState,
    };
  }
  
  return context;
};

export default CameraContext;
