import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Camera, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FaceRecognitionProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const FaceRecognition = ({ onSuccess, onCancel }: FaceRecognitionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'initializing' | 'ready' | 'scanning' | 'success' | 'failed'>('initializing');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setStatus('initializing');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('ready');
      }
    } catch (err) {
      logger.error('Camera error:', err);
      setError('No se pudo acceder a la cámara. Por favor, permite el acceso.');
      setStatus('failed');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const simulateFaceRecognition = useCallback(async () => {
    if (status !== 'ready') return;
    
    setStatus('scanning');
    
    // Capture frame for visual feedback
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
      }
    }
    
    // Simulate face detection (in production, use a real face recognition API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 80% success rate simulation for demo
    const isSuccess = Math.random() > 0.2;
    
    if (isSuccess) {
      setStatus('success');
      stopCamera();
      setTimeout(onSuccess, 1000);
    } else {
      setAttempts(prev => prev + 1);
      setStatus('failed');
      setError('Rostro no reconocido. Intenta de nuevo.');
      setTimeout(() => {
        if (attempts < 2) {
          setStatus('ready');
          setError(null);
        }
      }, 2000);
    }
  }, [status, onSuccess, attempts, stopCamera]);

  const handleRetry = () => {
    setAttempts(0);
    setError(null);
    startCamera();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Video container with neon border */}
        <div className="relative w-72 h-72 rounded-full overflow-hidden gradient-border p-1">
          <div className="w-full h-full rounded-full overflow-hidden bg-card relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning overlay */}
            {status === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                <div className="w-48 h-1 bg-primary animate-pulse rounded-full" 
                     style={{ 
                       animation: 'scanning 1.5s ease-in-out infinite',
                     }} 
                />
              </div>
            )}
            
            {/* Status overlay */}
            {status === 'success' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                <CheckCircle className="w-20 h-20 text-green-400" />
              </div>
            )}
            
            {status === 'failed' && attempts >= 3 && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                <XCircle className="w-20 h-20 text-red-400" />
              </div>
            )}
          </div>
        </div>
        
        {/* Animated ring */}
        {status === 'scanning' && (
          <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse-glow" />
        )}
      </div>

      {/* Status text */}
      <div className="text-center space-y-2">
        {status === 'initializing' && (
          <p className="text-muted-foreground flex items-center gap-2">
            <Camera className="w-5 h-5 animate-pulse" />
            Iniciando cámara...
          </p>
        )}
        
        {status === 'ready' && (
          <p className="text-foreground">
            Posiciona tu rostro en el centro
          </p>
        )}
        
        {status === 'scanning' && (
          <p className="text-primary neon-text flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Escaneando rostro...
          </p>
        )}
        
        {status === 'success' && (
          <p className="text-green-400 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            ¡Reconocimiento exitoso!
          </p>
        )}
        
        {error && (
          <p className="text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        {status === 'ready' && (
          <Button
            onClick={simulateFaceRecognition}
            className="neon-glow bg-primary hover:bg-primary/80"
          >
            <Camera className="w-4 h-4 mr-2" />
            Escanear Rostro
          </Button>
        )}
        
        {(status === 'failed' && attempts < 3) && (
          <Button
            onClick={() => setStatus('ready')}
            variant="outline"
            className="border-primary/50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        )}
        
        {(status === 'failed' && attempts >= 3) && (
          <Button
            onClick={handleRetry}
            variant="outline"
            className="border-primary/50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Comenzar de nuevo
          </Button>
        )}
        
        <Button
          onClick={onCancel}
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </Button>
      </div>

      {/* Attempts counter */}
      {attempts > 0 && attempts < 3 && (
        <p className="text-sm text-muted-foreground">
          Intento {attempts} de 3
        </p>
      )}

      <style>{`
        @keyframes scanning {
          0%, 100% { transform: translateY(-80px); }
          50% { transform: translateY(80px); }
        }
      `}</style>
    </div>
  );
};
