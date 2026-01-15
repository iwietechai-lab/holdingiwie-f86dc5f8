import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface IncomingCall {
  id: string;
  title: string;
  callerName: string;
  roomId: string;
  actionUrl: string;
}

interface IncomingCallAlertProps {
  userId: string;
}

export function IncomingCallAlert({ userId }: IncomingCallAlertProps) {
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time notifications for incoming calls
    const channel = supabase
      .channel(`incoming-calls-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as any;
          
          // Check if it's an incoming call notification
          if (
            notification.title === 'Llamada entrante' &&
            notification.action_url?.startsWith('/videollamada/')
          ) {
            // Extract caller name from message
            const callerMatch = notification.message.match(/^(.+?) te está llamando/);
            const callerName = callerMatch ? callerMatch[1] : 'Alguien';
            
            setIncomingCall({
              id: notification.id,
              title: notification.message.split(': ')[1] || 'Videollamada',
              callerName,
              roomId: notification.action_url.replace('/videollamada/', ''),
              actionUrl: notification.action_url,
            });
            setIsVisible(true);

            // Play ringtone sound
            try {
              const audio = new Audio('/sounds/ringtone.mp3');
              audio.loop = true;
              audio.volume = 0.5;
              audio.play().catch(() => {
                // Audio autoplay blocked, ignore
              });
              
              // Store audio to stop later
              (window as any).__incomingCallAudio = audio;
            } catch (e) {
              console.log('Could not play ringtone');
            }

            // Auto-dismiss after 30 seconds
            setTimeout(() => {
              handleDecline();
            }, 30000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopRingtone();
    };
  }, [userId]);

  const stopRingtone = () => {
    const audio = (window as any).__incomingCallAudio;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      delete (window as any).__incomingCallAudio;
    }
  };

  const handleAnswer = async () => {
    stopRingtone();
    
    if (incomingCall) {
      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', incomingCall.id);
      
      setIsVisible(false);
      setIncomingCall(null);
      navigate(incomingCall.actionUrl);
    }
  };

  const handleDecline = async () => {
    stopRingtone();
    
    if (incomingCall) {
      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', incomingCall.id);
    }
    
    setIsVisible(false);
    setIncomingCall(null);
  };

  if (!isVisible || !incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Caller avatar with pulse animation */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/30 rounded-full animate-ping" />
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse" />
            <Avatar className="h-24 w-24 relative ring-4 ring-green-500/50">
              <AvatarFallback className="text-3xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                {incomingCall.callerName[0]?.toUpperCase() || <User className="w-10 h-10" />}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Call info */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {incomingCall.callerName}
          </h2>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Video className="w-4 h-4" />
            Videollamada entrante
          </p>
          <p className="text-xs text-muted-foreground mt-2 truncate px-4">
            {incomingCall.title}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={handleDecline}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              "bg-red-500 hover:bg-red-600 text-white",
              "transition-all duration-200 hover:scale-110 active:scale-95",
              "shadow-lg shadow-red-500/30"
            )}
          >
            <PhoneOff className="w-7 h-7" />
          </button>
          
          <button
            onClick={handleAnswer}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              "bg-green-500 hover:bg-green-600 text-white",
              "transition-all duration-200 hover:scale-110 active:scale-95",
              "shadow-lg shadow-green-500/30 animate-pulse"
            )}
          >
            <Phone className="w-7 h-7" />
          </button>
        </div>

        {/* Labels */}
        <div className="flex items-center justify-center gap-8 mt-3">
          <span className="text-xs text-muted-foreground w-16 text-center">Rechazar</span>
          <span className="text-xs text-muted-foreground w-16 text-center">Aceptar</span>
        </div>
      </div>
    </div>
  );
}
