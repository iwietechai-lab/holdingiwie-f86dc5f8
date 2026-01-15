import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  MessageSquare, 
  Users, 
  Building2, 
  Globe,
  Loader2,
  Trash2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Chat, ChatType, useChats } from '@/hooks/useChats';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface ChatListProps {
  onSelectChat: (chat: Chat) => void;
  onCreateChat: () => void;
  selectedChatId?: string;
}

export function ChatList({ onSelectChat, onCreateChat, selectedChatId }: ChatListProps) {
  const { chats, isLoading, deleteChat } = useChats();
  const { isSuperadmin } = useSupabaseAuth();
  const { unreadCounts, markAsRead } = useUnreadMessages();

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
      case 'one_to_one': return 'bg-blue-500/20 text-blue-500';
      case 'group_company': return 'bg-green-500/20 text-green-500';
      case 'group_multi_company': return 'bg-purple-500/20 text-purple-500';
      case 'global': return 'bg-amber-500/20 text-amber-500';
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

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este chat?')) {
      await deleteChat(chatId);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    markAsRead(chat.id);
    onSelectChat(chat);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mis Chats</h2>
        <Button onClick={onCreateChat} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Chat
        </Button>
      </div>

      {chats.length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm mb-4">No tienes chats aún</p>
            <Button onClick={onCreateChat} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Crear mi primer chat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-2">
            {chats.map(chat => {
              const unreadCount = unreadCounts[chat.id] || 0;
              
              return (
                <Card
                  key={chat.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 group relative ${
                    selectedChatId === chat.id ? 'ring-2 ring-primary' : ''
                  } ${unreadCount > 0 ? 'border-primary/50' : ''}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className={getChatTypeBadgeColor(chat.type)}>
                            {getChatTypeIcon(chat.type)}
                          </AvatarFallback>
                        </Avatar>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium truncate ${unreadCount > 0 ? 'text-foreground' : ''}`}>
                            {chat.title}
                          </p>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getChatTypeBadgeColor(chat.type)}`}
                          >
                            {getChatTypeLabel(chat.type)}
                          </Badge>
                        </div>
                        <p className={`text-xs ${unreadCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                          {unreadCount > 0 
                            ? `${unreadCount} mensaje${unreadCount > 1 ? 's' : ''} nuevo${unreadCount > 1 ? 's' : ''}`
                            : chat.last_message_at 
                              ? `Último mensaje: ${formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true, locale: es })}`
                              : `Creado: ${format(new Date(chat.created_at), "d MMM yyyy", { locale: es })}`
                          }
                        </p>
                      </div>
                      {isSuperadmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-destructive"
                          onClick={(e) => handleDelete(e, chat.id)}
                          title="Solo el CEO puede eliminar chats"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
