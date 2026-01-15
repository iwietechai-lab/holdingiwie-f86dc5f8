import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Phone, MonitorUp, MessageSquare, X, Send, Circle, Loader2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useVideoCall } from '@/hooks/useVideoCall';
import { useMeetingRecording } from '@/hooks/useMeetingRecording';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function VideoCallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useSupabaseAuth();
  const { users } = useSuperadmin();
  
  const {
    localStream,
    participants,
    chatMessages,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
  } = useVideoCall();

  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    isProcessing,
  } = useMeetingRecording();

  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && user && roomId) {
      joinRoom(roomId, user.id, profile?.full_name || 'Participante');
      setMeetingStartTime(new Date());
      
      // Fetch meeting title
      supabase
        .from('meeting_requests')
        .select('title')
        .eq('room_id', roomId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.title) {
            setMeetingTitle(data.title);
          }
        });
    }
  }, [authLoading, user, roomId, joinRoom, profile?.full_name]);

  // Auto-start recording when connected
  useEffect(() => {
    if (isConnected && localStream && !isRecording && !isProcessing) {
      startRecording(localStream);
    }
  }, [isConnected, localStream, isRecording, isProcessing, startRecording]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLeave = async () => {
    if (isRecording) {
      toast.info('Procesando grabación...');
      
      const result = await stopRecording();
      
      if (result && (result.transcription || result.summary)) {
        // Get all participant IDs from the room
        const participantIds = [
          user?.id || '',
          ...Array.from(participants.keys()),
        ].filter(Boolean);

        // Save meeting summary
        try {
          const { error: saveError } = await supabase
            .from('meeting_summaries')
            .insert({
              room_id: roomId || '',
              title: meetingTitle || `Reunión ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
              participants: participantIds,
              transcription: result.transcription,
              summary: result.summary,
              duration_seconds: result.durationSeconds,
              started_at: meetingStartTime?.toISOString(),
              ended_at: new Date().toISOString(),
              created_by: user?.id || '',
            });

          if (saveError) {
            console.error('Error saving summary:', saveError);
            toast.error('Error al guardar el resumen');
          } else {
            toast.success('Resumen de reunión guardado');
            
            // Notify participants
            for (const participantId of participantIds) {
              if (participantId !== user?.id) {
                await supabase.rpc('create_notification', {
                  p_user_id: participantId,
                  p_title: 'Resumen de reunión disponible',
                  p_message: `El resumen de "${meetingTitle || 'la reunión'}" está disponible`,
                  p_type: 'meeting',
                  p_priority: 'media',
                  p_action_url: '/reuniones',
                  p_company_id: null,
                });
              }
            }
          }
        } catch (err) {
          console.error('Error saving meeting summary:', err);
        }
      }
    }
    
    leaveRoom();
    navigate('/reuniones');
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  // Get all participants including self
  const allParticipants = [
    { id: user?.id || '', name: profile?.full_name || 'Tú', isSelf: true },
    ...Array.from(participants.entries()).map(([id, p]) => ({
      id,
      name: p.userName,
      isSelf: false,
    })),
  ];

  const participantCount = allParticipants.length;

  // Calculate grid layout based on participant count
  const getGridClass = () => {
    if (participantCount === 1) return 'grid-cols-1';
    if (participantCount === 2) return 'grid-cols-2';
    if (participantCount <= 4) return 'grid-cols-2 grid-rows-2';
    if (participantCount <= 6) return 'grid-cols-3 grid-rows-2';
    if (participantCount <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-3';
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-foreground truncate max-w-[200px] md:max-w-none text-sm">
            {meetingTitle || 'Videollamada'}
          </h1>
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 rounded-full">
              <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
              <span className="text-xs text-red-400">
                REC {formatDuration(recordingDuration)}
              </span>
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/20 rounded-full">
              <Loader2 className="w-2 h-2 text-yellow-400 animate-spin" />
              <span className="text-xs text-yellow-400">Procesando...</span>
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          {participantCount} participante{participantCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Participants sidebar */}
        <div className={cn(
          "bg-card border-r border-border flex flex-col transition-all duration-300 shrink-0",
          showParticipants ? "w-56" : "w-0"
        )}>
          {showParticipants && (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participantes
                </h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setShowParticipants(false)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {allParticipants.map((participant) => (
                    <div 
                      key={participant.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg text-sm",
                        participant.isSelf ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/20">
                          {participant.name[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {participant.name}
                          {participant.isSelf && <span className="text-muted-foreground"> (Tú)</span>}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        {participant.isSelf ? (
                          <>
                            {!isAudioEnabled && <MicOff className="w-3 h-3 text-red-500" />}
                            {!isVideoEnabled && <VideoOff className="w-3 h-3 text-red-500" />}
                          </>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Toggle sidebar button when hidden */}
        {!showParticipants && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-12 w-6 rounded-none rounded-r-lg bg-card border border-l-0 border-border"
            onClick={() => setShowParticipants(true)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {/* Video grid */}
        <div className="flex-1 p-3 overflow-hidden">
          <div className={cn(
            "grid gap-2 h-full w-full",
            getGridClass()
          )}>
            {/* Local video */}
            <div className="relative bg-muted rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-2xl bg-primary/20">
                      {profile?.full_name?.[0] || 'T'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
                Tú {isScreenSharing && '(Pantalla)'}
              </div>
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                {!isAudioEnabled && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                {!isVideoEnabled && <VideoOff className="w-3.5 h-3.5 text-red-500" />}
              </div>
            </div>

            {/* Remote participants */}
            {Array.from(participants.entries()).map(([oderId, participant]) => (
              <div key={oderId} className="relative bg-muted rounded-lg overflow-hidden">
                {participant.stream ? (
                  <VideoPlayer stream={participant.stream} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-2xl bg-primary/20">
                        {participant.userName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
                  {participant.userName}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="w-72 bg-card border-l border-border flex flex-col shrink-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={cn(
                    "p-2 rounded-lg text-sm",
                    msg.oderId === user?.id ? "bg-primary/20 ml-4" : "bg-muted mr-4"
                  )}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-xs">{msg.userName}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(msg.timestamp, 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mensaje..."
                className="text-sm h-9"
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              />
              <Button size="icon" className="h-9 w-9" onClick={handleSendChat}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="h-16 bg-card border-t border-border flex items-center justify-center gap-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-full w-12 h-12",
            showParticipants ? "bg-primary/20" : ""
          )}
          onClick={() => setShowParticipants(!showParticipants)}
        >
          <Users className="w-5 h-5" />
        </Button>

        <Button
          variant={isAudioEnabled ? "secondary" : "destructive"}
          size="sm"
          className="rounded-full w-12 h-12"
          onClick={toggleAudio}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        
        <Button
          variant={isVideoEnabled ? "secondary" : "destructive"}
          size="sm"
          className="rounded-full w-12 h-12"
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        
        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="sm"
          className="rounded-full w-12 h-12"
          onClick={toggleScreenShare}
        >
          <MonitorUp className="w-5 h-5" />
        </Button>
        
        <Button
          variant={showChat ? "default" : "secondary"}
          size="sm"
          className="rounded-full w-12 h-12"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          className="rounded-full w-12 h-12"
          onClick={handleLeave}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Phone className="w-5 h-5 rotate-[135deg]" />
          )}
        </Button>
      </div>
      
      {error && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
}
