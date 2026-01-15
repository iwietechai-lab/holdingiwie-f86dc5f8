import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, 
  PhoneCall, 
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video, 
  Clock, 
  Play, 
  Pause, 
  Loader2,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMeetingRequests, MeetingRequest } from '@/hooks/useMeetingRequests';
import { StartInstantCallDialog } from '@/components/meetings/StartInstantCallDialog';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface IwieChatCallsListProps {
  userId: string;
  userName: string;
}

export function IwieChatCallsList({ userId, userName }: IwieChatCallsListProps) {
  const navigate = useNavigate();
  const { 
    requests, 
    isLoading, 
    fetchRequests,
    pauseRequest, 
    reactivateRequest 
  } = useMeetingRequests();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCallDialog, setShowCallDialog] = useState(false);

  // Real-time subscription for meeting requests
  useEffect(() => {
    const channel = supabase
      .channel('iwiechat-calls-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const handleJoin = (request: MeetingRequest) => {
    if (request.room_id) {
      navigate(`/videollamada/${request.room_id}`);
    }
  };

  const handlePause = async (requestId: string) => {
    setProcessingId(requestId);
    await pauseRequest(requestId);
    setProcessingId(null);
  };

  const handleReactivate = async (requestId: string) => {
    setProcessingId(requestId);
    await reactivateRequest(requestId);
    setProcessingId(null);
  };

  const formatCallTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ayer';
    }
    return format(date, 'dd/MM/yyyy');
  };

  const getCallIcon = (status: string | null, isCreator: boolean) => {
    switch (status) {
      case 'aprobada':
        return <PhoneCall className="w-4 h-4 text-green-500" />;
      case 'pausada':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'completada':
        return isCreator 
          ? <PhoneOutgoing className="w-4 h-4 text-blue-500" />
          : <PhoneIncoming className="w-4 h-4 text-blue-500" />;
      case 'rechazada':
        return <PhoneMissed className="w-4 h-4 text-red-500" />;
      default:
        return <Phone className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'aprobada': return 'Llamada activa';
      case 'pausada': return 'Llamada pausada';
      case 'completada': return 'Llamada finalizada';
      case 'pendiente': return 'Esperando respuesta';
      case 'rechazada': return 'Llamada rechazada';
      default: return 'Estado desconocido';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b141a]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Sort requests by date, most recent first
  const sortedRequests = [...requests].sort((a, b) => 
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  return (
    <div className="flex-1 flex flex-col bg-[#0b141a]">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-[#1f2c34]">
        <h1 className="text-xl font-bold text-white">Llamadas</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowCallDialog(true)}
          className="text-gray-400 hover:text-white hover:bg-white/10"
        >
          <Phone className="w-5 h-5" />
        </Button>
      </header>

      {/* Call List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-white/5">
          {sortedRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div className="w-16 h-16 rounded-full bg-[#1f2c34] flex items-center justify-center mb-4">
                <Video className="w-8 h-8" />
              </div>
              <p className="text-sm mb-1">No tienes llamadas recientes</p>
              <p className="text-xs text-gray-600">Toca el botón + para iniciar una</p>
            </div>
          ) : (
            sortedRequests.map(request => {
              const isCreator = request.creator_id === userId;
              const isProcessing = processingId === request.id;
              const isActive = request.status === 'aprobada';
              const isPaused = request.status === 'pausada';
              
              return (
                <button
                  key={request.id}
                  onClick={() => isActive ? handleJoin(request) : undefined}
                  disabled={!isActive}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Avatar with call icon */}
                  <Avatar className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600">
                    <AvatarFallback className="bg-transparent text-white">
                      <Video className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Call info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {request.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getCallIcon(request.status, isCreator)}
                      <span className="text-sm text-gray-500">
                        {getStatusText(request.status)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Time and action */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-500">
                      {request.created_at ? formatCallTime(request.created_at) : ''}
                    </span>
                    
                    {isActive && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoin(request);
                        }}
                        className="h-7 px-3 bg-green-600 hover:bg-green-700 text-xs"
                      >
                        Unirse
                      </Button>
                    )}
                    
                    {isPaused && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactivate(request.id);
                        }}
                        disabled={isProcessing}
                        className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-xs"
                      >
                        {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reactivar'}
                      </Button>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowCallDialog(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Start Call Dialog */}
      {showCallDialog && (
        <StartInstantCallDialog
          currentUserId={userId}
          currentUserName={userName}
        />
      )}
    </div>
  );
}
