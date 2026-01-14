import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Video,
  CheckCircle,
  XCircle,
  Settings,
  CalendarPlus,
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useMeetings } from '@/hooks/useMeetings';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { MEETING_STATUS_LABELS } from '@/types/organization';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { CeoAvailabilityManager } from '@/components/CeoAvailabilityManager';
import { BookMeetingDialog } from '@/components/BookMeetingDialog';
import { useCeoAvailability } from '@/hooks/useCeoAvailability';

const STATUS_COLORS = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500',
};

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user, profile } = useSupabaseAuth();
  const { meetings, isLoading, createMeeting, updateMeeting, deleteMeeting, fetchMeetings } = useMeetings();
  const { users } = useSuperadmin();
  const { requests } = useCeoAvailability();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    location: '',
    meeting_url: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.scheduled_at) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    const result = await createMeeting({
      ...newMeeting,
      status: 'scheduled',
      attendees: [],
      company_id: profile?.company_id || '',
      created_by: user?.id || '',
    });

    if (result.success) {
      toast.success('Reunión creada exitosamente');
      setShowCreateDialog(false);
      setNewMeeting({
        title: '',
        description: '',
        scheduled_at: '',
        duration_minutes: 60,
        location: '',
        meeting_url: '',
      });
    } else {
      toast.error(result.error || 'Error al crear reunión');
    }
  };

  const handleStatusChange = async (meetingId: string, status: string) => {
    const result = await updateMeeting(meetingId, { status: status as any });
    if (result.success) {
      toast.success('Estado actualizado');
    } else {
      toast.error(result.error || 'Error al actualizar estado');
    }
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta reunión?')) return;
    
    const result = await deleteMeeting(meetingId);
    if (result.success) {
      toast.success('Reunión eliminada');
    } else {
      toast.error(result.error || 'Error al eliminar reunión');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcomingMeetings = meetings.filter(
    m => new Date(m.scheduled_at) >= new Date() && m.status !== 'cancelled'
  );
  const pastMeetings = meetings.filter(
    m => new Date(m.scheduled_at) < new Date() || m.status === 'cancelled'
  );

  // Get users with availability configured (potential hosts)
  const hostsWithAvailability = users.filter(u => 
    u.id !== user?.id && (profile?.role === 'superadmin' || profile?.role === 'admin' || profile?.role === 'manager')
  );

  // Count pending requests for current user
  const myPendingRequests = requests.filter(r => r.host_id === user?.id && r.status === 'pending');

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
                <Calendar className="w-8 h-8 text-primary" />
                Reuniones
              </h1>
              <p className="text-muted-foreground">
                Gestiona tu disponibilidad y reuniones
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-secondary">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Reunión
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Reunión</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título *</Label>
                      <Input
                        value={newMeeting.title}
                        onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                        placeholder="Título de la reunión"
                      />
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <Textarea
                        value={newMeeting.description}
                        onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                        placeholder="Descripción de la reunión"
                      />
                    </div>
                    <div>
                      <Label>Fecha y Hora *</Label>
                      <Input
                        type="datetime-local"
                        value={newMeeting.scheduled_at}
                        onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_at: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duración (min)</Label>
                        <Input
                          type="number"
                          value={newMeeting.duration_minutes}
                          onChange={(e) => setNewMeeting({ ...newMeeting, duration_minutes: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Ubicación</Label>
                        <Input
                          value={newMeeting.location}
                          onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                          placeholder="Sala o ubicación"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>URL de la reunión</Label>
                      <Input
                        value={newMeeting.meeting_url}
                        onChange={(e) => setNewMeeting({ ...newMeeting, meeting_url: e.target.value })}
                        placeholder="https://meet.google.com/..."
                      />
                    </div>
                    <Button onClick={handleCreateMeeting} className="w-full">
                      Crear Reunión
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{upcomingMeetings.length}</p>
                    <p className="text-xs text-muted-foreground">Próximas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{myPendingRequests.length}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {meetings.filter(m => m.status === 'completed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Completadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {meetings.filter(m => m.status === 'cancelled').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Canceladas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="meetings" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="meetings" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Mis Reuniones
              </TabsTrigger>
              <TabsTrigger value="availability" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Mi Disponibilidad
                {myPendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs px-1.5">
                    {myPendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4" />
                Agendar con Otros
              </TabsTrigger>
            </TabsList>

            {/* Meetings Tab */}
            <TabsContent value="meetings" className="space-y-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Próximas Reuniones ({upcomingMeetings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : upcomingMeetings.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay reuniones programadas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingMeetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">{meeting.title}</h3>
                                <Badge
                                  variant="outline"
                                  className={STATUS_COLORS[meeting.status]}
                                >
                                  {MEETING_STATUS_LABELS[meeting.status]}
                                </Badge>
                              </div>
                              {meeting.description && (
                                <p className="text-sm text-muted-foreground mb-3">
                                  {meeting.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(meeting.scheduled_at), "PPP 'a las' p", { locale: es })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {meeting.duration_minutes} min
                                </span>
                                {meeting.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {meeting.location}
                                  </span>
                                )}
                                {meeting.meeting_url && (
                                  <a
                                    href={meeting.meeting_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <Video className="w-4 h-4" />
                                    Unirse
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={meeting.status}
                                onValueChange={(value) => handleStatusChange(meeting.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {Object.entries(MEETING_STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(meeting.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              {user?.id && <CeoAvailabilityManager userId={user.id} />}
            </TabsContent>

            {/* Schedule with Others Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarPlus className="w-5 h-5 text-primary" />
                    Agendar Reunión con Otros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay usuarios disponibles para agendar</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {users.filter(u => u.id !== user?.id).map((targetUser) => (
                        <div
                          key={targetUser.id}
                          className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary font-medium">
                                {targetUser.full_name?.charAt(0) || targetUser.email?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {targetUser.full_name || 'Sin nombre'}
                              </p>
                              <p className="text-xs text-muted-foreground">{targetUser.email}</p>
                            </div>
                          </div>
                          <BookMeetingDialog
                            hostId={targetUser.id}
                            hostName={targetUser.full_name || targetUser.email || 'Usuario'}
                            requesterId={user?.id || ''}
                            trigger={
                              <Button variant="outline" size="sm" className="w-full">
                                <CalendarPlus className="w-4 h-4 mr-2" />
                                Solicitar Reunión
                              </Button>
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
