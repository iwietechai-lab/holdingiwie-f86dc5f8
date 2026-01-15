import { useState, useEffect } from 'react';
import { Plus, Search, MessageSquare, Building2, Users, Globe, Loader2, Camera, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateChatDialog } from '@/components/CreateChatDialog';
import { Chat, ChatType, useChats } from '@/hooks/useChats';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface IwieChatListProps {
  onSelectChat: (chat: Chat) => void;
}

type FilterType = 'todos' | 'no_leidos' | 'grupos';

export function IwieChatList({ onSelectChat }: IwieChatListProps) {
  const { chats, isLoading, fetchChats } = useChats();
  const { unreadCounts, markAsRead, fetchUnreadCounts } = useUnreadMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');

  // Real-time subscription for chats and messages
  useEffect(() => {
    const chatsChannel = supabase
      .channel('iwiechat-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchChats();
        fetchUnreadCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
    };
  }, [fetchChats, fetchUnreadCounts]);

  const getChatTypeIcon = (type: ChatType) => {
    switch (type) {
      case 'one_to_one': return <MessageSquare className="w-5 h-5" />;
      case 'group_company': return <Building2 className="w-5 h-5" />;
      case 'group_multi_company': return <Users className="w-5 h-5" />;
      case 'global': return <Globe className="w-5 h-5" />;
    }
  };

  const getAvatarColor = (type: ChatType) => {
    switch (type) {
      case 'one_to_one': return 'from-blue-500 to-cyan-500';
      case 'group_company': return 'from-green-500 to-emerald-500';
      case 'group_multi_company': return 'from-purple-500 to-pink-500';
      case 'global': return 'from-amber-500 to-orange-500';
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ayer';
    }
    return format(date, 'dd/MM/yyyy');
  };

  // Filter chats based on active filter and search
  const filteredChats = chats
    .filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(chat => {
      if (activeFilter === 'no_leidos') {
        return (unreadCounts[chat.id] || 0) > 0;
      }
      if (activeFilter === 'grupos') {
        return chat.type !== 'one_to_one';
      }
      return true;
    });

  const handleSelectChat = (chat: Chat) => {
    markAsRead(chat.id);
    onSelectChat(chat);
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'no_leidos', label: 'No leídos' },
    { id: 'grupos', label: 'Grupos' },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b141a]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0b141a]">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-[#1f2c34]">
        <h1 className="text-xl font-bold text-white">IwieChat</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Camera className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="px-3 py-2 bg-[#0b141a]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1f2c34] text-white placeholder:text-gray-500 rounded-lg pl-12 pr-4 py-2.5 text-[15px] focus:outline-none"
          />
        </div>
      </div>

      {/* Filter chips - WhatsApp style */}
      <div className="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter.id
                ? 'bg-purple-600 text-white'
                : 'bg-[#1f2c34] text-gray-400 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-white/5">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="w-16 h-16 rounded-full bg-[#1f2c34] flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="text-sm mb-1">
                {searchQuery ? 'No se encontraron chats' : 'No tienes chats aún'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-gray-600">Toca el botón + para crear uno</p>
              )}
            </div>
          ) : (
            filteredChats.map(chat => {
              const unreadCount = unreadCounts[chat.id] || 0;
              
              return (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  {/* Avatar */}
                  <Avatar className={`w-12 h-12 bg-gradient-to-br ${getAvatarColor(chat.type)}`}>
                    <AvatarFallback className="bg-transparent text-white">
                      {getChatTypeIcon(chat.type)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Chat info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`font-medium truncate ${unreadCount > 0 ? 'text-white' : 'text-gray-200'}`}>
                        {chat.title}
                      </span>
                      <span className={`text-xs shrink-0 ${unreadCount > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
                        {chat.last_message_at ? formatMessageTime(chat.last_message_at) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                        {unreadCount > 0 
                          ? `${unreadCount} mensaje${unreadCount > 1 ? 's' : ''} nuevo${unreadCount > 1 ? 's' : ''}`
                          : 'Toca para ver los mensajes'
                        }
                      </p>
                      {unreadCount > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-purple-600 text-[11px] font-bold text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowCreateDialog(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/30"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <CreateChatDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onChatCreated={(chatId) => {
          fetchChats().then(() => {
            const chat = chats.find(c => c.id === chatId);
            if (chat) {
              handleSelectChat(chat);
            }
          });
        }}
      />
    </div>
  );
}
