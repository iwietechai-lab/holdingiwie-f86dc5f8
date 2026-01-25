import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  BookOpen, 
  Target, 
  Upload, 
  MessageSquare, 
  Trophy,
  TrendingUp,
  Flame,
  Star,
} from 'lucide-react';
import type { BrainGalaxyUserStats, BrainGalaxyLevel, BrainGalaxyCourse, BrainGalaxyMission } from '@/types/brain-galaxy';

interface BrainGalaxyDashboardProps {
  userStats: BrainGalaxyUserStats | null;
  currentLevel: BrainGalaxyLevel | undefined;
  nextLevel: BrainGalaxyLevel | null;
  levelProgress: number;
  myCourses: BrainGalaxyCourse[];
  activeMissions: BrainGalaxyMission[];
  onCreateCourse: () => void;
  onUploadContent: () => void;
  onOpenChat: () => void;
  onViewMissions: () => void;
}

export function BrainGalaxyDashboard({
  userStats,
  currentLevel,
  nextLevel,
  levelProgress,
  myCourses,
  activeMissions,
  onCreateCourse,
  onUploadContent,
  onOpenChat,
  onViewMissions,
}: BrainGalaxyDashboardProps) {
  const activeCourses = myCourses.filter(c => c.status !== 'archived').slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Level & Progress Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{currentLevel?.icon || '🌱'}</span>
              <div>
                <CardTitle className="text-xl">{currentLevel?.name_es || 'Aprendiz'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Nivel {currentLevel?.level_number || 1}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {userStats?.knowledge_points.toLocaleString() || 0}
              </p>
              <p className="text-sm text-muted-foreground">puntos de conocimiento</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso al siguiente nivel</span>
              <span>{levelProgress}%</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
            {nextLevel && (
              <p className="text-xs text-muted-foreground text-right">
                {nextLevel.min_points - (userStats?.knowledge_points || 0)} pts para {nextLevel.name_es}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{userStats?.courses_completed || 0}</p>
                <p className="text-xs text-muted-foreground">Cursos completados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{userStats?.content_uploaded || 0}</p>
                <p className="text-xs text-muted-foreground">Contenidos subidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{userStats?.missions_completed || 0}</p>
                <p className="text-xs text-muted-foreground">Misiones completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{userStats?.learning_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Días de racha</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2"
          onClick={onOpenChat}
        >
          <Brain className="h-6 w-6 text-purple-500" />
          <span>Chat con IA</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2"
          onClick={onCreateCourse}
        >
          <BookOpen className="h-6 w-6 text-blue-500" />
          <span>Crear Curso</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2"
          onClick={onUploadContent}
        >
          <Upload className="h-6 w-6 text-green-500" />
          <span>Subir Contenido</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col gap-2"
          onClick={onViewMissions}
        >
          <Target className="h-6 w-6 text-orange-500" />
          <span>Ver Misiones</span>
        </Button>
      </div>

      {/* Active Courses & Missions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* My Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Mis Cursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCourses.length > 0 ? (
              <div className="space-y-3">
                {activeCourses.map(course => (
                  <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {course.difficulty_level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {course.estimated_hours}h estimadas
                        </span>
                      </div>
                    </div>
                    <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                      {course.status === 'draft' ? 'Borrador' : 'Publicado'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tienes cursos aún</p>
                <Button variant="link" size="sm" onClick={onCreateCourse}>
                  Crear tu primer curso
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Missions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Misiones Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeMissions.length > 0 ? (
              <div className="space-y-3">
                {activeMissions.slice(0, 3).map(mission => (
                  <div key={mission.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{mission.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {mission.description}
                        </p>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-600">
                        +{mission.reward_points} pts
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button variant="link" size="sm" onClick={onViewMissions} className="w-full">
                  Ver todas las misiones
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay misiones activas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
