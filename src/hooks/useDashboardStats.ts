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
}

interface TasksChartData {
  name: string;
  value: number;
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
  });
  const [tasksChartData, setTasksChartData] = useState<TasksChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // IWIE Holding shows all employees from all companies (it's the parent company)
        const isHolding = selectedCompanyId === 'iwie-holding';
        
        // Fetch employees count
        let employeesQuery = supabase.from('user_profiles').select('id, company_id');
        if (selectedCompanyId && !isHolding) {
          employeesQuery = employeesQuery.eq('company_id', selectedCompanyId);
        }
        const { data: employees, error: employeesError } = await employeesQuery;
        
        if (employeesError) {
          console.error('Error fetching employees:', employeesError);
        }

        // Fetch tickets
        let ticketsQuery = supabase.from('tickets').select('id, status, company_id');
        if (selectedCompanyId && !isHolding) {
          ticketsQuery = ticketsQuery.eq('company_id', selectedCompanyId);
        }
        const { data: tickets, error: ticketsError } = await ticketsQuery;

        if (ticketsError) {
          console.error('Error fetching tickets:', ticketsError);
        }

        // Fetch meetings
        let meetingsQuery = supabase.from('meetings').select('id, status, company_id');
        if (selectedCompanyId && !isHolding) {
          meetingsQuery = meetingsQuery.eq('company_id', selectedCompanyId);
        }
        const { data: meetings, error: meetingsError } = await meetingsQuery;

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
        }

        // Fetch companies count
        const { count: companiesCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

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
        });

        // Update tasks chart data
        setTasksChartData([
          { name: 'Completadas', value: completedTickets },
          { name: 'En progreso', value: inProgressTickets },
          { name: 'Pendientes', value: openTickets },
        ]);

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [selectedCompanyId]);

  return { stats, tasksChartData, isLoading };
};
