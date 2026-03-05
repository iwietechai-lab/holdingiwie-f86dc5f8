import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, Fingerprint, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RealFaceRecognition } from '@/components/RealFaceRecognition';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useFacialVerification } from '@/hooks/useFacialVerification';
import cameraService from '@/utils/cameraService';
import { isGlobalVerificationComplete, setGlobalVerificationComplete } from '@/utils/verificationState';

interface FacialVerificationGuardProps {
  children: React.ReactNode;
}

export const FacialVerificationGuard = ({ children }: FacialVerificationGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useSupabaseAuth();
  const {
    isVerified,
    isLoading: verificationLoading,
    recordVerification,
  } = useFacialVerification(user?.id);

  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(isGlobalVerificationComplete());
  
  const successHandledRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check global state on mount
  useEffect(() => {
    if (isGlobalVerificationComplete()) {
      setVerificationComplete(true);
    }
  }, []);

  // Safety timeout for loading states
  useEffect(() => {
    if (authLoading || verificationLoading) {
      timeoutRef.current = setTimeout(() => setHasError(true), 10000);
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [authLoading, verificationLoading]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show face recognition when needed
  useEffect(() => {
    if (verificationComplete) return;
    if (authLoading || verificationLoading) return;
    if (isAuthenticated && user && !isVerified && !showFaceRecognition) {
      setShowFaceRecognition(true);
    }
  }, [authLoading, verificationLoading, isAuthenticated, user, isVerified, verificationComplete, showFaceRecognition]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (!showFaceRecognition) {
        cameraService.forceStopAllCameras();
      }
    };
  }, [showFaceRecognition]);

  const handleFaceSuccess = useCallback(async () => {
    if (successHandledRef.current) return;
    successHandledRef.current = true;
    
    logger.log('✅ FacialVerificationGuard: Face recognition success');
    
    // Update global state
    setGlobalVerificationComplete(true);
    setVerificationComplete(true);
    
    // Stop camera immediately
    cameraService.forceStopAllCameras();
    cameraService.scheduleCleanup();
    
    // Hide face recognition
    setShowFaceRecognition(false);
    
    // Record in database (async, don't wait)
    try { await recordVerification(); } catch (e) { logger.error(e); }
  }, [recordVerification]);

  const handleCancel = useCallback(async () => {
    cameraService.forceStopAllCameras();
    cameraService.scheduleCleanup();
    setShowFaceRecognition(false);
    
    // Small delay before logout to ensure cleanup
    await new Promise(r => setTimeout(r, 200));
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // Error state
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SpaceBackground />
        <Card className="max-w-md w-full bg-card/90 backdrop-blur-sm border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl text-foreground">Error de Conexión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">La verificación está tardando demasiado.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>
                Cerrar Sesión
              </Button>
              <Button className="flex-1" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auth loading
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

  // Not authenticated
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

  // Already verified - render children
  if (verificationComplete) {
    return <>{children}</>;
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

  // Show face recognition
  if (showFaceRecognition) {
    return <RealFaceRecognition userId={user.id} onSuccess={handleFaceSuccess} onCancel={handleCancel} />;
  }

  // Verification required prompt
  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SpaceBackground />
        <Card className="max-w-md w-full bg-card/90 backdrop-blur-sm border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl text-foreground">Verificación Facial Requerida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">Para acceder, debes completar la verificación facial.</p>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Shield className="w-5 h-5 text-primary" />
                <span>Tu identidad será verificada mediante reconocimiento facial</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={() => setShowFaceRecognition(true)}>
                <Fingerprint className="w-4 h-4 mr-2" />
                Verificar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export const VerificationStatusBadge = ({ userId }: { userId: string | undefined }) => {
  const { isVerified, getTimeSinceVerification, isLoading } = useFacialVerification(userId);
  if (isLoading) return null;
  const timeSince = getTimeSinceVerification();

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs pointer-events-none select-none ${isVerified ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
      {isVerified ? (
        <>
          <Fingerprint className="w-4 h-4" />
          <div className="flex flex-col">
            <span className="font-medium">Verificación facial activa</span>
            {timeSince && (
              <span className="text-[10px] opacity-80 flex items-center gap-1">
                <Clock className="w-3 h-3" />Último: {timeSince}
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