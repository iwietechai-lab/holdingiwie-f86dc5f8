import { useState, useCallback } from 'react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, BookOpen, Trophy, MessageSquare, Plus, History, PanelLeftClose, PanelLeft, Sparkles, Wand2, Target } from 'lucide-react';
import { BrainGalaxyDashboard, BrainGalaxyChat, BrainGalaxyRanking, UploadContentDialog } from '@/components/brain-galaxy';
import { CreateAreaDialog } from '@/components/brain-galaxy/CreateAreaDialog';
import { ChatSessionsList } from '@/components/brain-galaxy/ChatSessionsList';
import { CourseBuilder } from '@/components/brain-galaxy/CourseBuilder';
import { StudioPrompt } from '@/components/brain-galaxy/StudioPrompt';
import { useBrainGalaxy } from '@/hooks/useBrainGalaxy';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Skeleton } from '@/components/ui/skeleton';
import type { BrainGalaxyChatSession, ChatMessage, BrainModel, BrainGalaxyCourse } from '@/types/brain-galaxy';
import { toast } from 'sonner';

export default function BrainGalaxyPage() {
  const { user } = useSupabaseAuth();
  const {
    isLoading,
    areas,
    levels,
    userStats,
    myCourses,
    myContent,
    activeMissions,
    chatSessions,
    getCurrentLevel,
    getNextLevel,
    getLevelProgress,
    createArea,
    createCourse,
    createChatSession,
    saveChatSession,
    loadChatSession,
    deleteChatSession,
    uploadContent,
  } = useBrainGalaxy(user?.id);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateArea, setShowCreateArea] = useState(false);
  
  const [showUploadContent, setShowUploadContent] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [currentSession, setCurrentSession] = useState<BrainGalaxyChatSession | null>(null);
  const [chatKey, setChatKey] = useState(0); // Force re-render chat component
  const [editingCourse, setEditingCourse] = useState<BrainGalaxyCourse | null>(null);

  // Handle clicking on a course to edit it
  const handleViewCourse = useCallback((course: BrainGalaxyCourse) => {
    setEditingCourse(course);
    setActiveTab('studio');
    toast.info(`Abriendo "${course.title}" para edición`);
  }, []);

  // Handle selecting a session from history
  const handleSelectSession = useCallback(async (session: BrainGalaxyChatSession) => {
    const fullSession = await loadChatSession(session.id);
    if (fullSession) {
      setCurrentSession(fullSession);
      setChatKey(prev => prev + 1); // Force chat component to reload
    }
  }, [loadChatSession]);

  // Handle creating a new chat
  const handleNewChat = useCallback(async () => {
    const newSession = await createChatSession();
    if (newSession) {
      setCurrentSession(newSession);
      setChatKey(prev => prev + 1);
    }
  }, [createChatSession]);

  // Handle saving chat session
  const handleSaveSession = useCallback(async (
    messages: ChatMessage[], 
    model?: BrainModel, 
    areaId?: string
  ) => {
    if (!currentSession) {
      // Create new session if none exists
      const newSession = await createChatSession(model, areaId);
      if (newSession) {
        setCurrentSession(newSession);
        // Generate title from first user message
        const firstUserMsg = messages.find(m => m.role === 'user');
        const title = firstUserMsg 
          ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
          : 'Nueva conversación';
        await saveChatSession(newSession.id, messages, title, model, areaId);
      }
    } else {
      // Update existing session
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = currentSession.title === 'Nueva conversación' && firstUserMsg
        ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
        : undefined;
      await saveChatSession(currentSession.id, messages, title, model, areaId);
    }
  }, [currentSession, createChatSession, saveChatSession]);

  // Handle deleting a session
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    const success = await deleteChatSession(sessionId);
    if (success && currentSession?.id === sessionId) {
      setCurrentSession(null);
      setChatKey(prev => prev + 1);
    }
    return success;
  }, [deleteChatSession, currentSession]);

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="h-full flex flex-col p-4 md:p-6 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Brain Galaxy</h1>
              <p className="text-sm text-muted-foreground">
                Tu centro de aprendizaje galáctico
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowCreateArea(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Área
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 md:w-auto md:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden md:inline">Mi Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="studio" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden md:inline">Studio Brain</span>
            </TabsTrigger>
            <TabsTrigger value="studio-prompt" className="gap-2">
              <Wand2 className="h-4 w-4" />
              <span className="hidden md:inline">Studio Prompt</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden md:inline">Chat IA</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden md:inline">Ranking</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 flex flex-col">
            <TabsContent value="dashboard" className="m-0">
              <BrainGalaxyDashboard
                userStats={userStats}
                currentLevel={getCurrentLevel()}
                nextLevel={getNextLevel()}
                levelProgress={getLevelProgress()}
                myCourses={myCourses}
                activeMissions={activeMissions}
                onCreateCourse={() => setActiveTab('studio')}
                onUploadContent={() => setShowUploadContent(true)}
                onOpenChat={() => setActiveTab('chat')}
                onViewMissions={() => setActiveTab('missions')}
                onViewCourse={handleViewCourse}
              />
            </TabsContent>

            <TabsContent value="studio" className="m-0 flex-1 [&>div]:h-full">
              <CourseBuilder
                areas={areas}
                existingContent={myContent}
                onBack={() => {
                  setEditingCourse(null);
                  setActiveTab('dashboard');
                }}
                onSaveCourse={createCourse}
                editingCourse={editingCourse}
              />
            </TabsContent>

            <TabsContent value="studio-prompt" className="m-0 flex-1 [&>div]:h-full">
              <StudioPrompt />
            </TabsContent>

            <TabsContent value="chat" className="m-0">
              <div className="flex gap-4 h-[calc(100vh-16rem)]">
                {/* Chat History Sidebar */}
                {showChatHistory && (
                  <div className="w-72 border rounded-lg bg-card shrink-0 hidden md:flex flex-col">
                    <div className="flex items-center justify-between p-3 border-b">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <History className="h-4 w-4" />
                        Historial
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowChatHistory(false)}
                      >
                        <PanelLeftClose className="h-4 w-4" />
                      </Button>
                    </div>
                    <ChatSessionsList
                      sessions={chatSessions}
                      currentSessionId={currentSession?.id}
                      onSelectSession={handleSelectSession}
                      onNewChat={handleNewChat}
                      onDeleteSession={handleDeleteSession}
                    />
                  </div>
                )}
                
                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  {!showChatHistory && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start mb-2 gap-2"
                      onClick={() => setShowChatHistory(true)}
                    >
                      <PanelLeft className="h-4 w-4" />
                      Mostrar historial
                    </Button>
                  )}
                  <BrainGalaxyChat 
                    key={chatKey}
                    sessionId={currentSession?.id}
                    initialModel={currentSession?.brain_model || 'brain-4'}
                    initialMessages={currentSession?.messages}
                    initialAreaId={currentSession?.context_area_id || undefined}
                    areas={areas} 
                    onSaveSession={handleSaveSession}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ranking" className="m-0">
              <BrainGalaxyRanking levels={levels} currentUserId={user?.id} />
            </TabsContent>

            <TabsContent value="missions" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Todas las Misiones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeMissions.length > 0 ? (
                    <div className="space-y-3">
                      {activeMissions.map(mission => (
                        <div key={mission.id} className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{mission.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {mission.description || 'Sin descripción'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {mission.status}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {mission.visibility}
                                </Badge>
                              </div>
                            </div>
                            <Badge className="bg-yellow-500/20 text-yellow-600 shrink-0">
                              +{mission.reward_points || 0} pts
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay misiones activas en este momento</p>
                      <p className="text-sm mt-1">Las misiones aparecerán aquí cuando estén disponibles</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Create Area Dialog */}
      <CreateAreaDialog
        open={showCreateArea}
        onOpenChange={setShowCreateArea}
        onCreateArea={createArea}
      />

      {/* Upload Content Dialog */}
      <UploadContentDialog
        open={showUploadContent}
        onOpenChange={setShowUploadContent}
        areas={areas}
        onUpload={uploadContent}
      />
    </ResponsiveLayout>
  );
}