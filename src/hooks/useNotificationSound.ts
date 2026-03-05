import { useCallback, useRef } from 'react';
import { useNotificationPreferences } from './useNotificationPreferences';
import { NotificationType } from '@/types/notification-sounds';
import { logger } from '@/utils/logger';

interface UseNotificationSoundReturn {
  playSound: (soundPath: string, volume?: number) => void;
  playForNotificationType: (type: NotificationType) => void;
  previewSound: (soundPath: string) => void;
  stopPreview: () => void;
}

// Audio cache to avoid reloading sounds
const audioCache = new Map<string, HTMLAudioElement>();

export function useNotificationSound(): UseNotificationSoundReturn {
  const { getSoundForType, getPreferenceForType, getDefaultSound } = useNotificationPreferences();
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const getAudio = useCallback((soundPath: string): HTMLAudioElement => {
    if (audioCache.has(soundPath)) {
      return audioCache.get(soundPath)!;
    }
    
    const audio = new Audio(soundPath);
    audio.preload = 'auto';
    audioCache.set(soundPath, audio);
    return audio;
  }, []);

  const playSound = useCallback(
    (soundPath: string, volume: number = 70) => {
      try {
        const audio = getAudio(soundPath);
        audio.volume = volume / 100;
        audio.currentTime = 0;
        audio.play().catch((err) => {
          logger.warn('Could not play notification sound:', err);
        });
      } catch (err) {
        logger.error('Error playing sound:', err);
      }
    },
    [getAudio]
  );

  const playForNotificationType = useCallback(
    (type: NotificationType) => {
      const pref = getPreferenceForType(type);
      
      // Check if notifications are enabled for this type
      if (pref && pref.is_enabled === false) {
        return;
      }

      const sound = getSoundForType(type);
      if (!sound) {
        // Try default sound
        const defaultSound = getDefaultSound();
        if (defaultSound) {
          playSound(defaultSound.file_path, pref?.volume ?? 70);
        }
        return;
      }

      playSound(sound.file_path, pref?.volume ?? 70);
    },
    [getSoundForType, getPreferenceForType, getDefaultSound, playSound]
  );

  const previewSound = useCallback(
    (soundPath: string) => {
      // Stop any currently playing preview
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }

      try {
        const audio = new Audio(soundPath);
        audio.volume = 0.7;
        previewAudioRef.current = audio;
        audio.play().catch((err) => {
          logger.warn('Could not preview sound:', err);
        });
      } catch (err) {
        logger.error('Error previewing sound:', err);
      }
    },
    []
  );

  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
  }, []);

  return {
    playSound,
    playForNotificationType,
    previewSound,
    stopPreview,
  };
}
