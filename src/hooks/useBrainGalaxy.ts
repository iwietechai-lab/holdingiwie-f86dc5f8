import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  BrainGalaxyArea,
  BrainGalaxyLevel,
  BrainGalaxyUserStats,
  BrainGalaxyCourse,
  BrainGalaxyMission,
  BrainGalaxyContent,
  BrainGalaxyChatSession,
  BrainModel,
} from '@/types/brain-galaxy';

export function useBrainGalaxy(userId: string | undefined) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [areas, setAreas] = useState<BrainGalaxyArea[]>([]);
  const [levels, setLevels] = useState<BrainGalaxyLevel[]>([]);
  const [userStats, setUserStats] = useState<BrainGalaxyUserStats | null>(null);
  const [myCourses, setMyCourses] = useState<BrainGalaxyCourse[]>([]);
  const [activeMissions, setActiveMissions] = useState<BrainGalaxyMission[]>([]);
  const [myContent, setMyContent] = useState<BrainGalaxyContent[]>([]);
  const [chatSessions, setChatSessions] = useState<BrainGalaxyChatSession[]>([]);

  // Fetch all base data
  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch areas and levels in parallel
      const [areasRes, levelsRes] = await Promise.all([
        supabase.from('brain_galaxy_areas').select('*').order('order_index'),
        supabase.from('brain_galaxy_levels').select('*').order('level_number'),
      ]);

      if (areasRes.data) setAreas(areasRes.data as BrainGalaxyArea[]);
      if (levelsRes.data) setLevels(levelsRes.data as BrainGalaxyLevel[]);

      // Fetch user-specific data
      const [statsRes, coursesRes, missionsRes, contentRes, chatsRes] = await Promise.all([
        supabase.from('brain_galaxy_user_stats').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('brain_galaxy_courses').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
        supabase.from('brain_galaxy_missions').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(10),
        supabase.from('brain_galaxy_content').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        supabase.from('brain_galaxy_chat_sessions').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
      ]);

      if (statsRes.data) {
        setUserStats(statsRes.data as unknown as BrainGalaxyUserStats);
      } else {
        // Create initial stats for new user
        const { data: newStats } = await supabase
          .from('brain_galaxy_user_stats')
          .insert({ user_id: userId })
          .select()
          .single();
        if (newStats) setUserStats(newStats as BrainGalaxyUserStats);
      }

      if (coursesRes.data) setMyCourses(coursesRes.data as unknown as BrainGalaxyCourse[]);
      if (missionsRes.data) setActiveMissions(missionsRes.data as unknown as BrainGalaxyMission[]);
      if (contentRes.data) setMyContent(contentRes.data as unknown as BrainGalaxyContent[]);
      if (chatsRes.data) setChatSessions(chatsRes.data as unknown as BrainGalaxyChatSession[]);

    } catch (error) {
      console.error('Error fetching Brain Galaxy data:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar los datos de Brain Galaxy',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get current level info
  const getCurrentLevel = useCallback(() => {
    if (!userStats || levels.length === 0) return levels[0];
    return levels.find(l => l.level_number === userStats.current_level) || levels[0];
  }, [userStats, levels]);

  // Get next level info
  const getNextLevel = useCallback(() => {
    const currentLevel = getCurrentLevel();
    if (!currentLevel) return null;
    return levels.find(l => l.level_number === currentLevel.level_number + 1) || null;
  }, [getCurrentLevel, levels]);

  // Calculate progress to next level
  const getLevelProgress = useCallback(() => {
    if (!userStats) return 0;
    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    
    if (!currentLevel || !nextLevel) return 100;
    
    const pointsInLevel = userStats.knowledge_points - currentLevel.min_points;
    const pointsNeeded = nextLevel.min_points - currentLevel.min_points;
    
    return Math.min(100, Math.round((pointsInLevel / pointsNeeded) * 100));
  }, [userStats, getCurrentLevel, getNextLevel]);

  // Add knowledge points
  const addPoints = useCallback(async (points: number, reason: string) => {
    if (!userId || !userStats) return;

    try {
      const newPoints = userStats.knowledge_points + points;
      const { error } = await supabase
        .from('brain_galaxy_user_stats')
        .update({ 
          knowledge_points: newPoints,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      setUserStats(prev => prev ? { ...prev, knowledge_points: newPoints } : null);
      
      toast({
        title: `+${points} puntos`,
        description: reason,
      });
    } catch (error) {
      console.error('Error adding points:', error);
    }
  }, [userId, userStats, toast]);

  // Create a new chat session
  const createChatSession = useCallback(async (brainModel: BrainModel = 'brain-4', areaId?: string) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('brain_galaxy_chat_sessions')
        .insert({
          user_id: userId,
          brain_model: brainModel,
          context_area_id: areaId || null,
          messages: [],
        })
        .select()
        .single();

      if (error) throw error;
      
      const newSession = data as unknown as BrainGalaxyChatSession;
      setChatSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (error) {
      console.error('Error creating chat session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la sesión de chat',
        variant: 'destructive',
      });
      return null;
    }
  }, [userId, toast]);

  // Upload content
  const uploadContent = useCallback(async (
    file: File,
    title: string,
    areaId?: string,
    visibility: 'private' | 'company' | 'holding' = 'private'
  ) => {
    if (!userId) return null;

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `brain-galaxy/${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Determine content type
      let contentType: BrainGalaxyContent['content_type'] = 'document';
      if (file.type.startsWith('video/')) contentType = 'video';
      else if (file.type.startsWith('audio/')) contentType = 'audio';
      else if (file.type.startsWith('image/')) contentType = 'image';

      // Create content record
      const { data, error } = await supabase
        .from('brain_galaxy_content')
        .insert({
          user_id: userId,
          title,
          area_id: areaId || null,
          content_type: contentType,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          visibility,
        })
        .select()
        .single();

      if (error) throw error;

      const newContent = data as BrainGalaxyContent;
      setMyContent(prev => [newContent, ...prev]);

      // Update stats
      await supabase
        .from('brain_galaxy_user_stats')
        .update({ 
          content_uploaded: (userStats?.content_uploaded || 0) + 1,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      await addPoints(10, 'Contenido subido');

      toast({
        title: 'Contenido subido',
        description: 'El archivo se ha subido correctamente',
      });

      return newContent;
    } catch (error) {
      console.error('Error uploading content:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el contenido',
        variant: 'destructive',
      });
      return null;
    }
  }, [userId, userStats, addPoints, toast]);

  return {
    isLoading,
    areas,
    levels,
    userStats,
    myCourses,
    activeMissions,
    myContent,
    chatSessions,
    getCurrentLevel,
    getNextLevel,
    getLevelProgress,
    addPoints,
    createChatSession,
    uploadContent,
    refetch: fetchData,
  };
}
