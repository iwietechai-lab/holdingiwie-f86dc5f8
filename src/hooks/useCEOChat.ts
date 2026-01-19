import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useSuperadmin } from './useSuperadmin';
import { toast } from 'sonner';

export interface CEOProject {
  id: string;
  name: string;
  description: string | null;
  company_id: string | null;
  status: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CEOThought {
  id: string;
  project_id: string | null;
  title: string;
  content: string;
  thought_type: string;
  is_processed: boolean;
  processed_at: string | null;
  ai_summary: string | null;
  ai_key_points: any[] | null;
  tags: string[];
  priority: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CEOInternalMessage {
  id: string;
  project_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  message_type: string;
  metadata: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
}

export interface CEOTeamSubmission {
  id: string;
  project_id: string | null;
  submitted_by: string;
  submission_type: string;
  title: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  status: string;
  ai_analysis: string | null;
  ai_feedback: string | null;
  ai_score: number | null;
  ai_improvement_suggestions: any[] | null;
  ceo_notes: string | null;
  ceo_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  submitter_name?: string;
  submitter_email?: string;
  project_name?: string;
}

export interface CEOPendingReview {
  id: string;
  review_type: string;
  reference_id: string;
  title: string;
  summary: string | null;
  priority: string;
  is_read: boolean;
  is_actioned: boolean;
  created_at: string;
}

export interface CEOInternalReport {
  id: string;
  project_id: string | null;
  title: string;
  summary: string;
  key_decisions: any[] | null;
  action_items: any[] | null;
  conclusions: string | null;
  created_at: string;
  project_name?: string;
}

export function useCEOChat() {
  const { user, profile } = useSupabaseAuth();
  const { isSuperadmin } = useSuperadmin();
  
  const [projects, setProjects] = useState<CEOProject[]>([]);
  const [thoughts, setThoughts] = useState<CEOThought[]>([]);
  const [internalMessages, setInternalMessages] = useState<CEOInternalMessage[]>([]);
  const [teamSubmissions, setTeamSubmissions] = useState<CEOTeamSubmission[]>([]);
  const [pendingReviews, setPendingReviews] = useState<CEOPendingReview[]>([]);
  const [reports, setReports] = useState<CEOInternalReport[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ceo_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []) as CEOProject[]);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);

  // Load thoughts for a project
  const loadThoughts = useCallback(async (projectId?: string | null) => {
    try {
      let query = supabase
        .from('ceo_thoughts')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setThoughts((data || []).map(t => ({
        ...t,
        tags: Array.isArray(t.tags) ? t.tags : [],
        ai_key_points: Array.isArray(t.ai_key_points) ? t.ai_key_points : null
      })) as CEOThought[]);
    } catch (error) {
      console.error('Error loading thoughts:', error);
    }
  }, []);

