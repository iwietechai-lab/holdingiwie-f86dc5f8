import { motion, Transition, TargetAndTransition } from 'framer-motion';

interface TourAvatarProps {
  mood: 'happy' | 'explaining' | 'pointing' | 'celebrating' | 'thinking' | 'waving';
  action?: 'bounce' | 'spin' | 'wave' | 'fly' | 'dance';
  size?: 'sm' | 'md' | 'lg';
}

export const TourAvatar = ({ mood, action, size = 'md' }: TourAvatarProps) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const getActionAnimation = (): TargetAndTransition => {
    switch (action) {
      case 'bounce':
        return {
          y: [0, -15, 0],
          transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.5 } as Transition
        };
      case 'spin':
        return {
          rotate: [0, 360],
          transition: { duration: 1, repeat: Infinity, ease: "linear" as const } as Transition
        };
      case 'wave':
        return {
          rotate: [0, 15, -15, 15, -15, 0],
          transition: { duration: 1, repeat: Infinity, repeatDelay: 1 } as Transition
        };
      case 'fly':
        return {
          y: [0, -8, 0],
          x: [0, 3, -3, 0],
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const } as Transition
        };
      case 'dance':
        return {
          scale: [1, 1.1, 1, 1.1, 1],
          rotate: [0, -10, 10, -10, 0],
          y: [0, -10, 0, -10, 0],
          transition: { duration: 1, repeat: Infinity } as Transition
        };
      default:
        return {
          scale: [1, 1.02, 1],
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const } as Transition
        };
    }
  };

  const getEyeExpression = () => {
    switch (mood) {
      case 'happy':
      case 'celebrating':
        return { type: 'happy', blink: true };
      case 'waving':
        return { type: 'excited', blink: true };
      case 'pointing':
        return { type: 'focused', blink: false };
      case 'explaining':
        return { type: 'normal', blink: true };
      case 'thinking':
        return { type: 'thinking', blink: false };
      default:
        return { type: 'normal', blink: true };
    }
  };

  const eyeExpression = getEyeExpression();

  return (
    <motion.div
      className={`${sizeClasses[size]} relative`}
      animate={getActionAnimation()}
    >
      {/* Glow effect */}
      <motion.div 
        className="absolute inset-0 bg-primary/40 rounded-full blur-xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Main avatar container */}
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent border-2 border-primary/50 shadow-2xl shadow-primary/50 overflow-visible">
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 via-transparent to-transparent"
          animate={{
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        
        {/* Face */}
        <svg viewBox="0 0 24 24" className="w-full h-full relative z-10">
          {/* Background gradient */}
          <defs>
            <radialGradient id="avatarGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="11" fill="url(#avatarGradient)" />
          
          {/* Eyes */}
          <motion.g
            animate={eyeExpression.blink ? {
              scaleY: [1, 0.1, 1],
            } : {}}
            transition={{
              duration: 0.15,
              repeat: Infinity,
              repeatDelay: 3
            }}
            style={{ transformOrigin: 'center' }}
          >
            {/* Left eye */}
            <ellipse cx="8" cy="9" rx="2" ry={eyeExpression.type === 'happy' ? 1.5 : 2.5} fill="white" />
            <motion.circle 
              cx="8" 
              cy="9" 
              r="1" 
              fill="#1a1a2e"
              animate={mood === 'pointing' ? { x: [0, 2, 0] } : mood === 'thinking' ? { x: [0, -1, 1, 0] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
            
            {/* Right eye */}
            <ellipse cx="16" cy="9" rx="2" ry={eyeExpression.type === 'happy' ? 1.5 : 2.5} fill="white" />
            <motion.circle 
              cx="16" 
              cy="9" 
              r="1" 
              fill="#1a1a2e"
              animate={mood === 'pointing' ? { x: [0, 2, 0] } : mood === 'thinking' ? { x: [0, -1, 1, 0] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
            
            {/* Eye shine */}
            <circle cx="7.2" cy="8.2" r="0.5" fill="white" opacity="0.9" />
            <circle cx="15.2" cy="8.2" r="0.5" fill="white" opacity="0.9" />
          </motion.g>
          
          {/* Eyebrows based on mood */}
          {mood === 'explaining' && (
            <>
              <path d="M 5 6.5 Q 8 5 10 6.5" stroke="hsl(var(--primary-foreground))" strokeWidth="0.8" fill="none" />
              <path d="M 14 6.5 Q 16 5 19 6.5" stroke="hsl(var(--primary-foreground))" strokeWidth="0.8" fill="none" />
            </>
          )}
          
          {mood === 'thinking' && (
            <>
              <path d="M 5 7 L 10 6" stroke="hsl(var(--primary-foreground))" strokeWidth="0.8" fill="none" />
              <path d="M 14 6 L 19 7" stroke="hsl(var(--primary-foreground))" strokeWidth="0.8" fill="none" />
            </>
          )}
          
          {(mood === 'celebrating' || mood === 'waving') && (
            <>
              <path d="M 5 7 Q 7.5 5 10 7" stroke="hsl(var(--primary-foreground))" strokeWidth="0.8" fill="none" />
              <path d="M 14 7 Q 16.5 5 19 7" stroke="hsl(var(--primary-foreground))" strokeWidth="0.8" fill="none" />
            </>
          )}
          
          {/* Mouth based on mood */}
          {(mood === 'happy' || mood === 'celebrating' || mood === 'waving') && (
            <motion.path 
              d="M 7 14 Q 12 19 17 14" 
              stroke="hsl(var(--primary-foreground))" 
              strokeWidth="1.2" 
              fill="none" 
              strokeLinecap="round"
              animate={{ d: ["M 7 14 Q 12 19 17 14", "M 7 14 Q 12 18 17 14", "M 7 14 Q 12 19 17 14"] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
          
          {mood === 'explaining' && (
            <motion.ellipse 
              cx="12" 
              cy="15" 
              rx="2" 
              ry="1.5" 
              fill="hsl(var(--primary-foreground))"
              animate={{ ry: [1.5, 2, 1.5, 1, 1.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          
          {mood === 'pointing' && (
            <path d="M 9 14 L 15 14" stroke="hsl(var(--primary-foreground))" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          )}
          
          {mood === 'thinking' && (
            <path d="M 10 15 Q 12 13 14 15" stroke="hsl(var(--primary-foreground))" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          )}
          
          {/* Blush for happy moods */}
          {(mood === 'happy' || mood === 'celebrating' || mood === 'waving') && (
            <>
              <ellipse cx="5" cy="12" rx="1.5" ry="1" fill="hsl(var(--destructive))" opacity="0.3" />
              <ellipse cx="19" cy="12" rx="1.5" ry="1" fill="hsl(var(--destructive))" opacity="0.3" />
            </>
          )}
        </svg>
        
        {/* Antenna */}
        <motion.div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center"
          animate={{
            y: [0, -2, 0]
          }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <motion.div 
            className="w-4 h-4 rounded-full bg-gradient-to-br from-accent to-primary shadow-lg"
            animate={{ 
              boxShadow: ['0 0 10px hsl(var(--accent))', '0 0 20px hsl(var(--primary))', '0 0 10px hsl(var(--accent))']
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <div className="w-1 h-3 bg-gradient-to-b from-accent to-primary rounded-b-full" />
        </motion.div>
      </div>
      
      {/* Waving hand for waving mood */}
      {mood === 'waving' && (
        <motion.div 
          className="absolute -right-6 top-0 text-3xl"
          animate={{ 
            rotate: [0, 20, -10, 20, -10, 0],
          }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }}
          style={{ transformOrigin: 'bottom center' }}
        >
          👋
        </motion.div>
      )}
      
      {/* Pointing hand for pointing mood */}
      {mood === 'pointing' && (
        <motion.div 
          className="absolute -right-8 top-1/2 -translate-y-1/2 text-3xl"
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        >
          👉
        </motion.div>
      )}
      
      {/* Celebration effects */}
      {mood === 'celebrating' && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['hsl(var(--primary))', 'hsl(var(--accent))', '#FFD700', '#FF6B6B'][i % 4],
                left: '50%',
                top: '50%'
              }}
              animate={{
                x: Math.cos(i * 45 * Math.PI / 180) * 40,
                y: Math.sin(i * 45 * Math.PI / 180) * 40,
                opacity: [1, 0],
                scale: [0.5, 1.5]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}
          {/* Stars */}
          <motion.span 
            className="absolute -top-4 -right-2 text-xl"
            animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            ⭐
          </motion.span>
          <motion.span 
            className="absolute -top-2 -left-4 text-lg"
            animate={{ scale: [1, 1.3, 1], rotate: [0, -15, 15, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
          >
            ✨
          </motion.span>
        </>
      )}
      
      {/* Thinking bubbles */}
      {mood === 'thinking' && (
        <>
          <motion.div
            className="absolute -top-2 -right-2 w-2 h-2 bg-muted rounded-full"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.div
            className="absolute -top-4 right-0 w-3 h-3 bg-muted rounded-full"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div
            className="absolute -top-7 right-2 w-4 h-4 bg-muted rounded-full flex items-center justify-center"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
          >
            <span className="text-[8px]">💭</span>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};
