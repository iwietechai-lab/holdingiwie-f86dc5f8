import { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Check, X, Video, Users, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMeetingRequests, MeetingRequest, MeetingRequestStatus } from '@/hooks/useMeetingRequests';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<MeetingRequestStatus, string> = {
  pendiente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  aprobada: 'bg-green-500/20 text-green-400 border-green-500',
  rechazada: 'bg-red-500/20 text-red-400 border-red-500',
  completada: 'bg-gray-500/20 text-gray-400 border-gray-500',
};

const STATUS_LABELS: Record<MeetingRequestStatus, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  completada: 'Completada',
};

const PRIORITY_COLORS = {
  baja: 'bg-gray-500/20 text-gray-400 border-gray-500',
  media: 'bg-blue-500/20 text-blue-400 border-blue-500',
  alta: 'bg-orange-500/20 text-orange-400 border-orange-500',
  urgente: 'bg-red-500/20 text-red-400 border-red-500',
};

const PRIORITY_LABELS = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

interface MeetingRequestsDashboardProps {
  currentUserId: string;
  isSuperadmin: boolean;
}

export function MeetingRequestsDashboard({ currentUserId, isSuperadmin }: MeetingRequestsDashboardProps) {
  const { requests, isLoading, approveRequest, rejectRequest } = useMeetingRequests();
  const { users } = useSuperadmin();
  const navigate = useNavigate();

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Usuario desconocido';
  };

  // Separate requests by status
  const pendingRequests = useMemo(() => 
    requests.filter(r => r.status === 'pendiente'), [requests]);
  
  const myPendingRequests = useMemo(() => 
    pendingRequests.filter(r => 
      r.participants.includes(currentUserId) || r.creator_id === currentUserId
    ), [pendingRequests, currentUserId]);
  
  const approvedRequests = useMemo(() => 
    requests.filter(r => r.status === 'aprobada'), [requests]);

  const handleApprove = async (id: string) => {
    await approveRequest(id);
  };

  const handleReject = async (id: string) => {
    await rejectRequest(id);
  };

  const handleJoinCall = (request: MeetingRequest) => {
    if (request.video_url) {
      navigate(request.video_url);
    }
  };

  const renderRequestCard = (request: MeetingRequest, showActions: boolean = false) => (
    <div
      key={request.id}
      className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h4 className="font-semibold text-foreground truncate">{request.title}</h4>
            <Badge variant="outline" className={STATUS_COLORS[request.status]}>
              {STATUS_LABELS[request.status]}
            </Badge>
            <Badge variant="outline" className={PRIORITY_COLORS[request.priority]}>
              {PRIORITY_LABELS[request.priority]}
            </Badge>
          </div>
          
          {request.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {request.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(request.requested_date), "d 'de' MMMM, yyyy", { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {request.requested_start_time.slice(0, 5)} - {request.requested_end_time.slice(0, 5)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {request.participants.length} participante{request.participants.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            Creado por: {getUserName(request.creator_id)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {showActions && request.status === 'pendiente' && isSuperadmin && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-400 border-green-500 hover:bg-green-500/20"
                onClick={() => handleApprove(request.id)}
              >
                <Check className="w-4 h-4 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-500 hover:bg-red-500/20"
                onClick={() => handleReject(request.id)}
              >
                <X className="w-4 h-4 mr-1" />
                Rechazar
              </Button>
            </>
          )}
          
          {request.status === 'aprobada' && request.video_url && (
            <Button
              size="sm"
              className="bg-gradient-to-r from-green-600 to-emerald-600"
              onClick={() => handleJoinCall(request)}
            >
              <Video className="w-4 h-4 mr-1" />
              Unirse
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests (Superadmin sees all, users see their own) */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Solicitudes Pendientes
            {(isSuperadmin ? pendingRequests.length : myPendingRequests.length) > 0 && (
              <Badge variant="destructive">
                {isSuperadmin ? pendingRequests.length : myPendingRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(isSuperadmin ? pendingRequests : myPendingRequests).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(isSuperadmin ? pendingRequests : myPendingRequests).map(request =>
                renderRequestCard(request, true)
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Meetings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-green-500" />
            Reuniones Aprobadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay reuniones aprobadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedRequests.map(request => renderRequestCard(request, false))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
