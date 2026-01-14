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
        x: x - 8, 
        y: y - 4,
        scale: isClicking ? 0.9 : 1,
        rotate: isClicking ? 5 : 0
      }}
      transition={{ 
        type: isMoving ? "spring" : "tween",
        stiffness: 120,
        damping: 20,
        duration: isMoving ? undefined : 0.1
      }}
    >
      {/* Professional pointer cursor hand */}
      <svg 
        width="48" 
        height="56" 
        viewBox="0 0 48 56" 
        className="drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 16px rgba(168, 85, 247, 0.4))'
        }}
      >
        <defs>
          <linearGradient id="cursorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e8e8e8" />
          </linearGradient>
          <linearGradient id="cursorStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#333333" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
          <filter id="cursorGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Glow effect behind cursor */}
        <motion.ellipse
          cx="20"
          cy="24"
          rx="18"
          ry="20"
          fill="rgba(168, 85, 247, 0.3)"
          animate={{
            scale: isClicking ? [1, 1.5, 1] : [1, 1.15, 1],
            opacity: isClicking ? [0.5, 0.8, 0.3] : [0.2, 0.35, 0.2]
          }}
          transition={{
            duration: isClicking ? 0.2 : 1.2,
            repeat: isClicking ? 0 : Infinity
          }}
        />

        {/* Standard pointer cursor shape */}
        <motion.path
          d="M8 2 L8 36 L14 30 L20 42 L26 40 L20 28 L30 28 L8 2 Z"
          fill="url(#cursorGradient)"
          stroke="url(#cursorStroke)"
          strokeWidth="2"
          strokeLinejoin="round"
          filter="url(#cursorGlow)"
          animate={{
            y: isClicking ? 2 : 0
          }}
          transition={{ duration: 0.1 }}
        />

        {/* Inner highlight */}
        <path
          d="M10 6 L10 32 L14 28 L18 36 L22 35 L18 27 L26 27 L10 6 Z"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />
      </svg>

      {/* Click ripple effect */}
      {isClicking && (
        <>
          <motion.div
            className="absolute top-1 left-1 w-8 h-8 rounded-full border-2 border-primary"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
          <motion.div
            className="absolute top-1 left-1 w-8 h-8 rounded-full border-2 border-accent"
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />
        </>
      )}
    </motion.div>
  );
};
