import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Briefcase,
  FileText,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { UserCreationRequest, useUserCreationRequests } from '@/hooks/useUserCreationRequests';
import { APP_ROLE_LABELS, AppRole, DashboardVisibility } from '@/types/superadmin';

interface UserRequestsListProps {
  companyId?: string;
  isCEO?: boolean;
}

const PERMISSION_LABELS: Record<keyof DashboardVisibility, string> = {
  ver_dashboard: 'Dashboard',
  ver_ventas: 'Ventas',
  ver_documentos: 'Documentos',
  ver_chat_interno: 'Chat',
  ver_tareas: 'Tareas',
  ver_tickets: 'Tickets',
  ver_reuniones: 'Reuniones',
  ver_estructura_org: 'Org',
  acceso_chatbot_empresa: 'Bot Empresa',
  acceso_chatbot_ceo: 'Bot CEO',
  gestionar_usuarios: 'Usuarios',
  gestionar_conocimiento: 'Conocimiento',
  ver_reportes: 'Reportes',
  ver_logs: 'Logs',
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pendiente':
      return (
        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </Badge>
      );
    case 'aprobada':
      return (
        <Badge variant="outline" className="text-green-500 border-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Aprobada
        </Badge>
      );
    case 'rechazada':
      return (
        <Badge variant="outline" className="text-red-500 border-red-500">
          <XCircle className="w-3 h-3 mr-1" />
          Rechazada
        </Badge>
      );
    default:
      return null;
  }
};

export function UserRequestsList({ companyId, isCEO = false }: UserRequestsListProps) {
  const { requests, isLoading, reviewRequest } = useUserCreationRequests(companyId);
  const [reviewingRequest, setReviewingRequest] = useState<UserCreationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReview = async (status: 'aprobada' | 'rechazada') => {
    if (!reviewingRequest) return;

    setIsSubmitting(true);
    const result = await reviewRequest(reviewingRequest.id, status, reviewNotes);

    if (result.success) {
      toast.success(
        status === 'aprobada' 
          ? 'Solicitud aprobada' 
          : 'Solicitud rechazada'
      );
      setReviewingRequest(null);
      setReviewNotes('');
    } else {
      toast.error('Error al procesar solicitud');
    }
    setIsSubmitting(false);
  };

  const pendingRequests = requests.filter(r => r.status === 'pendiente');
  const processedRequests = requests.filter(r => r.status !== 'pendiente');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay solicitudes de usuarios
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Solicitudes Pendientes ({pendingRequests.length})
          </h3>
          {pendingRequests.map(request => (
            <Card key={request.id} className="bg-card/50 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{request.full_name}</h4>
                      <StatusBadge status={request.status} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {request.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="w-4 h-4" />
                      {APP_ROLE_LABELS[request.proposed_role as AppRole] || request.proposed_role}
                    </div>
                    {request.justification && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{request.justification}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Solicitado por {request.requester_name} el {format(new Date(request.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>

                    {/* Permissions */}
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="permissions" className="border-none">
                        <AccordionTrigger className="text-xs py-1 hover:no-underline">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Ver permisos solicitados
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-wrap gap-1 pt-2">
                            {Object.entries(request.access_permissions).map(([key, value]) => (
                              value && (
                                <Badge key={key} variant="secondary" className="text-[10px]">
                                  {PERMISSION_LABELS[key as keyof DashboardVisibility]}
                                </Badge>
                              )
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  {isCEO && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-500 hover:bg-red-500/10"
                        onClick={() => setReviewingRequest(request)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setReviewingRequest(request)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Aprobar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="processed">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground">
              Solicitudes Procesadas ({processedRequests.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {processedRequests.map(request => (
                  <Card key={request.id} className="bg-card/30">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{request.full_name}</span>
                            <StatusBadge status={request.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {request.email} • {APP_ROLE_LABELS[request.proposed_role as AppRole] || request.proposed_role}
                          </p>
                          {request.review_notes && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {request.review_notes}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.reviewed_at || request.created_at), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingRequest} onOpenChange={() => setReviewingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar Solicitud de Usuario</DialogTitle>
            <DialogDescription>
              Revisa y aprueba o rechaza la solicitud para agregar a {reviewingRequest?.full_name}
            </DialogDescription>
          </DialogHeader>

          {reviewingRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nombre</p>
                  <p className="font-medium">{reviewingRequest.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{reviewingRequest.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cargo</p>
                  <p className="font-medium">
                    {APP_ROLE_LABELS[reviewingRequest.proposed_role as AppRole] || reviewingRequest.proposed_role}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Solicitado por</p>
                  <p className="font-medium">{reviewingRequest.requester_name}</p>
                </div>
              </div>

              {reviewingRequest.justification && (
                <div>
                  <p className="text-muted-foreground text-sm">Justificación</p>
                  <p className="text-sm bg-muted/30 p-2 rounded">{reviewingRequest.justification}</p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-sm mb-2">Permisos solicitados</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(reviewingRequest.access_permissions).map(([key, value]) => (
                    value && (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {PERMISSION_LABELS[key as keyof DashboardVisibility]}
                      </Badge>
                    )
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm mb-2">Notas de revisión (opcional)</p>
                <Textarea
                  placeholder="Agrega comentarios sobre tu decisión..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewingRequest(null)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="text-red-500 border-red-500 hover:bg-red-500/10"
              onClick={() => handleReview('rechazada')}
              disabled={isSubmitting}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rechazar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleReview('aprobada')}
              disabled={isSubmitting}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
