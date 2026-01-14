import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TourAvatar } from './TourAvatar';
import { useTourContext } from './TourProvider';
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
  } = useTourContext();
  
  const { playSound, toggleSounds } = useTourSounds();
  const [soundsOn, setSoundsOn] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: '50%', left: '50%' });
  const [isReady, setIsReady] = useState(false);
  const lastStepRef = useRef<string | null>(null);

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !currentStep) {
      setIsReady(false);
      return;
    }

    setIsReady(false);
    
    const timer = setTimeout(() => {
      if (currentStep.target) {
        const element = document.querySelector(currentStep.target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Calculate tooltip position based on step position
          calculateTooltipPosition(rect, currentStep.position);
        } else {
          setTargetRect(null);
          setTooltipPosition({ top: '50%', left: '50%' });
        }
      } else {
        setTargetRect(null);
        setTooltipPosition({ top: '50%', left: '50%' });
      }
      setIsReady(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [isActive, currentStep, currentStepIndex]);

  const calculateTooltipPosition = (rect: DOMRect, position?: string) => {
    const padding = 20;
    
    switch (position) {
      case 'top':
        setTooltipPosition({
          top: `${rect.top - padding}px`,
          left: `${rect.left + rect.width / 2}px`
        });
        break;
      case 'bottom':
        setTooltipPosition({
          top: `${rect.bottom + padding}px`,
          left: `${rect.left + rect.width / 2}px`
        });
        break;
      case 'left':
        setTooltipPosition({
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - padding}px`
        });
        break;
      case 'right':
        setTooltipPosition({
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + padding}px`
        });
        break;
      default:
        setTooltipPosition({ top: '50%', left: '50%' });
    }
  };

  // Play sound on step change
  useEffect(() => {
    if (isActive && currentStep && currentStep.id !== lastStepRef.current) {
      lastStepRef.current = currentStep.id;
      if (currentStep.soundEffect && soundsOn) {
        setTimeout(() => {
          playSound(currentStep.soundEffect!);
        }, 300);
      }
    }
  }, [isActive, currentStep, playSound, soundsOn]);

  const handleToggleSounds = () => {
    const newState = toggleSounds();
    setSoundsOn(newState);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('TourOverlay - Next clicked');
    nextStep();
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('TourOverlay - Prev clicked');
    prevStep();
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('TourOverlay - Skip clicked');
    skipTour();
  };

  console.log('TourOverlay render - isActive:', isActive, 'currentStep:', currentStep?.id, 'isReady:', isReady);

  if (!isActive || !currentStep) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay with spotlight */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 12}
                y={targetRect.top - 12}
                width={targetRect.width + 24}
                height={targetRect.height + 24}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.85)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Pulsating highlight border around target */}
      {targetRect && (
        <div className="pointer-events-none">
          {/* Outer glow */}
          <motion.div
            className="absolute rounded-xl border-4 border-primary/50"
            style={{
              left: targetRect.left - 16,
              top: targetRect.top - 16,
              width: targetRect.width + 32,
              height: targetRect.height + 32,
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Main border */}
          <motion.div
            className="absolute rounded-xl border-4 border-primary shadow-[0_0_30px_rgba(168,85,247,0.6)]"
            style={{
              left: targetRect.left - 12,
              top: targetRect.top - 12,
              width: targetRect.width + 24,
              height: targetRect.height + 24,
            }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(168, 85, 247, 0.4)',
                '0 0 40px rgba(168, 85, 247, 0.8)',
                '0 0 20px rgba(168, 85, 247, 0.4)'
              ]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Corner sparkles */}
          <motion.div
            className="absolute"
            style={{ left: targetRect.left - 24, top: targetRect.top - 24 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
          <motion.div
            className="absolute"
            style={{ left: targetRect.right + 8, top: targetRect.top - 24 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-6 h-6 text-accent" />
          </motion.div>

          {/* Arrow pointing down */}
          <motion.div
            className="absolute"
            style={{
              left: targetRect.left + targetRect.width / 2 - 16,
              top: targetRect.top - 48,
            }}
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" className="text-primary">
              <path
                d="M16 28 L16 8 M8 20 L16 28 L24 20"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </motion.div>
        </div>
      )}

      {/* Tooltip Card - positioned at center or near target */}
      <AnimatePresence mode="wait">
        {isReady && (
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="absolute z-50 w-[380px] max-w-[90vw]"
            style={{
              top: currentStep.position === 'center' || !targetRect ? '50%' : 'auto',
              left: currentStep.position === 'center' || !targetRect ? '50%' : 'auto',
              transform: currentStep.position === 'center' || !targetRect ? 'translate(-50%, -50%)' : 'none',
              ...(targetRect && currentStep.position !== 'center' && {
                bottom: '80px',
                right: '80px',
                transform: 'none'
              })
            }}
          >
            <div className="bg-card border-2 border-primary/40 rounded-2xl shadow-2xl shadow-primary/30 overflow-hidden">
              {/* Header with Avatar */}
              <div className="bg-gradient-to-r from-primary/30 to-accent/20 p-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  <TourAvatar 
                    mood={currentStep.avatarMood || 'happy'} 
                    action={currentStep.avatarAction}
                    size="md" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground truncate">
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
                  className="flex-shrink-0 hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-foreground/90 leading-relaxed text-sm">
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
                    transition={{ duration: 0.4 }}
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="gap-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    {currentStepIndex === totalSteps - 1 ? (
                      '🎉 Finalizar'
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration particles on last step */}
      {currentStep.avatarMood === 'celebrating' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
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
