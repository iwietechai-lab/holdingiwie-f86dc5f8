import { motion } from 'framer-motion';

interface TourHandProps {
  x: number;
  y: number;
  isClicking: boolean;
  isMoving: boolean;
}

export const TourHand = ({ x, y, isClicking, isMoving }: TourHandProps) => {
  return (
    <motion.div
      className="fixed z-[10000] pointer-events-none"
      initial={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
      animate={{ 
        x: x - 20, 
        y: y - 10,
        scale: isClicking ? 0.85 : 1,
        rotate: isClicking ? -5 : 0
      }}
      transition={{ 
        type: isMoving ? "spring" : "tween",
        stiffness: 100,
        damping: 20,
        duration: isMoving ? undefined : 0.1
      }}
    >
      {/* Hand SVG with pointer finger */}
      <svg 
        width="64" 
        height="64" 
        viewBox="0 0 64 64" 
        className="drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))'
        }}
      >
        {/* Glow effect */}
        <defs>
          <radialGradient id="handGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd5b8" />
            <stop offset="100%" stopColor="#e8b89a" />
          </linearGradient>
          <linearGradient id="nailGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fce8dc" />
            <stop offset="100%" stopColor="#f5d5c8" />
          </linearGradient>
        </defs>

        {/* Glow behind hand */}
        <motion.circle
          cx="32"
          cy="40"
          r="28"
          fill="url(#handGlow)"
          animate={{
            scale: isClicking ? [1, 1.5, 1] : [1, 1.2, 1],
            opacity: isClicking ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: isClicking ? 0.2 : 1.5,
            repeat: isClicking ? 0 : Infinity
          }}
        />

        {/* Hand base (palm) */}
        <ellipse cx="34" cy="48" rx="14" ry="12" fill="url(#skinGradient)" />
        
        {/* Pointer finger */}
        <motion.g
          animate={{ 
            y: isClicking ? 3 : 0 
          }}
          transition={{ duration: 0.1 }}
        >
          {/* Finger segment 1 */}
          <rect x="28" y="14" width="12" height="20" rx="6" fill="url(#skinGradient)" />
          {/* Finger tip */}
          <ellipse cx="34" cy="14" rx="6" ry="5" fill="url(#skinGradient)" />
          {/* Fingernail */}
          <ellipse cx="34" cy="12" rx="4" ry="3.5" fill="url(#nailGradient)" />
          {/* Nail shine */}
          <ellipse cx="33" cy="11" rx="1.5" ry="1" fill="white" opacity="0.6" />
        </motion.g>

        {/* Curled fingers */}
        <ellipse cx="24" cy="42" rx="5" ry="7" fill="url(#skinGradient)" />
        <ellipse cx="44" cy="42" rx="5" ry="7" fill="url(#skinGradient)" />
        <ellipse cx="20" cy="48" rx="4" ry="6" fill="url(#skinGradient)" />
        <ellipse cx="48" cy="48" rx="4" ry="6" fill="url(#skinGradient)" />

        {/* Thumb */}
        <ellipse cx="18" cy="52" rx="6" ry="5" fill="url(#skinGradient)" transform="rotate(-30 18 52)" />
      </svg>

      {/* Click ripple effect */}
      {isClicking && (
        <motion.div
          className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border-4 border-primary"
          initial={{ scale: 0.5, opacity: 1, x: '-50%', y: '-50%' }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </motion.div>
  );
};
