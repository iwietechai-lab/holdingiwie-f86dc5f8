import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TourHand } from './TourHand';
import { useTourContext } from './TourProvider';
import { useTourSounds } from '@/hooks/useTourSounds';

interface HandPosition {
  x: number;
  y: number;
}

export const InteractiveTourOverlay = () => {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    skipTour
  } = useTourContext();
  
  const { playSound, toggleSounds } = useTourSounds();
  const [soundsOn, setSoundsOn] = useState(true);
  const [handPosition, setHandPosition] = useState<HandPosition>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isClicking, setIsClicking] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [phase, setPhase] = useState<'moving' | 'clicking' | 'showing' | 'waiting'>('waiting');
  const lastStepRef = useRef<string | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const clearAnimationTimeout = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

  // Simulate click on element
  const simulateElementInteraction = useCallback((element: Element) => {
    // Trigger visual click effect
    setIsClicking(true);
    playSound('step');

    // Create visual feedback on element
    const rect = element.getBoundingClientRect();
    
    // Add temporary highlight
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: rgba(168, 85, 247, 0.3);
      border-radius: 8px;
      pointer-events: none;
      z-index: 9998;
      animation: pulseHighlight 0.6s ease-out forwards;
    `;
    document.body.appendChild(highlight);

    // Add CSS animation if not exists
    if (!document.getElementById('tour-animations')) {
      const style = document.createElement('style');
      style.id = 'tour-animations';
      style.textContent = `
        @keyframes pulseHighlight {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Actually click interactive elements (buttons, links)
    setTimeout(() => {
      if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.getAttribute('role') === 'button') {
        // For buttons, trigger a click event but prevent navigation
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        // Only trigger for expandable elements (dropdowns, accordions)
        if (element.getAttribute('data-state') !== undefined || 
            element.classList.contains('collapsible') ||
            element.closest('[data-radix-collection-item]')) {
          element.dispatchEvent(clickEvent);
        }
      }
    }, 100);

    // Cleanup highlight
    setTimeout(() => {
      highlight.remove();
      setIsClicking(false);
    }, 600);
  }, [playSound]);

  // Animation sequence for each step
  const runStepAnimation = useCallback(() => {
    if (!currentStep) return;

    clearAnimationTimeout();
    setShowTooltip(false);
    setPhase('waiting');

    // Phase 1: Find target and move hand
    animationTimeoutRef.current = setTimeout(() => {
      if (currentStep.target) {
        const element = document.querySelector(currentStep.target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
          
          // Scroll element into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Move hand to target with whoosh sound
          setPhase('moving');
          setIsMoving(true);
          playSound('whoosh');
          setHandPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          });

          // Phase 2: Click animation
          animationTimeoutRef.current = setTimeout(() => {
            setIsMoving(false);
            setPhase('clicking');
            playSound('click');
            simulateElementInteraction(element);

            // Phase 3: Show tooltip
            animationTimeoutRef.current = setTimeout(() => {
              setPhase('showing');
              setShowTooltip(true);
              if (currentStep.soundEffect) {
                playSound(currentStep.soundEffect);
              }
            }, 700);
          }, 1000);
        } else {
          // No target found, just show tooltip
          setTargetRect(null);
          setPhase('showing');
          setShowTooltip(true);
          playSound(currentStep.soundEffect || 'welcome');
        }
      } else {
        // Center step (no target)
        setTargetRect(null);
        setHandPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 100 });
        setPhase('showing');
        setShowTooltip(true);
        playSound(currentStep.soundEffect || 'welcome');
      }
    }, 300);
  }, [currentStep, playSound, simulateElementInteraction, clearAnimationTimeout]);

  // Run animation when step changes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    if (currentStep.id !== lastStepRef.current) {
      lastStepRef.current = currentStep.id;
      runStepAnimation();
    }

    return () => clearAnimationTimeout();
  }, [isActive, currentStep, runStepAnimation, clearAnimationTimeout]);

  // Handle next step with animation
  const handleNext = useCallback(() => {
    setShowTooltip(false);
    playSound('step');
    
    setTimeout(() => {
      nextStep();
    }, 300);
  }, [nextStep, playSound]);

  const handleSkip = useCallback(() => {
    clearAnimationTimeout();
    setShowTooltip(false);
    skipTour();
  }, [skipTour, clearAnimationTimeout]);

  const handleToggleSounds = () => {
    const newState = toggleSounds();
    setSoundsOn(newState);
  };

  if (!isActive || !currentStep) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay */}
      <motion.div
        className="absolute inset-0 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Spotlight on target */}
      {targetRect && (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 16}
                y={targetRect.top - 16}
                width={targetRect.width + 32}
                height={targetRect.height + 32}
                rx="16"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.9)"
            mask="url(#spotlight)"
          />
        </svg>
      )}

      {/* Target highlight border */}
      {targetRect && phase !== 'moving' && (
        <motion.div
          className="absolute rounded-2xl border-4 border-primary"
          style={{
            left: targetRect.left - 16,
            top: targetRect.top - 16,
            width: targetRect.width + 32,
            height: targetRect.height + 32,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            boxShadow: [
              '0 0 20px rgba(168, 85, 247, 0.5)',
              '0 0 40px rgba(168, 85, 247, 0.8)',
              '0 0 20px rgba(168, 85, 247, 0.5)'
            ]
          }}
          transition={{
            boxShadow: { duration: 1.5, repeat: Infinity }
          }}
        >
          {/* Corner sparkles */}
          <Sparkles className="absolute -top-3 -left-3 w-6 h-6 text-primary animate-spin" style={{ animationDuration: '3s' }} />
          <Sparkles className="absolute -top-3 -right-3 w-6 h-6 text-accent animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
        </motion.div>
      )}

      {/* Animated Hand */}
      <TourHand
        x={handPosition.x}
        y={handPosition.y}
        isClicking={isClicking}
        isMoving={isMoving}
      />

      {/* Tooltip Card */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-8 right-8 w-[380px] max-w-[90vw] pointer-events-auto z-[10001]"
          >
            <div className="bg-card border-2 border-primary/50 rounded-2xl shadow-2xl shadow-primary/30 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 p-4 flex items-center gap-3">
                <motion.div 
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MessageCircle className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">
                    {currentStep.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Paso {currentStepIndex + 1} de {totalSteps}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  className="hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-foreground/90 leading-relaxed">
                  {currentStep.content}
                </p>
              </div>

              {/* Progress bar */}
              <div className="px-4 pb-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex items-center justify-between border-t border-border/50 pt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleSounds}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {soundsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>

                <Button
                  onClick={handleNext}
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 px-6"
                >
                  {currentStepIndex === totalSteps - 1 ? (
                    <>
                      🎉 ¡Finalizar!
                    </>
                  ) : (
                    <>
                      Siguiente →
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration particles on last step */}
      {currentStep.avatarMood === 'celebrating' && (
        <div className="fixed inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: ['#a855f7', '#06b6d4', '#22c55e', '#eab308', '#ef4444'][i % 5],
                left: `${Math.random() * 100}%`,
                top: '-20px'
              }}
              animate={{
                y: window.innerHeight + 50,
                rotate: [0, 360, 720],
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 0.5,
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
