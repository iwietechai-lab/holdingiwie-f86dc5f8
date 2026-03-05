import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Download, Clock, Users, Calendar, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { toast } from 'sonner';

interface MeetingSummary {
  id: string;
  room_id: string;
  title: string;
  participants: string[];
  transcription: string | null;
  summary: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_by: string;
  created_at: string;
  file_url: string | null;
}

interface MeetingSummariesListProps {
  currentUserId: string;
}

export function MeetingSummariesList({ currentUserId }: MeetingSummariesListProps) {
  const [summaries, setSummaries] = useState<MeetingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<MeetingSummary | null>(null);
  const { users } = useSuperadmin();

  const fetchSummaries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_summaries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedData = (data || []).map(item => ({
        ...item,
        participants: Array.isArray(item.participants) ? item.participants as string[] : [],
      }));
      
      setSummaries(mappedData);
    } catch (error: any) {
      logger.error('Error fetching summaries:', error);
      toast.error('Error al cargar resúmenes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('meeting-summaries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_summaries',
        },
        () => {
          fetchSummaries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Usuario desconocido';
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este resumen?')) return;
    
    try {
      const { error } = await supabase
        .from('meeting_summaries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Resumen eliminado');
      setSummaries(prev => prev.filter(s => s.id !== id));
    } catch (error: any) {
      toast.error('Error al eliminar resumen');
    }
  };

  const downloadAsText = (summary: MeetingSummary) => {
    const content = `
RESUMEN DE REUNIÓN
==================

Título: ${summary.title}
Fecha: ${summary.created_at ? format(new Date(summary.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }) : 'N/A'}
Duración: ${formatDuration(summary.duration_seconds)}
Participantes: ${summary.participants.map(id => getUserName(id)).join(', ')}

---

RESUMEN:
${summary.summary || 'Sin resumen disponible'}

---

TRANSCRIPCIÓN COMPLETA:
${summary.transcription || 'Sin transcripción disponible'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-reunion-${summary.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Archivo descargado');
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Resúmenes de Reuniones
            {summaries.length > 0 && (
              <Badge variant="secondary">{summaries.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay resúmenes de reuniones</p>
              <p className="text-sm mt-1">Los resúmenes se generarán automáticamente al finalizar las videollamadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summaries.map(summary => (
                <div
                  key={summary.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {summary.title}
                      </h4>
                      
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {summary.created_at
                            ? format(new Date(summary.created_at), "d MMM yyyy, HH:mm", { locale: es })
                            : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(summary.duration_seconds)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {summary.participants.length} participante{summary.participants.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {summary.summary && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {summary.summary.slice(0, 150)}...
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSummary(summary)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAsText(summary)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Descargar
                      </Button>
                      {summary.created_by === currentUserId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(summary.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Detail Dialog */}
      <Dialog open={!!selectedSummary} onOpenChange={() => setSelectedSummary(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedSummary?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedSummary?.created_at && format(new Date(selectedSummary.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
              {' • '}
              Duración: {formatDuration(selectedSummary?.duration_seconds || null)}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Participants */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">PARTICIPANTES</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSummary?.participants.map(id => (
                    <Badge key={id} variant="secondary">
                      {getUserName(id)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedSummary?.summary && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">RESUMEN</h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-foreground">
                      {selectedSummary.summary}
                    </div>
                  </div>
                </div>
              )}

              {/* Transcription */}
              {selectedSummary?.transcription && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">TRANSCRIPCIÓN COMPLETA</h4>
                  <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {selectedSummary.transcription}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setSelectedSummary(null)}
            >
              Cerrar
            </Button>
            {selectedSummary && (
              <Button
                className="flex-1"
                onClick={() => downloadAsText(selectedSummary)}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
