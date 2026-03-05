import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface Sale {
  id: string;
  company_id: string;
  sale_date: string;
  amount: number;
  description: string | null;
  category: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateSaleInput {
  company_id: string;
  sale_date: string;
  amount: number;
  description?: string;
  category?: string;
}

export const useCompanySales = (companyId: string | null) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSales = async () => {
    if (!companyId) {
      setSales([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_sales')
        .select('*')
        .eq('company_id', companyId)
        .order('sale_date', { ascending: false });

      if (error) throw error;

      setSales((data || []).map(s => ({
        id: s.id,
        company_id: s.company_id,
        sale_date: s.sale_date,
        amount: Number(s.amount),
        description: s.description,
        category: s.category,
        created_by: s.created_by,
        created_at: s.created_at || '',
      })));
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createSale = async (input: CreateSaleInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('company_sales')
        .insert({
          ...input,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Venta registrada',
        description: 'La venta se ha registrado exitosamente',
      });

      fetchSales();
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar la venta',
        variant: 'destructive',
      });
    }
  };

  const deleteSale = async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('company_sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;

      toast({
        title: 'Venta eliminada',
      });

      fetchSales();
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSales();

    if (companyId) {
      const channel = supabase
        .channel(`company-sales-${companyId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'company_sales',
          filter: `company_id=eq.${companyId}`
        }, fetchSales)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [companyId]);

  return {
    sales,
    isLoading,
    createSale,
    deleteSale,
    refetch: fetchSales,
  };
};