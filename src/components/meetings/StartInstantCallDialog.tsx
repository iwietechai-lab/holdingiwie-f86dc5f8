import { useState, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { Video, Users, Search, User, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StartInstantCallDialogProps {
  currentUserId: string;
  currentUserName: string;
}

export function StartInstantCallDialog({ currentUserId, currentUserName }: StartInstantCallDialogProps) {
  const navigate = useNavigate();
  const { users } = useSuperadmin();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [callTitle, setCallTitle] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Filter out current user and search
  const availableUsers = useMemo(() => {
    return users
      .filter(u => u.id !== currentUserId)
      .filter(u => 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [users, currentUserId, searchTerm]);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleStartCall = async () => {
    if (selectedParticipants.length === 0) {
      toast.error('Selecciona al menos un participante');
      return;
    }

    setIsStarting(true);
    try {
      // Generate unique room ID
      const roomId = crypto.randomUUID();
      const allParticipants = [currentUserId, ...selectedParticipants];
      const title = callTitle.trim() || `Llamada instantánea - ${new Date().toLocaleString('es')}`;

      // Create meeting request as approved immediately
      const { error } = await supabase
        .from('meeting_requests')
        .insert({
          creator_id: currentUserId,
          participants: allParticipants,
          title,
          description: 'Llamada instantánea',
          requested_date: new Date().toISOString().split('T')[0],
          requested_start_time: new Date().toTimeString().slice(0, 8),
          requested_end_time: new Date().toTimeString().slice(0, 8),
          duration_minutes: 60,
          priority: 'media',
          status: 'aprobada',
          room_id: roomId,
          video_url: `/videollamada/${roomId}`,
        });

      if (error) throw error;

      // Notify participants
      for (const participantId of selectedParticipants) {
        const participant = users.find(u => u.id === participantId);
        await supabase.rpc('create_notification', {
          p_user_id: participantId,
          p_title: 'Llamada entrante',
          p_message: `${currentUserName} te está llamando: ${title}`,
          p_type: 'meeting',
          p_priority: 'alta',
          p_action_url: `/videollamada/${roomId}`,
          p_company_id: null,
        });
      }

      toast.success('Iniciando videollamada...');
      setOpen(false);
      navigate(`/videollamada/${roomId}`);
    } catch (error: any) {
      logger.error('Error starting call:', error);
      toast.error(error.message || 'Error al iniciar la llamada');
    } finally {
      setIsStarting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
          <Video className="w-4 h-4 mr-2" />
          Llamada Instantánea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-500" />
            Iniciar Videollamada
          </DialogTitle>
          <DialogDescription>
            Selecciona los participantes para iniciar una llamada instantánea
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Call title */}
          <div className="space-y-2">
            <Label htmlFor="callTitle">Título (opcional)</Label>
            <Input
              id="callTitle"
              placeholder="Ej: Reunión de seguimiento"
              value={callTitle}
              onChange={(e) => setCallTitle(e.target.value)}
            />
          </div>

          {/* Selected participants badges */}
          {selectedParticipants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedParticipants.map(id => {
                const user = users.find(u => u.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={() => toggleParticipant(id)}
                  >
                    {user?.full_name || 'Usuario'}
                    <span className="ml-1">×</span>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User list */}
          <ScrollArea className="flex-1 max-h-[300px] border rounded-lg">
            <div className="p-2 space-y-1">
              {availableUsers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No se encontraron usuarios</p>
                </div>
              ) : (
                availableUsers.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedParticipants.includes(user.id)
                        ? 'bg-primary/20 border border-primary/50'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleParticipant(user.id)}
                  >
                    <Checkbox
                      checked={selectedParticipants.includes(user.id)}
                      onCheckedChange={() => toggleParticipant(user.id)}
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/20">
                        {getInitials(user.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {user.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    {user.role && (
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
              onClick={handleStartCall}
              disabled={selectedParticipants.length === 0 || isStarting}
            >
              {isStarting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Video className="w-4 h-4 mr-2" />
              )}
              Llamar ({selectedParticipants.length + 1})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
