/**
 * Global Camera Service
 * 
 * This service provides a centralized way to manage camera streams across the application.
 * It ensures that camera streams are properly stopped when no longer needed.
 */

// Global reference to active streams
const activeStreams: Set<MediaStream> = new Set();

// Global flag to track if camera should be stopped
let shouldStopCamera = false;

/**
 * Register a new camera stream for tracking
 */
export const registerStream = (stream: MediaStream): void => {
  console.log('📹 CameraService: Registering stream with', stream.getTracks().length, 'tracks');
  activeStreams.add(stream);
  shouldStopCamera = false;
};

/**
 * Unregister a stream from tracking
 */
export const unregisterStream = (stream: MediaStream): void => {
  console.log('📹 CameraService: Unregistering stream');
  activeStreams.delete(stream);
};

/**
 * Get the count of active streams
 */
export const getActiveStreamCount = (): number => {
  return activeStreams.size;
};

/**
 * FORCE stop ALL camera streams - the nuclear option
 * This will stop every video track and clear all references
 */
export const forceStopAllCameras = (): void => {
  console.log('📹 CameraService: ===== FORCE STOP ALL CAMERAS =====');
  shouldStopCamera = true;
  
  // Step 1: Stop all tracked streams
  console.log('📹 CameraService: Stopping', activeStreams.size, 'tracked streams');
  activeStreams.forEach((stream) => {
    try {
      stream.getTracks().forEach((track) => {
        console.log('📹 CameraService: Stopping tracked track:', track.kind, 'state:', track.readyState);
        track.stop();
      });
    } catch (e) {
      console.warn('📹 CameraService: Error stopping tracked stream:', e);
    }
  });
  activeStreams.clear();
  
  // Step 2: Stop all video elements in the DOM
  const allVideos = document.querySelectorAll('video');
  console.log('📹 CameraService: Processing', allVideos.length, 'video elements');
  
  allVideos.forEach((video, index) => {
    try {
      const stream = video.srcObject as MediaStream | null;
      if (stream && stream.getTracks) {
        const tracks = stream.getTracks();
        console.log('📹 CameraService: Video', index, 'has', tracks.length, 'tracks');
        tracks.forEach((track) => {
          console.log('📹 CameraService: Stopping DOM track:', track.kind, 'enabled:', track.enabled, 'state:', track.readyState);
          track.enabled = false; // Disable first
          track.stop(); // Then stop
        });
      }
      video.srcObject = null;
      video.pause();
      video.load(); // Force release
    } catch (e) {
      console.warn('📹 CameraService: Error cleaning video', index, ':', e);
    }
  });
  
  // Step 3: Try to enumerate and release through MediaDevices API
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const cameras = devices.filter(d => d.kind === 'videoinput');
        console.log('📹 CameraService: Found', cameras.length, 'camera devices');
      })
      .catch(() => {
        // Ignore errors
      });
  }
  
  console.log('📹 CameraService: ===== FORCE STOP COMPLETE =====');
};

/**
 * Scheduled cleanup - runs multiple times to ensure camera is stopped
 */
export const scheduleCleanup = (): void => {
  console.log('📹 CameraService: Scheduling cleanup');
  shouldStopCamera = true;
  
  // Immediate cleanup
  forceStopAllCameras();
  
  // Multiple delayed cleanups
  const delays = [50, 100, 200, 300, 500, 750, 1000, 1500, 2000];
  delays.forEach((delay) => {
    setTimeout(() => {
      if (shouldStopCamera) {
        console.log(`📹 CameraService: Delayed cleanup (${delay}ms)`);
        forceStopAllCameras();
      }
    }, delay);
  });
};

/**
 * Check if any camera is currently active
 */
export const isCameraActive = (): boolean => {
  // Check tracked streams
  for (const stream of activeStreams) {
    if (stream.getTracks().some(t => t.readyState === 'live')) {
      return true;
    }
  }
  
  // Check DOM videos
  const allVideos = document.querySelectorAll('video');
  for (const video of allVideos) {
    const stream = video.srcObject as MediaStream | null;
    if (stream?.getTracks().some(t => t.readyState === 'live')) {
      return true;
    }
  }
  
  return false;
};

/**
 * Debug function to log camera state
 */
export const logCameraState = (): void => {
  console.log('📹 CameraService: === CAMERA STATE ===');
  console.log('📹 Tracked streams:', activeStreams.size);
  console.log('📹 Should stop:', shouldStopCamera);
  
  activeStreams.forEach((stream, index) => {
    stream.getTracks().forEach((track) => {
      console.log(`📹 Stream ${index}: ${track.kind} - enabled: ${track.enabled}, state: ${track.readyState}`);
    });
  });
  
  const allVideos = document.querySelectorAll('video');
  console.log('📹 Video elements:', allVideos.length);
  allVideos.forEach((video, index) => {
    const stream = video.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log(`📹 Video ${index}: ${track.kind} - enabled: ${track.enabled}, state: ${track.readyState}`);
      });
    }
  });
  console.log('📹 ========================');
};

// Export a default object for easier imports
export default {
  registerStream,
  unregisterStream,
  forceStopAllCameras,
  scheduleCleanup,
  isCameraActive,
  logCameraState,
  getActiveStreamCount,
};
