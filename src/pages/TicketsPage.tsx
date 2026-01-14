import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Plus,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  Circle,
  Search,
  Filter,
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useTickets } from '@/hooks/useTickets';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRIORITY_COLORS, PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/types/organization';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_ICONS = {
  open: Circle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: CheckCircle2,
};

export default function TicketsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user, profile } = useSupabaseAuth();
  const { tickets, isLoading, createTicket, updateTicket, assignTicket, fetchTickets } = useTickets();
  const { users, isSuperadmin } = useSuperadmin();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'media' as const,
    points: 0,
    assigned_to: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleCreateTicket = async () => {
    if (!newTicket.title) {
      toast.error('Por favor ingresa un título');
      return;
    }

    const result = await createTicket({
      title: newTicket.title,
      description: newTicket.description,
      priority: newTicket.priority,
      status: 'open',
      points: newTicket.points,
      assigned_to: newTicket.assigned_to || undefined,
      tags: [],
      company_id: profile?.company_id || '',
      created_by: user?.id || '',
    });

    if (result.success) {
      toast.success('Ticket creado exitosamente');
      setShowCreateDialog(false);
      setNewTicket({
        title: '',
        description: '',
        priority: 'media',
        points: 0,
        assigned_to: '',
      });
    } else {
      toast.error(result.error || 'Error al crear ticket');
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    const result = await updateTicket(ticketId, { status: status as any });
    if (result.success) {
      toast.success('Estado actualizado');
    } else {
      toast.error(result.error || 'Error al actualizar estado');
    }
  };

  const handleAssign = async (ticketId: string, userId: string) => {
    const result = await assignTicket(ticketId, userId);
    if (result.success) {
      toast.success('Ticket asignado');
    } else {
      toast.error(result.error || 'Error al asignar ticket');
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ticketsByStatus = {
    open: filteredTickets.filter(t => t.status === 'open'),
    in_progress: filteredTickets.filter(t => t.status === 'in_progress'),
    resolved: filteredTickets.filter(t => t.status === 'resolved'),
    closed: filteredTickets.filter(t => t.status === 'closed'),
  };

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      <Sidebar selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Ticket className="w-8 h-8 text-primary" />
                Tickets
              </h1>
              <p className="text-muted-foreground">
                Gestiona los tickets de trabajo
              </p>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Título *</Label>
                    <Input
                      value={newTicket.title}
                      onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                      placeholder="Título del ticket"
                    />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      placeholder="Descripción detallada"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Prioridad</Label>
                      <Select
                        value={newTicket.priority}
                        onValueChange={(value: any) => setNewTicket({ ...newTicket, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Puntos</Label>
                      <Input
                        type="number"
                        value={newTicket.points}
                        onChange={(e) => setNewTicket({ ...newTicket, points: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  {isSuperadmin && users.length > 0 && (
                    <div>
                      <Label>Asignar a</Label>
                      <Select
                        value={newTicket.assigned_to}
                        onValueChange={(value) => setNewTicket({ ...newTicket, assigned_to: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button onClick={handleCreateTicket} className="w-full">
                    Crear Ticket
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </header>

          {/* Filters */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todas las prioridades</SelectItem>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => {
              const StatusIcon = STATUS_ICONS[status as keyof typeof STATUS_ICONS];
              const count = ticketsByStatus[status as keyof typeof ticketsByStatus].length;
              return (
                <Card key={status} className="bg-card/50 backdrop-blur-sm border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-8 h-8 ${
                        status === 'open' ? 'text-blue-500' :
                        status === 'in_progress' ? 'text-yellow-500' :
                        status === 'resolved' ? 'text-green-500' : 'text-gray-500'
                      }`} />
                      <div>
                        <p className="text-2xl font-bold text-foreground">{count}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tickets List */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Tickets ({filteredTickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay tickets</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => {
                    const StatusIcon = STATUS_ICONS[ticket.status];
                    const assignedUser = users.find(u => u.id === ticket.assigned_to);
                    
                    return (
                      <div
                        key={ticket.id}
                        className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <StatusIcon className="w-4 h-4 text-muted-foreground" />
                              <h3 className="font-semibold text-foreground truncate">
                                {ticket.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={PRIORITY_COLORS[ticket.priority]}
                              >
                                {PRIORITY_LABELS[ticket.priority]}
                              </Badge>
                              {ticket.points > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {ticket.points} pts
                                </Badge>
                              )}
                            </div>
                            {ticket.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {ticket.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(ticket.created_at), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </span>
                              {assignedUser && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {assignedUser.full_name || assignedUser.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={ticket.status}
                              onValueChange={(value) => handleStatusChange(ticket.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
