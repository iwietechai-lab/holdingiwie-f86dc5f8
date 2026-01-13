import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, MapPin, User } from 'lucide-react';
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
  | 'comparing'
  | 'registering'
  | 'success'
  | 'failed';

const FACE_API_MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const SIMILARITY_THRESHOLD = 0.75; // Cosine similarity threshold
const MAX_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 3000; // 3 seconds between auto-retries
const DETECTION_CONFIDENCE = 0.5; // More tolerant threshold

// Progressive messages for retries
const RETRY_MESSAGES = [
  'Buscando rostro...',
  'Acerca más la cara a la cámara',
  'Mejora la iluminación',
  'Mantén el rostro centrado',
  'Último intento - mira directamente a la cámara'
];

export const RealFaceRecognition = ({ userId, onSuccess, onCancel }: RealFaceRecognitionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [status, setStatus] = useState<RecognitionStatus>('loading-models');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [instruction, setInstruction] = useState('Cargando modelos de IA...');
  const [hasStoredEmbedding, setHasStoredEmbedding] = useState<boolean | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [landmarksCount, setLandmarksCount] = useState(0);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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
        console.log('✅ Access logged:', { userId, timestamp, location, success });
      }
    } catch (error) {
      console.error('Error logging access:', error);
    }
  }, [userId]);

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    try {
      console.log('🔄 Loading face-api.js models...');
      setInstruction('Cargando modelos de reconocimiento facial...');
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODELS_URL),
      ]);
      
      console.log('✅ Models loaded successfully');
      setModelsLoaded(true);
      setInstruction('Modelos cargados. Iniciando cámara...');
      return true;
    } catch (err) {
      console.error('❌ Error loading face-api models:', err);
      setError('Error al cargar modelos de IA. Recarga la página.');
      setStatus('failed');
      return false;
    }
  }, []);

  // Check if user has stored facial embedding using RPC
  const checkStoredEmbedding = useCallback(async () => {
    try {
      console.log('🔍 Checking stored embedding for user:', userId);
      
      const { data, error } = await supabase.rpc('get_user_facial_embedding', {
        target_user_id: userId
      });

      if (error) {
        console.error('Error checking embedding via RPC:', error);
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
        console.log('📹 Camera started successfully');
        setStatus('ready');
        setInstruction('Posiciona tu rostro dentro del círculo');
      }
    } catch (err) {
      console.error('❌ Camera error:', err);
      setError('No se pudo acceder a la cámara. Permite el acceso e intenta de nuevo.');
      setStatus('failed');
    }
  }, []);

  // Stop camera - only on success or cancel
  const stopCamera = useCallback(() => {
    console.log('📹 Stopping camera...');
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Calculate cosine similarity between two embeddings
  const cosineSimilarity = (a: number[], b: number[]): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  // Process embedding - compare or register
  const processEmbedding = useCallback(async (descriptor: Float32Array) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const embedding = Array.from(descriptor);
    console.log('🔐 Processing embedding, length:', embedding.length);
    console.log('🔐 Has stored embedding:', hasStoredEmbedding);

    if (hasStoredEmbedding) {
      // Compare with stored embedding
      setStatus('comparing');
      setInstruction('Comparando con tu rostro registrado...');

      try {
        const { data, error } = await supabase.rpc('get_user_facial_embedding', {
          target_user_id: userId
        });

        if (error || !data?.facial_embedding) {
          console.error('❌ Error getting facial embedding:', error);
          setError('Error al obtener datos faciales. Intenta de nuevo.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          setIsProcessing(false);
          return;
        }

        const storedEmbedding = data.facial_embedding as number[];
        const similarity = cosineSimilarity(embedding, storedEmbedding);

        console.log('📏 Cosine similarity:', similarity.toFixed(4), '(threshold:', SIMILARITY_THRESHOLD, ')');

        if (similarity >= SIMILARITY_THRESHOLD) {
          // Match successful
          console.log('✅ Face match successful! Similarity:', similarity.toFixed(4));
          setStatus('success');
          setInstruction('¡Verificación completada!');
          stopCamera();
          
          await logAccessWithLocation(true, locationData || {});
          
          // Update last facial verification timestamp
          console.log('📝 Saving verification timestamp...');
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ last_facial_verification: new Date().toISOString() })
            .eq('id', userId);
          
          if (updateError) {
            console.error('❌ Error updating verification timestamp:', updateError);
          } else {
            console.log('✅ Verification timestamp saved:', new Date().toISOString());
          }

          setTimeout(onSuccess, 1500);
        } else {
          console.log('❌ Face match failed - similarity too low:', similarity.toFixed(4));
          
          // If similarity is very low, allow re-registering
          if (similarity < 0.5) {
            console.log('📝 Very low similarity - offering to re-register');
            setError(`Rostro no coincide (similitud: ${(similarity * 100).toFixed(1)}%). Si tu apariencia cambió, puedes re-registrar.`);
          } else {
            setError(`Rostro no coincide (similitud: ${(similarity * 100).toFixed(1)}%). Intenta de nuevo.`);
          }
          setAttempts(prev => prev + 1);
          setStatus('failed');
        }
      } catch (err) {
        console.error('❌ Comparison error:', err);
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
          console.error('❌ Error saving embedding:', error);
          setError('Error al registrar rostro. Intenta de nuevo.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          setIsProcessing(false);
          return;
        }

        console.log('✅ Facial embedding registered successfully!');
        console.log('📝 Timestamp saved:', new Date().toISOString());
        setStatus('success');
        setInstruction('¡Rostro registrado exitosamente!');
        stopCamera();

        await logAccessWithLocation(true, locationData || {});

        setTimeout(onSuccess, 1500);
      } catch (err) {
        console.error('❌ Registration error:', err);
        setError('Error al registrar rostro. Intenta de nuevo.');
        setAttempts(prev => prev + 1);
        setStatus('failed');
      }
    }
    setIsProcessing(false);
  }, [hasStoredEmbedding, userId, stopCamera, logAccessWithLocation, locationData, onSuccess, isProcessing]);

  // Draw landmarks on canvas
  const drawLandmarks = useCallback((detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
    const resized = faceapi.resizeResults(detection, dims);
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw all landmarks with colors
      const landmarks = detection.landmarks;
      
      // Draw face outline
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      
      // Eyes (green)
      ctx.fillStyle = '#00ff00';
      landmarks.getLeftEye().forEach(point => {
        const scaled = { x: point.x * dims.width / videoRef.current!.videoWidth, y: point.y * dims.height / videoRef.current!.videoHeight };
        ctx.beginPath();
        ctx.arc(scaled.x, scaled.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
      landmarks.getRightEye().forEach(point => {
        const scaled = { x: point.x * dims.width / videoRef.current!.videoWidth, y: point.y * dims.height / videoRef.current!.videoHeight };
        ctx.beginPath();
        ctx.arc(scaled.x, scaled.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      // Nose (blue)
      ctx.fillStyle = '#0088ff';
      landmarks.getNose().forEach(point => {
        const scaled = { x: point.x * dims.width / videoRef.current!.videoWidth, y: point.y * dims.height / videoRef.current!.videoHeight };
        ctx.beginPath();
        ctx.arc(scaled.x, scaled.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      // Mouth (red)
      ctx.fillStyle = '#ff4444';
      landmarks.getMouth().forEach(point => {
        const scaled = { x: point.x * dims.width / videoRef.current!.videoWidth, y: point.y * dims.height / videoRef.current!.videoHeight };
        ctx.beginPath();
        ctx.arc(scaled.x, scaled.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  }, []);

  // Main face detection loop
  const startDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    console.log('🚀 Starting face detection... Camera stays active until success.');
    setStatus('detecting');
    setInstruction(RETRY_MESSAGES[0]);
    setAutoRetryCount(0);

    let consecutiveDetections = 0;
    let lastValidDetection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>> | null = null;
    let frameCount = 0;
    let noFaceFrames = 0;

    const detect = async () => {
      if (!videoRef.current || status === 'success' || isProcessing) {
        return;
      }

      frameCount++;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: DETECTION_CONFIDENCE, // More tolerant
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          noFaceFrames = 0;
          consecutiveDetections++;
          lastValidDetection = detection;
          
          const landmarks = detection.landmarks;
          const landmarkCount = landmarks.positions.length;
          setLandmarksCount(landmarkCount);
          setFaceDetected(true);

          // Draw landmarks in real-time
          drawLandmarks(detection);
          
          // Log every 30 frames
          if (frameCount % 30 === 0) {
            console.log('👤 Face detected! Score:', detection.detection.score.toFixed(2), 
                        '| Landmarks:', landmarkCount,
                        '| Consecutive:', consecutiveDetections);
          }

          // If we have enough landmarks (> 5 points) and stable detection
          if (landmarkCount > 5 && consecutiveDetections >= 5) {
            console.log('✅ Stable face detected with', landmarkCount, 'landmarks');
            console.log('🔄 Processing embedding...');
            
            // Process embedding
            await processEmbedding(detection.descriptor);
            return; // Stop detection loop
          }

          setInstruction('¡Rostro detectado! Mantén la posición...');
        } else {
          noFaceFrames++;
          consecutiveDetections = 0;
          
          if (noFaceFrames > 15) { // After ~0.5 seconds without face
            setFaceDetected(false);
            setLandmarksCount(0);
            
            // Clear canvas
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
          }
        }

        // Auto-retry with progressive messages every 3 seconds
        if (frameCount % 90 === 0 && !faceDetected) { // ~3 seconds at 30fps
          const retryIndex = Math.min(autoRetryCount, RETRY_MESSAGES.length - 1);
          setInstruction(RETRY_MESSAGES[retryIndex]);
          setAutoRetryCount(prev => prev + 1);
          console.log(`⏱️ Auto-retry ${autoRetryCount + 1}: ${RETRY_MESSAGES[retryIndex]}`);
          
          // After 5 auto-retries (15 seconds), show manual retry option
          if (autoRetryCount >= 4) {
            console.log('❌ Max auto-retries reached, showing manual retry');
            setError('No se detectó rostro. Verifica cámara/iluminación/posición.');
            setAttempts(prev => prev + 1);
            setStatus('failed');
            return; // Stop auto-detection
          }
        }

        animationRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error('Detection error:', err);
        animationRef.current = requestAnimationFrame(detect);
      }
    };

    detect();
  }, [modelsLoaded, status, drawLandmarks, processEmbedding, autoRetryCount, faceDetected, isProcessing]);

  // Handle manual retry
  const handleRetry = useCallback(() => {
    console.log('🔄 Manual retry triggered');
    setError(null);
    setFaceDetected(false);
    setLandmarksCount(0);
    setAutoRetryCount(0);
    setIsProcessing(false);
    
    if (attempts < MAX_ATTEMPTS) {
      setStatus('detecting');
      setInstruction(RETRY_MESSAGES[0]);
      startDetection();
    }
  }, [attempts, startDetection]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    console.log('❌ User cancelled');
    stopCamera();
    onCancel();
  }, [stopCamera, onCancel]);

  // Initialize
  useEffect(() => {
    const init = async () => {
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
      case 'detecting':
        return faceDetected ? 'border-green-500 shadow-green-500/50' : 'border-primary/50';
      case 'comparing':
      case 'registering':
        return 'border-yellow-500 shadow-yellow-500/50';
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
            {status === 'detecting' && !faceDetected && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-1 bg-primary/50 animate-pulse" 
                     style={{ animation: 'scanning 2s ease-in-out infinite' }} 
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
          {(status === 'detecting' || status === 'comparing' || status === 'registering') && (
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              faceDetected ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
            }`}>
              <User className="w-3 h-3" />
              {faceDetected 
                ? `✓ Rostro detectado (${landmarksCount} puntos)` 
                : 'Buscando rostro...'}
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
        <div className="text-center space-y-2 min-h-[60px] mt-4">
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
            <p className={`flex items-center gap-2 justify-center ${faceDetected ? 'text-green-400' : 'text-foreground'}`}>
              {faceDetected ? <CheckCircle className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
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
            <p className="text-destructive flex items-center gap-2 justify-center text-sm">
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
              onClick={handleCancel}
              variant="destructive"
            >
              Volver al inicio
            </Button>
          )}
          
          {status !== 'success' && status !== 'failed' && (
            <Button
              onClick={handleCancel}
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
