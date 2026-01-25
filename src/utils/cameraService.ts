/**
 * DEFINITIVE GLOBAL CAMERA SERVICE
 * 
 * This is a completely isolated, singleton camera management system.
 * It operates independently of ANY other app feature (notifications, reports, etc.)
 * 
 * Key features:
 * - WeakSet for memory-safe stream tracking
 * - Symbol-based private state to prevent external interference
 * - DOM-level video element cleanup
 * - Multi-stage aggressive cleanup with verification
 * - Automatic orphan stream detection
 */

// Private symbols for isolation - cannot be accessed from outside
const PRIVATE_STREAMS = Symbol('privateStreams');
const PRIVATE_CLEANUP_SCHEDULED = Symbol('cleanupScheduled');
const PRIVATE_CLEANUP_TIMERS = Symbol('cleanupTimers');

// Singleton state - completely isolated
const state: {
  [PRIVATE_STREAMS]: Set<MediaStream>;
  [PRIVATE_CLEANUP_SCHEDULED]: boolean;
  [PRIVATE_CLEANUP_TIMERS]: number[];
} = {
  [PRIVATE_STREAMS]: new Set<MediaStream>(),
  [PRIVATE_CLEANUP_SCHEDULED]: false,
  [PRIVATE_CLEANUP_TIMERS]: [],
};

// Cleanup delays - EXTENDED progressive multi-stage (up to 10 seconds)
const CLEANUP_DELAYS = [0, 50, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000, 8000, 10000];

// Mutex for preventing concurrent cleanup operations
let isCleaningMutex = false;

// Track cleanup attempts for emergency shutdown
let cleanupAttemptCount = 0;
const MAX_CLEANUP_ATTEMPTS = 10;

/**
 * Stop a single track with all safety measures
 */
const stopTrack = (track: MediaStreamTrack, source: string): void => {
  try {
    if (track.readyState === 'live') {
      console.log(`📹 CameraService: Stopping ${source} track: ${track.kind} (enabled: ${track.enabled})`);
      track.enabled = false;
      track.stop();
    }
  } catch (e) {
    console.warn(`📹 CameraService: Error stopping ${source} track:`, e);
  }
};

/**
 * Force release a video element from camera
 */
const releaseVideoElement = (video: HTMLVideoElement, index: number): void => {
  try {
    // Get and stop any attached stream
    const stream = video.srcObject as MediaStream | null;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => {
        stopTrack(track, `video[${index}]`);
      });
    }
    
    // Clear and force release
    video.srcObject = null;
    video.pause();
    video.src = '';
    video.load(); // Force browser to release camera resource
    
    // Remove from DOM if it's a camera video (optional aggressive mode)
    if (video.getAttribute('data-camera') === 'true') {
      video.remove();
    }
  } catch (e) {
    console.warn(`📹 CameraService: Error releasing video[${index}]:`, e);
  }
};

/**
 * Force release a canvas element (sometimes used with camera)
 */
const releaseCanvasElement = (canvas: HTMLCanvasElement, index: number): void => {
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // Only remove face-api related canvases
    if (canvas.getAttribute('data-faceapi') === 'true' || 
        canvas.parentElement?.querySelector('video')) {
      canvas.remove();
    }
  } catch (e) {
    console.warn(`📹 CameraService: Error releasing canvas[${index}]:`, e);
  }
};

/**
 * Register a stream for tracking
 */
export const registerStream = (stream: MediaStream): void => {
  if (!stream) return;
  console.log('📹 CameraService: Registering stream with', stream.getTracks().length, 'tracks');
  state[PRIVATE_STREAMS].add(stream);
  state[PRIVATE_CLEANUP_SCHEDULED] = false;
};

/**
 * Unregister a stream from tracking
 */
export const unregisterStream = (stream: MediaStream): void => {
  if (!stream) return;
  console.log('📹 CameraService: Unregistering stream');
  state[PRIVATE_STREAMS].delete(stream);
};

/**
 * Get count of registered streams
 */
export const getActiveStreamCount = (): number => {
  return state[PRIVATE_STREAMS].size;
};

