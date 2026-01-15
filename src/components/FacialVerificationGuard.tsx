import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Fingerprint, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RealFaceRecognition } from '@/components/RealFaceRecognition';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useFacialVerification } from '@/hooks/useFacialVerification';

// Robust function to stop all camera streams - used as safety net
const stopAllCameraStreams = () => {
  console.log('📹 FacialVerificationGuard: ===== STOPPING ALL CAMERA STREAMS =====');
  
  // Method 1: Stop all video elements
  const allVideos = document.querySelectorAll('video');
  console.log('📹 FacialVerificationGuard: Found', allVideos.length, 'video elements');
  
  allVideos.forEach((video, i) => {
    const stream = video.srcObject as MediaStream | null;
    if (stream?.getTracks) {
      const tracks = stream.getTracks();
      console.log(`📹 FacialVerificationGuard: Video[${i}] has`, tracks.length, 'tracks');
      tracks.forEach((track, idx) => {
        console.log(`📹 FacialVerificationGuard: Video[${i}].Track[${idx}]:`, track.kind, 'readyState:', track.readyState);
        track.stop();
        console.log(`📹 FacialVerificationGuard: Video[${i}].Track[${idx}] stopped, readyState now:`, track.readyState);
      });
    }
    video.srcObject = null;
    video.pause();
    video.src = '';
    video.load();
  });
  
  // Method 2: Try to enumerate and stop all media devices
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        console.log('📹 FacialVerificationGuard: Found', videoDevices.length, 'video input devices');
      })
      .catch(err => console.log('📹 FacialVerificationGuard: Error enumerating devices:', err));
  }
  
  console.log('📹 FacialVerificationGuard: ===== CAMERA STREAMS STOPPED =====');
};

interface FacialVerificationGuardProps {
  children: React.ReactNode;
}

export const FacialVerificationGuard = ({ children }: FacialVerificationGuardProps) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useSupabaseAuth();
  const {
    isVerified,
    isLoading: verificationLoading,
    recordVerification,
    getTimeSinceVerification,
    lastVerification,
  } = useFacialVerification(user?.id);

  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Safety timeout - if loading takes too long, show error state
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading || verificationLoading) {
        console.warn('FacialVerificationGuard: Loading timeout reached');
        setLoadingTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [authLoading, verificationLoading]);

  // Reset timeout flag when loading completes
  useEffect(() => {
    if (!authLoading && !verificationLoading) {
      setLoadingTimeout(false);
    }
  }, [authLoading, verificationLoading]);

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show face recognition if not verified
  useEffect(() => {
    if (!authLoading && !verificationLoading && isAuthenticated && !isVerified) {
      setShowFaceRecognition(true);
    }
  }, [authLoading, verificationLoading, isAuthenticated, isVerified]);

  // Cleanup camera when face recognition component hides
  useEffect(() => {
    if (!showFaceRecognition) {
      stopAllCameraStreams();
    }
  }, [showFaceRecognition]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAllCameraStreams();
    };
  }, []);

  const handleFaceSuccess = useCallback(async () => {
    console.log('🎉 FacialVerificationGuard: ===== FACE SUCCESS =====');
    
    // Stop cameras FIRST - multiple attempts
    console.log('📹 FacialVerificationGuard: Stopping cameras before hiding component');
    stopAllCameraStreams();
    
    // Hide component (this unmounts RealFaceRecognition)
    console.log('📹 FacialVerificationGuard: Setting showFaceRecognition to false');
    setShowFaceRecognition(false);
    
    // Extra cleanup with multiple delays as safety net
    setTimeout(() => {
      console.log('📹 FacialVerificationGuard: Running delayed cleanup (100ms)');
      stopAllCameraStreams();
    }, 100);
    
    setTimeout(() => {
      console.log('📹 FacialVerificationGuard: Running delayed cleanup (300ms)');
      stopAllCameraStreams();
    }, 300);
    
    setTimeout(() => {
      console.log('📹 FacialVerificationGuard: Running final cleanup (500ms)');
      stopAllCameraStreams();
    }, 500);
    
    // Update verification record
    console.log('📹 FacialVerificationGuard: Recording verification');
    await recordVerification();
    
    console.log('✅ FacialVerificationGuard: ===== SUCCESS HANDLING COMPLETE =====');
  }, [recordVerification]);

  const handleCancel = async () => {
    console.log('📹 FacialVerificationGuard: ===== CANCEL =====');
    console.log('📹 FacialVerificationGuard: Stopping cameras before logout');
    
    // Multiple cleanup attempts
    stopAllCameraStreams();
    setTimeout(() => stopAllCameraStreams(), 100);
    setTimeout(() => stopAllCameraStreams(), 300);
    
    // Delay before logout to ensure cleanup
    setTimeout(async () => {
      console.log('📹 FacialVerificationGuard: Running logout after delay');
      stopAllCameraStreams(); // Final cleanup before logout
      await logout();
      navigate('/login');
    }, 200);
  };

  // Handle loading timeout - offer retry or logout
  if (loadingTimeout) {
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
                  navigate('/login');
                }}
              >
                Cerrar Sesión
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setLoadingTimeout(false);
                  window.location.reload();
                }}
              >
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state - show spinner
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

  // Not authenticated - redirect handled by useEffect, but show loading briefly
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Wait for verification loading
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
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
      isVerified 
        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
        : 'bg-destructive/10 text-destructive border border-destructive/20'
    }`}>
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
