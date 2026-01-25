/**
 * DEFINITIVE GLOBAL CAMERA SERVICE v2
 * 
 * This is a completely isolated, singleton camera management system.
 * 
 * Key changes from v1:
 * - REMOVED getUserMedia re-trigger (was CAUSING camera to stay on!)
 * - Proper cleanup of face-api.js canvas overlays
 * - Simplified cleanup logic with proper state management
 * - Mutex prevents concurrent cleanup operations
 */

// Private state - completely isolated
const registeredStreams = new Set<MediaStream>();
let cleanupScheduled = false;
let cleanupTimers: number[] = [];
let isCleaningMutex = false;

// Cleanup delays - progressive multi-stage
const CLEANUP_DELAYS = [0, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000];

/**
 * Stop a single track with all safety measures
 */
const stopTrack = (track: MediaStreamTrack, source: string): boolean => {
  try {
    if (track.readyState === 'live') {
      console.log(`📹 CameraService: Stopping ${source} track: ${track.kind}`);
      track.enabled = false;
      track.stop();
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`📹 CameraService: Error stopping ${source} track:`, e);
    return false;
  }
};

/**
 * Force release a video element from camera
 */
const releaseVideoElement = (video: HTMLVideoElement): boolean => {
  try {
    const stream = video.srcObject as MediaStream | null;
    let stoppedTracks = 0;
    
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => {
        if (stopTrack(track, 'video-element')) stoppedTracks++;
      });
    }
    
    // Clear and force release
    video.srcObject = null;
    video.pause();
    video.src = '';
    video.load(); // Force browser to release camera resource
    
    return stoppedTracks > 0;
  } catch (e) {
    console.warn('📹 CameraService: Error releasing video:', e);
    return false;
  }
};

/**
 * Clean up face-api.js canvas elements
 * These are created dynamically and need explicit removal
 */
const cleanupFaceApiCanvases = (): number => {
  let removed = 0;
  try {
    // Remove all canvases that are overlays on video elements (face-api pattern)
    document.querySelectorAll('canvas').forEach((canvas) => {
      // Check if this is a face-api overlay canvas
      // Face-api creates canvases positioned absolute over video elements
      const style = window.getComputedStyle(canvas);
      const isOverlay = style.position === 'absolute';
      const parent = canvas.parentElement;
      const hasSiblingVideo = parent?.querySelector('video') !== null;
      
      // Also check for canvases with no explicit dimensions (face-api creates these)
      const hasNoExplicitSize = !canvas.hasAttribute('width') || canvas.width === 300;
      
      if ((isOverlay && hasSiblingVideo) || hasNoExplicitSize) {
        // Clear the canvas content first
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.remove();
        removed++;
      }
    });
    
    if (removed > 0) {
      console.log(`📹 CameraService: Removed ${removed} face-api canvases`);
    }
  } catch (e) {
    console.warn('📹 CameraService: Error cleaning canvases:', e);
  }
  return removed;
};

/**
 * Register a stream for tracking
 */
export const registerStream = (stream: MediaStream): void => {
  if (!stream) return;
  console.log('📹 CameraService: Registering stream with', stream.getTracks().length, 'tracks');
  registeredStreams.add(stream);
  cleanupScheduled = false;
};

/**
 * Unregister a stream from tracking
 */
export const unregisterStream = (stream: MediaStream): void => {
  if (!stream) return;
  console.log('📹 CameraService: Unregistering stream');
  registeredStreams.delete(stream);
};

/**
 * Get count of registered streams
 */
export const getActiveStreamCount = (): number => {
  return registeredStreams.size;
};

/**
 * Force stop ALL cameras everywhere
 * This is the main cleanup function - no getUserMedia tricks
 */
export const forceStopAllCameras = (): void => {
  // Use mutex to prevent concurrent operations
  if (isCleaningMutex) {
    console.log('📹 CameraService: Cleanup in progress, skipping');
    return;
  }
  
  isCleaningMutex = true;
  
  let stoppedTracks = 0;
  let stoppedVideos = 0;
  
  // STEP 1: Stop all registered streams
  registeredStreams.forEach((stream) => {
    try {
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach((track) => {
          if (stopTrack(track, 'registered')) stoppedTracks++;
        });
      }
    } catch (e) {
      console.warn('📹 CameraService: Error stopping registered stream:', e);
    }
  });
  registeredStreams.clear();
  
  // STEP 2: Stop ALL video elements in the entire document
  document.querySelectorAll('video').forEach((video) => {
    if (releaseVideoElement(video)) stoppedVideos++;
  });
  
  // STEP 3: Clean up face-api canvas elements
  cleanupFaceApiCanvases();
  
  if (stoppedTracks > 0 || stoppedVideos > 0) {
    console.log(`📹 CameraService: Stopped ${stoppedTracks} tracks, ${stoppedVideos} video elements`);
  }
  
  // Release mutex after a short delay
  setTimeout(() => {
    isCleaningMutex = false;
  }, 50);
};

/**
 * Clear all scheduled cleanup timers
 */
const clearAllCleanupTimers = (): void => {
  cleanupTimers.forEach(timerId => clearTimeout(timerId));
  cleanupTimers = [];
};

/**
 * Schedule multi-stage cleanup with verification
 */
export const scheduleCleanup = (): void => {
  // Clear any existing timers to prevent accumulation
  clearAllCleanupTimers();
  cleanupScheduled = true;
  
  // Execute immediate cleanup
  forceStopAllCameras();
  
  // Schedule progressive cleanup attempts
  CLEANUP_DELAYS.forEach((delay) => {
    if (delay === 0) return; // Already did immediate
    
    const timerId = window.setTimeout(() => {
      if (cleanupScheduled) {
        forceStopAllCameras();
      }
    }, delay);
    
    cleanupTimers.push(timerId);
  });
};

/**
 * Cancel scheduled cleanup (call when intentionally starting camera again)
 */
export const cancelScheduledCleanup = (): void => {
  cleanupScheduled = false;
  clearAllCleanupTimers();
};

/**
 * Check if any camera is currently active
 */
export const isCameraActive = (): boolean => {
  // Check registered streams
  for (const stream of registeredStreams) {
    try {
      if (stream.getTracks().some(t => t.readyState === 'live')) {
        return true;
      }
    } catch {
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
    } catch {
      // Ignore errors
    }
  }
  
  return false;
};

/**
 * Verify cameras are actually stopped
 */
export const verifyCamerasStopped = (): boolean => {
  const isActive = isCameraActive();
  
  if (isActive) {
    console.warn('📹 CameraService: ⚠️ Camera still active - forcing additional cleanup');
    forceStopAllCameras();
    return false;
  }
  
  console.log('📹 CameraService: ✅ All cameras stopped');
  return true;
};

/**
 * Debug: Log current camera state
 */
export const logCameraState = (): void => {
  console.log('📹 CameraService: === STATE ===');
  console.log('📹 Registered streams:', registeredStreams.size);
  console.log('📹 Cleanup scheduled:', cleanupScheduled);
  console.log('📹 Camera active:', isCameraActive());
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
