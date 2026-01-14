import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TourAvatar } from './TourAvatar';
import { useTour, TourStep } from '@/hooks/useTour';
import { useTourSounds } from '@/hooks/useTourSounds';

export const TourOverlay = () => {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour
  } = useTour();
  
  const { playSound, toggleSounds } = useTourSounds();
  const [soundsOn, setSoundsOn] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const lastStepRef = useRef<string | null>(null);

  // Find and highlight target element
  useEffect(() => {
    if (isActive && currentStep?.target) {
      const element = document.querySelector(currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  // Play sound on step change
  useEffect(() => {
    if (isActive && currentStep && currentStep.id !== lastStepRef.current) {
      lastStepRef.current = currentStep.id;
      if (currentStep.soundEffect && soundsOn) {
        playSound(currentStep.soundEffect);
      }
    }
  }, [isActive, currentStep, playSound, soundsOn]);

  const handleToggleSounds = () => {
    const newState = toggleSounds();
    setSoundsOn(newState);
  };

  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect || currentStep?.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const padding = 20;
    const tooltipWidth = 380;
    const tooltipHeight = 200;

    switch (currentStep?.position) {
      case 'top':
        return {
          top: `${targetRect.top - tooltipHeight - padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - tooltipWidth - padding}px`,
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: 'translateY(-50%)'
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  };

  if (!isActive || !currentStep) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
      >
        {/* Backdrop with spotlight effect */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Highlight border around target */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          >
            <div className="w-full h-full rounded-lg border-2 border-primary animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
          </motion.div>
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute z-10 w-[380px] max-w-[90vw]"
          style={getTooltipPosition()}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Header with avatar */}
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-4 flex items-center gap-4">
              <TourAvatar mood={currentStep.avatarMood || 'happy'} size="md" />
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
                onClick={skipTour}
                className="text-muted-foreground hover:text-foreground"
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
            <div className="px-4 pb-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-2 flex items-center justify-between border-t border-border/50">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleSounds}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {soundsOn ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="gap-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {currentStepIndex === totalSteps - 1 ? (
                    'Finalizar'
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Arrow pointer */}
          {targetRect && currentStep.position !== 'center' && (
            <div
              className={`absolute w-4 h-4 bg-card border-l border-t border-border rotate-45
                ${currentStep.position === 'top' ? 'bottom-[-8px] left-1/2 -translate-x-1/2 border-l-0 border-t-0 border-r border-b' : ''}
                ${currentStep.position === 'bottom' ? 'top-[-8px] left-1/2 -translate-x-1/2' : ''}
                ${currentStep.position === 'left' ? 'right-[-8px] top-1/2 -translate-y-1/2 border-l-0 border-t-0 border-r border-b rotate-[135deg]' : ''}
                ${currentStep.position === 'right' ? 'left-[-8px] top-1/2 -translate-y-1/2 rotate-[-45deg]' : ''}
              `}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
