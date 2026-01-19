import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useSuperadmin } from './useSuperadmin';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export interface Company {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface CEOAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'link';
  file_type?: string;
  size?: number;
}

export interface CEOProject {
  id: string;
  name: string;
  description: string | null;
  company_id: string | null;
  status: string;
  color: string;
  created_at: string;
  updated_at: string;
  company?: Company | null;
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
  attachments: CEOAttachment[];
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
  attachments: CEOAttachment[];
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
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<CEOProject[]>([]);
  const [thoughts, setThoughts] = useState<CEOThought[]>([]);
  const [internalMessages, setInternalMessages] = useState<CEOInternalMessage[]>([]);
  const [teamSubmissions, setTeamSubmissions] = useState<CEOTeamSubmission[]>([]);
  const [pendingReviews, setPendingReviews] = useState<CEOPendingReview[]>([]);
  const [reports, setReports] = useState<CEOInternalReport[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<CEOTeamSubmission[]>([]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, icon, color')
        .order('name');

      if (error) throw error;
      setCompanies((data || []) as Company[]);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }, []);

  // Load projects with company info
  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ceo_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with company data
      const enriched = (data || []).map(project => {
        const company = companies.find(c => c.id === project.company_id);
        return { ...project, company } as CEOProject;
      });
      
      setProjects(enriched);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, [companies]);

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
        ai_key_points: Array.isArray(t.ai_key_points) ? t.ai_key_points : null,
        attachments: Array.isArray(t.attachments) ? t.attachments as unknown as CEOAttachment[] : []
      })) as unknown as CEOThought[]);
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
      setInternalMessages((data || []).map(m => ({
        ...m,
        attachments: Array.isArray(m.attachments) ? m.attachments as unknown as CEOAttachment[] : []
      })) as unknown as CEOInternalMessage[]);
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

  // Upload file to CEO storage
  const uploadFile = async (file: File, bucket: string = 'ceo-files'): Promise<CEOAttachment | null> => {
    try {
      const filePath = `${user?.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const fileType = file.type.startsWith('image/') ? 'image' 
        : file.type.startsWith('video/') ? 'video' 
        : 'document';

      return {
        id: crypto.randomUUID(),
        name: file.name,
        url: urlData.publicUrl,
        type: fileType,
        file_type: file.type,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir archivo');
      return null;
    }
  };

  // Create thought with attachments
  const createThought = async (data: {
    title: string;
    content: string;
    thought_type?: string;
    project_id?: string | null;
    priority?: string;
    tags?: string[];
    attachments?: CEOAttachment[];
  }) => {
    try {
      const { error } = await supabase
        .from('ceo_thoughts')
        .insert([{
          title: data.title,
          content: data.content,
          thought_type: data.thought_type || 'idea',
          project_id: data.project_id || null,
          priority: data.priority || 'media',
          tags: data.tags || [],
          attachments: (data.attachments || []) as unknown as any
        }]);

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

  // Load user's own submissions history - loads immediately without waiting for projects
  const loadUserSubmissions = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('ceo_team_submissions')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = (data || []).map(submission => {
        return {
          ...submission,
          submitter_name: profile?.full_name || 'Usuario',
          submitter_email: '',
          project_name: 'Sin proyecto', // Will be enriched later if projects are available
          ai_improvement_suggestions: Array.isArray(submission.ai_improvement_suggestions) 
            ? submission.ai_improvement_suggestions 
            : null
        };
      });

      setUserSubmissions(enriched as CEOTeamSubmission[]);
    } catch (error) {
      console.error('Error loading user submissions:', error);
    }
  }, [user?.id, profile]);

  // Parse file content in the browser
  const parseFileContent = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase();
    console.log('📄 Parsing file:', fileName, 'Type:', file.type, 'Size:', file.size);
    
    // Handle Excel files
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        console.log('📊 Reading Excel file...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('📊 ArrayBuffer size:', arrayBuffer.byteLength);
        
        const workbook = XLSX.read(arrayBuffer, { 
          type: 'array',
          cellDates: true,
          cellNF: true,
          cellStyles: true
        });
        
        console.log('📊 Workbook sheets:', workbook.SheetNames);
        let content = `=== ARCHIVO EXCEL: ${file.name} ===\n`;
        content += `Total de hojas: ${workbook.SheetNames.length}\n`;
        
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          
          // Get data with headers
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          // Get raw values too
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          
          content += `\n\n========== HOJA: ${sheetName} ==========\n\n`;
          console.log(`📊 Sheet "${sheetName}" has ${jsonData.length} rows (json), ${rawData.length} rows (raw)`);
          
          // If sheet has data
          if (rawData.length > 0) {
            // Add raw rows first (more reliable for getting all data)
            content += '--- DATOS EN FORMATO TABLA ---\n';
            for (let i = 0; i < rawData.length; i++) {
              const row = rawData[i] as unknown[];
              if (row.some(cell => cell !== '')) {
                content += `Fila ${i + 1}: ${row.map(cell => String(cell ?? '')).join(' | ')}\n`;
              }
            }
            
            // Also add as JSON for structured access
            if (jsonData.length > 0) {
              content += '\n--- DATOS ESTRUCTURADOS (JSON) ---\n';
              for (const row of jsonData) {
                content += JSON.stringify(row, null, 0) + '\n';
              }
            }
          } else {
            content += '[Hoja vacía]\n';
          }
        }
        
        console.log('📊 Total extracted content length:', content.length);
        console.log('📊 First 1000 chars:', content.substring(0, 1000));
        
        if (content.length < 100) {
          return `[Archivo Excel "${file.name}" parece estar vacío o corrupto. Tamaño: ${file.size} bytes]`;
        }
        
        return content;
      } catch (error) {
        console.error('❌ Error parsing Excel:', error);
        return `[Error al parsear Excel "${file.name}": ${error instanceof Error ? error.message : 'Unknown'}. Por favor, intenta exportar a CSV.]`;
      }
    }
    
    // Handle CSV files
    if (fileName.endsWith('.csv')) {
      try {
        const text = await file.text();
        return `=== CONTENIDO CSV ===\n\n${text}`;
      } catch (error) {
        return `[Error al leer CSV]`;
      }
    }
    
    // Handle text files
    if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.json')) {
      try {
        const text = await file.text();
        return text;
      } catch (error) {
        return `[Error al leer archivo de texto]`;
      }
    }
    
    // For other files, return indication
    return `[Archivo ${file.name} - tipo: ${file.type}]`;
  };

  // Submit file/content from team for CEO analysis
  const submitForCEOReview = async (data: {
    title: string;
    content?: string;
    file?: File;
    submission_type?: string;
    project_id?: string | null;
  }) => {
    setIsSubmitting(true);
    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;
      let parsedContent = data.content || '';

      if (data.file) {
        // Parse file content in the browser BEFORE uploading
        console.log('Parsing file content in browser...');
        const extractedContent = await parseFileContent(data.file);
        parsedContent = extractedContent;
        console.log('Extracted content length:', parsedContent.length);

        // Sanitize filename to avoid invalid characters
        const sanitizedFileName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${user?.id}/${Date.now()}_${sanitizedFileName}`;
        const { error: uploadError } = await supabase.storage
          .from('ceo-team-submissions')
          .upload(filePath, data.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Error al subir archivo: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('ceo-team-submissions')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = data.file.name;
        fileType = data.file.type;
      }

      // Insert submission with PARSED CONTENT
      const { data: submission, error } = await supabase
        .from('ceo_team_submissions')
        .insert({
          title: data.title,
          content: parsedContent, // Save the parsed content!
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          submission_type: data.submission_type || 'documento',
          project_id: data.project_id || null,
          submitted_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw new Error(`Error al guardar documento: ${error.message}`);
      }

      // Trigger AI analysis with REAL PARSED CONTENT
      supabase.functions.invoke('ceo-internal-chat', {
        body: {
          action: 'analyze_submission',
          submission_id: submission.id,
          title: data.title,
          content: parsedContent, // Send parsed content!
          file_url: fileUrl,
          file_type: fileType,
          submitter_name: profile?.full_name || 'Usuario'
        }
      }).then(({ data: analysisResult }) => {
        // Update with AI analysis
        if (analysisResult) {
          supabase
            .from('ceo_team_submissions')
            .update({
              ai_analysis: analysisResult.analysis,
              ai_feedback: analysisResult.feedback,
              ai_score: analysisResult.score,
              ai_improvement_suggestions: analysisResult.suggestions,
              status: 'en_revision'
            })
            .eq('id', submission.id)
            .then(() => {
              loadUserSubmissions();
            });
        }
      }).catch(err => {
        console.error('AI analysis error:', err);
      });

      toast.success('Documento enviado para análisis del CEO');
      await loadUserSubmissions();
      return submission;
    } catch (error: any) {
      console.error('Error submitting for review:', error);
      toast.error(error.message || 'Error al enviar documento');
      return null;
    } finally {
      setIsSubmitting(false);
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

  // Analyze submission immediately with AI CEO
  const analyzeSubmissionNow = async (submission: CEOTeamSubmission): Promise<{
    analysis: string;
    feedback: string;
    score: number;
    suggestions: string[];
  } | null> => {
    try {
      toast.info('Analizando documento con AI CEO...');
      
      const { data: analysisResult, error } = await supabase.functions.invoke('ceo-internal-chat', {
        body: {
          action: 'analyze_submission',
          submission_id: submission.id,
          title: submission.title,
          content: submission.content || `Archivo: ${submission.file_name || 'documento'}`,
          file_url: submission.file_url,
          submitter_name: profile?.full_name || 'Usuario'
        }
      });

      if (error) throw error;

      if (analysisResult) {
        // Update the submission with AI analysis
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

        await loadUserSubmissions();
        toast.success('Análisis AI completado');
        
        return {
          analysis: analysisResult.analysis,
          feedback: analysisResult.feedback,
          score: analysisResult.score,
          suggestions: analysisResult.suggestions || []
        };
      }
      
      return null;
    } catch (error: any) {
      console.error('Error analyzing submission:', error);
      toast.error('Error al analizar documento');
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await loadCompanies();
      setIsLoading(false);
    };
    loadAll();
  }, [loadCompanies]);

  // Load projects when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadProjects();
    }
  }, [companies, loadProjects]);

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

  // Load user submissions on user change - doesn't depend on projects
  useEffect(() => {
    if (user?.id) {
      loadUserSubmissions();
    }
  }, [user?.id, loadUserSubmissions]);

  return {
    // Data
    companies,
    projects,
    thoughts,
    internalMessages,
    teamSubmissions,
    pendingReviews,
    reports,
    userSubmissions,
    selectedProjectId,
    
    // State
    isLoading,
    isSending,
    isSubmitting,
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
    uploadFile,
    analyzeSubmissionNow,
    
    // Refresh functions
    loadCompanies,
    loadProjects,
    loadThoughts,
    loadInternalMessages,
    loadTeamSubmissions,
    loadUserSubmissions,
    loadPendingReviews,
    loadReports
  };
}
