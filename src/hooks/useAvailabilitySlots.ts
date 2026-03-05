import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface UseavailabilitySlotsReturn {
  slots: AvailabilitySlot[];
  isLoading: boolean;
  error: string | null;
  fetchSlots: (userId?: string) => Promise<void>;
  addSlot: (slot: Omit<AvailabilitySlot, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateSlot: (id: string, updates: Partial<AvailabilitySlot>) => Promise<{ success: boolean; error?: string }>;
  deleteSlot: (id: string) => Promise<{ success: boolean; error?: string }>;
  getSlotsForDate: (date: string) => AvailabilitySlot[];
}

export function useAvailabilitySlots(): UseavailabilitySlotsReturn {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async (userId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('availability_slots')
        .select('*')
        .order('available_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error: queryError } = await query;
      
      if (queryError) throw queryError;
      setSlots(data || []);
    } catch (err: any) {
      console.error('Error fetching availability slots:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSlot = useCallback(async (slot: Omit<AvailabilitySlot, 'id' | 'created_at'>) => {
    try {
      const { error: insertError } = await supabase
        .from('availability_slots')
        .insert(slot);
      
      if (insertError) throw insertError;
      
      await fetchSlots(slot.user_id);
      toast.success('Horario agregado');
      return { success: true };
    } catch (err: any) {
      console.error('Error adding availability slot:', err);
      toast.error(err.message || 'Error al agregar horario');
      return { success: false, error: err.message };
    }
  }, [fetchSlots]);

  const updateSlot = useCallback(async (id: string, updates: Partial<AvailabilitySlot>) => {
    try {
      const { error: updateError } = await supabase
        .from('availability_slots')
        .update(updates)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      await fetchSlots();
      toast.success('Horario actualizado');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating availability slot:', err);
      toast.error(err.message || 'Error al actualizar horario');
      return { success: false, error: err.message };
    }
  }, [fetchSlots]);

  const deleteSlot = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setSlots(prev => prev.filter(s => s.id !== id));
      toast.success('Horario eliminado');
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting availability slot:', err);
      toast.error(err.message || 'Error al eliminar horario');
      return { success: false, error: err.message };
    }
  }, []);

  const getSlotsForDate = useCallback((date: string) => {
    return slots.filter(s => s.available_date === date);
  }, [slots]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return {
    slots,
    isLoading,
    error,
    fetchSlots,
    addSlot,
    updateSlot,
    deleteSlot,
    getSlotsForDate,
  };
}
