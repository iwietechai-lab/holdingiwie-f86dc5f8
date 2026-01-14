import { useCallback, useRef, useEffect } from 'react';

type SoundEffect = 'welcome' | 'step' | 'success' | 'tip' | 'complete';

// Create audio context and oscillator-based sounds
const createSound = (type: SoundEffect): () => void => {
  return () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure different sounds based on type
      switch (type) {
        case 'welcome':
          // Ascending melody
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.frequency.linearRampToValueAtTime(660, audioContext.currentTime + 0.1);
          oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
          oscillator.type = 'sine';
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
          break;
          
        case 'step':
          // Soft click/pop
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.type = 'sine';
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;
          
        case 'tip':
          // Notification chime
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.05);
          oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
          oscillator.type = 'triangle';
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
          
        case 'success':
          // Success sound
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
          oscillator.type = 'sine';
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
          break;
          
        case 'complete':
          // Celebration fanfare
          const osc1 = audioContext.createOscillator();
          const osc2 = audioContext.createOscillator();
          const gain1 = audioContext.createGain();
          const gain2 = audioContext.createGain();
          
          osc1.connect(gain1);
          osc2.connect(gain2);
          gain1.connect(audioContext.destination);
          gain2.connect(audioContext.destination);
          
          osc1.frequency.setValueAtTime(523, audioContext.currentTime);
          osc1.frequency.setValueAtTime(659, audioContext.currentTime + 0.15);
          osc1.frequency.setValueAtTime(784, audioContext.currentTime + 0.3);
          osc1.frequency.setValueAtTime(1047, audioContext.currentTime + 0.45);
          
          osc2.frequency.setValueAtTime(392, audioContext.currentTime);
          osc2.frequency.setValueAtTime(523, audioContext.currentTime + 0.15);
          osc2.frequency.setValueAtTime(659, audioContext.currentTime + 0.3);
          osc2.frequency.setValueAtTime(784, audioContext.currentTime + 0.45);
          
          gain1.gain.setValueAtTime(0.1, audioContext.currentTime);
          gain1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.7);
          gain2.gain.setValueAtTime(0.08, audioContext.currentTime);
          gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.7);
          
          osc1.type = 'sine';
          osc2.type = 'triangle';
          
          osc1.start(audioContext.currentTime);
          osc2.start(audioContext.currentTime);
          osc1.stop(audioContext.currentTime + 0.7);
          osc2.stop(audioContext.currentTime + 0.7);
          return;
      }
    } catch (error) {
      console.warn('Audio not available:', error);
    }
  };
};

export const useTourSounds = () => {
  const soundsEnabled = useRef(true);
  
  const playSound = useCallback((type: SoundEffect) => {
    if (soundsEnabled.current) {
      createSound(type)();
    }
  }, []);
  
  const toggleSounds = useCallback(() => {
    soundsEnabled.current = !soundsEnabled.current;
    return soundsEnabled.current;
  }, []);
  
  const setSoundsEnabled = useCallback((enabled: boolean) => {
    soundsEnabled.current = enabled;
  }, []);

  return {
    playSound,
    toggleSounds,
    setSoundsEnabled,
    soundsEnabled: soundsEnabled.current
  };
};
