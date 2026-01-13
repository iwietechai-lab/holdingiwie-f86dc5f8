import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Fingerprint, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RealFaceRecognition } from '@/components/RealFaceRecognition';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useFacialVerification } from '@/hooks/useFacialVerification';

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

  const handleFaceSuccess = async () => {
    const success = await recordVerification();
    if (success) {
      setShowFaceRecognition(false);
    }
  };

  const handleCancel = async () => {
    // If user cancels, log them out
    await logout();
    navigate('/login');
  };

  // Loading state
  if (authLoading || verificationLoading) {
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
    return null;
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
