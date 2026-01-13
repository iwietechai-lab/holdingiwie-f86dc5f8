import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';

interface LocationData {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

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
const MAX_ATTEMPTS = 5;
const DETECTION_TIMEOUT_SECONDS = 15;

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
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  
  // Eye aspect ratio history for blink detection
  const eyeRatioHistory = useRef<number[]>([]);

  // Get user location
  const getLocation = useCallback(async (): Promise<LocationData> => {
    try {
      setGettingLocation(true);
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
        });
      });

      // Try to get city/country from coordinates using reverse geocoding
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=es`
        );
        const data = await response.json();
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: data.city || data.locality || 'Desconocida',
          country: data.countryName || 'Desconocido',
        };
        setLocationData(location);
        setGettingLocation(false);
        return location;
      } catch {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocationData(location);
        setGettingLocation(false);
        return location;
      }
    } catch (err) {
      console.error('Error getting location:', err);
      setGettingLocation(false);
      return {};
    }
  }, []);

  // Log access with location and timestamp
  const logAccessWithLocation = useCallback(async (success: boolean, location: LocationData) => {
    try {
      const timestamp = new Date().toISOString();
      
      const { error } = await supabase.from('access_logs').insert({
        user_id: userId,
        timestampt: timestamp,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        city: location.city || null,
        country: location.country || null,
        device_info: navigator.userAgent,
        success,
      });

      if (error) {
        console.error('Error logging access:', error);
      } else {
        console.log('Access logged successfully:', { userId, timestamp, location, success });
      }
    } catch (error) {
      console.error('Error logging access:', error);
    }
  }, [userId]);
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

  // Check if user has stored facial embedding using RPC to bypass RLS
  const checkStoredEmbedding = useCallback(async () => {
    try {
      console.log('🔍 Checking stored embedding for user:', userId);
      
      // Use RPC get_user_facial_embedding to bypass RLS
      const { data, error } = await supabase.rpc('get_user_facial_embedding', {
        target_user_id: userId
      });

      if (error) {
        console.error('Error checking embedding via RPC:', error);
        // Fallback: assume no embedding
        setHasStoredEmbedding(false);
        return false;
      }

      const embedding = data?.facial_embedding;
      const hasEmbedding = embedding && 
        Array.isArray(embedding) && 
        embedding.length > 0;
      
      console.log('📊 Has stored embedding:', hasEmbedding);
      setHasStoredEmbedding(hasEmbedding);
      return hasEmbedding;
    } catch (err) {
      console.error('Error checking stored embedding:', err);
      setHasStoredEmbedding(false);
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

  // Detect blink using EAR with improved thresholds and logging
  const detectBlink = useCallback((landmarks: faceapi.FaceLandmarks68) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    eyeRatioHistory.current.push(avgEAR);
    
    // Log every 15 frames for debugging
    if (eyeRatioHistory.current.length % 15 === 0) {
      console.log('👁️ EAR:', avgEAR.toFixed(3), '| History:', eyeRatioHistory.current.slice(-5).map(v => v.toFixed(2)).join(', '));
    }
    
    // Keep last 20 frames for better detection
    if (eyeRatioHistory.current.length > 20) {
      eyeRatioHistory.current.shift();
    }

    // Detect blink: Look for a significant dip in EAR followed by recovery
    // Much more lenient thresholds for easier detection
    if (eyeRatioHistory.current.length >= 6) {
      const recent = eyeRatioHistory.current.slice(-6);
      const min = Math.min(...recent);
      const max = Math.max(...recent);
      const current = recent[recent.length - 1];
      const diff = max - min;
      
      // Blink detected if:
      // 1. There's a significant variation (at least 0.05 difference)
      // 2. Current value is higher than the minimum (eyes are open again)
      // 3. Minimum was below 0.28 (eyes were at least partially closed)
      if (diff > 0.04 && min < 0.30 && current > min + 0.02) {
        console.log('✅ BLINK DETECTED!', { 
          min: min.toFixed(3), 
          max: max.toFixed(3), 
          current: current.toFixed(3),
          diff: diff.toFixed(3)
        });
        blinkCount.current += 1;
        eyeRatioHistory.current = []; // Reset after blink
        return true;
      }
    }
    
    return false;
  }, []);

  // Main face detection and verification loop - keeps camera always active
  const startDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    console.log('🚀 Starting face detection... Camera will stay active until success.');
    setStatus('detecting');
    setInstruction('Mantén la cámara activa y parpadea lentamente');
    setBlinkDetected(false);
    blinkCount.current = 0;
    eyeRatioHistory.current = [];

    let livenessConfirmed = false;
    let detectionAttempts = 0;
    const maxDetectionAttempts = DETECTION_TIMEOUT_SECONDS * 30; // ~15 seconds at 30fps
    let faceDetectedCount = 0;
    let lastFaceDetectedTime = 0;

    const detect = async () => {
      // Only stop on success - camera stays active otherwise
      if (!videoRef.current || status === 'success') return;
      
      // If status is failed, we still keep the loop but pause detection
      if (status === 'failed') {
        // Keep trying to detect while showing retry button
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      detectionAttempts++;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 224, // Smaller for faster detection
            scoreThreshold: 0.3, // Lower threshold for better detection in various lighting
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          faceDetectedCount++;
          lastFaceDetectedTime = Date.now();
          setFaceDetected(true);
          
          if (faceDetectedCount === 1) {
            console.log('👤 Face detected! Score:', detection.detection.score.toFixed(2));
          }

          // Draw face detection on canvas
          if (canvasRef.current && videoRef.current) {
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
            setInstruction('¡Rostro detectado! Parpadea lentamente 1 vez');
            
            if (detectBlink(detection.landmarks)) {
              console.log('🎉 Liveness confirmed via blink!');
              setBlinkDetected(true);
              livenessConfirmed = true;
              
              // Proceed to embedding comparison/registration
              await processEmbedding(detection.descriptor);
              return; // Stop detection loop on success
            }
          }
        } else {
          // Only mark as not detected if no face for more than 500ms
          if (Date.now() - lastFaceDetectedTime > 500) {
            setFaceDetected(false);
          }
          if (status === 'detecting') {
            setInstruction('Posiciona tu rostro dentro del círculo');
          }
        }

        // Log progress every 60 frames (~2 seconds)
        if (detectionAttempts % 60 === 0) {
          const elapsed = Math.floor(detectionAttempts / 30);
          console.log(`⏱️ ${elapsed}s elapsed, faces detected: ${faceDetectedCount}, waiting for blink...`);
        }

        // Timeout - but don't stop camera
        if (detectionAttempts >= maxDetectionAttempts && !livenessConfirmed) {
          console.log('❌ Timeout - no blink detected after', DETECTION_TIMEOUT_SECONDS, 'seconds');
          setError('No se detectó parpadeo. Mantén la cámara activa y parpadea lentamente.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          // Don't stop camera - user can retry
          // Don't return - keep the animation frame going for retry
        }

        animationRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error('Detection error:', err);
        animationRef.current = requestAnimationFrame(detect);
      }
    };

    detect();
  }, [modelsLoaded, status, detectBlink]);

  // Process embedding - compare or register using RPC to bypass RLS
  const processEmbedding = async (descriptor: Float32Array) => {
    const embedding = Array.from(descriptor);
    console.log('🔐 Processing embedding, has stored:', hasStoredEmbedding);

    if (hasStoredEmbedding) {
      // Compare with stored embedding
      setStatus('comparing');
      setInstruction('Comparando con tu rostro registrado...');

      try {
        // Use RPC get_user_facial_embedding to bypass RLS
        const { data, error } = await supabase.rpc('get_user_facial_embedding', {
          target_user_id: userId
        });

        if (error || !data?.facial_embedding) {
          console.error('Error getting facial embedding:', error);
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

        console.log('📏 Face match distance:', distance.toFixed(4), '(threshold:', MATCH_THRESHOLD, ')');

        if (distance < MATCH_THRESHOLD) {
          // Match successful
          console.log('✅ Face match successful!');
          setStatus('success');
          setInstruction('¡Verificación completada!');
          stopCamera();
          
          // Log successful access with location
          await logAccessWithLocation(true, locationData || {});
          
          // Update last facial verification timestamp using direct update
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ last_facial_verification: new Date().toISOString() })
            .eq('id', userId);
          
          if (updateError) {
            console.error('Error updating verification timestamp:', updateError);
          } else {
            console.log('📝 Verification timestamp saved!');
          }

          setTimeout(onSuccess, 1500);
        } else {
          console.log('❌ Face match failed - distance too high');
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
      console.log('📝 Registering new facial embedding...');
      setStatus('registering');
      setInstruction('Registrando tu rostro por primera vez...');

      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ 
            facial_embedding: embedding,
            last_facial_verification: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          console.error('Error saving embedding:', error);
          setError('Error al registrar rostro. Intenta de nuevo.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          return;
        }

        console.log('✅ Facial embedding registered successfully!');
        setStatus('success');
        setInstruction('¡Rostro registrado exitosamente!');
        stopCamera();

        // Log successful access with location
        await logAccessWithLocation(true, locationData || {});

        setTimeout(onSuccess, 1500);
      } catch (err) {
        console.error('Registration error:', err);
        setError('Error al registrar rostro. Intenta de nuevo.');
        setAttempts(prev => prev + 1);
        setStatus('failed');
      }
    }
  };

  // Handle retry - camera stays active, just reset detection state
  const handleRetry = useCallback(() => {
    console.log('🔄 Retrying detection...');
    setError(null);
    setBlinkDetected(false);
    blinkCount.current = 0;
    eyeRatioHistory.current = [];
    setFaceDetected(false);
    
    if (attempts < MAX_ATTEMPTS) {
      // Camera is still active, just restart detection
      setStatus('detecting');
      setInstruction('Mantén la cámara activa y parpadea lentamente');
      startDetection();
    }
  }, [attempts, startDetection]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      // Start getting location immediately
      getLocation();
      
      const modelsOk = await loadModels();
      if (modelsOk) {
        await checkStoredEmbedding();
        await startCamera();
      }
    };
    
    init();
    
    return () => stopCamera();
  }, [loadModels, checkStoredEmbedding, startCamera, stopCamera, getLocation]);

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

          {/* Location indicator */}
          <div className={`absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            locationData ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
          }`}>
            <MapPin className="w-3 h-3" />
            {gettingLocation 
              ? 'Obteniendo ubicación...' 
              : locationData?.city 
                ? `${locationData.city}, ${locationData.country}` 
                : 'Ubicación no disponible'}
          </div>
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
