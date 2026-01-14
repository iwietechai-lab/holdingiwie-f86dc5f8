import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyDashboardStats {
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  totalDocuments: number;
  totalMeetings: number;
  scheduledMeetings: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
  revenueGrowth: number;
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

export const useCompanyDashboard = (companyId: string | null) => {
  const [stats, setStats] = useState<CompanyDashboardStats>({
    activeUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
    totalDocuments: 0,
    totalMeetings: 0,
    scheduledMeetings: 0,
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    monthlyRevenue: 0,
    previousMonthRevenue: 0,
    revenueGrowth: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgressData[]>([]);
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

        // Fetch tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('company_id', companyId);

        const taskStats = {
          total: tasks?.length || 0,
          completed: tasks?.filter(t => t.status === 'completada').length || 0,
          pending: tasks?.filter(t => t.status === 'pendiente').length || 0,
          inProgress: tasks?.filter(t => t.status === 'en_progreso').length || 0,
          blocked: tasks?.filter(t => t.status === 'bloqueada').length || 0,
        };

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
          resolved: tickets?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0,
        };

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
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
          const monthName = monthNames[date.getMonth()];
          if (!salesByMonth[monthName]) {
            salesByMonth[monthName] = 0;
          }
          salesByMonth[monthName] += Number(sale.amount);
        });

        const chartData = Object.entries(salesByMonth).map(([month, amount]) => ({
          month,
          amount,
        }));

        // Calculate monthly revenue
        const thisMonth = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const thisMonthKey = monthNames[thisMonth.getMonth()];
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
          totalDocuments: docsCount || 0,
          totalMeetings: meetings?.length || 0,
          scheduledMeetings,
          totalTickets: ticketStats.total,
          openTickets: ticketStats.open,
          resolvedTickets: ticketStats.resolved,
          monthlyRevenue: currentRevenue,
          previousMonthRevenue: previousRevenue,
          revenueGrowth: growth,
        });

        setSalesData(chartData);

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return {
    stats,
    salesData,
    taskProgress,
    isLoading,
  };
};