import { useCallback, useRef } from 'react';

type SoundEffect = 'welcome' | 'step' | 'success' | 'tip' | 'complete' | 'click' | 'move' | 'whoosh';

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
          // Ascending melody with warmth
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.frequency.linearRampToValueAtTime(550, audioContext.currentTime + 0.1);
          oscillator.frequency.linearRampToValueAtTime(660, audioContext.currentTime + 0.2);
          oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
          oscillator.type = 'sine';
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
          break;
          
        case 'step':
          // Soft notification pop
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.08);
          gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.type = 'sine';
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
          break;

        case 'click':
          // Satisfying click sound
          const clickOsc = audioContext.createOscillator();
          const clickGain = audioContext.createGain();
          clickOsc.connect(clickGain);
          clickGain.connect(audioContext.destination);
          
          clickOsc.frequency.setValueAtTime(1200, audioContext.currentTime);
          clickOsc.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
          clickGain.gain.setValueAtTime(0.2, audioContext.currentTime);
          clickGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
          clickOsc.type = 'sine';
          clickOsc.start(audioContext.currentTime);
          clickOsc.stop(audioContext.currentTime + 0.08);
          return;

        case 'move':
          // Whoosh/movement sound
          const moveOsc = audioContext.createOscillator();
          const moveGain = audioContext.createGain();
          moveOsc.connect(moveGain);
          moveGain.connect(audioContext.destination);
          
          moveOsc.frequency.setValueAtTime(200, audioContext.currentTime);
          moveOsc.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.15);
          moveOsc.frequency.linearRampToValueAtTime(300, audioContext.currentTime + 0.3);
          moveGain.gain.setValueAtTime(0.05, audioContext.currentTime);
          moveGain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.15);
          moveGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
          moveOsc.type = 'sine';
          moveOsc.start(audioContext.currentTime);
          moveOsc.stop(audioContext.currentTime + 0.3);
          return;

        case 'whoosh':
          // Fast whoosh for hand movement
          const whOsc = audioContext.createOscillator();
          const whGain = audioContext.createGain();
          const whFilter = audioContext.createBiquadFilter();
          
          whOsc.connect(whFilter);
          whFilter.connect(whGain);
          whGain.connect(audioContext.destination);
          
          whFilter.type = 'lowpass';
          whFilter.frequency.setValueAtTime(800, audioContext.currentTime);
          whFilter.frequency.linearRampToValueAtTime(2000, audioContext.currentTime + 0.1);
          whFilter.frequency.linearRampToValueAtTime(500, audioContext.currentTime + 0.2);
          
          whOsc.frequency.setValueAtTime(150, audioContext.currentTime);
          whOsc.frequency.linearRampToValueAtTime(250, audioContext.currentTime + 0.1);
          whOsc.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.2);
          
          whGain.gain.setValueAtTime(0.03, audioContext.currentTime);
          whGain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1);
          whGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.25);
          
          whOsc.type = 'sawtooth';
          whOsc.start(audioContext.currentTime);
          whOsc.stop(audioContext.currentTime + 0.25);
          return;
          
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
          osc1.frequency.setValueAtTime(659, audioContext.currentTime + 0.12);
          osc1.frequency.setValueAtTime(784, audioContext.currentTime + 0.24);
          osc1.frequency.setValueAtTime(1047, audioContext.currentTime + 0.36);
          
          osc2.frequency.setValueAtTime(392, audioContext.currentTime);
          osc2.frequency.setValueAtTime(523, audioContext.currentTime + 0.12);
          osc2.frequency.setValueAtTime(659, audioContext.currentTime + 0.24);
          osc2.frequency.setValueAtTime(784, audioContext.currentTime + 0.36);
          
          gain1.gain.setValueAtTime(0.12, audioContext.currentTime);
          gain1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6);
          gain2.gain.setValueAtTime(0.08, audioContext.currentTime);
          gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6);
          
          osc1.type = 'sine';
          osc2.type = 'triangle';
          
          osc1.start(audioContext.currentTime);
          osc2.start(audioContext.currentTime);
          osc1.stop(audioContext.currentTime + 0.6);
          osc2.stop(audioContext.currentTime + 0.6);
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
