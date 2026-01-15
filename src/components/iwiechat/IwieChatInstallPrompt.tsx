import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detect if user is on a mobile device
const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  // Check for mobile user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  // Also check screen width as fallback
  const isSmallScreen = window.innerWidth <= 768;
  return mobileRegex.test(userAgent) || isSmallScreen;
};

// Check if app is running in standalone mode (installed as PWA)
const isRunningAsApp = (): boolean => {
  // Check display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari standalone mode
  if ((navigator as any).standalone === true) return true;
  // Check if running in TWA (Trusted Web Activity)
  if (document.referrer.includes('android-app://')) return true;
  return false;
};

export function IwieChatInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if on mobile device
    const mobile = isMobileDevice();
    setIsMobile(mobile);

    // If not mobile, don't show install prompt
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
      // Show again after 7 days
      if (now.getTime() - dismissedDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

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

  if (!showPrompt || isInstalled) return null;

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
              <Button size="sm" onClick={handleInstall} className="flex-1 bg-purple-600 hover:bg-purple-700">
                <Download className="w-4 h-4 mr-2" />
                Instalar
              </Button>
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
