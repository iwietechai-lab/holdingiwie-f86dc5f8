import { useState } from 'react';
import { logger } from '@/utils/logger';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from 'sonner';

interface DeleteTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketTitle: string;
  onDeleted: () => void;
}

export function DeleteTicketDialog({
  open,
  onOpenChange,
  ticketId,
  ticketTitle,
  onDeleted,
}: DeleteTicketDialogProps) {
  const { user } = useSupabaseAuth();
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!reason.trim()) {
      toast.error('Debes proporcionar una razón para eliminar el ticket');
      return;
    }

    setIsDeleting(true);
    try {
      // Soft delete: mark as deleted but keep in database for CEO audit
      const { error } = await supabase
        .from('tickets')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
          deletion_reason: reason.trim(),
          status: 'closed',
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Ticket eliminado correctamente');
      onDeleted();
      onOpenChange(false);
      setReason('');
    } catch (err) {
      logger.error('Error deleting ticket:', err);
      toast.error('Error al eliminar ticket');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Eliminar Ticket
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              ¿Estás seguro de eliminar el ticket{' '}
              <strong className="text-foreground">"{ticketTitle}"</strong>?
            </p>
            <p className="text-xs text-muted-foreground">
              El ticket será ocultado de la vista pero el CEO podrá acceder al historial
              completo.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label className="text-destructive">Razón de eliminación *</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica por qué se está eliminando este ticket..."
            rows={3}
            className="border-destructive/50 focus:border-destructive"
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason('');
            }}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || !reason.trim()}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Eliminar Ticket
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
