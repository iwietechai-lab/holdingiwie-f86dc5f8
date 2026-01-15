import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { SpaceBackground } from '@/components/SpaceBackground';
import { IwieChatHeader } from '@/components/iwiechat/IwieChatHeader';
import { IwieChatTabs } from '@/components/iwiechat/IwieChatTabs';
import { IwieChatChats } from '@/components/iwiechat/IwieChatChats';
import { IwieChatCalls } from '@/components/iwiechat/IwieChatCalls';
import { IwieChatInstallPrompt } from '@/components/iwiechat/IwieChatInstallPrompt';
import { Chat } from '@/hooks/useChats';
import { ChatWindow } from '@/components/ChatWindow';

export default function IwieChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user } = useSupabaseAuth();
  
  const initialTab = searchParams.get('tab') || 'chats';
  const [activeTab, setActiveTab] = useState<'chats' | 'calls'>(initialTab as 'chats' | 'calls');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SpaceBackground />
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show chat window when a chat is selected
  if (selectedChat) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SpaceBackground />
        <div className="flex-1 relative z-10 flex flex-col">
          <ChatWindow
            chat={selectedChat}
            onBack={() => setSelectedChat(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background safe-area-inset">
      <SpaceBackground />
      
      <div className="flex-1 relative z-10 flex flex-col">
        <IwieChatHeader />
        
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chats' ? (
            <IwieChatChats onSelectChat={setSelectedChat} />
          ) : (
            <IwieChatCalls userId={user?.id || ''} />
          )}
        </main>
        
        <IwieChatTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      
      <IwieChatInstallPrompt />
    </div>
  );
}
