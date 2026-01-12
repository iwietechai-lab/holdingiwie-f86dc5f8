import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleOptions {
  timeout: number; // in milliseconds
  onIdle?: () => void;
  onActive?: () => void;
  events?: string[];
}

export const useIdle = ({
  timeout = 300000, // 5 minutes default
  onIdle,
  onActive,
  events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'touchmove']
}: UseIdleOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If was idle, trigger onActive
    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIsIdle(false);
      onActive?.();
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      isIdleRef.current = true;
      setIsIdle(true);
      onIdle?.();
    }, timeout);
  }, [timeout, onIdle, onActive]);

  const forceActive = useCallback(() => {
    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIsIdle(false);
      onActive?.();
    }
    resetTimer();
  }, [resetTimer, onActive]);

  useEffect(() => {
    // Start initial timer
    resetTimer();

    // Add event listeners
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [events, resetTimer]);

  return { isIdle, forceActive, resetTimer };
};
