import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CompanyDashboardStats {
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  tasksNearDeadline: number;
  tasksOverdue: number;
  tasksCompletionRate: number;
  totalDocuments: number;
  totalMeetings: number;
  scheduledMeetings: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  inProgressTickets: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
  revenueGrowth: number;
  // Budget stats
  totalBudgetItems: number;
  totalInventoryValue: number;
  totalQuotes: number;
  pendingQuotes: number;
  approvedQuotes: number;
  quotesValue: number;
}

export interface SalesData {
  month: string;
  amount: number;
}

export interface TaskProgressData {
  name: string;
  value: number;
  color: string;
}

export interface BudgetCategoryData {
  name: string;
  value: number;
  color: string;
}

export const useCompanyDashboard = (companyId: string | null) => {
  const [stats, setStats] = useState<CompanyDashboardStats>({
    activeUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
    tasksNearDeadline: 0,
    tasksOverdue: 0,
    tasksCompletionRate: 0,
    totalDocuments: 0,
    totalMeetings: 0,
    scheduledMeetings: 0,
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    inProgressTickets: 0,
    monthlyRevenue: 0,
    previousMonthRevenue: 0,
    revenueGrowth: 0,
    totalBudgetItems: 0,
    totalInventoryValue: 0,
    totalQuotes: 0,
    pendingQuotes: 0,
    approvedQuotes: 0,
    quotesValue: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgressData[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      
      try {
        // Fetch users count
        const { count: usersCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId);

        // Fetch tasks with all details
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status, end_date, alert_status')
          .eq('company_id', companyId);

        const taskStats = {
          total: tasks?.length || 0,
          completed: tasks?.filter(t => t.status === 'completada').length || 0,
          pending: tasks?.filter(t => t.status === 'pendiente').length || 0,
          inProgress: tasks?.filter(t => t.status === 'en_progreso').length || 0,
          blocked: tasks?.filter(t => t.status === 'bloqueada').length || 0,
          nearDeadline: tasks?.filter(t => t.alert_status === 'por_vencer').length || 0,
          overdue: tasks?.filter(t => t.alert_status === 'vencida').length || 0,
        };
        const tasksCompletionRate = taskStats.total > 0 
          ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

        // Fetch documents
        const { count: docsCount } = await supabase
          .from('documentos')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', companyId);

        // Fetch meetings
        const { data: meetings } = await supabase
          .from('meetings')
          .select('status')
          .eq('company_id', companyId);

        const scheduledMeetings = meetings?.filter(m => m.status === 'scheduled' || m.status === 'confirmed').length || 0;

        // Fetch tickets
        const { data: tickets } = await supabase
          .from('tickets')
          .select('status')
          .eq('company_id', companyId);

        const ticketStats = {
          total: tickets?.length || 0,
          open: tickets?.filter(t => t.status === 'open').length || 0,
          inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
          resolved: tickets?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0,
        };

        // Fetch budget items with categories
        const { data: budgetItems } = await supabase
          .from('budget_items')
          .select('id, price_clp, quantity, category_id')
          .eq('company_id', companyId);

        const totalBudgetItems = budgetItems?.length || 0;
        const totalInventoryValue = budgetItems?.reduce((sum, item) => 
          sum + ((item.price_clp || 0) * (item.quantity || 1)), 0) || 0;

        // Fetch budget categories for chart
        const { data: categories } = await supabase
          .from('budget_categories')
          .select('id, name')
          .eq('company_id', companyId);

        // Group items by category
        const categoryColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        const categoryData: BudgetCategoryData[] = (categories || []).map((cat, idx) => {
          const catItems = budgetItems?.filter(i => i.category_id === cat.id) || [];
          const value = catItems.reduce((sum, i) => sum + ((i.price_clp || 0) * (i.quantity || 1)), 0);
          return {
            name: cat.name,
            value,
            color: categoryColors[idx % categoryColors.length],
          };
        }).filter(c => c.value > 0);

        // Fetch quotes
        const { data: quotes } = await supabase
          .from('budget_quotes')
          .select('id, status, total')
          .eq('company_id', companyId);

        const totalQuotes = quotes?.length || 0;
        const pendingQuotes = quotes?.filter(q => q.status === 'borrador' || q.status === 'enviada').length || 0;
        const approvedQuotes = quotes?.filter(q => q.status === 'aprobada').length || 0;
        const quotesValue = quotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0;

        // Fetch sales data
        const currentMonth = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: sales } = await supabase
          .from('company_sales')
          .select('sale_date, amount')
          .eq('company_id', companyId)
          .gte('sale_date', sixMonthsAgo.toISOString().split('T')[0])
          .order('sale_date', { ascending: true });

        // Group sales by month
        const salesByMonth: Record<string, number> = {};
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        sales?.forEach(sale => {
          const date = new Date(sale.sale_date);
          const monthName = monthNames[date.getMonth()];
          salesByMonth[monthName] = (salesByMonth[monthName] || 0) + Number(sale.amount);
        });

        const chartData = Object.entries(salesByMonth).map(([month, amount]) => ({
          month,
          amount,
        }));

        // Calculate monthly revenue
        const thisMonthKey = monthNames[currentMonth.getMonth()];
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthKey = monthNames[lastMonth.getMonth()];

        const currentRevenue = salesByMonth[thisMonthKey] || 0;
        const previousRevenue = salesByMonth[lastMonthKey] || 0;
        const growth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        setStats({
          activeUsers: usersCount || 0,
          totalTasks: taskStats.total,
          completedTasks: taskStats.completed,
          pendingTasks: taskStats.pending,
          inProgressTasks: taskStats.inProgress,
          blockedTasks: taskStats.blocked,
          tasksNearDeadline: taskStats.nearDeadline,
          tasksOverdue: taskStats.overdue,
          tasksCompletionRate,
          totalDocuments: docsCount || 0,
          totalMeetings: meetings?.length || 0,
          scheduledMeetings,
          totalTickets: ticketStats.total,
          openTickets: ticketStats.open,
          inProgressTickets: ticketStats.inProgress,
          resolvedTickets: ticketStats.resolved,
          monthlyRevenue: currentRevenue,
          previousMonthRevenue: previousRevenue,
          revenueGrowth: growth,
          totalBudgetItems,
          totalInventoryValue,
          totalQuotes,
          pendingQuotes,
          approvedQuotes,
          quotesValue,
        });

        setSalesData(chartData);
        setBudgetCategories(categoryData);

        setTaskProgress([
          { name: 'Completadas', value: taskStats.completed, color: '#22c55e' },
          { name: 'En Progreso', value: taskStats.inProgress, color: '#3b82f6' },
          { name: 'Pendientes', value: taskStats.pending, color: '#f59e0b' },
          { name: 'Bloqueadas', value: taskStats.blocked, color: '#ef4444' },
        ]);

      } catch (error) {
        console.error('Error fetching company dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`company-dashboard-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `company_id=eq.${companyId}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `company_id=eq.${companyId}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_sales', filter: `company_id=eq.${companyId}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items', filter: `company_id=eq.${companyId}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_quotes', filter: `company_id=eq.${companyId}` }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return {
    stats,
    salesData,
    taskProgress,
    budgetCategories,
    isLoading,
  };
};