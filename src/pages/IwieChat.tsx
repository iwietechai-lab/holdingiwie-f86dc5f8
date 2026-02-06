import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Chat } from '@/hooks/useChats';
import { 
  IwieChatSplash,
  IwieChatList,
  IwieChatCallsList,
  IwieChatWindow,
  IwieChatNav,
  IwieChatInstallPrompt
} from '@/components/iwiechat';

export default function IwieChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user, profile } = useSupabaseAuth();
  
  const initialTab = searchParams.get('tab') || 'chats';
  const [activeTab, setActiveTab] = useState<'chats' | 'calls'>(initialTab as 'chats' | 'calls');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Force dark mode for IwieChat
  useEffect(() => {
    document.documentElement.classList.add('dark');
    // Set specific background color for IwieChat
    document.body.style.backgroundColor = '#0b141a';
    
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  // Check authentication status
  useEffect(() => {
    if (!authLoading) {
      setHasCheckedAuth(true);
      if (!isAuthenticated) {
        navigate('/login');
      }
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show splash screen on first load
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Show splash while loading auth or splash animation - only if authenticated or still loading
  if (authLoading || (showSplash && !hasCheckedAuth)) {
    return <IwieChatSplash onComplete={handleSplashComplete} />;
  }

  // Show splash after auth confirmed for smooth transition
  if (showSplash && isAuthenticated) {
    return <IwieChatSplash onComplete={handleSplashComplete} />;
  }

  // If not authenticated and auth check done, don't render (will redirect)
  if (!isAuthenticated && hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b141a]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show chat window when a chat is selected
  if (selectedChat) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b141a] safe-area-inset">
        <IwieChatWindow
          chat={selectedChat}
          onBack={() => setSelectedChat(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b141a] safe-area-inset">
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chats' ? (
          <IwieChatList onSelectChat={setSelectedChat} />
        ) : (
          <IwieChatCallsList 
            userId={user?.id || ''} 
            userName={profile?.full_name || 'Usuario'}
          />
        )}
      </main>
      
      <IwieChatNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      <IwieChatInstallPrompt />
    </div>
  );
}