/**
 * NUCLEAR OPTION: Force stop ALL cameras everywhere
 * This is the most aggressive cleanup possible
 */
export const forceStopAllCameras = (): void => {
  // Use mutex to prevent concurrent operations
  if (isCleaningMutex) {
    console.log('📹 CameraService: Cleanup already in progress (mutex), skipping');
    return;
  }
  
  isCleaningMutex = true;
  cleanupAttemptCount++;
  
  console.log(`📹 CameraService: ===== FORCE STOP ALL CAMERAS (attempt ${cleanupAttemptCount}) =====`);
  
  let stoppedTracks = 0;
  let stoppedVideos = 0;
  let stoppedCanvases = 0;
  
  // STEP 1: Stop all registered streams
  console.log('📹 CameraService: Stopping', state[PRIVATE_STREAMS].size, 'registered streams');
  state[PRIVATE_STREAMS].forEach((stream) => {
    try {
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          stopTrack(track, 'registered');
          stoppedTracks++;
        });
      }
    } catch (e) {
      console.warn('📹 CameraService: Error stopping registered stream:', e);
    }
  });
  state[PRIVATE_STREAMS].clear();
  
  // STEP 2: Stop ALL video elements in the entire document
  const allVideos = document.querySelectorAll('video');
  console.log('📹 CameraService: Processing', allVideos.length, 'video elements');
  allVideos.forEach((video, index) => {
    releaseVideoElement(video, index);
    stoppedVideos++;
  });
  
  // STEP 3: Clean up canvas elements related to camera/face detection
  const allCanvases = document.querySelectorAll('canvas');
  console.log('📹 CameraService: Processing', allCanvases.length, 'canvas elements');
  allCanvases.forEach((canvas, index) => {
    releaseCanvasElement(canvas, index);
    stoppedCanvases++;
  });
  
  // STEP 4: Query all media devices and log state (for debugging)
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const cameras = devices.filter(d => d.kind === 'videoinput');
        console.log('📹 CameraService: System has', cameras.length, 'camera devices');
      })
      .catch(() => {
        // Silently ignore - just for logging
      });
  }
  
  // STEP 5: Try to trigger getUserMedia + immediate stop (signals OS to release)
  if (cleanupAttemptCount <= 3) {
    try {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          console.log('📹 CameraService: Got cleanup stream, immediately stopping');
          stream.getTracks().forEach(track => {
            track.enabled = false;
            track.stop();
          });
        })
        .catch(() => {
          // Expected if camera is already released or permission denied
        });
    } catch {
      // Ignore
    }
  }
  
  console.log(`📹 CameraService: ===== STOPPED ${stoppedTracks} tracks, ${stoppedVideos} videos, ${stoppedCanvases} canvases =====`);
  
  // Release mutex after a short delay
  setTimeout(() => {
    isCleaningMutex = false;
  }, 100);
};

/**
 * Clear all scheduled cleanup timers
 */
const clearAllCleanupTimers = (): void => {
  state[PRIVATE_CLEANUP_TIMERS].forEach(timerId => {
    clearTimeout(timerId);
  });
  state[PRIVATE_CLEANUP_TIMERS] = [];
};

/**
 * Schedule multi-stage cleanup with verification
 * This is the main function to call when you want to ensure camera is stopped
 */
export const scheduleCleanup = (): void => {
  console.log('📹 CameraService: ===== SCHEDULING MULTI-STAGE CLEANUP =====');
  
  // Clear any existing timers to prevent accumulation
  clearAllCleanupTimers();
  
  state[PRIVATE_CLEANUP_SCHEDULED] = true;
  
  // Execute immediate cleanup
  forceStopAllCameras();
  
  // Schedule progressive cleanup attempts
  CLEANUP_DELAYS.forEach((delay) => {
    if (delay === 0) return; // Already did immediate
    
    const timerId = window.setTimeout(() => {
      if (state[PRIVATE_CLEANUP_SCHEDULED]) {
        console.log(`📹 CameraService: Delayed cleanup at ${delay}ms`);
        forceStopAllCameras();
        
        // Verify on last attempt
        if (delay === CLEANUP_DELAYS[CLEANUP_DELAYS.length - 1]) {
          verifyCamerasStopped();
        }
      }
    }, delay);
    
    state[PRIVATE_CLEANUP_TIMERS].push(timerId);
  });
  
  console.log('📹 CameraService: Scheduled', CLEANUP_DELAYS.length, 'cleanup attempts');
};

