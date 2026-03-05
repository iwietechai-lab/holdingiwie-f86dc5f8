import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, 
  PhoneCall, 
  Video, 
  Clock, 
  Play, 
  Pause, 
  CheckCircle,
  Loader2,
  Calendar,
  Users,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useMeetingRequests, MeetingRequest } from '@/hooks/useMeetingRequests';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { StartInstantCallDialog } from '@/components/meetings/StartInstantCallDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface IwieChatCallsProps {
  userId: string;
}

export function IwieChatCalls({ userId }: IwieChatCallsProps) {
  const navigate = useNavigate();
  const { profile } = useSupabaseAuth();
  const { 
    requests, 
    isLoading, 
    fetchRequests,
    pauseRequest, 
    reactivateRequest 
  } = useMeetingRequests();
  
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Real-time subscription for meeting requests
  // Note: meeting_requests can't be filtered by a single user column since
  // both requested_by and requested_to need updates. RLS protects data on fetch.
  useEffect(() => {
    const channel = supabase
      .channel('iwiechat-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const activeRequests = requests.filter(r => r.status === 'aprobada');
  const pausedRequests = requests.filter(r => r.status === 'pausada');
  const completedRequests = requests.filter(r => r.status === 'completada');
  const pendingRequests = requests.filter(r => r.status === 'pendiente');

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobada': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pausada': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'completada': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pendiente': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprobada': return 'Activa';
      case 'pausada': return 'Pausada';
      case 'completada': return 'Finalizada';
      case 'pendiente': return 'Pendiente';
      default: return status;
    }
  };

  const renderCallCard = (request: MeetingRequest) => {
    const isProcessing = processingId === request.id;
    
    return (
      <Card key={request.id} className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-medium truncate text-white">{request.title}</span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(request.requested_date), "d MMM", { locale: es })}</span>
                  <Clock className="w-3 h-3 ml-2" />
                  <span>{request.requested_start_time?.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <span>
                    {Array.isArray(request.participants) 
                      ? `${request.participants.length} participantes`
                      : 'Sin participantes'}
                  </span>
                </div>
              </div>
            </div>
            
            <Badge className={`shrink-0 ${getStatusColor(request.status || '')}`}>
              {getStatusLabel(request.status || '')}
            </Badge>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {request.status === 'aprobada' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleJoin(request)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Unirse
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePause(request.id)}
                  disabled={isProcessing}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </Button>
              </>
            )}
            
            {request.status === 'pausada' && (
              <Button
                size="sm"
                onClick={() => handleReactivate(request.id)}
                disabled={isProcessing}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Reactivar
              </Button>
            )}
            
            {request.status === 'completada' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReactivate(request.id)}
                disabled={isProcessing}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Reabrir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Quick Actions */}
      <div className="px-4 py-3">
        <StartInstantCallDialog
          currentUserId={userId}
          currentUserName={profile?.full_name || 'Usuario'}
        />
      </div>

      {/* Stats */}
      <div className="px-4 pb-3 grid grid-cols-4 gap-2">
        <div className="flex flex-col items-center p-2 rounded-lg bg-white/5">
          <PhoneCall className="w-4 h-4 text-green-400 mb-1" />
          <span className="text-lg font-bold text-white">{activeRequests.length}</span>
          <span className="text-[10px] text-gray-400">Activas</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-white/5">
          <Pause className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-lg font-bold text-white">{pausedRequests.length}</span>
          <span className="text-[10px] text-gray-400">Pausadas</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-white/5">
          <Clock className="w-4 h-4 text-orange-400 mb-1" />
          <span className="text-lg font-bold text-white">{pendingRequests.length}</span>
          <span className="text-[10px] text-gray-400">Pendientes</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-white/5">
          <CheckCircle className="w-4 h-4 text-blue-400 mb-1" />
          <span className="text-lg font-bold text-white">{completedRequests.length}</span>
          <span className="text-[10px] text-gray-400">Finalizadas</span>
        </div>
      </div>

      {/* Call Lists */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-4">
          {/* Active Calls */}
          {activeRequests.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-green-400" />
                Llamadas Activas
              </h3>
              <div className="space-y-2">
                {activeRequests.map(renderCallCard)}
              </div>
            </section>
          )}

          {/* Paused Calls */}
          {pausedRequests.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Pause className="w-4 h-4 text-amber-400" />
                Llamadas Pausadas
              </h3>
              <div className="space-y-2">
                {pausedRequests.map(renderCallCard)}
              </div>
            </section>
          )}

          {/* Pending Calls */}
          {pendingRequests.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                Pendientes de Aprobación
              </h3>
              <div className="space-y-2">
                {pendingRequests.map(renderCallCard)}
              </div>
            </section>
          )}

          {/* Completed Calls */}
          {completedRequests.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                Historial de Llamadas
              </h3>
              <div className="space-y-2">
                {completedRequests.slice(0, 5).map(renderCallCard)}
              </div>
            </section>
          )}

          {/* Empty State */}
          {requests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Video className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm mb-2">No tienes llamadas aún</p>
              <p className="text-xs text-center text-gray-500">
                Usa el botón "Llamada Instantánea" para iniciar
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
