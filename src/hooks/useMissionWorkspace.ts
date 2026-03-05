import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import type { 
  Mission, 
  MissionChatMessage, 
  MissionWorkspaceState, 
  ContextClassification,
  ConversationContext,
  PanelType,
  MissionCostEstimate,
  MissionTimeEstimate,
  MissionArtifact,
} from '@/types/mision-iwie';

interface Participant {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
}

interface UseMissionWorkspaceProps {
  mission: Mission | null;
}

export function useMissionWorkspace({ mission }: UseMissionWorkspaceProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<MissionChatMessage[]>([]);
  const [workspaceState, setWorkspaceState] = useState<MissionWorkspaceState | null>(null);
  const [currentContext, setCurrentContext] = useState<ContextClassification | null>(null);
  const [isAITyping, setIsAITyping] = useState(false);
  const [costEstimates, setCostEstimates] = useState<MissionCostEstimate[]>([]);
  const [timeEstimates, setTimeEstimates] = useState<MissionTimeEstimate[]>([]);
  const [artifacts, setArtifacts] = useState<MissionArtifact[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch workspace data
  const fetchWorkspaceData = useCallback(async () => {
    if (!mission) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Fetch chat messages
      const { data: chatData } = await supabase
        .from('brain_galaxy_mission_chat')
        .select('*')
        .eq('mission_id', mission.id)
        .order('created_at', { ascending: true });

      // Fetch workspace state
      const { data: stateData } = await supabase
        .from('brain_galaxy_mission_workspace_state')
        .select('*')
        .eq('mission_id', mission.id)
        .maybeSingle();

      // Fetch cost estimates
      const { data: costData } = await supabase
        .from('brain_galaxy_mission_cost_estimates')
        .select('*')
        .eq('mission_id', mission.id)
        .order('created_at', { ascending: false });

      // Fetch time estimates
      const { data: timeData } = await supabase
        .from('brain_galaxy_mission_time_estimates')
        .select('*')
        .eq('mission_id', mission.id)
        .order('created_at', { ascending: false });

      // Fetch artifacts
      const { data: artifactData } = await supabase
        .from('brain_galaxy_mission_artifacts')
        .select('*')
        .eq('mission_id', mission.id)
        .eq('is_latest', true)
        .order('created_at', { ascending: false });

      // Fetch participants
      const { data: participantData } = await supabase
        .from('brain_galaxy_mission_participants')
        .select('id, user_id, role')
        .eq('mission_id', mission.id);

      if (participantData && participantData.length > 0) {
        const userIds = participantData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        const enrichedParticipants = participantData.map(p => {
          const profile = profiles?.find(pr => pr.id === p.user_id);
          return {
            ...p,
            full_name: profile?.full_name || null,
            email: profile?.email || null,
          };
        });
        setParticipants(enrichedParticipants);
      } else {
        setParticipants([]);
      }

      setChatMessages((chatData || []) as MissionChatMessage[]);
      setCostEstimates((costData || []) as MissionCostEstimate[]);
      setTimeEstimates((timeData || []) as MissionTimeEstimate[]);
      setArtifacts((artifactData || []) as MissionArtifact[]);

      if (stateData) {
        setWorkspaceState(stateData as MissionWorkspaceState);
        setCurrentContext({
          detected_context: stateData.current_context as ConversationContext,
          sub_context: stateData.sub_context,
          confidence: 1,
          suggested_panels: stateData.active_panels as PanelType[],
          detected_intents: [],
        });
      }
    } catch (error) {
      logger.error('Error fetching workspace data:', error);
    } finally {
      setLoading(false);
    }
  }, [mission]);

  // Subscribe to realtime chat updates
  useEffect(() => {
    if (!mission) return;

    // Cleanup previous subscription
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`mission-chat-${mission.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'brain_galaxy_mission_chat',
          filter: `mission_id=eq.${mission.id}`,
        },
        (payload) => {
          const newMessage = payload.new as MissionChatMessage;
          setChatMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brain_galaxy_mission_workspace_state',
          filter: `mission_id=eq.${mission.id}`,
        },
        (payload) => {
          if (payload.new) {
            const newState = payload.new as MissionWorkspaceState;
            setWorkspaceState(newState);
            setCurrentContext({
              detected_context: newState.current_context as ConversationContext,
              sub_context: newState.sub_context,
              confidence: 1,
              suggested_panels: newState.active_panels as PanelType[],
              detected_intents: [],
            });
          }
        }
      )
      .subscribe();

    chatChannelRef.current = channel;

    return () => {
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
      }
    };
  }, [mission]);

  // Fetch data when mission changes
  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // Send a message and get AI response
  const sendMessage = async (content: string): Promise<void> => {
    if (!mission || !currentUserId || !content.trim()) return;

    setIsAITyping(true);

    try {
      // Prepare messages for the AI
      const messages = [
        ...chatMessages.map(m => ({
          role: m.is_ai_message ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content },
      ];

      // Call the mission-ai-assistant edge function
      const { data, error } = await supabase.functions.invoke('mission-ai-assistant', {
        body: {
          messages,
          missionId: mission.id,
          missionInfo: {
            title: mission.title,
            description: mission.description,
            mission_type: mission.mission_type,
          },
          userId: currentUserId,
          action: 'chat',
        },
      });

      if (error) throw error;

      // Update context from response
      if (data.context) {
        setCurrentContext(data.context);
      }

      // The messages are saved by the edge function, but we update locally too
      // for immediate feedback (realtime will sync)
      
    } catch (error) {
      logger.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    } finally {
      setIsAITyping(false);
    }
  };

  // Manually insert a user message (optimistic update before AI response)
  const insertLocalMessage = (content: string) => {
    if (!currentUserId || !mission) return;
    
    const tempMessage: MissionChatMessage = {
      id: `temp-${Date.now()}`,
      mission_id: mission.id,
      user_id: currentUserId,
      is_ai_message: false,
      content,
      created_at: new Date().toISOString(),
    };
    
    setChatMessages(prev => [...prev, tempMessage]);
  };

  // Change active panels manually
  const setActivePanels = async (panels: PanelType[]) => {
    if (!mission) return;

    try {
      await supabase
        .from('brain_galaxy_mission_workspace_state')
        .upsert({
          mission_id: mission.id,
          active_panels: panels,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'mission_id' });

      setWorkspaceState(prev => prev ? { ...prev, active_panels: panels } : null);
    } catch (error) {
      logger.error('Error updating panels:', error);
    }
  };

  // Add cost estimate
  const addCostEstimate = async (estimate: Partial<MissionCostEstimate>) => {
    if (!mission) return null;

    try {
      const { data, error } = await supabase
        .from('brain_galaxy_mission_cost_estimates')
        .insert({
          mission_id: mission.id,
          item_name: estimate.item_name,
          description: estimate.description,
          quantity: estimate.quantity || 1,
          unit_price: estimate.unit_price || 0,
          currency: estimate.currency || 'USD',
          category: estimate.category,
          source: estimate.source,
          is_ai_generated: estimate.is_ai_generated || false,
        })
        .select()
        .single();

      if (error) throw error;

      setCostEstimates(prev => [data as MissionCostEstimate, ...prev]);
      return data;
    } catch (error) {
      logger.error('Error adding cost estimate:', error);
      return null;
    }
  };

  // Add time estimate
  const addTimeEstimate = async (estimate: Partial<MissionTimeEstimate>) => {
    if (!mission) return null;

    try {
      const { data, error } = await supabase
        .from('brain_galaxy_mission_time_estimates')
        .insert({
          mission_id: mission.id,
          phase_name: estimate.phase_name,
          description: estimate.description,
          estimated_days: estimate.estimated_days || 1,
          estimated_hours: estimate.estimated_hours,
          is_ai_generated: estimate.is_ai_generated || false,
        })
        .select()
        .single();

      if (error) throw error;

      setTimeEstimates(prev => [data as MissionTimeEstimate, ...prev]);
      return data;
    } catch (error) {
      logger.error('Error adding time estimate:', error);
      return null;
    }
  };

  // Get total budget
  const getTotalBudget = () => {
    return costEstimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
  };

  // Get total estimated days
  const getTotalDays = () => {
    return timeEstimates.reduce((sum, e) => sum + (e.estimated_days || 0), 0);
  };

  // Export completed mission to CEOChat
  const exportToCEOChat = async (): Promise<boolean> => {
    if (!mission || !currentUserId) return false;

    try {
      // Generate mission report
      const missionReport = `
# ${mission.title}
## Código: ${mission.project_code || 'N/A'}

### Descripción
${mission.description || 'Sin descripción'}

### Desafío Abordado
${mission.challenge_text || 'Sin desafío definido'}

### Participantes
${participants.map(p => `- ${p.full_name || p.email || 'Usuario'} (${p.role})`).join('\n')}

### Resumen de Conversación
${chatMessages.slice(-20).map(m => `**${m.is_ai_message ? 'AI' : 'Usuario'}**: ${m.content.substring(0, 300)}${m.content.length > 300 ? '...' : ''}`).join('\n\n')}

### Estimaciones de Costos
${costEstimates.length > 0 
  ? costEstimates.map(c => `- ${c.item_name}: $${c.unit_price} x ${c.quantity || 1} = $${c.total_price || c.unit_price}`).join('\n')
  : 'Sin estimaciones de costos'}

**Total Presupuesto Estimado**: $${getTotalBudget().toLocaleString()}

### Estimaciones de Tiempo
${timeEstimates.length > 0 
  ? timeEstimates.map(t => `- ${t.phase_name}: ${t.estimated_days} días`).join('\n')
  : 'Sin estimaciones de tiempo'}

**Total Días Estimados**: ${getTotalDays()}

### Presupuesto
- Estimado: $${mission.estimated_budget?.toLocaleString() || 'Por definir'}
- Real: $${mission.actual_budget?.toLocaleString() || 'Por definir'}

### Fecha de Entrega
${mission.target_end_date || 'Por definir'}
      `.trim();

      // Create submission in CEOChat
      const { error } = await supabase
        .from('ceo_team_submissions')
        .insert({
          title: `Plan Final: ${mission.title}`,
          content: missionReport,
          submission_type: 'propuesta',
          submitted_by: currentUserId,
          notify_ceo: true,
          source_type: 'mission',
          source_reference_id: mission.id,
        });

      if (error) throw error;

      toast({
        title: 'Plan enviado a CEOChat',
        description: 'El CEO revisará tu plan final',
      });

      return true;
    } catch (error) {
      logger.error('Error exporting to CEOChat:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el plan a CEOChat',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    loading,
    chatMessages,
    workspaceState,
    currentContext,
    isAITyping,
    costEstimates,
    timeEstimates,
    artifacts,
    currentUserId,
    participants,
    sendMessage,
    insertLocalMessage,
    setActivePanels,
    addCostEstimate,
    addTimeEstimate,
    getTotalBudget,
    getTotalDays,
    exportToCEOChat,
    refreshData: fetchWorkspaceData,
  };
}
