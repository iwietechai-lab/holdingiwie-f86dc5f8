import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Phone, MonitorUp, MessageSquare, X, Send, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with recording indicator */}
      <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-foreground truncate max-w-[200px] md:max-w-none">
            {meetingTitle || 'Videollamada'}
          </h1>
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full">
              <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
              <span className="text-sm text-red-400">
                REC {formatDuration(recordingDuration)}
              </span>
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full">
              <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
              <span className="text-sm text-yellow-400">Procesando...</span>
            </div>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {participants.size + 1} participante{participants.size !== 0 ? 's' : ''}
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 flex">
        {/* Video grid */}
        <div className={cn("flex-1 p-4 grid gap-4", showChat ? "mr-80" : "")}>
          <div className={cn(
            "grid gap-4 h-full",
            participants.size === 0 ? "grid-cols-1" :
            participants.size === 1 ? "grid-cols-2" :
            participants.size <= 3 ? "grid-cols-2 grid-rows-2" :
            "grid-cols-3 grid-rows-2"
          )}>
            {/* Local video */}
            <div className="relative bg-muted rounded-lg overflow-hidden min-h-[200px]">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-2xl font-bold">{profile?.full_name?.[0] || 'T'}</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                Tú {isScreenSharing && '(Compartiendo pantalla)'}
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                {!isAudioEnabled && <MicOff className="w-4 h-4 text-red-500" />}
                {!isVideoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
              </div>
            </div>

            {/* Remote participants */}
            {Array.from(participants.entries()).map(([oderId, participant]) => (
              <div key={oderId} className="relative bg-muted rounded-lg overflow-hidden min-h-[200px]">
                {participant.stream ? (
                  <VideoPlayer stream={participant.stream} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-2xl font-bold">{participant.odername[0]}</span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                  {participant.odername}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div className="fixed right-0 top-14 bottom-20 w-80 bg-card border-l border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id} className={cn(
                  "p-2 rounded-lg text-sm",
                  msg.userId === user?.id ? "bg-primary/20 ml-4" : "bg-muted mr-4"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-xs">{msg.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(msg.timestamp, 'HH:mm')}
                    </span>
                  </div>
                  <p>{msg.message}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-4 border-t border-border flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              />
              <Button size="icon" onClick={handleSendChat}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="h-20 bg-card border-t border-border flex items-center justify-center gap-4">
        <Button
          variant={isAudioEnabled ? "secondary" : "destructive"}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={toggleAudio}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        
        <Button
          variant={isVideoEnabled ? "secondary" : "destructive"}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        
        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={toggleScreenShare}
        >
          <MonitorUp className="w-5 h-5" />
        </Button>
        
        <Button
          variant={showChat ? "default" : "secondary"}
          size="lg"
          className="rounded-full w-14 h-14"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-14 h-14"
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
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg">
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
