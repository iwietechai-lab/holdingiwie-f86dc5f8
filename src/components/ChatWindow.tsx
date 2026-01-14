import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Loader2, 
  Users, 
  FileText, 
  ArrowLeft,
  Building2,
  Globe,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useChatMessages, useChatParticipants, useChatSummaries, Chat, ChatType } from '@/hooks/useChats';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
}

export function ChatWindow({ chat, onBack }: ChatWindowProps) {
  const { user } = useSupabaseAuth();
  const { messages, isLoading, sendMessage } = useChatMessages(chat.id);
  const { participants } = useChatParticipants(chat.id);
  const { summaries, isGenerating, generateSummary } = useChatSummaries(chat.id);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSummaries, setShowSummaries] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleGenerateSummary = async () => {
    await generateSummary(messages);
  };

  const getChatTypeIcon = (type: ChatType) => {
    switch (type) {
      case 'one_to_one': return <MessageSquare className="w-4 h-4" />;
      case 'group_company': return <Building2 className="w-4 h-4" />;
      case 'group_multi_company': return <Users className="w-4 h-4" />;
      case 'global': return <Globe className="w-4 h-4" />;
    }
  };

  const getChatTypeBadge = (type: ChatType) => {
    const labels: Record<ChatType, string> = {
      'one_to_one': 'Privado',
      'group_company': 'Empresa',
      'group_multi_company': 'Multi-Empresa',
      'global': 'Global',
    };
    return labels[type];
  };

  return (
    <Card className="flex flex-col h-full bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {getChatTypeIcon(chat.type)}
              <CardTitle className="text-lg">{chat.title}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {getChatTypeBadge(chat.type)}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowParticipants(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              {participants.length}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateSummary}
              disabled={isGenerating || messages.length === 0}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Generar Informe
            </Button>
            {summaries.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSummaries(true)}
              >
                Ver Informes ({summaries.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">No hay mensajes aún. ¡Inicia la conversación!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const showDate = index === 0 || 
                  format(new Date(message.sent_at), 'yyyy-MM-dd') !== 
                  format(new Date(messages[index - 1].sent_at), 'yyyy-MM-dd');

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <Badge variant="secondary" className="text-xs">
                          {format(new Date(message.sent_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </Badge>
                      </div>
                    )}
                    <div className={`flex gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      {!isOwnMessage && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {(message.sender?.full_name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
                        {!isOwnMessage && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {message.sender?.full_name || message.sender?.email || 'Usuario'}
                          </p>
                        )}
                        <div
                          className={`rounded-lg p-3 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(message.sent_at), 'HH:mm', { locale: es })}
                        </p>
                      </div>
                      {isOwnMessage && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            Yo
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe tu mensaje..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isSending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputMessage.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Participants Dialog */}
      <Dialog open={showParticipants} onOpenChange={setShowParticipants}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participantes ({participants.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {(p.user_profile?.full_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {p.user_profile?.full_name || 'Sin nombre'}
                      {p.user_id === user?.id && ' (Tú)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.user_profile?.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Summaries Dialog */}
      <Dialog open={showSummaries} onOpenChange={setShowSummaries}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informes del Chat
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {summaries.map(summary => (
                <Card key={summary.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(summary.generated_at), "d MMM yyyy, HH:mm", { locale: es })}
                      </Badge>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <pre className="whitespace-pre-wrap text-sm font-sans bg-transparent p-0">
                        {summary.summary}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
