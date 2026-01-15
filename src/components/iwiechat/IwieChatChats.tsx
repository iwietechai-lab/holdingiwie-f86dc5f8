import { useState, useEffect } from 'react';
import { Plus, Search, MessageSquare, Building2, Users, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatDialog } from '@/components/CreateChatDialog';
import { Chat, ChatType, useChats } from '@/hooks/useChats';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface IwieChatChatsProps {
  onSelectChat: (chat: Chat) => void;
}

export function IwieChatChats({ onSelectChat }: IwieChatChatsProps) {
  const { chats, isLoading, fetchChats } = useChats();
  const { unreadCounts, markAsRead, fetchUnreadCounts } = useUnreadMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Real-time subscription for chats and messages
  useEffect(() => {
    const chatsChannel = supabase
      .channel('iwiechat-chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        () => {
          fetchChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchChats();
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
    };
  }, [fetchChats, fetchUnreadCounts]);

  const getChatTypeIcon = (type: ChatType) => {
    switch (type) {
      case 'one_to_one': return <MessageSquare className="w-4 h-4" />;
      case 'group_company': return <Building2 className="w-4 h-4" />;
      case 'group_multi_company': return <Users className="w-4 h-4" />;
      case 'global': return <Globe className="w-4 h-4" />;
    }
  };

  const getChatTypeBadgeColor = (type: ChatType) => {
    switch (type) {
      case 'one_to_one': return 'bg-blue-500/20 text-blue-400';
      case 'group_company': return 'bg-green-500/20 text-green-400';
      case 'group_multi_company': return 'bg-purple-500/20 text-purple-400';
      case 'global': return 'bg-amber-500/20 text-amber-400';
    }
  };

  const getChatTypeLabel = (type: ChatType) => {
    switch (type) {
      case 'one_to_one': return 'Privado';
      case 'group_company': return 'Empresa';
      case 'group_multi_company': return 'Multi';
      case 'global': return 'Global';
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectChat = (chat: Chat) => {
    markAsRead(chat.id);
    onSelectChat(chat);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Search and New Chat */}
      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Chat
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-2">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No se encontraron chats' : 'No tienes chats aún'}
              </p>
              {!searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-4 border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear mi primer chat
                </Button>
              )}
            </div>
          ) : (
            filteredChats.map(chat => {
              const unreadCount = unreadCounts[chat.id] || 0;
              
              return (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left ${
                    unreadCount > 0 ? 'border border-indigo-500/30' : 'border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className={getChatTypeBadgeColor(chat.type)}>
                        {getChatTypeIcon(chat.type)}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium truncate ${unreadCount > 0 ? 'text-white' : 'text-gray-200'}`}>
                        {chat.title}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 border-0 ${getChatTypeBadgeColor(chat.type)}`}
                      >
                        {getChatTypeLabel(chat.type)}
                      </Badge>
                    </div>
                    <p className={`text-xs truncate ${unreadCount > 0 ? 'text-indigo-400 font-medium' : 'text-gray-500'}`}>
                      {unreadCount > 0 
                        ? `${unreadCount} mensaje${unreadCount > 1 ? 's' : ''} nuevo${unreadCount > 1 ? 's' : ''}`
                        : chat.last_message_at 
                          ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true, locale: es })
                          : 'Sin mensajes'
                      }
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      <CreateChatDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onChatCreated={(chatId) => {
          const chat = chats.find(c => c.id === chatId);
          if (chat) {
            handleSelectChat(chat);
          }
        }}
      />
    </div>
  );
}
