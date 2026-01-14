import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Building2, Globe, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useChats, ChatType, CreateChatInput } from '@/hooks/useChats';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface CreateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated?: (chatId: string) => void;
}

export function CreateChatDialog({ open, onOpenChange, onChatCreated }: CreateChatDialogProps) {
  const { user, profile, isSuperadmin } = useSupabaseAuth();
  const { createChat } = useChats();
  
  const [chatType, setChatType] = useState<ChatType>('one_to_one');
  const [title, setTitle] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users and companies
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, companiesRes] = await Promise.all([
          supabase.from('user_profiles').select('id, full_name, email, company_id'),
          supabase.from('companies').select('id, name'),
        ]);

        if (usersRes.data) {
          // Filter out current user
          setUsers(usersRes.data.filter(u => u.id !== user?.id));
        }
        if (companiesRes.data) {
          setCompanies(companiesRes.data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, user?.id]);

  // Filter users based on chat type and selected company
  const filteredUsers = users.filter(u => {
    if (chatType === 'one_to_one') return true;
    if (chatType === 'group_company') {
      // For group_company, filter by selected company or user's company
      const companyToFilter = selectedCompanyId || profile?.company_id;
      return u.company_id === companyToFilter;
    }
    // For multi-company and global, show all
    return true;
  });

  const handleUserToggle = (userId: string) => {
    if (chatType === 'one_to_one') {
      // For one-to-one, only allow one selection
      setSelectedUsers(prev => prev.includes(userId) ? [] : [userId]);
    } else {
      setSelectedUsers(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Ingresa un título para el chat');
      return;
    }

    if (chatType !== 'global' && selectedUsers.length === 0) {
      toast.error('Selecciona al menos un participante');
      return;
    }

    if (chatType === 'one_to_one' && selectedUsers.length !== 1) {
      toast.error('Selecciona exactamente un participante para chat uno a uno');
      return;
    }

    if (chatType === 'group_company' && !selectedCompanyId && !profile?.company_id) {
      toast.error('Selecciona una empresa');
      return;
    }

    setIsSubmitting(true);
    try {
      let participantIds = selectedUsers;
      
      // For global chat, add all users
      if (chatType === 'global') {
        participantIds = users.map(u => u.id);
      }

      const input: CreateChatInput = {
        type: chatType,
        title: title.trim(),
        company_id: chatType === 'group_company' ? (selectedCompanyId || profile?.company_id) : null,
        participant_ids: participantIds,
      };

      const chat = await createChat(input);
      if (chat) {
        onOpenChange(false);
        resetForm();
        onChatCreated?.(chat.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setChatType('one_to_one');
    setTitle('');
    setSelectedCompanyId('');
    setSelectedUsers([]);
  };

  const getChatTypeIcon = (type: ChatType) => {
    switch (type) {
      case 'one_to_one': return <MessageSquare className="w-4 h-4" />;
      case 'group_company': return <Building2 className="w-4 h-4" />;
      case 'group_multi_company': return <Users className="w-4 h-4" />;
      case 'global': return <Globe className="w-4 h-4" />;
    }
  };

  const getChatTypeLabel = (type: ChatType) => {
    switch (type) {
      case 'one_to_one': return 'Uno a Uno';
      case 'group_company': return 'Grupal por Empresa';
      case 'group_multi_company': return 'Grupal Multi-Empresa';
      case 'global': return 'Global (Todos)';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Nuevo Chat
          </DialogTitle>
          <DialogDescription>
            Crea una conversación nueva
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Chat Type Selection */}
          <div className="space-y-2">
            <Label>Tipo de Chat</Label>
            <Select value={chatType} onValueChange={(v) => {
              setChatType(v as ChatType);
              setSelectedUsers([]);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_to_one">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Uno a Uno
                  </div>
                </SelectItem>
                <SelectItem value="group_company">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Grupal por Empresa
                  </div>
                </SelectItem>
                <SelectItem value="group_multi_company">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Grupal Multi-Empresa
                  </div>
                </SelectItem>
                {isSuperadmin && (
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Global (Todos)
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder="Nombre del chat..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Company Selection for group_company */}
          {chatType === 'group_company' && isSuperadmin && (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Participants Selection (not for global) */}
          {chatType !== 'global' && (
            <div className="space-y-2">
              <Label>
                Participantes
                {chatType === 'one_to_one' ? ' (selecciona 1)' : ''}
              </Label>
              
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedUsers.map(userId => {
                    const user = users.find(u => u.id === userId);
                    return (
                      <Badge 
                        key={userId} 
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleUserToggle(userId)}
                      >
                        {user?.full_name || user?.email || 'Usuario'}
                        <span className="ml-1">×</span>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <ScrollArea className="h-48 border rounded-md p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay usuarios disponibles
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map(u => {
                      const company = companies.find(c => c.id === u.company_id);
                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleUserToggle(u.id)}
                        >
                          <Checkbox 
                            checked={selectedUsers.includes(u.id)}
                            onCheckedChange={() => handleUserToggle(u.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {u.full_name || 'Sin nombre'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                          {company && (
                            <Badge variant="outline" className="text-xs">
                              {company.name}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {chatType === 'global' && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <Globe className="w-5 h-5 mb-2" />
              El chat global incluirá automáticamente a todos los usuarios del holding.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            className="flex-1"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              getChatTypeIcon(chatType)
            )}
            <span className="ml-2">Crear Chat</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
