import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Loader2,
  Settings,
  Trash2,
  Bot,
  User,
  Calendar,
  Ticket,
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useChatbot } from '@/hooks/useChatbot';
import { useMeetings } from '@/hooks/useMeetings';
import { useTickets } from '@/hooks/useTickets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import mauricioAvatar from '@/assets/faces/mauricio.jpg';

export default function CEOChatbotPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, profile } = useSupabaseAuth();
  const { chatbot, messages, isLoading, isSending, sendMessage, clearConversation } = useChatbot();
  const { createMeeting } = useMeetings();
  const { createTicket } = useTickets();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle action responses from chatbot
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.metadata?.action) {
      handleAction(lastMessage.metadata);
    }
  }, [messages]);

  const handleAction = async (metadata: any) => {
    if (metadata.action === 'create_meeting') {
      const result = await createMeeting({
        title: metadata.title,
        description: metadata.description,
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: metadata.duration_minutes || 60,
        status: 'scheduled',
        attendees: [],
        company_id: profile?.company_id || '',
        created_by: '',
      });
      if (result.success) {
        toast.success('Reunión creada exitosamente');
      }
    } else if (metadata.action === 'create_ticket') {
      const result = await createTicket({
        title: metadata.title,
        description: metadata.description,
        priority: metadata.priority || 'media',
        status: 'open',
        points: 0,
        tags: [],
        company_id: profile?.company_id || '',
        created_by: '',
      });
      if (result.success) {
        toast.success('Ticket creado exitosamente');
      }
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isSending) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary">
                <AvatarImage src={mauricioAvatar} alt="CEO Mauricio" />
                <AvatarFallback>MC</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Bot className="w-6 h-6 text-primary" />
                  Asistente del CEO
                </h1>
                <p className="text-muted-foreground text-sm">
                  {chatbot?.name || 'Chatbot CEO'}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={clearConversation}
              className="text-muted-foreground"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar chat
            </Button>
          </header>

          {/* Chat Area */}
          <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border flex flex-col overflow-hidden">
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">¡Hola! Soy el asistente del CEO</p>
                    <p className="text-sm mt-2 text-center max-w-md">
                      Puedo ayudarte con consultas sobre la empresa, crear solicitudes de reunión
                      y generar tickets de trabajo.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInputMessage('Quiero programar una reunión')}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Crear reunión
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInputMessage('Necesito crear un ticket')}
                      >
                        <Ticket className="w-4 h-4 mr-2" />
                        Crear ticket
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={mauricioAvatar} alt="CEO" />
                            <AvatarFallback>
                              <Bot className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <span className="text-xs opacity-60 mt-1 block">
                            {formatDistanceToNow(new Date(message.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                        </div>
                        {message.role === 'user' && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={mauricioAvatar} alt="CEO" />
                          <AvatarFallback>
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Escribe tu mensaje..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputMessage.trim() || isSending}
                    className="bg-gradient-to-r from-primary to-secondary"
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
          </Card>
        </div>
      </main>
    </div>
  );
}
