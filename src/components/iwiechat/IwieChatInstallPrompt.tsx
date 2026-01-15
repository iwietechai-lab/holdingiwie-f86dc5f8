import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Plus, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isMobileDevice, isRunningAsApp } from '@/utils/deviceDetection';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detect iOS
const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export function IwieChatInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if on mobile device
    const mobile = isMobileDevice();
    setIsMobile(mobile);

    // If not mobile, don't show install prompt at all
    if (!mobile) {
      return;
    }

    // Check if already installed/running as app
    if (isRunningAsApp()) {
      setIsInstalled(true);
      localStorage.setItem('iwiechat-installed', 'true');
      return;
    }

    // Check localStorage for installation status
    const installedFlag = localStorage.getItem('iwiechat-installed');
    if (installedFlag === 'true') {
      // Double check - if flag is set but not running as app, 
      // user might have uninstalled, so we can show prompt again
      if (!isRunningAsApp()) {
        localStorage.removeItem('iwiechat-installed');
      } else {
        setIsInstalled(true);
        return;
      }
    }

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('iwiechat-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // Show again after 1 day (reduced from 7 for better engagement)
      if (now.getTime() - dismissedDate.getTime() < 1 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // For iOS, show custom instructions immediately
    if (isIOS()) {
      setShowPrompt(true);
      setShowIOSInstructions(true);
      return;
    }

    // For Android/others, wait for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('iwiechat-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If no prompt event fires after 2 seconds, show manual instructions for Android
    const timeout = setTimeout(() => {
      if (!deferredPrompt && mobile && !isIOS() && !isRunningAsApp()) {
        setShowPrompt(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timeout);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Show manual instructions for browsers that don't support beforeinstallprompt
      if (isIOS()) {
        setShowIOSInstructions(true);
      }
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      localStorage.setItem('iwiechat-installed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('iwiechat-install-dismissed', new Date().toISOString());
  };

  if (!isMobile || isInstalled) return null;
  if (!showPrompt) return null;

  // iOS specific instructions
  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-[#1f2c34] border border-white/10 rounded-xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white mb-2">Instalar IwieChat en iOS</h3>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">1</span>
                  <span>Toca el botón <Share className="inline w-4 h-4 mx-1" /> Compartir</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">2</span>
                  <span>Selecciona "Agregar a pantalla de inicio" <Plus className="inline w-4 h-4 mx-1" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">3</span>
                  <span>Confirma tocando "Agregar"</span>
                </div>
              </div>
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss} 
                className="mt-3 text-gray-400 hover:text-white hover:bg-white/10 text-xs"
              >
                Entendido
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-[#1f2c34] border border-white/10 rounded-xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">Instalar IwieChat</h3>
            <p className="text-xs text-gray-400 mb-3">
              Instala la app en tu dispositivo para acceso rápido y notificaciones
            </p>
            
            <div className="flex gap-2">
              {deferredPrompt ? (
                <Button size="sm" onClick={handleInstall} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  <Download className="w-4 h-4 mr-2" />
                  Instalar
                </Button>
              ) : (
                <div className="flex-1 text-xs text-gray-400">
                  Usa el menú del navegador para instalar
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-gray-400 hover:text-white hover:bg-white/10">
                Ahora no
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-6 w-6 text-gray-400 hover:text-white hover:bg-white/10"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
