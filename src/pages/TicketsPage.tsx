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
  Trash2,
  Eye,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PRIORITY_COLORS, PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/types/organization';
import { CreateTicketDialog, TICKET_CATEGORIES_LIST } from '@/components/tickets/CreateTicketDialog';
import { DeleteTicketDialog } from '@/components/tickets/DeleteTicketDialog';
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
  const { tickets, isLoading, updateTicket, fetchTickets, softDeleteTicket } = useTickets();
  const { users, isSuperadmin } = useSuperadmin();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<{ id: string; title: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showDeletedTickets, setShowDeletedTickets] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Refetch tickets when showDeletedTickets changes (only for CEO)
  useEffect(() => {
    if (isSuperadmin) {
      fetchTickets(showDeletedTickets);
    }
  }, [showDeletedTickets, isSuperadmin, fetchTickets]);

  const handleStatusChange = async (ticketId: string, status: string) => {
    const result = await updateTicket(ticketId, { status: status as any });
    if (result.success) {
      toast.success('Estado actualizado');
    } else {
      toast.error(result.error || 'Error al actualizar estado');
    }
  };

  const handleDeleteClick = (ticketId: string, ticketTitle: string) => {
    setTicketToDelete({ id: ticketId, title: ticketTitle });
    setShowDeleteDialog(true);
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || (ticket as any).category === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
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

  const getCategoryInfo = (categoryValue: string | null | undefined) => {
    if (!categoryValue) return null;
    return TICKET_CATEGORIES_LIST.find(c => c.value === categoryValue);
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

            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Ticket
            </Button>
          </header>

          {/* Filters */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
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
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-44">
                    <Tag className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {TICKET_CATEGORIES_LIST.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* CEO: Toggle to view deleted tickets */}
                {isSuperadmin && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="show-deleted" className="text-sm text-muted-foreground cursor-pointer">
                      Ver eliminados
                    </Label>
                    <Switch
                      id="show-deleted"
                      checked={showDeletedTickets}
                      onCheckedChange={setShowDeletedTickets}
                    />
                  </div>
                )}
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
                    const categoryInfo = getCategoryInfo((ticket as any).category);
                    const isDeleted = (ticket as any).is_deleted;
                    
                    return (
                      <div
                        key={ticket.id}
                        className={`p-4 bg-muted/30 rounded-lg border transition-colors ${
                          isDeleted 
                            ? 'border-destructive/50 bg-destructive/5 opacity-60' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <StatusIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                              <h3 className="font-semibold text-foreground truncate">
                                {ticket.title}
                              </h3>
                              {categoryInfo && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <span>{categoryInfo.icon}</span>
                                  {categoryInfo.label}
                                </Badge>
                              )}
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
                              {isDeleted && (
                                <Badge variant="destructive" className="text-xs">
                                  Eliminado
                                </Badge>
                              )}
                            </div>
                            {ticket.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {ticket.description}
                              </p>
                            )}
                            {isDeleted && (ticket as any).deletion_reason && (
                              <p className="text-xs text-destructive italic mb-2">
                                Razón: {(ticket as any).deletion_reason}
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
                          {!isDeleted && (
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(ticket.id, ticket.title)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
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

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTicketCreated={() => fetchTickets()}
      />

      {/* Delete Ticket Dialog */}
      {ticketToDelete && (
        <DeleteTicketDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          ticketId={ticketToDelete.id}
          ticketTitle={ticketToDelete.title}
          onDeleted={() => {
            fetchTickets();
            setTicketToDelete(null);
          }}
        />
      )}
    </div>
  );
}
