import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, MapPin, User, MoveHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';

// Session verification key (must match useFacialVerification hook)
const SESSION_VERIFIED_KEY = 'facial_verification_done';
const markSessionVerified = () => {
  try {
    sessionStorage.setItem(SESSION_VERIFIED_KEY, 'true');
  } catch {
    console.warn('Could not save to sessionStorage');
  }
};

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

type LivenessChallenge = 'turn-left' | 'turn-right' | 'nod-up' | 'nod-down';

const FACE_API_MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const SIMILARITY_THRESHOLD = 0.75;
const MAX_ATTEMPTS = 5;
const DETECTION_CONFIDENCE = 0.5;
const LIVENESS_TIMEOUT_SECONDS = 15;

// Liveness challenge messages
const CHALLENGE_MESSAGES: Record<LivenessChallenge, string> = {
  'turn-left': '👈 Gira la cabeza hacia la IZQUIERDA',
  'turn-right': '👉 Gira la cabeza hacia la DERECHA',
  'nod-up': '👆 Mueve la cabeza hacia ARRIBA',
  'nod-down': '👇 Mueve la cabeza hacia ABAJO'
};

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
  const [faceDetected, setFaceDetected] = useState(false);
  const [landmarksCount, setLandmarksCount] = useState(0);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge | null>(null);

  // Use refs to track state in detection loop (avoid stale closures)
  const statusRef = useRef<RecognitionStatus>('loading-models');
  const isProcessingRef = useRef(false);
  const livenessConfirmedRef = useRef(false);

  // Sync refs with state
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // Liveness detection state
  const nosePositionsRef = useRef<{x: number, y: number}[]>([]);
  const eyeRatioHistoryRef = useRef<number[]>([]);
  const initialNosePositionRef = useRef<{x: number, y: number} | null>(null);
  const livenessStartTimeRef = useRef<number>(0);
  const challengeCompletedRef = useRef(false);
  const currentChallengeRef = useRef<LivenessChallenge | null>(null);

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

  // Log access with location
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
        console.log('✅ Access logged:', { userId, timestamp, success });
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

  // Check stored embedding using RPC
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

      // RPC returns an array, get first element
      const embedding = data?.[0]?.facial_embedding;
      const hasEmbedding = embedding && Array.isArray(embedding) && embedding.length > 0;
      
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

  // Stop camera - ensures complete cleanup with forced track termination
  const stopCamera = useCallback(() => {
    console.log('📹 FORCE stopping camera and cleaning up...');
    
    // Cancel animation frame first
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop all media tracks from streamRef
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      console.log('📹 Found', tracks.length, 'tracks to stop from streamRef');
      tracks.forEach(track => {
        console.log('📹 Force stopping track:', track.kind, track.label, 'readyState:', track.readyState);
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    
    // Also stop tracks directly from video element (belt and suspenders approach)
    if (videoRef.current) {
      const srcObj = videoRef.current.srcObject as MediaStream | null;
      if (srcObj && srcObj.getTracks) {
        srcObj.getTracks().forEach(track => {
          console.log('📹 Force stopping video element track:', track.kind, track.label);
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.warn('Error stopping video track:', e);
          }
        });
      }
      videoRef.current.srcObject = null;
      videoRef.current.pause();
      try {
        videoRef.current.load(); // Force video element to release resources
      } catch (e) {
        console.warn('Error loading empty video:', e);
      }
    }
    
    // As a last resort, try to stop all active media tracks in the page
    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        // This doesn't stop existing streams, but we've done what we can
        console.log('✅ Camera cleanup complete - all tracks should be stopped');
      }
    } catch (e) {
      console.warn('MediaDevices check error:', e);
    }
  }, []);

  // Calculate cosine similarity
  const cosineSimilarity = (a: number[], b: number[]): number => {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  // Calculate Eye Aspect Ratio for blink detection
  const calculateEAR = (eyePoints: faceapi.Point[]): number => {
    const p1 = eyePoints[0], p2 = eyePoints[1], p3 = eyePoints[2];
    const p4 = eyePoints[3], p5 = eyePoints[4], p6 = eyePoints[5];
    const A = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
    const B = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
    const C = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));
    return (A + B) / (2.0 * C);
  };

  // Select random liveness challenge (only head movements)
  const selectRandomChallenge = (): LivenessChallenge => {
    const challenges: LivenessChallenge[] = ['turn-left', 'turn-right', 'nod-up', 'nod-down'];
    return challenges[Math.floor(Math.random() * challenges.length)];
  };

  // Check liveness based on current challenge (uses ref for loop)
  const checkLiveness = useCallback((landmarks: faceapi.FaceLandmarks68): boolean => {
    const challenge = currentChallengeRef.current;
    if (!challenge) return false;

    const nose = landmarks.getNose();
    const noseCenter = nose[3]; // Tip of nose
    
    // Store nose positions for movement detection
    nosePositionsRef.current.push({ x: noseCenter.x, y: noseCenter.y });
    if (nosePositionsRef.current.length > 30) {
      nosePositionsRef.current.shift();
    }

    // Set initial position if not set
    if (!initialNosePositionRef.current && nosePositionsRef.current.length >= 5) {
      initialNosePositionRef.current = {
        x: nosePositionsRef.current.slice(0, 5).reduce((sum, p) => sum + p.x, 0) / 5,
        y: nosePositionsRef.current.slice(0, 5).reduce((sum, p) => sum + p.y, 0) / 5
      };
      console.log('📍 Initial nose position set:', initialNosePositionRef.current);
    }

    if (!initialNosePositionRef.current) return false;

    const currentX = noseCenter.x;
    const currentY = noseCenter.y;
    const initialX = initialNosePositionRef.current.x;
    const initialY = initialNosePositionRef.current.y;
    
    // Calculate movement from initial position
    const deltaX = currentX - initialX;
    const deltaY = currentY - initialY;
    
    // Movement threshold (adjust based on video resolution)
    const MOVEMENT_THRESHOLD = 20; // Reduced for easier detection

    switch (challenge) {
      case 'turn-left':
        // Nose moves RIGHT in mirrored video when turning left
        const progressLeft = Math.min(100, Math.max(0, (deltaX / MOVEMENT_THRESHOLD) * 100));
        setLivenessProgress(progressLeft);
        if (deltaX > MOVEMENT_THRESHOLD) {
          console.log('✅ LIVENESS: Turn left detected! DeltaX:', deltaX.toFixed(2));
          return true;
        }
        break;

      case 'turn-right':
        // Nose moves LEFT in mirrored video when turning right
        const progressRight = Math.min(100, Math.max(0, (Math.abs(deltaX) / MOVEMENT_THRESHOLD) * 100));
        setLivenessProgress(progressRight);
        if (deltaX < -MOVEMENT_THRESHOLD) {
          console.log('✅ LIVENESS: Turn right detected! DeltaX:', deltaX.toFixed(2));
          return true;
        }
        break;

      case 'nod-up':
        // Head moves up (nose goes up in video, Y decreases)
        const progressUp = Math.min(100, Math.max(0, (Math.abs(deltaY) / MOVEMENT_THRESHOLD) * 100));
        setLivenessProgress(progressUp);
        if (deltaY < -MOVEMENT_THRESHOLD) {
          console.log('✅ LIVENESS: Nod up detected! DeltaY:', deltaY.toFixed(2));
          return true;
        }
        break;

      case 'nod-down':
        // Head moves down (nose goes down in video, Y increases)
        const progressDown = Math.min(100, Math.max(0, (deltaY / MOVEMENT_THRESHOLD) * 100));
        setLivenessProgress(progressDown);
        if (deltaY > MOVEMENT_THRESHOLD) {
          console.log('✅ LIVENESS: Nod down detected! DeltaY:', deltaY.toFixed(2));
          return true;
        }
        break;
    }

    // Log progress periodically
    if (nosePositionsRef.current.length % 15 === 0) {
      console.log(`🔍 Liveness check - Challenge: ${challenge}, DeltaX: ${deltaX.toFixed(2)}, DeltaY: ${deltaY.toFixed(2)}`);
    }

    return false;
  }, []);

  // Process embedding
  const processEmbedding = useCallback(async (descriptor: Float32Array) => {
    if (isProcessingRef.current) return;
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    const embedding = Array.from(descriptor);
    console.log('🔐 Embedding generado', embedding.slice(0, 5), '... (length:', embedding.length, ')');

    if (hasStoredEmbedding) {
      setStatus('comparing');
      statusRef.current = 'comparing';
      setInstruction('Comparando con tu rostro registrado...');

      try {
        const { data, error } = await supabase.rpc('get_user_facial_embedding', {
          target_user_id: userId
        });

        // RPC returns an array, get first element
        const embeddingData = data?.[0];
        if (error || !embeddingData?.facial_embedding) {
          console.error('❌ Error getting facial embedding:', error);
          setError('Error al obtener datos faciales. Intenta de nuevo.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          statusRef.current = 'failed';
          setIsProcessing(false);
          isProcessingRef.current = false;
          return;
        }

        const storedEmbedding = embeddingData.facial_embedding as number[];
        console.log('📊 Embedding guardado', storedEmbedding.slice(0, 5), '... (length:', storedEmbedding.length, ')');
        
        const similarity = cosineSimilarity(embedding, storedEmbedding);
        console.log('📏 Similitud calculada:', similarity.toFixed(4), '(umbral:', SIMILARITY_THRESHOLD, ')');

        if (similarity >= SIMILARITY_THRESHOLD) {
          console.log('✅ Face match successful!');
          setStatus('success');
          statusRef.current = 'success';
          setInstruction('¡Verificación completada!');
          
          // IMMEDIATELY stop camera before anything else
          console.log('📹 Stopping camera IMMEDIATELY after success');
          stopCamera();
          
          await logAccessWithLocation(true, locationData || {});
          
          // Use RPC to update timestamp (bypasses RLS issues - SECURITY DEFINER)
          const { error: updateError } = await supabase.rpc('save_facial_embedding', {
            target_user_id: userId,
            new_embedding: null, // Don't update embedding, just timestamp
            update_timestamp: true
          });
          
          if (updateError) {
            console.error('❌ Error updating timestamp via RPC:', updateError);
          } else {
            console.log('✅ Timestamp actualizado via RPC:', new Date().toISOString());
          }

          // Mark session as verified in sessionStorage
          markSessionVerified();
          
          // Ensure camera is fully stopped before calling onSuccess
          setTimeout(() => {
            stopCamera(); // Call again just in case
            onSuccess();
          }, 1500);
        } else {
          console.log('❌ Face match failed - similarity:', similarity.toFixed(4));
          setError(`Rostro no coincide (similitud: ${(similarity * 100).toFixed(1)}%). Intenta de nuevo.`);
          setAttempts(prev => prev + 1);
          setStatus('failed');
          statusRef.current = 'failed';
          stopCamera();
        }
      } catch (err) {
        console.error('❌ Comparison error:', err);
        setError('Error al comparar rostros. Intenta de nuevo.');
        setAttempts(prev => prev + 1);
        setStatus('failed');
        statusRef.current = 'failed';
        stopCamera();
      }
    } else {
      console.log('📝 Registrando nuevo embedding facial...');
      console.log('📊 Guardando embedding', embedding.slice(0, 5), '...');
      setStatus('registering');
      statusRef.current = 'registering';
      setInstruction('Registrando tu rostro por primera vez...');

      try {
        // Use RPC to save embedding (SECURITY DEFINER - bypasses RLS)
        const { error: rpcError } = await supabase.rpc('save_facial_embedding', {
          target_user_id: userId,
          new_embedding: embedding,
          update_timestamp: true
        });

        if (rpcError) {
          console.error('❌ Error saving embedding via RPC:', rpcError);
          setError('Error al registrar rostro. Intenta de nuevo.');
          setAttempts(prev => prev + 1);
          setStatus('failed');
          statusRef.current = 'failed';
          setIsProcessing(false);
          isProcessingRef.current = false;
          stopCamera();
          return;
        }

        console.log('✅ Embedding registrado!');
        console.log('✅ Guardando timestamp', new Date().toISOString());
        setStatus('success');
        statusRef.current = 'success';
        setInstruction('¡Rostro registrado exitosamente!');
        
        // IMMEDIATELY stop camera before anything else
        console.log('📹 Stopping camera IMMEDIATELY after registration success');
        stopCamera();

        // Mark session as verified in sessionStorage
        markSessionVerified();

        await logAccessWithLocation(true, locationData || {});
        
        // Ensure camera is fully stopped before calling onSuccess
        setTimeout(() => {
          stopCamera(); // Call again just in case
          onSuccess();
        }, 1500);
      } catch (err) {
        console.error('❌ Registration error:', err);
        setError('Error al registrar rostro. Intenta de nuevo.');
        setAttempts(prev => prev + 1);
        setStatus('failed');
        statusRef.current = 'failed';
        stopCamera();
      }
    }
    setIsProcessing(false);
    isProcessingRef.current = false;
  }, [hasStoredEmbedding, userId, stopCamera, logAccessWithLocation, locationData, onSuccess, isProcessing]);

  // Draw landmarks
  const drawLandmarks = useCallback((detection: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    const landmarks = detection.landmarks;
    const scaleX = dims.width / videoRef.current.videoWidth;
    const scaleY = dims.height / videoRef.current.videoHeight;
    
    // Draw all landmarks with larger points
    const drawPoints = (points: faceapi.Point[], color: string, size: number = 4) => {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x * scaleX, point.y * scaleY, size, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    };

    drawPoints(landmarks.getLeftEye(), '#00ff00', 5);
    drawPoints(landmarks.getRightEye(), '#00ff00', 5);
    drawPoints(landmarks.getNose(), '#0088ff', 5);
    drawPoints(landmarks.getMouth(), '#ff4444', 5);
    drawPoints(landmarks.getLeftEyeBrow(), '#ffff00', 4);
    drawPoints(landmarks.getRightEyeBrow(), '#ffff00', 4);
    drawPoints(landmarks.getJawOutline(), '#ffffff', 3);
  }, []);

  // Main detection loop
  const startDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    console.log('🚀 Starting face detection with liveness check...');
    setStatus('detecting');
    statusRef.current = 'detecting';
    setInstruction('Posiciona tu rostro dentro del círculo');
    setLivenessProgress(0);
    nosePositionsRef.current = [];
    eyeRatioHistoryRef.current = [];
    initialNosePositionRef.current = null;
    challengeCompletedRef.current = false;
    livenessConfirmedRef.current = false;

    // Select random challenge and store in ref
    const challenge = selectRandomChallenge();
    setCurrentChallenge(challenge);
    currentChallengeRef.current = challenge;
    console.log('🎯 Selected liveness challenge:', challenge);

    let consecutiveDetections = 0;
    let frameCount = 0;
    let hasStartedLiveness = false;

    const detect = async () => {
      // Use refs to check current state (avoids stale closures)
      const currentStatus = statusRef.current;
      const processing = isProcessingRef.current;
      
      if (!videoRef.current || currentStatus === 'success' || currentStatus === 'failed' || processing) {
        console.log('🛑 Detection loop stopped:', { currentStatus, processing });
        return;
      }

      frameCount++;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: DETECTION_CONFIDENCE,
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          consecutiveDetections++;
          setFaceDetected(true);
          setLandmarksCount(detection.landmarks.positions.length);
          
          drawLandmarks(detection);

          // Phase 1: Detect face stably (5 consecutive detections)
          if (consecutiveDetections >= 5 && !hasStartedLiveness) {
            console.log('✅ Stable face detected, starting liveness check');
            hasStartedLiveness = true;
            setStatus('liveness-check');
            statusRef.current = 'liveness-check';
            setInstruction(CHALLENGE_MESSAGES[challenge]);
            livenessStartTimeRef.current = Date.now();
          }

          // Phase 2: Liveness check
          if (hasStartedLiveness && !livenessConfirmedRef.current) {
            if (checkLiveness(detection.landmarks)) {
              console.log('🎉 Liveness confirmed!');
              livenessConfirmedRef.current = true;
              challengeCompletedRef.current = true;
              setLivenessProgress(100);
              
              // Proceed to embedding
              await processEmbedding(detection.descriptor);
              return; // Exit loop
            }

            // Check timeout
            const elapsed = (Date.now() - livenessStartTimeRef.current) / 1000;
            if (elapsed >= LIVENESS_TIMEOUT_SECONDS) {
              console.log('❌ Liveness timeout after', LIVENESS_TIMEOUT_SECONDS, 'seconds');
              setError('No se detectó movimiento. Intenta de nuevo siguiendo las instrucciones.');
              setAttempts(prev => prev + 1);
              setStatus('failed');
              statusRef.current = 'failed';
              stopCamera();
              return; // Exit loop
            }
          }
        } else {
          if (frameCount % 30 === 0) {
            setFaceDetected(false);
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
          consecutiveDetections = 0;
        }

        animationRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error('Detection error:', err);
        animationRef.current = requestAnimationFrame(detect);
      }
    };

    detect();
  }, [modelsLoaded, checkLiveness, drawLandmarks, processEmbedding, stopCamera]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    console.log('🔄 Retrying...');
    setError(null);
    setFaceDetected(false);
    setLandmarksCount(0);
    setLivenessProgress(0);
    setIsProcessing(false);
    isProcessingRef.current = false;
    livenessConfirmedRef.current = false;
    nosePositionsRef.current = [];
    eyeRatioHistoryRef.current = [];
    initialNosePositionRef.current = null;
    challengeCompletedRef.current = false;
    
    if (attempts < MAX_ATTEMPTS) {
      const newChallenge = selectRandomChallenge();
      setCurrentChallenge(newChallenge);
      currentChallengeRef.current = newChallenge;
      console.log('🎯 New challenge:', newChallenge);
      setStatus('ready');
      statusRef.current = 'ready';
      setInstruction('Posiciona tu rostro dentro del círculo');
      
      // Restart camera if stopped
      if (!streamRef.current) {
        await startCamera();
      }
    }
  }, [attempts, startCamera]);

  // Handle cancel
  const handleCancel = useCallback(() => {
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
    
    // Cleanup on unmount - ensure camera is always stopped
    return () => {
      console.log('🧹 Component unmounting, stopping camera...');
      stopCamera();
    };
  }, [loadModels, checkStoredEmbedding, startCamera, stopCamera, getLocation]);

  // Stop camera when status changes to success or failed
  useEffect(() => {
    if (status === 'success' || status === 'failed') {
      console.log('📹 Status changed to', status, '- ensuring camera is stopped');
      stopCamera();
    }
  }, [status, stopCamera]);

  // Start detection when ready
  useEffect(() => {
    if (status === 'ready' && modelsLoaded) {
      startDetection();
    }
  }, [status, modelsLoaded, startDetection]);

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'border-green-500 shadow-green-500/50';
      case 'failed': return 'border-red-500 shadow-red-500/50';
      case 'liveness-check': return 'border-yellow-500 shadow-yellow-500/50';
      case 'detecting': return faceDetected ? 'border-green-500 shadow-green-500/50' : 'border-primary/50';
      default: return 'border-primary/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 max-w-lg w-full my-auto">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            {hasStoredEmbedding === false ? 'Registro Facial' : 'Verificación Facial'}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Prueba de vida requerida para seguridad
          </p>
        </div>

        {/* Video container */}
        <div className="relative">
          <div className={`relative w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 transition-all duration-300 ${getStatusColor()}`}>
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
            
            {status === 'loading-models' && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />
              </div>
            )}
            
            {status === 'success' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-400" />
              </div>
            )}
            
            {status === 'failed' && attempts >= MAX_ATTEMPTS && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                <XCircle className="w-16 h-16 sm:w-20 sm:h-20 text-red-400" />
              </div>
            )}
          </div>

          {/* Face indicator */}
          {(status === 'detecting' || status === 'liveness-check') && (
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 ${
              faceDetected ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
            }`}>
              <User className="w-3 h-3" />
              {faceDetected ? `✓ Rostro (${landmarksCount} pts)` : 'Buscando...'}
            </div>
          )}

          {/* Location */}
          <div className={`absolute -bottom-8 sm:-bottom-10 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium flex items-center gap-1 ${
            locationData ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
          }`}>
            <MapPin className="w-3 h-3" />
            {gettingLocation ? 'Ubicando...' : locationData?.city ? `${locationData.city}` : 'Sin ubicación'}
          </div>
        </div>

        {/* Liveness progress bar - show during liveness check OR detecting with face */}
        {(status === 'liveness-check' || (status === 'detecting' && faceDetected)) && (
          <div className="w-56 sm:w-72 mt-4 sm:mt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MoveHorizontal className="w-4 h-4 text-yellow-400" />
                <span className="text-xs sm:text-sm text-yellow-400 font-medium">
                  {status === 'liveness-check' ? 'Prueba de vida' : 'Detectando rostro...'}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-yellow-400">
                {status === 'liveness-check' ? `${Math.round(livenessProgress)}%` : '✓'}
              </span>
            </div>
            <div className="h-2 sm:h-3 bg-muted rounded-full overflow-hidden border border-yellow-500/30">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-200 ease-out"
                style={{ width: `${status === 'liveness-check' ? Math.max(5, livenessProgress) : 100}%` }}
              />
            </div>
            
            {/* Animated movement instruction - PROMINENT */}
            {status === 'liveness-check' && currentChallenge && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/50 animate-pulse">
                <div className="flex items-center justify-center gap-2 sm:gap-3 text-yellow-400">
                  {currentChallenge === 'turn-left' && (
                    <>
                      <span className="text-2xl sm:text-4xl animate-bounce">👈</span>
                      <div className="text-center">
                        <p className="text-sm sm:text-lg font-bold">GIRA A LA IZQUIERDA</p>
                        <p className="text-xs sm:text-sm opacity-80">Mueve tu cabeza hacia tu izquierda</p>
                      </div>
                    </>
                  )}
                  {currentChallenge === 'turn-right' && (
                    <>
                      <div className="text-center">
                        <p className="text-sm sm:text-lg font-bold">GIRA A LA DERECHA</p>
                        <p className="text-xs sm:text-sm opacity-80">Mueve tu cabeza hacia tu derecha</p>
                      </div>
                      <span className="text-2xl sm:text-4xl animate-bounce">👉</span>
                    </>
                  )}
                  {currentChallenge === 'nod-up' && (
                    <>
                      <span className="text-2xl sm:text-4xl animate-bounce">👆</span>
                      <div className="text-center">
                        <p className="text-sm sm:text-lg font-bold">MIRA HACIA ARRIBA</p>
                        <p className="text-xs sm:text-sm opacity-80">Levanta la cabeza hacia arriba</p>
                      </div>
                    </>
                  )}
                  {currentChallenge === 'nod-down' && (
                    <>
                      <span className="text-2xl sm:text-4xl animate-bounce">👇</span>
                      <div className="text-center">
                        <p className="text-sm sm:text-lg font-bold">MIRA HACIA ABAJO</p>
                        <p className="text-xs sm:text-sm opacity-80">Baja la cabeza hacia abajo</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instruction */}
        <div className="text-center space-y-2 min-h-[60px] mt-2">
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

          {status === 'liveness-check' && (
            <p className="text-yellow-400 flex items-center gap-2 justify-center text-lg font-semibold animate-pulse">
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

        {/* Buttons */}
        <div className="flex gap-4">
          {status === 'failed' && attempts < MAX_ATTEMPTS && (
            <Button onClick={handleRetry} variant="outline" className="border-primary/50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar ({MAX_ATTEMPTS - attempts})
            </Button>
          )}
          
          {status === 'failed' && attempts >= MAX_ATTEMPTS && (
            <Button onClick={handleCancel} variant="destructive">
              Volver al inicio
            </Button>
          )}
          
          {status !== 'success' && status !== 'failed' && (
            <Button onClick={handleCancel} variant="ghost" className="text-muted-foreground">
              Cancelar
            </Button>
          )}
        </div>

        {attempts > 0 && attempts < MAX_ATTEMPTS && (
          <p className="text-sm text-muted-foreground">Intento {attempts} de {MAX_ATTEMPTS}</p>
        )}

        <p className="text-xs text-muted-foreground/70 text-center max-w-sm">
          La prueba de vida previene ataques con fotografías. Solo se guarda un embedding matemático.
        </p>
      </div>
    </div>
  );
};
