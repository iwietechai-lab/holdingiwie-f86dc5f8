import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Ticket } from '@/types/organization';
import { useSupabaseAuth } from './useSupabaseAuth';
import { logger } from '@/utils/logger';

interface UseTicketsReturn {
  tickets: Ticket[];
  isLoading: boolean;
  error: string | null;
  fetchTickets: (includeDeleted?: boolean) => Promise<void>;
  createTicket: (ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; data?: Ticket; error?: string }>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<{ success: boolean; error?: string }>;
  assignTicket: (id: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  softDeleteTicket: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export function useTickets(): UseTicketsReturn {
  const { user, profile } = useSupabaseAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async (includeDeleted: boolean = false) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeDeleted) {
        query = query.or('is_deleted.is.null,is_deleted.eq.false');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTickets((data || []) as unknown as Ticket[]);
    } catch (err) {
      logger.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : 'Error loading tickets');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createTicket = useCallback(async (
    ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; data?: Ticket; error?: string }> => {
    try {
      const { data, error: insertError } = await supabase
        .from('tickets')
        .insert({
          ...ticket,
          created_by: user?.id,
          company_id: profile?.company_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      await fetchTickets();
      return { success: true, data: data as unknown as Ticket };
    } catch (err) {
      logger.error('Error creating ticket:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error creating ticket' };
    }
  }, [user, profile, fetchTickets]);

  const updateTicket = useCallback(async (
    id: string,
    updates: Partial<Ticket>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const updateData: any = { ...updates, updated_at: new Date().toISOString() };
      
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchTickets();
      return { success: true };
    } catch (err) {
      logger.error('Error updating ticket:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error updating ticket' };
    }
  }, [fetchTickets]);

  const assignTicket = useCallback(async (
    id: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    return updateTicket(id, { assigned_to: userId, status: 'in_progress' });
  }, [updateTicket]);

  const softDeleteTicket = useCallback(async (
    id: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
          deletion_reason: reason,
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchTickets();
      return { success: true };
    } catch (err) {
      logger.error('Error soft deleting ticket:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error deleting ticket' };
    }
  }, [user, fetchTickets]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    isLoading,
    error,
    fetchTickets,
    createTicket,
    updateTicket,
    assignTicket,
    softDeleteTicket,
  };
}
