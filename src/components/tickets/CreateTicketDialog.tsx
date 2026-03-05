import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { PRIORITY_LABELS } from '@/types/organization';
import { Ticket, Users, Building2, User, Tag, Loader2 } from 'lucide-react';
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

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated: () => void;
}

// Ticket categories for Chilean holding company
const TICKET_CATEGORIES = [
  { value: 'comercial', label: 'Comercial', icon: '💼' },
  { value: 'operaciones', label: 'Operaciones', icon: '⚙️' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧' },
  { value: 'reparacion', label: 'Reparación', icon: '🛠️' },
  { value: 'administrativo', label: 'Administrativo', icon: '📋' },
  { value: 'corporativo', label: 'Corporativo', icon: '🏢' },
  { value: 'fondos', label: 'Solicitud de Fondos', icon: '💰' },
  { value: 'finanzas', label: 'Finanzas', icon: '📊' },
  { value: 'contable', label: 'Contabilidad', icon: '📚' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'rrhh', label: 'Recursos Humanos', icon: '👥' },
  { value: 'ti', label: 'Tecnología', icon: '💻' },
  { value: 'logistica', label: 'Logística', icon: '🚚' },
];

type ParticipantScope = 'single' | 'multi_user' | 'multi_company';

export function CreateTicketDialog({ open, onOpenChange, onTicketCreated }: CreateTicketDialogProps) {
  const { user, profile } = useSupabaseAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [category, setCategory] = useState('');
  const [points, setPoints] = useState(0);
  const [participantScope, setParticipantScope] = useState<ParticipantScope>('single');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, companiesRes] = await Promise.all([
          supabase.from('user_profiles').select('id, full_name, email, company_id'),
          supabase.from('companies').select('id, name'),
        ]);
        
        if (usersRes.data) setUsers(usersRes.data);
        if (companiesRes.data) setCompanies(companiesRes.data);
      } catch (err) {
        logger.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Reset form
    setTitle('');
    setDescription('');
    setPriority('media');
    setCategory('');
    setPoints(0);
    setParticipantScope('single');
    setSelectedUsers([]);
    setSelectedCompanies([]);
    setAssignedTo('');
  }, [open, user?.id]);

  const filteredUsers = users.filter(u => {
    if (participantScope === 'single') return true;
    if (participantScope === 'multi_user') {
      return u.company_id === profile?.company_id;
    }
    if (participantScope === 'multi_company') {
      if (selectedCompanies.length === 0) return true;
      return selectedCompanies.includes(u.company_id || '');
    }
    return true;
  });

  const handleUserToggle = (userId: string) => {
    if (participantScope === 'single') {
      setSelectedUsers([userId]);
      setAssignedTo(userId);
    } else {
      setSelectedUsers(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleCompanyToggle = (companyId: string) => {
    setSelectedCompanies(prev => {
      const newSelection = prev.includes(companyId) 
        ? prev.filter(id => id !== companyId) 
        : [...prev, companyId];
      
      // Clear users from removed companies
      if (!newSelection.includes(companyId)) {
        const companyUserIds = users.filter(u => u.company_id === companyId).map(u => u.id);
        setSelectedUsers(current => current.filter(id => !companyUserIds.includes(id)));
      }
      
      return newSelection;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Ingresa un título');
      return;
    }
    if (!category) {
      toast.error('Selecciona una categoría');
      return;
    }
    if (participantScope !== 'single' && selectedUsers.length === 0) {
      toast.error('Selecciona al menos un participante');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tickets').insert({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        points,
        status: 'open',
        participant_scope: participantScope,
        participants: selectedUsers,
        assigned_to: participantScope === 'single' ? assignedTo || null : null,
        company_id: profile?.company_id || '',
        created_by: user?.id || '',
      });

      if (error) throw error;

      toast.success('Ticket creado exitosamente');
      onTicketCreated();
      onOpenChange(false);
    } catch (err) {
      logger.error('Error creating ticket:', err);
      toast.error('Error al crear ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || companyId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Crear Nuevo Ticket
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del ticket"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción detallada del ticket..."
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoría *
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {TICKET_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority and Points */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Puntos</Label>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
            </div>

            {/* Participant Scope Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Tipo de Participación
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={participantScope === 'single' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => {
                    setParticipantScope('single');
                    setSelectedUsers([]);
                    setSelectedCompanies([]);
                  }}
                >
                  <User className="w-5 h-5 mb-1" />
                  <span className="text-xs">Uno a Uno</span>
                </Button>
                <Button
                  type="button"
                  variant={participantScope === 'multi_user' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => {
                    setParticipantScope('multi_user');
                    setSelectedUsers([]);
                    setSelectedCompanies([]);
                  }}
                >
                  <Users className="w-5 h-5 mb-1" />
                  <span className="text-xs">Multi-Usuario</span>
                </Button>
                <Button
                  type="button"
                  variant={participantScope === 'multi_company' ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => {
                    setParticipantScope('multi_company');
                    setSelectedUsers([]);
                    setSelectedCompanies([]);
                  }}
                >
                  <Building2 className="w-5 h-5 mb-1" />
                  <span className="text-xs">Multi-Empresa</span>
                </Button>
              </div>
            </div>

            {/* Company Selection for multi_company */}
            {participantScope === 'multi_company' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Empresas Participantes
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedCompanies.map(companyId => (
                    <Badge
                      key={companyId}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleCompanyToggle(companyId)}
                    >
                      {getCompanyName(companyId)} ×
                    </Badge>
                  ))}
                </div>
                <ScrollArea className="h-32 border rounded-md p-2">
                  {companies.map(company => (
                    <div
                      key={company.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => handleCompanyToggle(company.id)}
                    >
                      <Checkbox checked={selectedCompanies.includes(company.id)} />
                      <span className="text-sm">{company.name}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* User Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {participantScope === 'single' ? 'Asignar a' : 'Participantes'}
              </Label>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedUsers.map(userId => {
                    const usr = users.find(u => u.id === userId);
                    return (
                      <Badge
                        key={userId}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleUserToggle(userId)}
                      >
                        {usr?.full_name || usr?.email || 'Usuario'} ×
                      </Badge>
                    );
                  })}
                </div>
              )}
              <ScrollArea className="h-40 border rounded-md p-2">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay usuarios disponibles
                  </p>
                ) : (
                  filteredUsers.map(usr => {
                    const company = companies.find(c => c.id === usr.company_id);
                    return (
                      <div
                        key={usr.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => handleUserToggle(usr.id)}
                      >
                        <Checkbox checked={selectedUsers.includes(usr.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {usr.full_name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {usr.email}
                          </p>
                        </div>
                        {company && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {company.name}
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Crear Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const TICKET_CATEGORIES_LIST = TICKET_CATEGORIES;
