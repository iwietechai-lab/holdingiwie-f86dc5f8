import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Download, Rocket, MessageCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isMobileDevice, isRunningAsApp } from '@/utils/deviceDetection';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface MobileBlockerProps {
  children: React.ReactNode;
}

export function MobileBlocker({ children }: MobileBlockerProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isApp, setIsApp] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const mobile = isMobileDevice();
    const app = isRunningAsApp();
    
    setIsMobile(mobile);
    setIsApp(app);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // If no prompt available, navigate to IwieChat with instructions
      navigate('/iwiechat');
      return;
    }

    setInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem('iwiechat-installed', 'true');
        // After install, redirect to IwieChat
        navigate('/iwiechat');
      }
    } catch (error) {
      console.error('Install error:', error);
    }
    
    setInstalling(false);
    setDeferredPrompt(null);
  };

  const handleGoToIwieChat = () => {
    navigate('/iwiechat');
  };

  // If not mobile or running as app, show children
  if (!isMobile || isApp) {
    return <>{children}</>;
  }

  // Mobile users not in app mode - show blocker
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0b141a] to-[#1f2c34] flex flex-col items-center justify-center p-6 z-50">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/30 rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/30">
          <Smartphone className="w-12 h-12 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Acceso desde Móvil
        </h1>

        {/* Description */}
        <p className="text-gray-400 mb-8 leading-relaxed">
          Para acceder desde tu dispositivo móvil, utiliza la aplicación <strong className="text-purple-400">IwieChat</strong>. 
          Es más rápida, segura y te permite recibir notificaciones.
        </p>

        {/* Install button */}
        <div className="space-y-4 w-full">
          <Button
            onClick={handleInstall}
            disabled={installing}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg font-semibold rounded-xl shadow-lg"
          >
            {installing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Instalando...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Instalar IwieChat
              </>
            )}
          </Button>

          <Button
            onClick={handleGoToIwieChat}
            variant="outline"
            className="w-full h-12 bg-transparent border-white/20 hover:bg-white/10 text-white rounded-xl"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Continuar sin instalar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Features */}
        <div className="mt-8 space-y-3 text-left w-full">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-green-400" />
            </div>
            <span>Mensajería instantánea con tu equipo</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-4 h-4 text-blue-400" />
            </div>
            <span>Videollamadas y conferencias</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4 text-purple-400" />
            </div>
            <span>Notificaciones en tiempo real</span>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-xs text-gray-500">
          El Dashboard completo está disponible desde un computador de escritorio
        </p>
      </div>
    </div>
  );
}