  // Load internal chat messages
  const loadInternalMessages = useCallback(async (projectId?: string | null) => {
    try {
      let query = supabase
        .from('ceo_internal_chat')
        .select('*')
        .order('created_at', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInternalMessages((data || []) as CEOInternalMessage[]);
    } catch (error) {
      console.error('Error loading internal messages:', error);
    }
  }, []);

  // Load team submissions
  const loadTeamSubmissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ceo_team_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with user names
      const userIds = [...new Set((data || []).map(s => s.submitted_by))];
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const enriched = (data || []).map(submission => {
        const user = users?.find(u => u.id === submission.submitted_by);
        const project = projects.find(p => p.id === submission.project_id);
        return {
          ...submission,
          submitter_name: user?.full_name || 'Usuario',
          submitter_email: user?.email || '',
          project_name: project?.name || 'Sin proyecto',
          ai_improvement_suggestions: Array.isArray(submission.ai_improvement_suggestions) 
            ? submission.ai_improvement_suggestions 
            : null
        };
      });

      setTeamSubmissions(enriched as CEOTeamSubmission[]);
    } catch (error) {
      console.error('Error loading team submissions:', error);
    }
  }, [projects]);

  // Load pending reviews
  const loadPendingReviews = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ceo_pending_reviews')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingReviews((data || []) as CEOPendingReview[]);
    } catch (error) {
      console.error('Error loading pending reviews:', error);
    }
  }, []);

  // Load reports
  const loadReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ceo_internal_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const enriched = (data || []).map(report => {
        const project = projects.find(p => p.id === report.project_id);
        return {
          ...report,
          project_name: project?.name || 'Sin proyecto',
          key_decisions: Array.isArray(report.key_decisions) ? report.key_decisions : null,
          action_items: Array.isArray(report.action_items) ? report.action_items : null
        };
      });
      
      setReports(enriched as CEOInternalReport[]);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }, [projects]);

  // Create project
  const createProject = async (data: { name: string; description?: string; company_id?: string; color?: string }) => {
    try {
      const { data: newProject, error } = await supabase
        .from('ceo_projects')
        .insert({
          name: data.name,
          description: data.description || null,
          company_id: data.company_id || null,
          color: data.color || '#8B5CF6'
        })
        .select()
        .single();

      if (error) throw error;
      await loadProjects();
      toast.success('Proyecto creado');
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Error al crear proyecto');
      return null;
    }
  };

  // Create thought
  const createThought = async (data: {
    title: string;
    content: string;
    thought_type?: string;
    project_id?: string | null;
    priority?: string;
    tags?: string[];
  }) => {
    try {
      const { error } = await supabase
        .from('ceo_thoughts')
        .insert({
          title: data.title,
          content: data.content,
          thought_type: data.thought_type || 'idea',
          project_id: data.project_id || null,
          priority: data.priority || 'media',
          tags: data.tags || []
        });

      if (error) throw error;
      await loadThoughts(selectedProjectId);
      toast.success('Pensamiento guardado');
      return true;
    } catch (error) {
      console.error('Error creating thought:', error);
      toast.error('Error al guardar pensamiento');
      return false;
    }
  };

  // Send internal message to CEO AI
  const sendInternalMessage = async (content: string, projectId?: string | null) => {
    if (!content.trim()) return null;
    
    setIsSending(true);
    try {
      // Save user message
      const { data: userMsg, error: userError } = await supabase
        .from('ceo_internal_chat')
        .insert({
          project_id: projectId || selectedProjectId,
          role: 'user',
          content,
          message_type: 'normal'
        })
        .select()
        .single();

      if (userError) throw userError;

      // Get project context if available
      let projectContext = '';
      if (projectId || selectedProjectId) {
        const project = projects.find(p => p.id === (projectId || selectedProjectId));
        if (project) {
          projectContext = `Proyecto actual: ${project.name}. ${project.description || ''}`;
        }
      }

      // Get relevant thoughts
      const projectThoughts = thoughts
        .filter(t => !projectId || t.project_id === projectId)
        .slice(0, 10)
        .map(t => `[${t.thought_type.toUpperCase()}] ${t.title}: ${t.content}`)
        .join('\n\n');

      // Get recent messages for context
      const recentMessages = internalMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call edge function for AI response
      const { data: response, error: aiError } = await supabase.functions.invoke('ceo-internal-chat', {
        body: {
          message: content,
          project_context: projectContext,
          thoughts_context: projectThoughts,
          history: recentMessages
        }
      });

      if (aiError) throw aiError;

      const aiContent = response?.response || 'Lo siento, no pude procesar tu mensaje.';

      // Save assistant response
      const { error: assistantError } = await supabase
        .from('ceo_internal_chat')
        .insert({
          project_id: projectId || selectedProjectId,
          role: 'assistant',
          content: aiContent,
          message_type: response?.message_type || 'normal',
          metadata: response?.metadata || null
        });

      if (assistantError) throw assistantError;

      await loadInternalMessages(projectId || selectedProjectId);
      return response;
    } catch (error) {
      console.error('Error sending internal message:', error);
      toast.error('Error al enviar mensaje');
      return null;
    } finally {
      setIsSending(false);
    }
  };

  // Generate report from chat session
  const generateReport = async (projectId: string | null, messageIds?: string[]) => {
    try {
      const messagesToReport = messageIds 
        ? internalMessages.filter(m => messageIds.includes(m.id))
        : internalMessages.filter(m => m.project_id === projectId);

      if (messagesToReport.length === 0) {
        toast.error('No hay mensajes para generar el informe');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('ceo-internal-chat', {
        body: {
          action: 'generate_report',
          messages: messagesToReport.map(m => ({ role: m.role, content: m.content })),
          project_name: projects.find(p => p.id === projectId)?.name || 'General'
        }
      });

      if (error) throw error;

      // Save the report
      const { error: saveError } = await supabase
        .from('ceo_internal_reports')
        .insert({
          project_id: projectId,
          title: data.title || `Informe ${new Date().toLocaleDateString('es-CL')}`,
          summary: data.summary || '',
          key_decisions: data.key_decisions || [],
          action_items: data.action_items || [],
          conclusions: data.conclusions || '',
          chat_messages_ids: messagesToReport.map(m => m.id)
        });

      if (saveError) throw saveError;

      await loadReports();
      toast.success('Informe generado exitosamente');
      return data;
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar informe');
      return null;
    }
  };

  // Submit file/content from team for CEO analysis
  const submitForCEOReview = async (data: {
    title: string;
    content?: string;
    file?: File;
    submission_type?: string;
    project_id?: string | null;
  }) => {
    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      if (data.file) {
        const filePath = `${user?.id}/${Date.now()}-${data.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('ceo-team-submissions')
          .upload(filePath, data.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('ceo-team-submissions')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = data.file.name;
        fileType = data.file.type;
      }

      // Insert submission
      const { data: submission, error } = await supabase
        .from('ceo_team_submissions')
        .insert({
          title: data.title,
          content: data.content || null,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          submission_type: data.submission_type || 'documento',
          project_id: data.project_id || null,
          submitted_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger AI analysis
      const { data: analysisResult } = await supabase.functions.invoke('ceo-internal-chat', {
        body: {
          action: 'analyze_submission',
          submission_id: submission.id,
          title: data.title,
          content: data.content || `Archivo: ${fileName}`,
          file_url: fileUrl,
          submitter_name: profile?.full_name || 'Usuario'
        }
      });

      // Update with AI analysis
      if (analysisResult) {
        await supabase
          .from('ceo_team_submissions')
          .update({
            ai_analysis: analysisResult.analysis,
            ai_feedback: analysisResult.feedback,
            ai_score: analysisResult.score,
            ai_improvement_suggestions: analysisResult.suggestions,
            status: 'en_revision'
          })
          .eq('id', submission.id);
      }

      toast.success('Documento enviado para análisis del CEO');
      return submission;
    } catch (error) {
      console.error('Error submitting for review:', error);
      toast.error('Error al enviar documento');
      return null;
    }
  };

  // Mark pending review as read
  const markReviewAsRead = async (reviewId: string) => {
    try {
      await supabase
        .from('ceo_pending_reviews')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', reviewId);
      
      await loadPendingReviews();
    } catch (error) {
      console.error('Error marking review as read:', error);
    }
  };

  // Update submission with CEO notes
  const updateSubmissionNotes = async (submissionId: string, notes: string) => {
    try {
      await supabase
        .from('ceo_team_submissions')
        .update({ 
          ceo_notes: notes,
          ceo_reviewed_at: new Date().toISOString(),
          status: 'revisado'
        })
        .eq('id', submissionId);

      await loadTeamSubmissions();
      toast.success('Notas guardadas');
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Error al guardar notas');
    }
  };

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await loadProjects();
      setIsLoading(false);
    };
    loadAll();
  }, []);

  // Load data when project changes
  useEffect(() => {
    if (projects.length > 0) {
      loadThoughts(selectedProjectId);
      loadInternalMessages(selectedProjectId);
      loadTeamSubmissions();
      loadPendingReviews();
      loadReports();
    }
  }, [selectedProjectId, projects]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isSuperadmin) return;

    const submissionsChannel = supabase
      .channel('ceo-submissions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ceo_team_submissions'
      }, () => {
        loadTeamSubmissions();
        loadPendingReviews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, [isSuperadmin]);

  return {
    // Data
    projects,
    thoughts,
    internalMessages,
    teamSubmissions,
    pendingReviews,
    reports,
    selectedProjectId,
    
    // State
    isLoading,
    isSending,
    isSuperadmin,
    
    // Actions
    setSelectedProjectId,
    createProject,
    createThought,
    sendInternalMessage,
    generateReport,
    submitForCEOReview,
    markReviewAsRead,
    updateSubmissionNotes,
    
    // Refresh functions
    loadProjects,
    loadThoughts,
    loadInternalMessages,
    loadTeamSubmissions,
    loadPendingReviews,
    loadReports
  };
}
