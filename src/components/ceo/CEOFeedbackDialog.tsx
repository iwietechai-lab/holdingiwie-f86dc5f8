import { useState, useRef } from 'react';
import { logger } from '@/utils/logger';
import { Send, Paperclip, X, MessageSquare, Lightbulb, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CEOTeamSubmission } from '@/hooks/useCEOChat';

interface CEOFeedbackDialogProps {
  submission: CEOTeamSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type FeedbackType = 'comment' | 'suggestion' | 'request_changes' | 'approved';

const FEEDBACK_TYPES = [
  { value: 'comment' as const, label: 'Comentario', icon: MessageSquare, color: 'text-blue-400' },
  { value: 'suggestion' as const, label: 'Sugerencia', icon: Lightbulb, color: 'text-amber-400' },
  { value: 'request_changes' as const, label: 'Solicitar Cambios', icon: AlertTriangle, color: 'text-orange-400' },
  { value: 'approved' as const, label: 'Aprobar', icon: CheckCircle2, color: 'text-green-400' },
];

export function CEOFeedbackDialog({ 
  submission, 
  open, 
  onOpenChange,
  onSuccess 
}: CEOFeedbackDialogProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('comment');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!submission || !message.trim()) {
      toast.error('Escribe un mensaje');
      return;
    }

    setIsSending(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Upload attachments if any
      const uploadedAttachments: { name: string; url: string; type: string }[] = [];
      for (const file of attachments) {
        const filePath = `feedback/${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('ceo-files')
          .upload(filePath, file);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('ceo-files')
            .getPublicUrl(filePath);
          
          uploadedAttachments.push({
            name: file.name,
            url: urlData.publicUrl,
            type: file.type,
          });
        }
      }

      // Create feedback entry
      const { error } = await supabase
        .from('ceo_feedback')
        .insert({
          submission_id: submission.id,
          from_user_id: user.id,
          to_user_id: submission.submitted_by,
          feedback_type: feedbackType,
          message: message.trim(),
          attachments: uploadedAttachments,
        });

      if (error) throw error;

      // Update submission status if approved
      if (feedbackType === 'approved') {
        await supabase
          .from('ceo_team_submissions')
          .update({ 
            status: 'revisado', 
            ceo_reviewed_at: new Date().toISOString() 
          })
          .eq('id', submission.id);
      }

      toast.success('Retroalimentación enviada');
      
      // Reset form
      setMessage('');
      setAttachments([]);
      setFeedbackType('comment');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('Error sending feedback:', error);
      toast.error('Error al enviar retroalimentación');
    } finally {
      setIsSending(false);
    }
  };

  const selectedType = FEEDBACK_TYPES.find(t => t.value === feedbackType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Responder a Documento
          </DialogTitle>
          <DialogDescription>
            {submission?.title}
            <span className="block text-xs mt-1">
              Enviado por: {submission?.submitter_name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feedback Type Selector */}
          <div className="space-y-2">
            <Label>Tipo de Retroalimentación</Label>
            <Select value={feedbackType} onValueChange={(v) => setFeedbackType(v as FeedbackType)}>
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className={`w-4 h-4 ${type.color}`} />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                feedbackType === 'approved' 
                  ? 'Excelente trabajo. El documento cumple con los estándares requeridos...'
                  : feedbackType === 'request_changes'
                  ? 'Es necesario realizar los siguientes ajustes...'
                  : feedbackType === 'suggestion'
                  ? 'Te sugiero considerar...'
                  : 'Mi comentario sobre el documento...'
              }
              className="min-h-[150px] bg-input"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Adjuntos (opcional)</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Adjuntar archivo
            </Button>
            
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {file.name}
                    <button
                      onClick={() => removeAttachment(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
