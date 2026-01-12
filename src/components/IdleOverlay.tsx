import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useIdle } from '@/hooks/useIdle';
import { Button } from '@/components/ui/button';
import { Rocket, X } from 'lucide-react';

// 5 minutes in milliseconds
const IDLE_TIMEOUT = 5 * 60 * 1000;

// Fun messages to display
const IDLE_MESSAGES = [
  "¡Ey! ¿Te dormiste en el espacio? 🚀",
  "Houston, ¿estás ahí? 🛸",
  "¡Despierta, astronauta! 🌟",
  "El universo te extraña... 🌌",
  "¿Viaje interestelar o siesta cósmica? 💫"
];

// Meme type
interface Meme {
  id: string;
  type: 'image' | 'gif' | 'video' | 'youtube';
  url: string;
  title: string;
}

// Helper to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const IdleOverlay = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState(IDLE_MESSAGES[0]);
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const [customMeme, setCustomMeme] = useState<Meme | null>(null);

  // Don't show on login page
  const isLoginPage = location.pathname === '/login' || location.pathname === '/';

  const showOverlay = useCallback((meme?: Meme) => {
    if (!isLoginPage) {
      const randomMessage = IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)];
      setMessage(meme?.title || randomMessage);
      setCustomMeme(meme || null);
      setAnimationPhase('entering');
      setIsVisible(true);
      
      setTimeout(() => setAnimationPhase('visible'), 50);
    }
  }, [isLoginPage]);

  const handleIdle = useCallback(() => {
    showOverlay();
  }, [showOverlay]);

  const handleActive = useCallback(() => {
    if (isVisible) {
      closeOverlay();
    }
  }, [isVisible]);

  const { forceActive } = useIdle({
    timeout: IDLE_TIMEOUT,
    onIdle: handleIdle,
    onActive: handleActive
  });

  // Listen for custom meme trigger events
  useEffect(() => {
    const handleMemeEvent = (event: CustomEvent<{ meme: Meme }>) => {
      showOverlay(event.detail.meme);
    };

    window.addEventListener('trigger-meme-overlay' as any, handleMemeEvent);
    return () => window.removeEventListener('trigger-meme-overlay' as any, handleMemeEvent);
  }, [showOverlay]);

  const closeOverlay = useCallback(() => {
    setAnimationPhase('exiting');
    setTimeout(() => {
      setIsVisible(false);
      setAnimationPhase('entering');
      setCustomMeme(null);
    }, 500);
  }, []);

  const handleInteraction = useCallback(() => {
    closeOverlay();
    forceActive();
  }, [closeOverlay, forceActive]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleInteraction]);

  // Render the meme content based on type - YouTube with minimal branding
  const renderMemeContent = () => {
    // YouTube embed params to hide branding: modestbranding=1, rel=0, showinfo=0, controls=0
    const youtubeParams = 'autoplay=1&mute=0&loop=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1';
    
    if (customMeme) {
      const videoId = customMeme.type === 'youtube' ? getYouTubeVideoId(customMeme.url) : null;
      
      switch (customMeme.type) {
        case 'youtube':
          return videoId ? (
            <div className="relative w-[300px] h-[170px] md:w-[560px] md:h-[315px] bg-black rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?${youtubeParams}&playlist=${videoId}`}
                title="Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
                style={{ border: 'none' }}
              />
            </div>
          ) : null;
        case 'video':
          return (
            <video 
              src={customMeme.url}
              autoPlay
              loop
              muted={false}
              playsInline
              className="max-w-[560px] max-h-[315px] rounded-lg bg-black"
              style={{ objectFit: 'contain' }}
            />
          );
        case 'gif':
        case 'image':
        default:
          return (
            <img 
              src={customMeme.url}
              alt="Meme"
              className="max-w-[560px] max-h-[400px] rounded-lg object-contain bg-black"
            />
          );
      }
    }
    
    // Default: Rick Astley with minimal branding
    return (
      <div className="relative w-[300px] h-[170px] md:w-[560px] md:h-[315px] bg-black rounded-lg overflow-hidden">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?${youtubeParams}&playlist=dQw4w9WgXcQ`}
          title="Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
          style={{ border: 'none' }}
        />
      </div>
    );
  };

  if (!isVisible || isLoginPage) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      onClick={handleInteraction}
    >
      {/* Dark space background with stars */}
      <div 
        className={`absolute inset-0 bg-black/95 backdrop-blur-sm transition-opacity duration-500 ${
          animationPhase === 'exiting' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Animated stars */}
        <div className="stars-container absolute inset-0 overflow-hidden">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDelay: Math.random() * 3 + 's',
                animationDuration: Math.random() * 2 + 1 + 's',
                opacity: Math.random() * 0.8 + 0.2
              }}
            />
          ))}
        </div>
        
        {/* Shooting stars */}
        <div className="shooting-stars absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`shooting-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: Math.random() * 80 + '%',
                top: Math.random() * 50 + '%',
                animation: `shooting-star ${3 + Math.random() * 4}s linear infinite`,
                animationDelay: `${i * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content container with 3D effect */}
      <div 
        className={`relative z-10 flex flex-col items-center justify-center max-w-2xl mx-4 transition-all duration-700 ease-out ${
          animationPhase === 'entering' 
            ? 'scale-0 rotate-180 opacity-0' 
            : animationPhase === 'exiting'
            ? 'scale-150 opacity-0 blur-lg'
            : 'scale-100 rotate-0 opacity-100'
        }`}
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating rocket animation */}
        <div 
          className="mb-6 animate-bounce"
          style={{
            animation: 'float 3s ease-in-out infinite, spin3d 10s linear infinite'
          }}
        >
          <div className="relative">
            <Rocket className="w-20 h-20 md:w-24 md:h-24 text-primary transform -rotate-45" />
            {/* Rocket flame */}
            <div 
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 rotate-45"
              style={{
                animation: 'flicker 0.2s ease-in-out infinite alternate'
              }}
            >
              <div className="w-4 h-8 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full opacity-80" />
            </div>
          </div>
        </div>

        {/* Meme/Video content */}
        <div 
          className={`relative mb-6 rounded-xl overflow-hidden shadow-2xl shadow-primary/30 border-2 border-primary/50 transition-all duration-1000 ${
            animationPhase === 'visible' ? 'scale-100 rotate-0' : 'scale-50'
          }`}
          style={{
            transform: animationPhase === 'visible' ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden'
          }}
        >
          {renderMemeContent()}
          
          {/* Neon glow effect */}
          <div className="absolute inset-0 pointer-events-none rounded-xl ring-2 ring-primary/50 ring-offset-2 ring-offset-black/50" />
        </div>

        {/* Neon text */}
        <h2 
          className={`text-2xl md:text-4xl font-bold text-center mb-6 transition-all duration-700 delay-300 ${
            animationPhase === 'visible' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{
            textShadow: '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary)), 0 0 80px hsl(var(--primary))',
            color: 'white',
            animation: 'neon-flicker 2s infinite'
          }}
        >
          {message}
        </h2>

        {/* Close button */}
        <Button
          onClick={handleInteraction}
          size="lg"
          className={`group relative overflow-hidden bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-white font-bold px-8 py-6 text-lg rounded-full transition-all duration-500 delay-500 ${
            animationPhase === 'visible' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{
            boxShadow: '0 0 20px hsl(var(--primary) / 0.5), 0 0 40px hsl(var(--primary) / 0.3)'
          }}
        >
          <span className="relative z-10 flex items-center gap-2">
            <Rocket className="w-5 h-5 group-hover:animate-bounce" />
            Volver al trabajo
          </span>
          {/* Button glow animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </Button>

        {/* Hint text */}
        <p 
          className={`text-muted-foreground text-sm mt-4 transition-all duration-700 delay-700 ${
            animationPhase === 'visible' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          (o haz clic en cualquier lugar para continuar)
        </p>
      </div>

      {/* Close button in corner */}
      <button
        onClick={handleInteraction}
        className={`absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-500 ${
          animationPhase === 'visible' ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Cerrar"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Custom CSS animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-45deg); }
          50% { transform: translateY(-20px) rotate(-45deg); }
        }
        
        @keyframes spin3d {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        
        @keyframes flicker {
          0% { opacity: 0.6; transform: scale(1) rotate(45deg); }
          100% { opacity: 1; transform: scale(1.2) rotate(45deg); }
        }
        
        @keyframes shooting-star {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(300px) translateY(300px);
            opacity: 0;
          }
        }
        
        @keyframes neon-flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            text-shadow: 
              0 0 10px hsl(var(--primary)),
              0 0 20px hsl(var(--primary)),
              0 0 40px hsl(var(--primary)),
              0 0 80px hsl(var(--primary));
          }
          20%, 24%, 55% {
            text-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};