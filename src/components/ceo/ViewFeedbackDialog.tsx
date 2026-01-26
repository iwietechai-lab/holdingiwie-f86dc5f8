import { useState, useEffect } from 'react';
import { MessageSquare, Lightbulb, AlertTriangle, CheckCircle2, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

import mauricioAvatar from '@/assets/faces/mauricio.jpg';

interface Feedback {
  id: string;
  feedback_type: string;
  message: string;
  attachments: { name: string; url: string; type: string }[];
  is_read: boolean;
  created_at: string;
}

interface ViewFeedbackDialogProps {
  submissionId: string | null;
  submissionTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEEDBACK_ICONS = {
  comment: MessageSquare,
  suggestion: Lightbulb,
  request_changes: AlertTriangle,
  approved: CheckCircle2,
};

const FEEDBACK_COLORS = {
  comment: 'text-blue-400 bg-blue-500/20',
  suggestion: 'text-amber-400 bg-amber-500/20',
  request_changes: 'text-orange-400 bg-orange-500/20',
  approved: 'text-green-400 bg-green-500/20',
};

const FEEDBACK_LABELS = {
  comment: 'Comentario',
  suggestion: 'Sugerencia',
  request_changes: 'Solicitar Cambios',
  approved: 'Aprobado',
};

export function ViewFeedbackDialog({
  submissionId,
  submissionTitle,
  open,
  onOpenChange,
}: ViewFeedbackDialogProps) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && submissionId) {
      loadFeedback();
    }
  }, [open, submissionId]);

  const loadFeedback = async () => {
    if (!submissionId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_feedback')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const feedbackData = (data || []).map(f => ({
        ...f,
        attachments: Array.isArray(f.attachments) ? f.attachments as { name: string; url: string; type: string }[] : [],
      })) as Feedback[];
      
      // Mark as read
      const unreadIds = feedbackData.filter(f => !f.is_read).map(f => f.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('ceo_feedback')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }

      setFeedback(feedbackData);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeedbackIcon = (type: string) => {
    const Icon = FEEDBACK_ICONS[type as keyof typeof FEEDBACK_ICONS] || MessageSquare;
    return Icon;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Comentarios del CEO
          </DialogTitle>
          {submissionTitle && (
            <DialogDescription>
              Documento: {submissionTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : feedback.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-3 opacity-50" />
              <p>No hay comentarios aún</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((fb) => {
                const Icon = getFeedbackIcon(fb.feedback_type);
                const colorClass = FEEDBACK_COLORS[fb.feedback_type as keyof typeof FEEDBACK_COLORS] || FEEDBACK_COLORS.comment;
                const label = FEEDBACK_LABELS[fb.feedback_type as keyof typeof FEEDBACK_LABELS] || 'Comentario';

                return (
                  <div
                    key={fb.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10 border-2 border-primary">
                        <AvatarImage src={mauricioAvatar} alt="CEO" />
                        <AvatarFallback>MO</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">Mauricio Ortiz</span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] ${colorClass}`}
                          >
                            <Icon className="w-3 h-3 mr-1" />
                            {label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="prose prose-sm prose-invert max-w-none">
                      <MarkdownRenderer content={fb.message} />
                    </div>

                    {/* Attachments */}
                    {fb.attachments && fb.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">Adjuntos:</p>
                        <div className="flex flex-wrap gap-2">
                          {fb.attachments.map((att, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-7 text-xs"
                            >
                              <a href={att.url} target="_blank" rel="noopener noreferrer">
                                <FileText className="w-3 h-3 mr-1" />
                                {att.name}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
