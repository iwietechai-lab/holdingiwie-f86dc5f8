import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CompanyKnowledge {
  id: string;
  company_id: string;
  contributor_id: string;
  title: string;
  content: string;
  category: string;
  document_name: string | null;
  document_type: string | null;
  document_url: string | null;
  is_analyzed: boolean;
  analysis_summary: string | null;
  key_points: any;
  analyzed_at: string | null;
  is_approved_for_ceo: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  contributor_name?: string;
}

export function useCompanyKnowledge(companyId?: string) {
  const [knowledge, setKnowledge] = useState<CompanyKnowledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledge = useCallback(async () => {
    if (!companyId) {
      setKnowledge([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('company_knowledge')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Get contributor names
      if (data && data.length > 0) {
        const contributorIds = [...new Set(data.map(k => k.contributor_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', contributorIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        const knowledgeWithNames = data.map(k => ({
          ...k,
          contributor_name: profileMap.get(k.contributor_id) || 'Usuario',
        }));

        setKnowledge(knowledgeWithNames);
      } else {
        setKnowledge([]);
      }
    } catch (err) {
      logger.error('Error fetching company knowledge:', err);
      setError('Error al cargar conocimiento');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  const addKnowledge = async (data: {
    title: string;
    content: string;
    category?: string;
    document_name?: string;
    document_type?: string;
    document_url?: string;
  }) => {
    if (!companyId) return { success: false, error: 'No company selected' };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: insertError } = await supabase
        .from('company_knowledge')
        .insert({
          company_id: companyId,
          contributor_id: user.id,
          title: data.title,
          content: data.content,
          category: data.category || 'general',
          document_name: data.document_name,
          document_type: data.document_type,
          document_url: data.document_url,
        });

      if (insertError) throw insertError;

      await fetchKnowledge();
      return { success: true };
    } catch (err) {
      logger.error('Error adding knowledge:', err);
      return { success: false, error: 'Error al agregar conocimiento' };
    }
  };

  const analyzeKnowledge = async (knowledgeId: string) => {
    try {
      // Call the analyze-knowledge edge function
      const { data, error } = await supabase.functions.invoke('analyze-knowledge', {
        body: { knowledgeId },
      });

      if (error) throw error;

      await fetchKnowledge();
      return { success: true, data };
    } catch (err) {
      logger.error('Error analyzing knowledge:', err);
      return { success: false, error: 'Error al analizar conocimiento' };
    }
  };

  const approveForCEO = async (knowledgeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('company_knowledge')
        .update({
          is_approved_for_ceo: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', knowledgeId);

      if (error) throw error;

      await fetchKnowledge();
      return { success: true };
    } catch (err) {
      logger.error('Error approving knowledge:', err);
      return { success: false, error: 'Error al aprobar conocimiento' };
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  // Real-time subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('company_knowledge_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_knowledge',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          fetchKnowledge();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchKnowledge]);

  return {
    knowledge,
    isLoading,
    error,
    addKnowledge,
    analyzeKnowledge,
    approveForCEO,
    fetchKnowledge,
    pendingAnalysis: knowledge.filter(k => !k.is_analyzed).length,
    approvedCount: knowledge.filter(k => k.is_approved_for_ceo).length,
  };
}
