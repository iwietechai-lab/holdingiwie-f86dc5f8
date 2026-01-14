import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Sparkles } from 'lucide-react';
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
  const [avatarPosition, setAvatarPosition] = useState({ x: 0, y: 0 });
  const [isAvatarFlying, setIsAvatarFlying] = useState(false);
  const lastStepRef = useRef<string | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Calculate avatar position based on target element
  const calculateAvatarPosition = (rect: DOMRect | null, position?: string) => {
    if (!rect || position === 'center') {
      // Center of screen for welcome/complete steps
      return {
        x: window.innerWidth / 2 - 40,
        y: window.innerHeight / 2 - 100
      };
    }

    const padding = 80;
    const avatarSize = 80;

    switch (position) {
      case 'top':
        return {
          x: rect.left + rect.width / 2 - avatarSize / 2,
          y: rect.top - avatarSize - padding
        };
      case 'bottom':
        return {
          x: rect.left + rect.width / 2 - avatarSize / 2,
          y: rect.bottom + padding / 2
        };
      case 'left':
        return {
          x: rect.left - avatarSize - padding,
          y: rect.top + rect.height / 2 - avatarSize / 2
        };
      case 'right':
        return {
          x: rect.right + padding / 2,
          y: rect.top + rect.height / 2 - avatarSize / 2
        };
      default:
        return {
          x: rect.left + rect.width / 2 - avatarSize / 2,
          y: rect.bottom + padding / 2
        };
    }
  };

  // Find and highlight target element
  useEffect(() => {
    if (isActive && currentStep) {
      setIsAvatarFlying(true);
      
      if (currentStep.target) {
        const element = document.querySelector(currentStep.target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
          
          // Scroll element into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Calculate new avatar position
          const newPos = calculateAvatarPosition(rect, currentStep.position);
          setAvatarPosition(newPos);
        } else {
          setTargetRect(null);
          setAvatarPosition(calculateAvatarPosition(null, 'center'));
        }
      } else {
        setTargetRect(null);
        setAvatarPosition(calculateAvatarPosition(null, 'center'));
      }

      // Avatar arrives after flying
      const flyTimer = setTimeout(() => {
        setIsAvatarFlying(false);
      }, 600);

      return () => clearTimeout(flyTimer);
    }
  }, [isActive, currentStep]);

  // Play sound on step change
  useEffect(() => {
    if (isActive && currentStep && currentStep.id !== lastStepRef.current) {
      lastStepRef.current = currentStep.id;
      if (currentStep.soundEffect && soundsOn) {
        // Delay sound slightly for better timing with animation
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

  const getTooltipPosition = (): React.CSSProperties => {
    const tooltipWidth = 360;
    const tooltipHeight = 180;
    const padding = 20;

    if (!targetRect || currentStep?.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    // Position tooltip relative to avatar
    const avatarX = avatarPosition.x + 40; // center of avatar
    const avatarY = avatarPosition.y + 80; // bottom of avatar

    switch (currentStep?.position) {
      case 'top':
        return {
          top: `${avatarY + padding}px`,
          left: `${avatarX}px`,
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          top: `${avatarY + padding}px`,
          left: `${avatarX}px`,
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          top: `${avatarPosition.y + 40}px`,
          left: `${avatarPosition.x + 100}px`,
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          top: `${avatarPosition.y + 40}px`,
          left: `${avatarPosition.x + 100}px`,
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
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  x={targetRect.left - 12}
                  y={targetRect.top - 12}
                  width={targetRect.width + 24}
                  height={targetRect.height + 24}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
            {/* Glow effect */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.8)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Animated highlight border around target */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              left: targetRect.left - 12,
              top: targetRect.top - 12,
              width: targetRect.width + 24,
              height: targetRect.height + 24,
            }}
          >
            <div className="w-full h-full rounded-xl border-2 border-primary shadow-[0_0_30px_rgba(var(--primary),0.6)]">
              {/* Animated corner sparkles */}
              <Sparkles className="absolute -top-3 -left-3 w-6 h-6 text-primary animate-pulse" />
              <Sparkles className="absolute -top-3 -right-3 w-6 h-6 text-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
              <Sparkles className="absolute -bottom-3 -left-3 w-6 h-6 text-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
              <Sparkles className="absolute -bottom-3 -right-3 w-6 h-6 text-primary animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
            {/* Pulsing ring */}
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-primary/50"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.2, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        )}

        {/* Flying Avatar */}
        <motion.div
          ref={avatarRef}
          className="absolute z-20"
          initial={{ x: window.innerWidth / 2, y: -100, scale: 0 }}
          animate={{
            x: avatarPosition.x,
            y: avatarPosition.y,
            scale: 1,
            rotate: isAvatarFlying ? [0, -10, 10, -5, 5, 0] : 0
          }}
          transition={{
            type: "spring",
            damping: 15,
            stiffness: 100,
            duration: 0.8
          }}
        >
          {/* Trail effect when flying */}
          {isAvatarFlying && (
            <>
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-8 h-8 rounded-full bg-primary/30 blur-md"
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{
                    opacity: 0,
                    scale: 0.3,
                    x: -20 * (i + 1),
                    y: -10 * (i + 1)
                  }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.05
                  }}
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              ))}
            </>
          )}
          <TourAvatar 
            mood={currentStep.avatarMood || 'happy'} 
            action={currentStep.avatarAction}
            size="lg" 
          />
        </motion.div>

        {/* Tooltip - appears after avatar lands */}
        <AnimatePresence>
          {!isAvatarFlying && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.2 }}
              className="absolute z-10 w-[360px] max-w-[90vw]"
              style={getTooltipPosition()}
            >
              <div className="bg-gradient-to-br from-card via-card to-card/90 border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 overflow-hidden backdrop-blur-xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <motion.h3 
                      className="text-lg font-bold text-foreground"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {currentStep.title}
                    </motion.h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Paso {currentStepIndex + 1} de {totalSteps}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipTour}
                    className="text-muted-foreground hover:text-foreground hover:bg-destructive/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <motion.p 
                    className="text-foreground/90 leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {currentStep.content}
                  </motion.p>
                </div>

                {/* Progress bar */}
                <div className="px-4 pb-2">
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                        backgroundPosition: ['0%', '100%', '0%']
                      }}
                      transition={{ 
                        width: { duration: 0.5 },
                        backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" }
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 pt-2 flex items-center justify-between border-t border-border/50">
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
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        size="sm"
                        onClick={nextStep}
                        className="gap-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30"
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
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration particles on last step */}
        {currentStep.avatarMood === 'celebrating' && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  background: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#FFD700', '#FF6B6B'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: '-20px'
                }}
                animate={{
                  y: window.innerHeight + 50,
                  x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50],
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
      </motion.div>
    </AnimatePresence>
  );
};
