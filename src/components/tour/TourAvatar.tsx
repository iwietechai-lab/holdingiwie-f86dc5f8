import { motion, Easing } from 'framer-motion';

interface TourAvatarProps {
  mood: 'happy' | 'explaining' | 'pointing' | 'celebrating' | 'thinking';
  size?: 'sm' | 'md' | 'lg';
}

type EasingType = Easing;

export const TourAvatar = ({ mood, size = 'md' }: TourAvatarProps) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const getMoodAnimation = (): { animate?: Record<string, number[]>; transition?: { duration: number; repeat: number; ease: EasingType } } => {
    switch (mood) {
      case 'happy':
        return {
          animate: { 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          },
          transition: { 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut" as EasingType
          }
        };
      case 'explaining':
        return {
          animate: { 
            y: [0, -3, 0],
          },
          transition: { 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut" as EasingType
          }
        };
      case 'pointing':
        return {
          animate: { 
            x: [0, 5, 0],
            rotate: [0, 5, 0]
          },
          transition: { 
            duration: 0.8, 
            repeat: Infinity,
            ease: "easeInOut" as EasingType
          }
        };
      case 'celebrating':
        return {
          animate: { 
            y: [0, -10, 0],
            scale: [1, 1.1, 1],
            rotate: [0, 10, -10, 0]
          },
          transition: { 
            duration: 0.6, 
            repeat: Infinity,
            ease: "easeOut" as EasingType
          }
        };
      case 'thinking':
        return {
          animate: { 
            rotate: [0, -5, 5, 0],
          },
          transition: { 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut" as EasingType
          }
        };
      default:
        return {};
    }
  };

  const getEyesAnimation = () => {
    if (mood === 'thinking') {
      return {
        animate: { x: [0, 3, -3, 0] },
        transition: { duration: 2, repeat: Infinity }
      };
    }
    if (mood === 'pointing') {
      return {
        animate: { x: [0, 2, 0] },
        transition: { duration: 0.8, repeat: Infinity }
      };
    }
    return {};
  };

  const getMouthPath = () => {
    switch (mood) {
      case 'happy':
      case 'celebrating':
        return "M 8 12 Q 12 16 16 12"; // Wide smile
      case 'explaining':
        return "M 9 12 Q 12 14 15 12"; // Slight smile
      case 'pointing':
        return "M 10 12 L 14 12"; // Neutral
      case 'thinking':
        return "M 10 13 Q 12 11 14 13"; // Slight frown
      default:
        return "M 9 12 Q 12 14 15 12";
    }
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} relative`}
      {...getMoodAnimation()}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
      
      {/* Main avatar container */}
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent border-2 border-primary/50 shadow-lg overflow-hidden">
        {/* Face */}
        <svg viewBox="0 0 24 24" className="w-full h-full">
          {/* Background gradient */}
          <defs>
            <radialGradient id="avatarGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="11" fill="url(#avatarGradient)" />
          
          {/* Eyes */}
          <motion.g {...getEyesAnimation()}>
            {/* Left eye */}
            <ellipse cx="8" cy="9" rx="1.5" ry="2" fill="white" />
            <circle cx="8.3" cy="9" r="0.8" fill="hsl(var(--primary-foreground))" />
            
            {/* Right eye */}
            <ellipse cx="16" cy="9" rx="1.5" ry="2" fill="white" />
            <circle cx="16.3" cy="9" r="0.8" fill="hsl(var(--primary-foreground))" />
            
            {/* Eye shine */}
            <circle cx="7.5" cy="8.3" r="0.4" fill="white" opacity="0.8" />
            <circle cx="15.5" cy="8.3" r="0.4" fill="white" opacity="0.8" />
          </motion.g>
          
          {/* Eyebrows */}
          {mood === 'thinking' && (
            <>
              <path d="M 6 7 Q 8 5.5 10 7" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" fill="none" />
              <path d="M 14 7 Q 16 5.5 18 7" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" fill="none" />
            </>
          )}
          
          {mood === 'celebrating' && (
            <>
              <path d="M 6 6.5 L 10 7.5" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" fill="none" />
              <path d="M 18 6.5 L 14 7.5" stroke="hsl(var(--primary-foreground))" strokeWidth="0.5" fill="none" />
            </>
          )}
          
          {/* Mouth */}
          <motion.path 
            d={getMouthPath()} 
            stroke="hsl(var(--primary-foreground))" 
            strokeWidth="1" 
            fill="none" 
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Blush */}
          {(mood === 'happy' || mood === 'celebrating') && (
            <>
              <ellipse cx="5" cy="11" rx="1.5" ry="1" fill="hsl(var(--destructive))" opacity="0.3" />
              <ellipse cx="19" cy="11" rx="1.5" ry="1" fill="hsl(var(--destructive))" opacity="0.3" />
            </>
          )}
        </svg>
        
        {/* Antenna/hat for robot look */}
        <motion.div 
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-3 bg-accent rounded-t-full"
          animate={{ 
            backgroundColor: ['hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--accent))']
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div 
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rounded-full"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>
      </div>
      
      {/* Pointing hand for pointing mood */}
      {mood === 'pointing' && (
        <motion.div 
          className="absolute -right-4 top-1/2 -translate-y-1/2"
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <span className="text-2xl">👉</span>
        </motion.div>
      )}
      
      {/* Celebration particles */}
      {mood === 'celebrating' && (
        <>
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))'][i % 3],
                left: '50%',
                top: '0%'
              }}
              animate={{
                x: [0, (i - 2) * 20],
                y: [0, -20, 10],
                opacity: [1, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
};
