/**
 * CAMERA CONTEXT PROVIDER
 * 
 * Provides application-wide camera state management and cleanup.
 * This context is injected at the App root level and:
 * - Listens to route changes to force cleanup on navigation
 * - Listens to window events (visibility, beforeunload, pagehide)
 * - Exposes camera service methods to any component
 * - Runs periodic verification checks when needed
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import cameraService from '@/utils/cameraService';

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
  const lastPathRef = useRef<string>(location.pathname);
  const cleanupVerificationRef = useRef<NodeJS.Timeout | null>(null);
  const isCleaningRef = useRef(false);

  // ===== ROUTE CHANGE HANDLER =====
  // Force camera cleanup on ANY route change
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = lastPathRef.current;
    
    if (currentPath !== previousPath) {
      console.log(`📹 CameraContext: Route changed from ${previousPath} to ${currentPath}`);
      lastPathRef.current = currentPath;
      
      // Check if navigating to a camera-free route
      const isCameraFreeRoute = CAMERA_FREE_ROUTES.some(route => 
        currentPath.startsWith(route) || currentPath === route
      );
      
      if (isCameraFreeRoute) {
        console.log('📹 CameraContext: Navigated to camera-free route - forcing cleanup');
        
        if (!isCleaningRef.current) {
          isCleaningRef.current = true;
          cameraService.scheduleCleanup();
          
          // Reset flag after cleanup chain completes
          setTimeout(() => {
            isCleaningRef.current = false;
          }, 4000);
        }
        
        // Start verification loop
        startVerificationLoop();
      }
    }
  }, [location.pathname]);

  // ===== VERIFICATION LOOP =====
  // Runs multiple checks after navigation to ensure camera is off
  const startVerificationLoop = useCallback(() => {
    // Clear any existing verification
    if (cleanupVerificationRef.current) {
      clearInterval(cleanupVerificationRef.current);
    }
    
    let checkCount = 0;
    const MAX_CHECKS = 15; // Check for up to 15 seconds
    
    cleanupVerificationRef.current = setInterval(() => {
      checkCount++;
      
      const isActive = cameraService.isCameraActive();
      console.log(`📹 CameraContext: Verification check ${checkCount}/${MAX_CHECKS} - Camera active: ${isActive}`);
      
      if (isActive && checkCount <= MAX_CHECKS) {
        console.warn('📹 CameraContext: Camera still active! Forcing additional cleanup...');
        cameraService.forceStopAllCameras();
      } else if (!isActive || checkCount >= MAX_CHECKS) {
        // Stop verification loop
        if (cleanupVerificationRef.current) {
          clearInterval(cleanupVerificationRef.current);
          cleanupVerificationRef.current = null;
        }
        
        if (isActive) {
          console.error('📹 CameraContext: ❌ CRITICAL - Camera could not be stopped after max attempts!');
        } else {
          console.log('📹 CameraContext: ✅ Camera verified stopped');
        }
      }
    }, 1000);
  }, []);

  // ===== WINDOW EVENT HANDLERS =====
  useEffect(() => {
    // Handle visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('📹 CameraContext: Tab hidden - scheduling camera cleanup');
        cameraService.scheduleCleanup();
      }
    };

    // Handle before unload (page close/refresh)
    const handleBeforeUnload = () => {
      console.log('📹 CameraContext: Page unloading - forcing camera stop');
      cameraService.forceStopAllCameras();
    };

    // Handle page hide (more reliable on mobile)
    const handlePageHide = () => {
      console.log('📹 CameraContext: Page hide - forcing camera stop');
      cameraService.forceStopAllCameras();
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    console.log('📹 CameraContext: Window event listeners attached');

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      
      if (cleanupVerificationRef.current) {
        clearInterval(cleanupVerificationRef.current);
      }
      
      console.log('📹 CameraContext: Window event listeners removed');
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
    // If used outside provider, return direct service calls (fallback)
    console.warn('📹 useCamera: Used outside CameraProvider, using direct service');
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