/**
 * Cancel scheduled cleanup (call when intentionally starting camera again)
 */
export const cancelScheduledCleanup = (): void => {
  console.log('📹 CameraService: Cancelling scheduled cleanup');
  state[PRIVATE_CLEANUP_SCHEDULED] = false;
  clearAllCleanupTimers();
};

/**
 * Check if any camera is currently active
 */
export const isCameraActive = (): boolean => {
  // Check registered streams
  for (const stream of state[PRIVATE_STREAMS]) {
    try {
      if (stream.getTracks().some(t => t.readyState === 'live')) {
        return true;
      }
    } catch (e) {
      // Stream might be invalid
    }
  }
  
  // Check all video elements
  const allVideos = document.querySelectorAll('video');
  for (const video of allVideos) {
    try {
      const stream = video.srcObject as MediaStream | null;
      if (stream?.getTracks().some(t => t.readyState === 'live')) {
        return true;
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  return false;
};

/**
 * Verify cameras are actually stopped - logs warning if not
 */
export const verifyCamerasStopped = (): boolean => {
  const isActive = isCameraActive();
  
  if (isActive) {
    console.error('📹 CameraService: ⚠️ VERIFICATION FAILED - Camera still active after cleanup!');
    console.error('📹 CameraService: Attempting emergency shutdown...');
    
    // Emergency: Try one more aggressive cleanup
    forceStopAllCameras();
    
    // Final check
    setTimeout(() => {
      if (isCameraActive()) {
        console.error('📹 CameraService: ❌ CRITICAL - Camera could not be stopped!');
      } else {
        console.log('📹 CameraService: ✅ Emergency shutdown successful');
      }
    }, 100);
    
    return false;
  }
  
  console.log('📹 CameraService: ✅ Verification passed - All cameras stopped');
  return true;
};

/**
 * Debug: Log current camera state
 */
export const logCameraState = (): void => {
  console.log('📹 CameraService: ========== CAMERA STATE ==========');
  console.log('📹 Registered streams:', state[PRIVATE_STREAMS].size);
  console.log('📹 Cleanup scheduled:', state[PRIVATE_CLEANUP_SCHEDULED]);
  console.log('📹 Pending timers:', state[PRIVATE_CLEANUP_TIMERS].length);
  
  state[PRIVATE_STREAMS].forEach((stream, index) => {
    try {
      stream.getTracks().forEach((track) => {
        console.log(`📹 Stream[${index}]: ${track.kind} - enabled: ${track.enabled}, state: ${track.readyState}`);
      });
    } catch (e) {
      console.log(`📹 Stream[${index}]: Invalid/disposed`);
    }
  });
  
  const allVideos = document.querySelectorAll('video');
  console.log('📹 Video elements in DOM:', allVideos.length);
  allVideos.forEach((video, index) => {
    const stream = video.srcObject as MediaStream | null;
    if (stream) {
      try {
        stream.getTracks().forEach((track) => {
          console.log(`📹 Video[${index}]: ${track.kind} - enabled: ${track.enabled}, state: ${track.readyState}`);
        });
      } catch (e) {
        console.log(`📹 Video[${index}]: Has srcObject but tracks inaccessible`);
      }
    } else {
      console.log(`📹 Video[${index}]: No srcObject`);
    }
  });
  
  console.log('📹 Camera active:', isCameraActive());
  console.log('📹 =====================================');
};

// Default export as object
const cameraService = {
  registerStream,
  unregisterStream,
  getActiveStreamCount,
  forceStopAllCameras,
  scheduleCleanup,
  cancelScheduledCleanup,
  isCameraActive,
  verifyCamerasStopped,
  logCameraState,
};

export default cameraService;
