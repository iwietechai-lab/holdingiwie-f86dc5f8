import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Settings, CalendarPlus, Video, Clock, CheckCircle, FileText } from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useMeetings } from '@/hooks/useMeetings';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { useMeetingRequests } from '@/hooks/useMeetingRequests';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SuperadminAvailabilityManager } from '@/components/SuperadminAvailabilityManager';
import { MeetingRequestForm } from '@/components/MeetingRequestForm';
import { MeetingRequestsDashboard } from '@/components/MeetingRequestsDashboard';
import { StartInstantCallDialog } from '@/components/meetings/StartInstantCallDialog';
import { MeetingSummariesList } from '@/components/meetings/MeetingSummariesList';

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user, profile } = useSupabaseAuth();
  const { meetings } = useMeetings();
  const { isSuperadmin } = useSuperadmin();
  const { requests } = useMeetingRequests();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcomingMeetings = meetings.filter(m => new Date(m.scheduled_at) >= new Date() && m.status !== 'cancelled');
  const pendingRequests = requests.filter(r => r.status === 'pendiente');

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      <Sidebar selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <header className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Calendar className="w-8 h-8 text-primary" />
                Reuniones
              </h1>
              <p className="text-muted-foreground">Gestiona tu disponibilidad y reuniones</p>
            </div>
            
            <StartInstantCallDialog 
              currentUserId={user?.id || ''} 
              currentUserName={profile?.full_name || 'Usuario'}
            />
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
                    <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
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
                    <p className="text-2xl font-bold text-foreground">{meetings.filter(m => m.status === 'completed').length}</p>
                    <p className="text-xs text-muted-foreground">Completadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Video className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{requests.filter(r => r.status === 'aprobada').length}</p>
                    <p className="text-xs text-muted-foreground">Aprobadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="requests" className="space-y-4">
            <TabsList className="bg-muted/50 flex-wrap h-auto">
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Solicitudes
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs px-1.5">{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="summaries" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resúmenes
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4" />
                Nueva Solicitud
              </TabsTrigger>
              {isSuperadmin && selectedCompany === 'iwie-holding' && (
                <TabsTrigger value="availability" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Mi Disponibilidad (CEO)
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="requests">
              <MeetingRequestsDashboard currentUserId={user?.id || ''} isSuperadmin={isSuperadmin} />
            </TabsContent>

            <TabsContent value="summaries">
              <MeetingSummariesList currentUserId={user?.id || ''} />
            </TabsContent>

            <TabsContent value="schedule">
              <MeetingRequestForm currentUserId={user?.id || ''} />
            </TabsContent>

            {isSuperadmin && selectedCompany === 'iwie-holding' && (
              <TabsContent value="availability">
                <SuperadminAvailabilityManager userId={user?.id || ''} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
