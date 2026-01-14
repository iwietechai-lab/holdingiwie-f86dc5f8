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
  CalendarDays,
  Brain,
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useCEOChatbot } from '@/hooks/useCEOChatbot';
import { useMeetings } from '@/hooks/useMeetings';
import { useTickets } from '@/hooks/useTickets';
import { useAvailabilitySlots } from '@/hooks/useAvailabilitySlots';
import { useMeetingRequests } from '@/hooks/useMeetingRequests';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow, format, getDay, addDays, startOfDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

import mauricioAvatar from '@/assets/faces/mauricio.jpg';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function CEOChatbotPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, profile } = useSupabaseAuth();
  const { messages, isLoading, isSending, sendMessage, clearConversation } = useCEOChatbot();
  const { createMeeting } = useMeetings();
  const { createTicket } = useTickets();
  const { slots } = useAvailabilitySlots();
  const { createRequest } = useMeetingRequests();
  const { isSuperadmin } = useSuperadmin();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Meeting scheduling state
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [pendingMeeting, setPendingMeeting] = useState<{
    title: string;
    description: string;
    duration_minutes: number;
    day_of_week?: number;
    preferred_time?: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');

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

  // Get available dates from slots
  const availableDates = slots.map(s => s.available_date);

  // Get available time slots for a selected date
  const getTimeSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots.filter(s => s.available_date === dateStr);
  };

  // Check if a date is available
  const isDateAvailable = (date: Date) => {
    const today = startOfDay(new Date());
    const dateStr = format(date, 'yyyy-MM-dd');
    return date >= today && availableDates.includes(dateStr);
  };

  const handleAction = async (metadata: any) => {
    if (metadata.action === 'request_meeting') {
      // Open the calendar dialog to select date
      setPendingMeeting({
        title: metadata.title,
        description: metadata.description,
        duration_minutes: metadata.duration_minutes || 30,
        day_of_week: metadata.day_of_week,
        preferred_time: metadata.preferred_time,
      });
      setShowMeetingDialog(true);
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

  const handleConfirmMeeting = async () => {
    if (!selectedDate || !selectedTime || !pendingMeeting || !user) {
      toast.error('Por favor selecciona una fecha y horario');
      return;
    }

    // Find a CEO user to send the request to
    const ceoUserId = slots[0]?.user_id;
    if (!ceoUserId) {
      toast.error('No se encontró el CEO para enviar la solicitud');
      return;
    }

    // Parse duration
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const endHours = hours + Math.floor((minutes + pendingMeeting.duration_minutes) / 60);
    const endMinutes = (minutes + pendingMeeting.duration_minutes) % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    const result = await createRequest({
      creator_id: user.id,
      title: pendingMeeting.title,
      description: pendingMeeting.description,
      participants: [ceoUserId],
      requested_date: format(selectedDate, 'yyyy-MM-dd'),
      requested_start_time: selectedTime,
      requested_end_time: endTime,
      duration_minutes: pendingMeeting.duration_minutes,
      priority: 'media',
    });

    if (result) {
      toast.success('Solicitud de reunión enviada. El CEO la revisará pronto.');
      setShowMeetingDialog(false);
      setPendingMeeting(null);
      setSelectedDate(undefined);
      setSelectedTime('');
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
                  Chatbot CEO para {profile?.company_id ? profile.company_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'tu empresa'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSuperadmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/ceo-knowledge')}
                  className="text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Gestionar Conocimiento
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
                className="text-muted-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar chat
              </Button>
            </div>
          </header>

          {/* Chat Area */}
          <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border flex flex-col min-h-0">
            <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
              <ScrollArea className="flex-1 h-full">
                <div className="p-4">
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
                            <Avatar className="w-8 h-8 shrink-0">
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
                            {message.role === 'assistant' ? (
                              <MarkdownRenderer content={message.content} />
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                            <span className="text-xs opacity-60 mt-2 block">
                              {formatDistanceToNow(new Date(message.created_at), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                          </div>
                          {message.role === 'user' && (
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback>
                                <User className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      {isSending && (
                        <div className="flex gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
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
                </div>
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

        {/* Meeting Scheduling Dialog */}
        <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Agendar Reunión con el CEO
              </DialogTitle>
              <DialogDescription>
                {pendingMeeting?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Selecciona una fecha disponible
                </Label>
                <div className="flex justify-center">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => !isDateAvailable(date)}
                    className="rounded-md border pointer-events-auto"
                    locale={es}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Fechas con disponibilidad: {availableDates.length > 0 ? availableDates.slice(0, 5).join(', ') + (availableDates.length > 5 ? '...' : '') : 'Ninguna'}
                </p>
              </div>

              {selectedDate && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Selecciona un horario
                  </Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige un horario" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTimeSlotsForDate(selectedDate).map((slot) => (
                        <SelectItem 
                          key={slot.id} 
                          value={slot.start_time.slice(0, 5)}
                        >
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedDate && selectedTime && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Reunión:</strong> {pendingMeeting?.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Fecha:</strong> {format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Hora:</strong> {selectedTime}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Duración:</strong> {pendingMeeting?.duration_minutes} minutos
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowMeetingDialog(false);
                    setPendingMeeting(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  onClick={handleConfirmMeeting}
                  disabled={!selectedDate || !selectedTime}
                >
                  Enviar Solicitud
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
