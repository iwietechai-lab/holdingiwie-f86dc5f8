import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Clock,
  Brain,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { BrainGalaxyChatSession } from '@/types/brain-galaxy';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatSessionsListProps {
  sessions: BrainGalaxyChatSession[];
  currentSessionId?: string;
  onSelectSession: (session: BrainGalaxyChatSession) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
}

export function ChatSessionsList({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ChatSessionsListProps) {
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteSessionId) return;
    setIsDeleting(true);
    await onDeleteSession(deleteSessionId);
    setIsDeleting(false);
    setDeleteSessionId(null);
  };

  const getSessionPreview = (session: BrainGalaxyChatSession) => {
    if (!session.messages || session.messages.length === 0) {
      return 'Conversación vacía';
    }
    const lastMessage = session.messages[session.messages.length - 1];
    return lastMessage.content.slice(0, 60) + (lastMessage.content.length > 60 ? '...' : '');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button onClick={onNewChat} className="w-full gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Nueva conversación
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay conversaciones guardadas</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted'
                }`}
                onClick={() => onSelectSession(session)}
              >
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {session.title || 'Sin título'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {getSessionPreview(session)}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(session.updated_at), { 
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteSessionId(session.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta conversación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}