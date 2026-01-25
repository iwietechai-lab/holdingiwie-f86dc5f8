import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Crown, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { BrainGalaxyUserStats, BrainGalaxyLevel } from '@/types/brain-galaxy';

interface RankingUser extends BrainGalaxyUserStats {
  user_name?: string;
  user_email?: string;
}

interface BrainGalaxyRankingProps {
  levels: BrainGalaxyLevel[];
  currentUserId?: string;
}

export function BrainGalaxyRanking({ levels, currentUserId }: BrainGalaxyRankingProps) {
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const { data, error } = await supabase
        .from('brain_galaxy_user_stats')
        .select('*')
        .order('knowledge_points', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Just use the stats data with default names
      const enrichedData = (data || []).map(stat => {
        return {
          ...stat,
          user_name: 'Usuario',
          user_email: undefined,
        } as RankingUser;
      });

      setRankings(enrichedData);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelInfo = (levelNumber: number) => {
    return levels.find(l => l.level_number === levelNumber);
  };

  const getRankIcon = (position: number) => {
    if (position === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (position === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{position + 1}</span>;
  };

  const getRankBg = (position: number) => {
    if (position === 0) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
    if (position === 1) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
    if (position === 2) return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30';
    return 'bg-muted/50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Ranking Global de Conocimiento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="points">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="points">Por Puntos</TabsTrigger>
            <TabsTrigger value="courses">Por Cursos</TabsTrigger>
            <TabsTrigger value="missions">Por Misiones</TabsTrigger>
          </TabsList>

          <TabsContent value="points">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {rankings.map((user, index) => {
                  const level = getLevelInfo(user.current_level);
                  const isCurrentUser = user.user_id === currentUserId;

                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${getRankBg(index)} ${
                        isCurrentUser ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="w-8 flex justify-center">
                        {getRankIcon(index)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: level?.color }}>
                          {level?.icon || '🌱'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {user.user_name}
                            {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(tú)</span>}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {level?.name_es || 'Aprendiz'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{user.courses_completed} cursos</span>
                          <span>{user.missions_completed} misiones</span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {user.learning_streak} días
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {user.knowledge_points.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">puntos</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="courses">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {[...rankings]
                  .sort((a, b) => b.courses_completed - a.courses_completed)
                  .map((user, index) => {
                    const level = getLevelInfo(user.current_level);
                    const isCurrentUser = user.user_id === currentUserId;

                    return (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${getRankBg(index)} ${
                          isCurrentUser ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <div className="w-8 flex justify-center">
                          {getRankIcon(index)}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{level?.icon || '🌱'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.knowledge_points.toLocaleString()} pts
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{user.courses_completed}</p>
                          <p className="text-xs text-muted-foreground">cursos</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="missions">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {[...rankings]
                  .sort((a, b) => b.missions_completed - a.missions_completed)
                  .map((user, index) => {
                    const level = getLevelInfo(user.current_level);
                    const isCurrentUser = user.user_id === currentUserId;

                    return (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${getRankBg(index)} ${
                          isCurrentUser ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <div className="w-8 flex justify-center">
                          {getRankIcon(index)}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{level?.icon || '🌱'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.knowledge_points.toLocaleString()} pts
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{user.missions_completed}</p>
                          <p className="text-xs text-muted-foreground">misiones</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
