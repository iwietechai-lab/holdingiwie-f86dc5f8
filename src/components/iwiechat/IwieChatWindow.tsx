import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Send, 
  Loader2, 
  ArrowLeft,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useChatMessages, useChatParticipants, Chat, ChatType } from '@/hooks/useChats';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface IwieChatWindowProps {
  chat: Chat;
  onBack: () => void;
  onStartCall?: () => void;
}

export function IwieChatWindow({ chat, onBack, onStartCall }: IwieChatWindowProps) {
  const { user } = useSupabaseAuth();
  const { messages, isLoading, sendMessage } = useChatMessages(chat.id);
  const { participants } = useChatParticipants(chat.id);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isSending) return;
    
    setIsSending(true);
    const success = await sendMessage(inputMessage);
    if (success) {
      setInputMessage('');
    }
    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setInputMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const getChatDisplayName = () => {
    if (chat.type === 'one_to_one') {
      const otherParticipant = participants.find(p => p.user_id !== user?.id);
      return otherParticipant?.user_profile?.full_name || chat.title;
    }
    return chat.title;
  };

  const getParticipantCount = () => {
    return participants.length;
  };

  return (
    <div className="flex flex-col h-full bg-[#0b141a]">
      {/* Header - WhatsApp style */}
      <header className="flex items-center gap-3 px-2 py-2 bg-[#1f2c34]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-gray-400 hover:text-white hover:bg-white/10 -ml-1"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <Avatar className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600">
          <AvatarFallback className="bg-transparent text-white font-medium">
            {getChatDisplayName().charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-medium truncate">{getChatDisplayName()}</h1>
          <p className="text-xs text-gray-400 truncate">
            {chat.type === 'one_to_one' ? 'En línea' : `${getParticipantCount()} participantes`}
          </p>
        </div>
        
        <div className="flex items-center gap-1">
          {onStartCall && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onStartCall}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Video className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onStartCall}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Phone className="w-5 h-5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages - WhatsApp style with pattern background */}
      <div 
        className="flex-1 overflow-hidden relative"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#0b141a'
        }}
      >
        <ScrollArea className="h-full">
          <div className="px-3 py-4 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-purple-400 -rotate-45" />
                </div>
                <p className="text-sm">¡Inicia la conversación!</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const showDate = index === 0 || 
                    format(new Date(message.sent_at), 'yyyy-MM-dd') !== 
                    format(new Date(messages[index - 1].sent_at), 'yyyy-MM-dd');
                  
                  // Check if this message is from same sender as previous (for grouping)
                  const prevMessage = messages[index - 1];
                  const isSameSender = prevMessage && prevMessage.sender_id === message.sender_id;
                  const isWithinTimeWindow = prevMessage && 
                    (new Date(message.sent_at).getTime() - new Date(prevMessage.sent_at).getTime()) < 60000;
                  const isGrouped = isSameSender && isWithinTimeWindow && !showDate;

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex justify-center my-3">
                          <span className="px-3 py-1 text-xs bg-[#1f2c34] text-gray-400 rounded-lg shadow">
                            {format(new Date(message.sent_at), "d 'de' MMMM, yyyy", { locale: es })}
                          </span>
                        </div>
                      )}
                      <div 
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-2'}`}
                      >
                        <div 
                          className={`relative max-w-[85%] px-3 py-1.5 rounded-lg shadow ${
                            isOwnMessage
                              ? 'bg-[#005c4b] text-white rounded-tr-none'
                              : 'bg-[#1f2c34] text-white rounded-tl-none'
                          }`}
                        >
                          {/* Sender name for group chats */}
                          {!isOwnMessage && chat.type !== 'one_to_one' && !isGrouped && (
                            <p className="text-xs font-medium text-purple-400 mb-0.5">
                              {message.sender?.full_name || 'Usuario'}
                            </p>
                          )}
                          
                          {/* Message content */}
                          <div className="flex items-end gap-2">
                            <p className="text-[15px] whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <div className="flex items-center gap-0.5 shrink-0 -mb-0.5">
                              <span className="text-[11px] text-gray-400">
                                {format(new Date(message.sent_at), 'HH:mm')}
                              </span>
                              {isOwnMessage && (
                                <CheckCheck className="w-4 h-4 text-blue-400 ml-0.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input - WhatsApp style */}
      <div className="px-2 py-2 bg-[#1f2c34] flex items-end gap-2">
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
            >
              <Smile className="w-6 h-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-0 border-0 bg-transparent">
            <Picker 
              data={data} 
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
              locale="es"
              previewPosition="none"
              skinTonePosition="none"
            />
          </PopoverContent>
        </Popover>
        
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Mensaje"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSending}
            className="w-full bg-[#2a3942] text-white placeholder:text-gray-500 rounded-full px-4 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!inputMessage.trim() || isSending}
          size="icon"
          className="shrink-0 w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
