import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';

interface RealFaceRecognitionProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type RecognitionStatus = 
  | 'loading-models'
  | 'initializing'
  | 'ready'
  | 'detecting'
  | 'liveness-check'
  | 'comparing'
  | 'registering'
  | 'success'
  | 'failed';

const FACE_API_MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const MATCH_THRESHOLD = 0.6;
const MAX_ATTEMPTS = 3;

export const RealFaceRecognition = ({ userId, onSuccess, onCancel }: RealFaceRecognitionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [status, setStatus] = useState<RecognitionStatus>('loading-models');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [instruction, setInstruction] = useState('Cargando modelos de IA...');
  const [hasStoredEmbedding, setHasStoredEmbedding] = useState<boolean | null>(null);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  
  // Eye aspect ratio history for blink detection
  const eyeRatioHistory = useRef<number[]>([]);
  const blinkCount = useRef(0);

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    try {
      setInstruction('Cargando modelos de reconocimiento facial...');
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODELS_URL),
      ]);
      
      setModelsLoaded(true);
      setInstruction('Modelos cargados. Iniciando cámara...');
      return true;
    } catch (err) {
      console.error('Error loading face-api models:', err);
      setError('Error al cargar modelos de IA. Recarga la página.');
      setStatus('failed');
      return false;
    }
  }, []);

  // Check if user has stored facial embedding
  // NOTE: Pending embeddings via localStorage removed for security reasons
  // Admin setup must store embeddings directly in database
  const checkStoredEmbedding = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('facial_embedding')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking embedding:', error);
        return false;
      }

      const hasEmbedding = data?.facial_embedding && 
        Array.isArray(data.facial_embedding) && 
        data.facial_embedding.length > 0;
      
      setHasStoredEmbedding(hasEmbedding);
      return hasEmbedding;
    } catch (err) {
      console.error('Error checking stored embedding:', err);
      return false;
    }
  }, [userId]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setStatus('initializing');
      setError(null);
      setInstruction('Solicitando acceso a la cámara...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('ready');
        setInstruction('Posiciona tu rostro dentro del círculo');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('No se pudo acceder a la cámara. Permite el acceso e intenta de nuevo.');
      setStatus('failed');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Calculate Eye Aspect Ratio (EAR) for blink detection
  const calculateEAR = (eyePoints: faceapi.Point[]) => {
    // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
    const p1 = eyePoints[0];
    const p2 = eyePoints[1];
    const p3 = eyePoints[2];
    const p4 = eyePoints[3];
    const p5 = eyePoints[4];
    const p6 = eyePoints[5];

    const A = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
    const B = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
    const C = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

    return (A + B) / (2.0 * C);
  };

  // Detect blink using EAR
  const detectBlink = useCallback((landmarks: faceapi.FaceLandmarks68) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    eyeRatioHistory.current.push(avgEAR);
    
    // Keep last 10 frames
    if (eyeRatioHistory.current.length > 10) {
      eyeRatioHistory.current.shift();
    }

    // Detect blink: EAR drops below threshold then rises back
    if (eyeRatioHistory.current.length >= 5) {
      const recent = eyeRatioHistory.current.slice(-5);
      const min = Math.min(...recent);
      const max = Math.max(...recent);
      
      // Blink detected if there's significant variation (eyes closed then opened)
      if (min < 0.2 && max > 0.25 && recent[recent.length - 1] > 0.22) {
        blinkCount.current += 1;
        eyeRatioHistory.current = []; // Reset after blink
        return true;
      }
    }
    
    return false;
  }, []);

  // Main face detection and verification loop
  const startDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    setStatus('detecting');
    setInstruction('Buscando tu rostro...');
    setBlinkDetected(false);
    blinkCount.current = 0;
    eyeRatioHistory.current = [];

    let livenessConfirmed = false;
    let detectionAttempts = 0;
    const maxDetectionAttempts = 150; // ~5 seconds at 30fps

    const detect = async () => {
      if (!videoRef.current || status === 'success' || status === 'failed') return;

      detectionAttempts++;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5,
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setFaceDetected(true);

          // Draw face detection on canvas
          if (canvasRef.current) {
            const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
            const resized = faceapi.resizeResults(detection, dims);
            
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              faceapi.draw.drawFaceLandmarks(canvasRef.current, resized);
            }
          }

          // Liveness check - detect blink
          if (!livenessConfirmed) {
            setStatus('liveness-check');
            setInstruction('¡Rostro detectado! Parpadea para verificar que eres real');
            
            if (detectBlink(detection.landmarks)) {
              setBlinkDetected(true);
              livenessConfirmed = true;
              
              // Proceed to embedding comparison/registration
              await processEmbedding(detection.descriptor);
              return;
            }
          }
        } else {
          setFaceDetected(false);
          if (status === 'detecting') {
            setInstruction('Posiciona tu rostro dentro del círculo');
          }
        }

        if (detectionAttempts >= maxDetectionAttempts && !livenessConfirmed) {
          setError('No se detectó parpadeo. Intenta de nuevo mirando la cámara y parpadeando.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          return;
        }

        animationRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error('Detection error:', err);
        animationRef.current = requestAnimationFrame(detect);
      }
    };

    detect();
  }, [modelsLoaded, status, detectBlink]);

  // Process embedding - compare or register
  const processEmbedding = async (descriptor: Float32Array) => {
    const embedding = Array.from(descriptor);

    if (hasStoredEmbedding) {
      // Compare with stored embedding
      setStatus('comparing');
      setInstruction('Comparando con tu rostro registrado...');

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('facial_embedding')
          .eq('id', userId)
          .single();

        if (error || !data?.facial_embedding) {
          setError('Error al obtener datos faciales. Intenta de nuevo.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          return;
        }

        const storedEmbedding = data.facial_embedding as number[];
        
        // Calculate Euclidean distance
        const distance = Math.sqrt(
          embedding.reduce((sum, val, i) => sum + Math.pow(val - storedEmbedding[i], 2), 0)
        );

        console.log('Face match distance:', distance);

        if (distance < MATCH_THRESHOLD) {
          // Match successful
          setStatus('success');
          setInstruction('¡Identidad verificada!');
          stopCamera();
          
          // Log successful access
          await supabase.from('access_logs').insert({
            user_id: userId,
            timestampt: new Date().toISOString(),
            device_info: navigator.userAgent,
            success: true,
          });

          setTimeout(onSuccess, 1500);
        } else {
          setError(`Rostro no coincide (distancia: ${distance.toFixed(2)}). Intenta de nuevo.`);
          setAttempts(prev => prev + 1);
          setStatus('failed');
        }
      } catch (err) {
        console.error('Comparison error:', err);
        setError('Error al comparar rostros. Intenta de nuevo.');
        setAttempts(prev => prev + 1);
        setStatus('failed');
      }
    } else {
      // First time - register facial embedding
      setStatus('registering');
      setInstruction('Registrando tu rostro por primera vez...');

      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ facial_embedding: embedding })
          .eq('id', userId);

        if (error) {
          console.error('Error saving embedding:', error);
          setError('Error al registrar rostro. Intenta de nuevo.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          return;
        }

        setStatus('success');
        setInstruction('¡Rostro registrado exitosamente!');
        stopCamera();

        // Log successful access
        await supabase.from('access_logs').insert({
          user_id: userId,
          timestampt: new Date().toISOString(),
          device_info: navigator.userAgent,
          success: true,
        });

        setTimeout(onSuccess, 1500);
      } catch (err) {
        console.error('Registration error:', err);
        setError('Error al registrar rostro. Intenta de nuevo.');
        setAttempts(prev => prev + 1);
        setStatus('failed');
      }
    }
  };

  // Handle retry
  const handleRetry = useCallback(() => {
    setError(null);
    setBlinkDetected(false);
    blinkCount.current = 0;
    eyeRatioHistory.current = [];
    setFaceDetected(false);
    
    if (attempts < MAX_ATTEMPTS) {
      startCamera().then(() => startDetection());
    }
  }, [attempts, startCamera, startDetection]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const modelsOk = await loadModels();
      if (modelsOk) {
        await checkStoredEmbedding();
        await startCamera();
      }
    };
    
    init();
    
    return () => stopCamera();
  }, [loadModels, checkStoredEmbedding, startCamera, stopCamera]);

  // Start detection when camera is ready
  useEffect(() => {
    if (status === 'ready' && modelsLoaded) {
      startDetection();
    }
  }, [status, modelsLoaded, startDetection]);

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-500 shadow-green-500/50';
      case 'failed':
        return 'border-red-500 shadow-red-500/50';
      case 'liveness-check':
        return blinkDetected ? 'border-green-500' : 'border-yellow-500 shadow-yellow-500/50';
      case 'detecting':
        return faceDetected ? 'border-primary shadow-primary/50' : 'border-muted';
      default:
        return 'border-primary/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-6 max-w-lg w-full">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {hasStoredEmbedding === false ? 'Registro Facial' : 'Verificación Facial'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {hasStoredEmbedding === false 
              ? 'Registra tu rostro para futuros accesos' 
              : 'Verifica tu identidad para continuar'}
          </p>
        </div>

        {/* Video container */}
        <div className="relative">
          <div className={`relative w-72 h-72 rounded-full overflow-hidden border-4 transition-all duration-300 ${getStatusColor()}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
            />
            
            {/* Scanning overlay */}
            {(status === 'detecting' || status === 'liveness-check') && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-1 bg-primary/50 animate-pulse" 
                     style={{ 
                       animation: 'scanning 2s ease-in-out infinite',
                     }} 
                />
              </div>
            )}

            {/* Status overlays */}
            {status === 'loading-models' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            )}
            
            {status === 'success' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                <CheckCircle className="w-20 h-20 text-green-400" />
              </div>
            )}
            
            {status === 'failed' && attempts >= MAX_ATTEMPTS && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                <XCircle className="w-20 h-20 text-red-400" />
              </div>
            )}
          </div>

          {/* Face detection indicator */}
          {(status === 'detecting' || status === 'liveness-check') && (
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium ${
              faceDetected ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
            }`}>
              {faceDetected ? '✓ Rostro detectado' : 'Buscando rostro...'}
            </div>
          )}

          {/* Blink indicator */}
          {status === 'liveness-check' && (
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              blinkDetected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              <Eye className="w-3 h-3" />
              {blinkDetected ? '✓ Parpadeo detectado' : 'Parpadea ahora'}
            </div>
          )}
        </div>

        {/* Instruction text */}
        <div className="text-center space-y-2 min-h-[60px]">
          {status === 'loading-models' && (
            <p className="text-muted-foreground flex items-center gap-2 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              {instruction}
            </p>
          )}
          
          {status === 'initializing' && (
            <p className="text-muted-foreground flex items-center gap-2 justify-center">
              <Camera className="w-5 h-5 animate-pulse" />
              {instruction}
            </p>
          )}
          
          {(status === 'ready' || status === 'detecting') && (
            <p className="text-foreground">{instruction}</p>
          )}
          
          {status === 'liveness-check' && (
            <p className="text-yellow-400 flex items-center gap-2 justify-center">
              <Eye className="w-5 h-5" />
              {instruction}
            </p>
          )}

          {status === 'comparing' && (
            <p className="text-primary flex items-center gap-2 justify-center">
              <RefreshCw className="w-5 h-5 animate-spin" />
              {instruction}
            </p>
          )}

          {status === 'registering' && (
            <p className="text-primary flex items-center gap-2 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              {instruction}
            </p>
          )}
          
          {status === 'success' && (
            <p className="text-green-400 flex items-center gap-2 justify-center">
              <CheckCircle className="w-5 h-5" />
              {instruction}
            </p>
          )}
          
          {error && (
            <p className="text-destructive flex items-center gap-2 justify-center">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          {status === 'failed' && attempts < MAX_ATTEMPTS && (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="border-primary/50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar ({MAX_ATTEMPTS - attempts} intentos restantes)
            </Button>
          )}
          
          {status === 'failed' && attempts >= MAX_ATTEMPTS && (
            <Button
              onClick={onCancel}
              variant="destructive"
            >
              Volver al inicio
            </Button>
          )}
          
          {status !== 'success' && status !== 'failed' && (
            <Button
              onClick={onCancel}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
          )}
        </div>

        {/* Attempts counter */}
        {attempts > 0 && attempts < MAX_ATTEMPTS && (
          <p className="text-sm text-muted-foreground">
            Intento {attempts} de {MAX_ATTEMPTS}
          </p>
        )}

        {/* Privacy notice */}
        <p className="text-xs text-muted-foreground/70 text-center max-w-sm">
          Solo se almacena una representación matemática de tu rostro (embedding), no imágenes ni video.
        </p>

        <style>{`
          @keyframes scanning {
            0%, 100% { transform: translateY(-100px); opacity: 0.3; }
            50% { transform: translateY(100px); opacity: 0.8; }
          }
        `}</style>
      </div>
    </div>
  );
};
