import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalEmployees: number;
  employeesByCompany: Record<string, number>;
  totalTickets: number;
  completedTickets: number;
  inProgressTickets: number;
  openTickets: number;
  totalMeetings: number;
  pendingMeetings: number;
  totalCompanies: number;
  ticketCompletionRate: number;
  // Task metrics
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  tasksCompletionRate: number;
  tasksNearDeadline: number;
  tasksOverdue: number;
  // Budget metrics
  totalBudgetItems: number;
  totalInventoryValue: number;
  totalQuotes: number;
  pendingQuotes: number;
  approvedQuotes: number;
  // Revenue
  totalMonthlyRevenue: number;
  previousMonthRevenue: number;
  revenueGrowth: number;
}

interface TasksChartData {
  name: string;
  value: number;
}

interface CompanyMetrics {
  id: string;
  name: string;
  icon: string;
  employees: number;
  tasks: number;
  completedTasks: number;
  revenue: number;
  tickets: number;
}

export const useDashboardStats = (selectedCompanyId: string | null) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    employeesByCompany: {},
    totalTickets: 0,
    completedTickets: 0,
    inProgressTickets: 0,
    openTickets: 0,
    totalMeetings: 0,
    pendingMeetings: 0,
    totalCompanies: 0,
    ticketCompletionRate: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    blockedTasks: 0,
    tasksCompletionRate: 0,
    tasksNearDeadline: 0,
    tasksOverdue: 0,
    totalBudgetItems: 0,
    totalInventoryValue: 0,
    totalQuotes: 0,
    pendingQuotes: 0,
    approvedQuotes: 0,
    totalMonthlyRevenue: 0,
    previousMonthRevenue: 0,
    revenueGrowth: 0,
  });
  const [tasksChartData, setTasksChartData] = useState<TasksChartData[]>([]);
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<{ month: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // IWIE Holding shows all data from all companies (it's the parent company)
        const isHolding = selectedCompanyId === 'iwie-holding' || !selectedCompanyId;
        
        // Fetch employees count
        let employeesQuery = supabase.from('user_profiles').select('id, company_id');
        if (selectedCompanyId && !isHolding) {
          employeesQuery = employeesQuery.eq('company_id', selectedCompanyId);
        }
        const { data: employees, error: employeesError } = await employeesQuery;
        
        if (employeesError) console.error('Error fetching employees:', employeesError);

        // Fetch tickets
        let ticketsQuery = supabase.from('tickets').select('id, status, company_id');
        if (selectedCompanyId && !isHolding) {
          ticketsQuery = ticketsQuery.eq('company_id', selectedCompanyId);
        }
        const { data: tickets } = await ticketsQuery;

        // Fetch meetings
        let meetingsQuery = supabase.from('meetings').select('id, status, company_id');
        if (selectedCompanyId && !isHolding) {
          meetingsQuery = meetingsQuery.eq('company_id', selectedCompanyId);
        }
        const { data: meetings } = await meetingsQuery;

        // Fetch TASKS (real data)
        let tasksQuery = supabase.from('tasks').select('id, status, company_id, end_date, alert_status');
        if (selectedCompanyId && !isHolding) {
          tasksQuery = tasksQuery.eq('company_id', selectedCompanyId);
        }
        const { data: tasks } = await tasksQuery;

        // Fetch budget items
        let budgetQuery = supabase.from('budget_items').select('id, price_clp, quantity, company_id');
        if (selectedCompanyId && !isHolding) {
          budgetQuery = budgetQuery.eq('company_id', selectedCompanyId);
        }
        const { data: budgetItems } = await budgetQuery;

        // Fetch quotes
        let quotesQuery = supabase.from('budget_quotes').select('id, status, company_id');
        if (selectedCompanyId && !isHolding) {
          quotesQuery = quotesQuery.eq('company_id', selectedCompanyId);
        }
        const { data: quotes } = await quotesQuery;

        // Fetch sales data for revenue
        const currentMonth = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        let salesQuery = supabase
          .from('company_sales')
          .select('sale_date, amount, company_id')
          .gte('sale_date', sixMonthsAgo.toISOString().split('T')[0])
          .order('sale_date', { ascending: true });
        if (selectedCompanyId && !isHolding) {
          salesQuery = salesQuery.eq('company_id', selectedCompanyId);
        }
        const { data: sales } = await salesQuery;

        // Fetch companies for metrics breakdown
        const { data: companiesData, count: companiesCount } = await supabase
          .from('companies')
          .select('id, name, icon', { count: 'exact' });

        // Calculate stats
        const totalEmployees = employees?.length || 0;
        
        // Group employees by company
        const employeesByCompany: Record<string, number> = {};
        employees?.forEach((emp) => {
          if (emp.company_id) {
            employeesByCompany[emp.company_id] = (employeesByCompany[emp.company_id] || 0) + 1;
          }
        });

        const totalTickets = tickets?.length || 0;
        const completedTickets = tickets?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0;
        const inProgressTickets = tickets?.filter(t => t.status === 'in_progress').length || 0;
        const openTickets = tickets?.filter(t => t.status === 'open').length || 0;

        const totalMeetings = meetings?.length || 0;
        const pendingMeetings = meetings?.filter(m => m.status === 'scheduled').length || 0;

        // Task stats from REAL DATA
        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.status === 'completada').length || 0;
        const inProgressTasks = tasks?.filter(t => t.status === 'en_progreso').length || 0;
        const pendingTasks = tasks?.filter(t => t.status === 'pendiente').length || 0;
        const blockedTasks = tasks?.filter(t => t.status === 'bloqueada').length || 0;
        const tasksNearDeadline = tasks?.filter(t => t.alert_status === 'por_vencer').length || 0;
        const tasksOverdue = tasks?.filter(t => t.alert_status === 'vencida').length || 0;
        const tasksCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Budget stats
        const totalBudgetItems = budgetItems?.length || 0;
        const totalInventoryValue = budgetItems?.reduce((sum, item) => 
          sum + ((item.price_clp || 0) * (item.quantity || 1)), 0) || 0;
        const totalQuotes = quotes?.length || 0;
        const pendingQuotes = quotes?.filter(q => q.status === 'borrador' || q.status === 'enviada').length || 0;
        const approvedQuotes = quotes?.filter(q => q.status === 'aprobada').length || 0;

        // Revenue calculations
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const salesByMonth: Record<string, number> = {};
        
        sales?.forEach(sale => {
          const date = new Date(sale.sale_date);
          const monthName = monthNames[date.getMonth()];
          salesByMonth[monthName] = (salesByMonth[monthName] || 0) + Number(sale.amount);
        });

        const chartData = Object.entries(salesByMonth).map(([month, value]) => ({ month, value }));
        
        const thisMonthKey = monthNames[currentMonth.getMonth()];
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthKey = monthNames[lastMonth.getMonth()];

        const totalMonthlyRevenue = salesByMonth[thisMonthKey] || 0;
        const previousMonthRevenue = salesByMonth[lastMonthKey] || 0;
        const revenueGrowth = previousMonthRevenue > 0 
          ? ((totalMonthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
          : 0;

        // Build company metrics for overview
        const companyMetricsData: CompanyMetrics[] = (companiesData || []).map(company => {
          const companyEmployees = employees?.filter(e => e.company_id === company.id).length || 0;
          const companyTasks = tasks?.filter(t => t.company_id === company.id) || [];
          const companyCompletedTasks = companyTasks.filter(t => t.status === 'completada').length;
          const companyTickets = tickets?.filter(t => t.company_id === company.id).length || 0;
          const companyRevenue = sales?.filter(s => s.company_id === company.id)
            .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

          return {
            id: company.id,
            name: company.name,
            icon: company.icon || '🏢',
            employees: companyEmployees,
            tasks: companyTasks.length,
            completedTasks: companyCompletedTasks,
            revenue: companyRevenue,
            tickets: companyTickets,
          };
        });

        const ticketCompletionRate = totalTickets > 0 
          ? Math.round((completedTickets / totalTickets) * 100) 
          : 0;

        setStats({
          totalEmployees,
          employeesByCompany,
          totalTickets,
          completedTickets,
          inProgressTickets,
          openTickets,
          totalMeetings,
          pendingMeetings,
          totalCompanies: companiesCount || 0,
          ticketCompletionRate,
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          blockedTasks,
          tasksCompletionRate,
          tasksNearDeadline,
          tasksOverdue,
          totalBudgetItems,
          totalInventoryValue,
          totalQuotes,
          pendingQuotes,
          approvedQuotes,
          totalMonthlyRevenue,
          previousMonthRevenue,
          revenueGrowth,
        });

        // Update tasks chart data with REAL task data
        setTasksChartData([
          { name: 'Completadas', value: completedTasks },
          { name: 'En progreso', value: inProgressTasks },
          { name: 'Pendientes', value: pendingTasks },
          { name: 'Bloqueadas', value: blockedTasks },
        ]);

        setCompanyMetrics(companyMetricsData);
        setRevenueChartData(chartData);

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_sales' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCompanyId]);

  return { stats, tasksChartData, companyMetrics, revenueChartData, isLoading };
};
