import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Rocket } from 'lucide-react';
import { CEOChatbot } from '@/components/CEOChatbot';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Button } from '@/components/ui/button';

export const Chatbot = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading, logout } = useSupabaseAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const displayRole = profile?.role || 'Usuario';

  return (
    <div className="min-h-screen flex flex-col">
      <SpaceBackground />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">IWIE Assistant</h1>
            <p className="text-xs text-muted-foreground">
              {displayName} - {displayRole}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </Button>
      </header>

      {/* Chatbot Content - Full screen */}
      <main className="flex-1 relative z-10 p-4 flex items-center justify-center">
        <div className="w-full max-w-4xl h-[calc(100vh-120px)]">
          <CEOChatbot fullScreen />
        </div>
      </main>
    </div>
  );
};

export default Chatbot;
