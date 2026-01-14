import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { ChatList } from '@/components/ChatList';
import { ChatWindow } from '@/components/ChatWindow';
import { CreateChatDialog } from '@/components/CreateChatDialog';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useChats, Chat } from '@/hooks/useChats';
import { MessageSquare } from 'lucide-react';

export default function MessagingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const { chats } = useChats();
  
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // When a chat is created, auto-select it
  const handleChatCreated = (chatId: string) => {
    // Find the chat from the list and select it
    const createdChat = chats.find(c => c.id === chatId);
    if (createdChat) {
      setSelectedChat(createdChat);
    } else {
      // If not found yet (due to timing), we'll wait for chats to update
      // Use a small timeout to wait for the realtime update
      setTimeout(() => {
        const updatedChat = chats.find(c => c.id === chatId);
        if (updatedChat) {
          setSelectedChat(updatedChat);
        }
      }, 500);
    }
  };

  // Effect to select chat after chats list updates
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);

  const handleChatCreatedWithPending = (chatId: string) => {
    setPendingChatId(chatId);
  };

  useEffect(() => {
    if (pendingChatId && chats.length > 0) {
      const chat = chats.find(c => c.id === pendingChatId);
      if (chat) {
        setSelectedChat(chat);
        setPendingChatId(null);
      }
    }
  }, [chats, pendingChatId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      <Sidebar selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="p-8 flex-1 flex flex-col max-h-screen">
          {/* Header */}
          <header className="flex items-center gap-4 mb-6">
            <MessageSquare className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mensajería Interna</h1>
              <p className="text-muted-foreground text-sm">
                Chats privados, grupales y globales
              </p>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Chat List */}
            <div className={`${selectedChat ? 'hidden lg:block lg:w-1/3' : 'w-full'}`}>
              <ChatList
                onSelectChat={setSelectedChat}
                onCreateChat={() => setShowCreateDialog(true)}
                selectedChatId={selectedChat?.id}
              />
            </div>

            {/* Chat Window */}
            {selectedChat && (
              <div className="flex-1">
                <ChatWindow
                  chat={selectedChat}
                  onBack={() => setSelectedChat(null)}
                />
              </div>
            )}

            {/* Empty State for Desktop */}
            {!selectedChat && (
              <div className="hidden lg:flex flex-1 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Selecciona un chat para comenzar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateChatDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onChatCreated={handleChatCreatedWithPending}
      />
    </div>
  );
}
