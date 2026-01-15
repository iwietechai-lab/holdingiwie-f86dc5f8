import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, MessageCircle } from 'lucide-react';

interface IwieChatSplashProps {
  onComplete: () => void;
}

export function IwieChatSplash({ onComplete }: IwieChatSplashProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Show content after a small delay
    const contentTimer = setTimeout(() => setShowContent(true), 300);
    
    // Auto-complete after animation
    const completeTimer = setTimeout(() => onComplete(), 2500);
    
    return () => {
      clearTimeout(contentTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a12] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Stars background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 100 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.8 + 0.2,
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Nebula gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20" />

        {/* Main content */}
        {showContent && (
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Rocket animation */}
            <motion.div
              className="relative mb-8"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.2 
              }}
            >
              {/* Rocket glow */}
              <motion.div
                className="absolute -inset-4 bg-gradient-to-t from-orange-500/50 via-purple-500/30 to-transparent rounded-full blur-2xl"
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />
              
              {/* Rocket icon container */}
              <motion.div
                className="relative w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl"
                animate={{
                  y: [-5, 5, -5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Chat bubble with rocket */}
                <div className="relative">
                  <MessageCircle className="w-14 h-14 text-white fill-white/20" />
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Rocket className="w-8 h-8 text-purple-200 -rotate-45" />
                  </motion.div>
                </div>

                {/* Engine flames */}
                <motion.div
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-8 h-12"
                  animate={{
                    opacity: [0.7, 1, 0.7],
                    scaleY: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-b from-orange-500 via-yellow-500 to-transparent rounded-full blur-sm" />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* App name */}
            <motion.h1
              className="text-4xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              IwieChat
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="text-gray-400 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Comunicación sin límites
            </motion.p>

            {/* Loading dots */}
            <motion.div
              className="flex gap-1 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-purple-500 rounded-full"
                  animate={{
                    y: [-3, 3, -3],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
