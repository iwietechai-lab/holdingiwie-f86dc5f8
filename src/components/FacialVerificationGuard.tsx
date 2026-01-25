import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Fingerprint, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RealFaceRecognition } from '@/components/RealFaceRecognition';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useFacialVerification } from '@/hooks/useFacialVerification';
import { useCamera } from '@/contexts/CameraContext';

interface FacialVerificationGuardProps {
  children: React.ReactNode;
}

export const FacialVerificationGuard = ({ children }: FacialVerificationGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const camera = useCamera();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useSupabaseAuth();
  const {
    isVerified,
    isLoading: verificationLoading,
    recordVerification,
    getTimeSinceVerification,
    lastVerification,
  } = useFacialVerification(user?.id);

  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [hasError, setHasError] = useState(false);
  const initRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationRef = useRef(location.pathname);

  // Force cleanup when navigating away from face recognition
  useEffect(() => {
    if (location.pathname !== lastLocationRef.current) {
      console.log('📹 FacialVerificationGuard: Route changed, forcing camera cleanup');
      lastLocationRef.current = location.pathname;
      
      if (!showFaceRecognition) {
        camera.scheduleCleanup();
      }
    }
  }, [location.pathname, showFaceRecognition, camera]);

  // Clear timeout on unmount and cleanup camera
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      console.log('📹 FacialVerificationGuard: Unmounting - scheduling cleanup');
      camera.scheduleCleanup();
    };
  }, [camera]);

  // Safety timeout - if total loading exceeds 8 seconds, show error
  useEffect(() => {
    if (authLoading || verificationLoading) {
      timeoutRef.current = setTimeout(() => {
        console.warn('FacialVerificationGuard: Loading timeout reached');
        setHasError(true);
      }, 8000);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [authLoading, verificationLoading]);

  // Redirect to login if not authenticated (ONLY when auth is done loading)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show face recognition when needed
  useEffect(() => {
    if (initRef.current) return;
    
    if (!authLoading && !verificationLoading && isAuthenticated && user && !isVerified) {
      initRef.current = true;
      setShowFaceRecognition(true);
    }
  }, [authLoading, verificationLoading, isAuthenticated, user, isVerified]);

  // Cleanup camera when hiding face recognition - with aggressive cleanup
  useEffect(() => {
    if (!showFaceRecognition) {
      console.log('📹 FacialVerificationGuard: showFaceRecognition is false - scheduling aggressive cleanup');
      // Schedule cleanup via camera context
      camera.scheduleCleanup();
      
      // Also verify after a delay that camera is actually stopped
      const verifyTimeout = setTimeout(() => {
        const isActive = camera.isCameraActive();
        if (isActive) {
          console.warn('📹 FacialVerificationGuard: Camera still active after hiding! Forcing additional cleanup...');
          camera.forceStopAll();
        } else {
          console.log('📹 FacialVerificationGuard: ✅ Camera verified stopped');
        }
      }, 3500);
      
      return () => clearTimeout(verifyTimeout);
    }
  }, [showFaceRecognition, camera]);

  const handleFaceSuccess = useCallback(async () => {
    console.log('🎉 FacialVerificationGuard: ===== FACE SUCCESS =====');
    
    // Step 1: Schedule camera cleanup FIRST (before any state changes)
    console.log('📹 FacialVerificationGuard: Scheduling camera cleanup before state change');
    camera.scheduleCleanup();
    
    // Step 2: Hide component IMMEDIATELY (this unmounts RealFaceRecognition)
    console.log('📹 FacialVerificationGuard: Setting showFaceRecognition to false');
    setShowFaceRecognition(false);
    
    // Step 3: Update verification record (async, don't block UI)
    console.log('📹 FacialVerificationGuard: Recording verification');
    try {
      await recordVerification();
    } catch (e) {
      console.error('Error recording verification:', e);
    }
    
    // Step 4: Final verification that camera is stopped
    setTimeout(() => {
      console.log('📹 FacialVerificationGuard: Final camera state verification');
      camera.verifyStopped();
    }, 4000);
    
    console.log('✅ FacialVerificationGuard: ===== SUCCESS HANDLING COMPLETE =====');
  }, [recordVerification, camera]);

  const handleCancel = async () => {
    console.log('📹 FacialVerificationGuard: ===== CANCEL =====');
    
    // Step 1: Schedule camera cleanup FIRST
    camera.scheduleCleanup();
    
    // Step 2: Hide component immediately
    setShowFaceRecognition(false);
    
    // Step 3: Delay logout to ensure cleanup completes
    setTimeout(async () => {
      // Verify camera is stopped before logout
      camera.verifyStopped();
      
      console.log('📹 FacialVerificationGuard: Running logout after cleanup verified');
      await logout();
      navigate('/login');
    }, 200);
  };

  // Handle error state
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SpaceBackground />
        <Card className="max-w-md w-full bg-card/90 backdrop-blur-sm border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl text-foreground">
              Error de Conexión
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              La verificación está tardando demasiado. Puede haber un problema de conexión.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
              >
                Cerrar Sesión
              </Button>
              <Button
                className="flex-1"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auth loading - brief state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect handled by useEffect
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Verification loading
  if (verificationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando identidad...</p>
        </div>
      </div>
    );
  }

  // Show face recognition prompt
  if (showFaceRecognition) {
    return (
      <RealFaceRecognition
        userId={user.id}
        onSuccess={handleFaceSuccess}
        onCancel={handleCancel}
      />
    );
  }

  // Not verified but not showing face recognition (shouldn't happen, but safety)
  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SpaceBackground />
        <Card className="max-w-md w-full bg-card/90 backdrop-blur-sm border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl text-foreground">
              Verificación Facial Requerida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Para acceder a esta página, debes completar la verificación facial.
              Esta medida garantiza la seguridad de tu cuenta y los datos de la plataforma.
            </p>
            
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Shield className="w-5 h-5 text-primary" />
                <span>Tu identidad será verificada mediante reconocimiento facial</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => setShowFaceRecognition(true)}
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                Verificar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verified - render children
  return <>{children}</>;
};

// Export verification status badge component for use in sidebars
export const VerificationStatusBadge = ({ userId }: { userId: string | undefined }) => {
  const { isVerified, getTimeSinceVerification, isLoading } = useFacialVerification(userId);

  if (isLoading) {
    return null;
  }

  const timeSince = getTimeSinceVerification();

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs pointer-events-none select-none ${
        isVerified 
          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
          : 'bg-destructive/10 text-destructive border border-destructive/20'
      }`}
    >
      {isVerified ? (
        <>
          <Fingerprint className="w-4 h-4" />
          <div className="flex flex-col">
            <span className="font-medium">Verificación facial activa</span>
            {timeSince && (
              <span className="text-[10px] opacity-80 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Último: {timeSince}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4" />
          <span>Verificación requerida</span>
        </>
      )}
    </div>
  );
};

export default FacialVerificationGuard;
