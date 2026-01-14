import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Phone, MonitorUp, MessageSquare, Users, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useVideoCall } from '@/hooks/useVideoCall';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function VideoCallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useSupabaseAuth();
  
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

  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && user && roomId) {
      joinRoom(roomId, user.id, profile?.full_name || 'Participante');
    }
  }, [authLoading, user, roomId, joinRoom, profile?.full_name]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleLeave = () => {
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
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border flex flex-col">
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
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
        </Button>
      </div>
      
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg">
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
