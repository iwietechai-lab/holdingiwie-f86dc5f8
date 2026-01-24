import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useMisionIwie } from '@/hooks/useMisionIwie';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { KanbanBoard } from '@/components/mision-iwie/KanbanBoard';
import { DecisionsSection } from '@/components/mision-iwie/DecisionsSection';
import { MisionDashboard } from '@/components/mision-iwie/MisionDashboard';
import { CommonBoard } from '@/components/mision-iwie/CommonBoard';
import { MisionAIAssistant } from '@/components/mision-iwie/MisionAIAssistant';
import { 
  Rocket, 
  ClipboardList, 
  Target, 
  BarChart3, 
  Users,
  AlertTriangle,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MisionIwiePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [showMorningPopup, setShowMorningPopup] = useState(false);
  
  const {
    loading,
    tasks,
    decisions,
    areas,
    userStats,
    userBadges,
    levels,
    badges,
    todayTaskCount,
    createArea,
    createTask,
    updateTask,
    completeTask,
    moveTaskPriority,
    deleteTask,
    createDecision,
    updateDecision,
    completeDecision,
    linkTaskToDecision,
    toggleBadgeShare,
    setFocusMission,
    getOverloadStatus,
    getCurrentLevel,
    getProgressToNextLevel,
    initializeDefaultAreas,
  } = useMisionIwie();

  const overloadStatus = getOverloadStatus();
  const currentLevel = getCurrentLevel();
  const progressToNextLevel = getProgressToNextLevel();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Initialize default areas for new users
  useEffect(() => {
    if (user && areas.length === 0 && !loading) {
      initializeDefaultAreas(user.id);
    }
  }, [user, areas, loading, initializeDefaultAreas]);

  // Morning popup for overload
  useEffect(() => {
    if (!loading && overloadStatus.isOverloaded) {
      const lastShown = localStorage.getItem('mision_iwie_morning_popup');
      const today = new Date().toISOString().split('T')[0];
      if (lastShown !== today) {
        setShowMorningPopup(true);
        localStorage.setItem('mision_iwie_morning_popup', today);
      }
    }
  }, [loading, overloadStatus.isOverloaded]);

  if (authLoading || loading) {
    return (
      <ResponsiveLayout selectedCompany={null} onSelectCompany={() => {}}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Rocket className="w-12 h-12 mx-auto mb-4 animate-bounce text-primary" />
            <p className="text-muted-foreground">Preparando tu estación espacial...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout selectedCompany={null} onSelectCompany={() => {}}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Misión Iwie</h1>
              <p className="text-muted-foreground text-sm">
                Tu centro de comando personal • {currentLevel?.icon} {currentLevel?.name_es}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2 py-1.5 px-3">
              <span className="text-lg">{currentLevel?.icon}</span>
              <span>{userStats?.total_points || 0} pts</span>
            </Badge>
            {userStats && userStats.current_streak > 0 && (
              <Badge variant="secondary" className="gap-2 py-1.5 px-3">
                🔥 {userStats.current_streak} días
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="tasks" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Tareas</span>
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Decisiones</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="common" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Común</span>
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <TabsContent value="tasks" className="mt-0">
                <KanbanBoard
                  tasks={tasks}
                  areas={areas}
                  onCreateTask={createTask}
                  onUpdateTask={updateTask}
                  onCompleteTask={completeTask}
                  onDeleteTask={deleteTask}
                  onMoveTask={moveTaskPriority}
                  onCreateArea={createArea}
                  onSetFocusMission={setFocusMission}
                  overloadStatus={overloadStatus}
                  todayTaskCount={todayTaskCount}
                />
              </TabsContent>

              <TabsContent value="decisions" className="mt-0">
                <DecisionsSection
                  decisions={decisions}
                  tasks={tasks}
                  onCreateDecision={createDecision}
                  onUpdateDecision={updateDecision}
                  onCompleteDecision={completeDecision}
                  onLinkTask={linkTaskToDecision}
                  onSetFocusMission={setFocusMission}
                />
              </TabsContent>

              <TabsContent value="dashboard" className="mt-0">
                <MisionDashboard
                  tasks={tasks}
                  decisions={decisions}
                  userStats={userStats}
                  userBadges={userBadges}
                  levels={levels}
                  currentLevel={currentLevel}
                  progressToNextLevel={progressToNextLevel}
                  overloadStatus={overloadStatus}
                  onToggleBadgeShare={toggleBadgeShare}
                />
              </TabsContent>

              <TabsContent value="common" className="mt-0">
                <CommonBoard />
              </TabsContent>
            </div>

            {/* AI Assistant Sidebar */}
            <div className="lg:col-span-1">
              <MisionAIAssistant
                tasks={tasks}
                decisions={decisions}
                userStats={userStats}
                overloadStatus={overloadStatus}
              />
            </div>
          </div>
        </Tabs>
      </div>

      {/* Morning Overload Popup */}
      <Dialog open={showMorningPopup} onOpenChange={setShowMorningPopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ Alerta de Sobrecarga
            </DialogTitle>
            <DialogDescription>
              Tienes {overloadStatus.totalPending} tareas pendientes acumuladas.
              Esto puede afectar tu productividad y bienestar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <p className="text-sm">Te sugerimos:</p>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Archivar tareas que ya no son relevantes
              </li>
              <li className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Seleccionar una Misión Focus para hoy
              </li>
              <li className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Revisar y ajustar prioridades
              </li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMorningPopup(false)}>
              Revisar después
            </Button>
            <Button onClick={() => { setShowMorningPopup(false); setActiveTab('tasks'); }}>
              Revisar ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
}
