import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BudgetCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  order_index: number;
  parent_id: string | null;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  company_id: string;
  category_id: string | null;
  part_number: string | null;
  name: string;
  description: string | null;
  quantity: number;
  price_rmb: number;
  price_clp: number;
  checklist_checked: boolean;
  stock_status: 'disponible' | 'agotado' | 'bajo_stock' | 'pedido';
  image_url: string | null;
  notes: string | null;
  created_at: string;
  category?: BudgetCategory;
}

export interface BudgetQuote {
  id: string;
  company_id: string;
  quote_number: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'facturada';
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  total: number;
  rmb_to_clp_rate: number;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
}

export interface BudgetQuoteItem {
  id: string;
  quote_id: string;
  item_id: string | null;
  custom_name: string | null;
  custom_description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  item?: BudgetItem;
}

export const useBudget = (companyId?: string | null, isSuperadmin?: boolean) => {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [quotes, setQuotes] = useState<BudgetQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    let query = supabase.from('budget_categories').select('*').order('order_index');
    if (companyId && !isSuperadmin) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query;
    if (error) console.error('Error fetching categories:', error);
    setCategories((data || []) as BudgetCategory[]);
  };

  const fetchItems = async () => {
    let query = supabase.from('budget_items').select('*').order('name');
    if (companyId && !isSuperadmin) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query;
    if (error) console.error('Error fetching items:', error);
    setItems((data || []).map(item => ({
      ...item,
      price_rmb: Number(item.price_rmb) || 0,
      price_clp: Number(item.price_clp) || 0,
      quantity: Number(item.quantity) || 1,
    })) as BudgetItem[]);
  };

  const fetchQuotes = async () => {
    let query = supabase.from('budget_quotes').select('*').order('created_at', { ascending: false });
    if (companyId && !isSuperadmin) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query;
    if (error) console.error('Error fetching quotes:', error);
    setQuotes((data || []).map(q => ({
      ...q,
      subtotal: Number(q.subtotal) || 0,
      tax_percentage: Number(q.tax_percentage) || 19,
      tax_amount: Number(q.tax_amount) || 0,
      total: Number(q.total) || 0,
      rmb_to_clp_rate: Number(q.rmb_to_clp_rate) || 140,
    })) as BudgetQuote[]);
  };

  const createItem = async (item: Omit<BudgetItem, 'id' | 'created_at' | 'category'>) => {
    try {
      const { error } = await supabase.from('budget_items').insert(item);
      if (error) throw error;
      toast({ title: 'Item creado', description: 'El item se ha agregado al inventario' });
      fetchItems();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateItem = async (id: string, updates: Partial<BudgetItem>) => {
    try {
      const { error } = await supabase.from('budget_items').update(updates).eq('id', id);
      if (error) throw error;
      toast({ title: 'Item actualizado' });
      fetchItems();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('budget_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Item eliminado' });
      fetchItems();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const createQuote = async (quote: Omit<BudgetQuote, 'id' | 'created_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('budget_quotes').insert({
        ...quote,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      toast({ title: 'Cotización creada' });
      fetchQuotes();
      return data;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const updateQuote = async (id: string, updates: Partial<BudgetQuote>) => {
    try {
      const { error } = await supabase.from('budget_quotes').update(updates).eq('id', id);
      if (error) throw error;
      toast({ title: 'Cotización actualizada' });
      fetchQuotes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      const { error } = await supabase.from('budget_quotes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Cotización eliminada' });
      fetchQuotes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getQuoteItems = async (quoteId: string): Promise<BudgetQuoteItem[]> => {
    const { data, error } = await supabase
      .from('budget_quote_items')
      .select('*')
      .eq('quote_id', quoteId);
    if (error) {
      console.error('Error fetching quote items:', error);
      return [];
    }
    return (data || []).map(qi => ({
      ...qi,
      quantity: Number(qi.quantity) || 1,
      unit_price: Number(qi.unit_price) || 0,
      total_price: Number(qi.total_price) || 0,
    })) as BudgetQuoteItem[];
  };

  const addQuoteItem = async (quoteId: string, itemId: string, quantity: number, unitPrice: number) => {
    try {
      const { error } = await supabase.from('budget_quote_items').insert({
        quote_id: quoteId,
        item_id: itemId,
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchCategories(), fetchItems(), fetchQuotes()]);
      setIsLoading(false);
    };
    init();

    // Realtime subscriptions
    const itemsChannel = supabase
      .channel('budget-items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items' }, fetchItems)
      .subscribe();

    const quotesChannel = supabase
      .channel('budget-quotes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_quotes' }, fetchQuotes)
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(quotesChannel);
    };
  }, [companyId, isSuperadmin]);

  return {
    categories,
    items,
    quotes,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    createQuote,
    updateQuote,
    deleteQuote,
    getQuoteItems,
    addQuoteItem,
    refetch: () => Promise.all([fetchCategories(), fetchItems(), fetchQuotes()]),
  };
};
