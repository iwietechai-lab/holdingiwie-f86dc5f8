import { useState } from 'react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, BookOpen, Target, Trophy, MessageSquare, Upload } from 'lucide-react';
import { BrainGalaxyDashboard, BrainGalaxyChat, BrainGalaxyRanking } from '@/components/brain-galaxy';
import { useBrainGalaxy } from '@/hooks/useBrainGalaxy';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Skeleton } from '@/components/ui/skeleton';

export default function BrainGalaxyPage() {
  const { user } = useSupabaseAuth();
  const {
    isLoading,
    areas,
    levels,
    userStats,
    myCourses,
    activeMissions,
    getCurrentLevel,
    getNextLevel,
    getLevelProgress,
  } = useBrainGalaxy(user?.id);

  const [activeTab, setActiveTab] = useState('dashboard');

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
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Brain Galaxy</h1>
              <p className="text-sm text-muted-foreground">
                Tu centro de aprendizaje galáctico
              </p>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden md:inline">Mi Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden md:inline">Chat IA</span>
            </TabsTrigger>
            <TabsTrigger value="missions" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden md:inline">Misiones</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden md:inline">Ranking</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard" className="m-0">
              <BrainGalaxyDashboard
                userStats={userStats}
                currentLevel={getCurrentLevel()}
                nextLevel={getNextLevel()}
                levelProgress={getLevelProgress()}
                myCourses={myCourses}
                activeMissions={activeMissions}
                onCreateCourse={() => setActiveTab('courses')}
                onUploadContent={() => {}}
                onOpenChat={() => setActiveTab('chat')}
                onViewMissions={() => setActiveTab('missions')}
              />
            </TabsContent>

            <TabsContent value="chat" className="m-0">
              <BrainGalaxyChat areas={areas} />
            </TabsContent>

            <TabsContent value="missions" className="m-0">
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Misiones Colaborativas</p>
                <p className="text-sm mt-2">
                  Próximamente podrás participar en misiones de aprendizaje colaborativo
                </p>
              </div>
            </TabsContent>

            <TabsContent value="ranking" className="m-0">
              <BrainGalaxyRanking levels={levels} currentUserId={user?.id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
}
