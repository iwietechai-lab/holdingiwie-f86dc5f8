import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  Target,
  Zap,
  PieChart,
  Activity,
  LogOut,
  Menu,
  Ticket,
  Calendar
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { KPICard } from '@/components/KPICard';
import { CEOChatbot } from '@/components/CEOChatbot';
import { SpaceBackground } from '@/components/SpaceBackground';
import { InDevelopmentModal } from '@/components/InDevelopmentModal';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { companies, getCompanyById } from '@/data/companies';
import { hasFullAccess } from '@/config/allowedEmails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// Mock data for revenue chart (will be connected later when financial data is available)
const revenueData = [
  { month: 'Ene', value: 4000 },
  { month: 'Feb', value: 3000 },
  { month: 'Mar', value: 5000 },
  { month: 'Abr', value: 4500 },
  { month: 'May', value: 6000 },
  { month: 'Jun', value: 5500 },
  { month: 'Jul', value: 7000 },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading, logout } = useSupabaseAuth();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showDevelopmentModal, setShowDevelopmentModal] = useState(false);
  
  // Fetch real stats from database
  const { stats, tasksChartData, isLoading: statsLoading } = useDashboardStats(selectedCompany);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Check if user has full access (CEO or has_full_access flag or special access list)
  useEffect(() => {
    if (!isLoading && isAuthenticated && profile) {
      const isCEO = profile.role === 'CEO Global';
      // Use profile.has_full_access first, then fallback to email check
      const userEmail = user?.email || '';
      const hasAccess = (profile as any).has_full_access || hasFullAccess(userEmail);
      
      console.log('Dashboard access check:', { userEmail, isCEO, hasAccess, profileRole: profile.role, profileHasFullAccess: (profile as any).has_full_access });
      
      if (!isCEO && !hasAccess) {
        // Users without full access: redirect to chatbot only
        navigate('/chatbot');
      }
    }
  }, [isLoading, isAuthenticated, profile, user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // If profile not loaded yet or no access, show loading
  const userEmail = user?.email || '';
  const userHasAccess = profile?.role === 'CEO Global' || (profile as any)?.has_full_access || hasFullAccess(userEmail);
  if (!profile || !userHasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  const selectedCompanyData = selectedCompany ? getCompanyById(selectedCompany) : null;
  
  // Use profile data or fallback to email
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const displayRole = profile?.role || 'Usuario';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SpaceBackground />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          selectedCompany={selectedCompany} 
          onSelectCompany={setSelectedCompany} 
        />
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <MobileNav
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
        />
        <h1 className="text-lg font-bold text-foreground neon-text">IWIE Holding</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {/* Header - Desktop only */}
          <header className="hidden lg:flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                {selectedCompanyData ? (
                  <span className="flex items-center gap-3">
                    <span className="text-4xl">{selectedCompanyData.icon}</span>
                    {selectedCompanyData.name}
                  </span>
                ) : (
                  'Dashboard Global'
                )}
              </h1>
              <p className="text-muted-foreground">
                {selectedCompanyData 
                  ? selectedCompanyData.description
                  : (
                    <span>
                      Bienvenido, <span className="text-primary font-semibold">{displayName}</span>
                      {' - '}
                      <span className="text-secondary">{displayRole}</span>
                      . Aquí tienes el resumen de todas las empresas del holding.
                    </span>
                  )
                }
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </header>

          {/* Mobile Title */}
          <div className="lg:hidden">
            <h1 className="text-xl font-bold text-foreground">
              {selectedCompanyData ? selectedCompanyData.name : 'Dashboard Global'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bienvenido, <span className="text-primary font-semibold">{displayName}</span>
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <KPICard
              title="Empleados Activos"
              value={statsLoading ? "..." : stats.totalEmployees.toString()}
              change={0}
              icon={Users}
              color="blue"
            />
            <KPICard
              title="Tickets Totales"
              value={statsLoading ? "..." : stats.totalTickets.toString()}
              change={0}
              icon={Ticket}
              color="purple"
            />
            <KPICard
              title="Reuniones"
              value={statsLoading ? "..." : stats.totalMeetings.toString()}
              change={0}
              icon={Calendar}
              color="green"
            />
            <KPICard
              title="Tareas Completadas"
              value={statsLoading ? "..." : `${stats.ticketCompletionRate}%`}
              change={0}
              icon={CheckCircle2}
              color="cyan"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {/* Revenue Chart */}
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-foreground text-sm md:text-base">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  Ingresos Mensuales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-6 pt-0">
                <div className="h-[200px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(250, 89%, 65%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(250, 89%, 65%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 25%, 20%)" />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(215, 20%, 65%)"
                        tick={{ fill: 'hsl(215, 20%, 65%)' }}
                      />
                      <YAxis 
                        stroke="hsl(215, 20%, 65%)"
                        tick={{ fill: 'hsl(215, 20%, 65%)' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(230, 25%, 12%)',
                          border: '1px solid hsl(230, 25%, 20%)',
                          borderRadius: '8px',
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(250, 89%, 65%)" 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Chart */}
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-foreground text-sm md:text-base">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
                  Estado de Tareas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-6 pt-0">
                <div className="h-[200px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tasksChartData.length > 0 ? tasksChartData : [{ name: 'Sin datos', value: 0 }]} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 25%, 20%)" />
                      <XAxis 
                        type="number"
                        stroke="hsl(215, 20%, 65%)"
                        tick={{ fill: 'hsl(215, 20%, 65%)' }}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category"
                        stroke="hsl(215, 20%, 65%)"
                        tick={{ fill: 'hsl(215, 20%, 65%)' }}
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(230, 25%, 12%)',
                          border: '1px solid hsl(230, 25%, 20%)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="hsl(200, 89%, 55%)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Companies Overview - clicking shows dev modal */}
          {!selectedCompany && (
            <div className="space-y-4">
              <h2 className="text-base md:text-xl font-semibold text-foreground flex items-center gap-2">
                <PieChart className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                Resumen por Empresa
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {companies.map((company, index) => (
                  <Card 
                    key={company.id}
                    className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedCompany(company.id)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                          {company.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {company.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {company.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">
                            ${(Math.random() * 500 + 100).toFixed(0)}K
                          </p>
                          <p className="text-xs text-green-400">
                            +{(Math.random() * 20 + 5).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.completedTickets}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">Tickets resueltos</p>
                </div>
              </div>
            </Card>
            <Card className="bg-card/30 backdrop-blur-sm border-border p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Zap className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.inProgressTickets}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">En progreso</p>
                </div>
              </div>
            </Card>
            <Card className="bg-card/30 backdrop-blur-sm border-border p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Target className="w-6 h-6 md:w-8 md:h-8 text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.openTickets}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">Tickets abiertos</p>
                </div>
              </div>
            </Card>
            <Card className="bg-card/30 backdrop-blur-sm border-border p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <PieChart className="w-6 h-6 md:w-8 md:h-8 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.totalCompanies}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">Empresas</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <CEOChatbot />
      
      <InDevelopmentModal 
        open={showDevelopmentModal} 
        onClose={() => setShowDevelopmentModal(false)} 
      />
    </div>
  );
};

export default Dashboard;
