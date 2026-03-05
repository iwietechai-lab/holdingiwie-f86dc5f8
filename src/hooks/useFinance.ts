import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { toast } from '@/hooks/use-toast';

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  company_id: string | null;
  is_active: boolean;
}

export interface BankTransaction {
  id: string;
  company_id: string | null;
  cost_center_id: string | null;
  transaction_date: string;
  amount: number;
  description_bank: string | null;
  description_normalized: string | null;
  transaction_type: string;
  account_debit: string | null;
  account_credit: string | null;
  status: string;
  confidence_score: number | null;
  document_number: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  transaction_id: string | null;
  journal_date: string;
  entry_number: string;
  debit_account: string | null;
  credit_account: string | null;
  amount: number;
  cost_center_id: string | null;
  description: string | null;
  created_by_agent: boolean;
  created_at: string;
}

interface Filters {
  costCenter?: string;
  transactionType?: string;
  dateFrom?: string;
  dateTo?: string;
  company?: string;
  status?: string;
}

export const useFinance = () => {
  const { profile } = useSupabaseAuth();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [pendingReview, setPendingReview] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const isSuperadmin = profile?.has_full_access === true;

  const fetchCostCenters = useCallback(async () => {
    const { data, error } = await supabase
      .from('finance_cost_centers')
      .select('*')
      .eq('is_active', true)
      .order('code');
    if (!error && data) setCostCenters(data);
  }, []);

  const fetchTransactions = useCallback(async (filters: Filters = {}) => {
    setLoading(true);
    let query = supabase
      .from('finance_bank_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(500);

    if (filters.costCenter) query = query.eq('cost_center_id', filters.costCenter);
    if (filters.transactionType) query = query.eq('transaction_type', filters.transactionType as any);
    if (filters.status) query = query.eq('status', filters.status as any);
    if (filters.company) query = query.eq('company_id', filters.company);
    if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);

    const { data, error } = await query;
    if (!error && data) setTransactions(data as BankTransaction[]);
    setLoading(false);
  }, []);

  const fetchJournalEntries = useCallback(async (date: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_journal_entries')
      .select('*')
      .eq('journal_date', date)
      .order('entry_number');
    if (!error && data) setJournalEntries(data as JournalEntry[]);
    setLoading(false);
  }, []);

  const fetchPendingReview = useCallback(async () => {
    const { data, error } = await supabase
      .from('finance_bank_transactions')
      .select('*')
      .eq('status', 'requiere_revision')
      .order('created_at', { ascending: false });
    if (!error && data) setPendingReview(data as BankTransaction[]);
  }, []);

  const approveTransaction = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('finance_bank_transactions')
      .update({ status: 'aprobado' })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Aprobado', description: 'Movimiento aprobado correctamente' });
      fetchPendingReview();
    }
  }, [fetchPendingReview]);

  const reclassifyTransaction = useCallback(async (id: string, costCenterId: string, transactionType: string) => {
    const { error } = await supabase
      .from('finance_bank_transactions')
      .update({
        cost_center_id: costCenterId,
        transaction_type: transactionType as any,
        status: 'aprobado',
      })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Reclasificado', description: 'Movimiento reclasificado y aprobado' });
      fetchPendingReview();
    }
  }, [fetchPendingReview]);

  const getMonthlyStats = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTxns = transactions.filter(t => {
      const d = new Date(t.transaction_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const ingresos = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const egresos = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const saldo = ingresos - egresos;

    const today = now.toISOString().split('T')[0];
    const todayProcessed = transactions.filter(t =>
      t.processed_at && t.processed_at.startsWith(today)
    ).length;

    return { ingresos, egresos, saldo, todayProcessed };
  }, [transactions]);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  return {
    costCenters,
    transactions,
    journalEntries,
    pendingReview,
    loading,
    isSuperadmin,
    fetchTransactions,
    fetchJournalEntries,
    fetchPendingReview,
    approveTransaction,
    reclassifyTransaction,
    getMonthlyStats,
  };
};
