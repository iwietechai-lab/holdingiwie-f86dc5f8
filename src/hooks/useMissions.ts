import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Mission, MissionParticipant, MissionType } from '@/types/mision-iwie';

// Helper to safely cast string to typed values
const castMission = (m: any): Mission => ({
  id: m.id,
  title: m.title,
  description: m.description,
  challenge_text: m.challenge_text || '',
  mission_type: (m.mission_type || 'general') as MissionType,
  project_code: m.project_code,
  priority: (m.priority || 'medium') as 'low' | 'medium' | 'high' | 'critical',
  status: (m.status || 'draft') as 'draft' | 'active' | 'paused' | 'completed' | 'cancelled',
  creator_id: m.creator_id,
  ai_enabled: m.ai_enabled ?? true,
  ai_intervention_level: (m.ai_intervention_level || 'proactive') as 'passive' | 'reactive' | 'proactive',
  estimated_budget: m.estimated_budget,
  actual_budget: m.actual_budget,
  target_end_date: m.target_end_date,
  deadline: m.deadline,
  area_id: m.area_id,
  visibility: (m.visibility || 'private') as 'private' | 'team' | 'company' | 'public',
  min_participants: m.min_participants,
  max_participants: m.max_participants,
  reward_points: m.reward_points,
  created_at: m.created_at,
  updated_at: m.updated_at,
  completed_at: m.completed_at,
  participants: (m.participants || []).map((p: any) => ({
    ...p,
    role: (p.role || 'collaborator') as 'owner' | 'collaborator' | 'viewer',
  })),
});

export function useMissions() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Fetch missions where user is creator or participant
      const { data: missionsData, error } = await supabase
        .from('brain_galaxy_missions')
        .select(`
          *,
          participants:brain_galaxy_mission_participants(
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .or(`creator_id.eq.${user.id},brain_galaxy_mission_participants.user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedMissions = (missionsData || []).map(castMission);
      setMissions(transformedMissions);
    } catch (error) {
      console.error('Error fetching missions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las misiones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  // Create a new mission
  const createMission = async (missionData: Partial<Mission>): Promise<Mission | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('brain_galaxy_missions')
        .insert({
          creator_id: user.id,
          title: missionData.title || 'Nueva Misión',
          description: missionData.description,
          challenge_text: missionData.challenge_text || missionData.description || '',
          mission_type: missionData.mission_type || 'general',
          project_code: missionData.project_code,
          priority: missionData.priority || 'medium',
          status: 'active',
          ai_enabled: missionData.ai_enabled ?? true,
          ai_intervention_level: missionData.ai_intervention_level || 'proactive',
          estimated_budget: missionData.estimated_budget,
          target_end_date: missionData.target_end_date,
          deadline: missionData.deadline,
          visibility: missionData.visibility || 'private',
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as participant
      await supabase
        .from('brain_galaxy_mission_participants')
        .insert({
          mission_id: data.id,
          user_id: user.id,
          role: 'creator',
        });

      // Initialize workspace state
      await supabase
        .from('brain_galaxy_mission_workspace_state')
        .insert({
          mission_id: data.id,
          current_context: 'general',
          active_panels: ['notes', 'documentation'],
        });

      const newMission = castMission({ ...data, participants: [] });

      setMissions(prev => [newMission, ...prev]);

      toast({
        title: '🚀 Misión creada',
        description: 'Tu nueva misión está lista para comenzar',
      });

      return newMission;
    } catch (error) {
      console.error('Error creating mission:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la misión',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update a mission
  const updateMission = async (id: string, updates: Partial<Mission>): Promise<Mission | null> => {
    try {
      const { data, error } = await supabase
        .from('brain_galaxy_missions')
        .update({
          title: updates.title,
          description: updates.description,
          challenge_text: updates.challenge_text,
          mission_type: updates.mission_type,
          project_code: updates.project_code,
          priority: updates.priority,
          status: updates.status,
          ai_enabled: updates.ai_enabled,
          ai_intervention_level: updates.ai_intervention_level,
          estimated_budget: updates.estimated_budget,
          actual_budget: updates.actual_budget,
          target_end_date: updates.target_end_date,
          deadline: updates.deadline,
          visibility: updates.visibility,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const newMission = castMission(data);
      setMissions(prev => prev.map(m => m.id === id ? newMission : m));
      return newMission;
    } catch (error) {
      console.error('Error updating mission:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la misión',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete a mission
  const deleteMission = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('brain_galaxy_missions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMissions(prev => prev.filter(m => m.id !== id));

      toast({
        title: 'Misión eliminada',
        description: 'La misión ha sido eliminada correctamente',
      });

      return true;
    } catch (error) {
      console.error('Error deleting mission:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la misión',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Add participant to mission
  const addParticipant = async (missionId: string, userId: string, role: 'collaborator' | 'viewer' = 'collaborator') => {
    try {
      const { data, error } = await supabase
        .from('brain_galaxy_mission_participants')
        .insert({
          mission_id: missionId,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;

      const newParticipant: MissionParticipant = {
        ...data,
        role: (data.role || 'collaborator') as 'owner' | 'collaborator' | 'viewer',
      };

      setMissions(prev => prev.map(m => {
        if (m.id === missionId) {
          return { ...m, participants: [...(m.participants || []), newParticipant] };
        }
        return m;
      }));

      toast({
        title: 'Participante agregado',
        description: 'El usuario ha sido agregado a la misión',
      });

      return data;
    } catch (error) {
      console.error('Error adding participant:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar al participante',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Get missions by type
  const getMissionsByType = (type: MissionType) => {
    return missions.filter(m => m.mission_type === type);
  };

  // Get active missions
  const getActiveMissions = () => {
    return missions.filter(m => m.status === 'active');
  };

  // Get missions where user is owner
  const getOwnedMissions = () => {
    return missions.filter(m => m.creator_id === currentUserId);
  };

  return {
    loading,
    missions,
    currentUserId,
    fetchMissions,
    createMission,
    updateMission,
    deleteMission,
    addParticipant,
    getMissionsByType,
    getActiveMissions,
    getOwnedMissions,
  };
}
