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
  Activity
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { KPICard } from '@/components/KPICard';
import { CEOChatbot } from '@/components/CEOChatbot';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useAuth } from '@/hooks/useAuth';
import { companies, getCompanyById } from '@/data/companies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Mock data for charts
const revenueData = [
  { month: 'Ene', value: 4000 },
  { month: 'Feb', value: 3000 },
  { month: 'Mar', value: 5000 },
  { month: 'Abr', value: 4500 },
  { month: 'May', value: 6000 },
  { month: 'Jun', value: 5500 },
  { month: 'Jul', value: 7000 },
];

const tasksData = [
  { name: 'Completadas', value: 85 },
  { name: 'En progreso', value: 45 },
  { name: 'Pendientes', value: 23 },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

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

  const selectedCompanyData = selectedCompany ? getCompanyById(selectedCompany) : null;

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      
      <Sidebar 
        selectedCompany={selectedCompany} 
        onSelectCompany={setSelectedCompany} 
      />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          {/* Header */}
          <header className="space-y-2">
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
                : `Bienvenido, ${user?.name}. Aquí tienes el resumen de todas las empresas del holding.`
              }
            </p>
          </header>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Ingresos Totales"
              value="$2.4M"
              change={12.5}
              icon={DollarSign}
              color="green"
            />
            <KPICard
              title="Rentabilidad"
              value="34.2%"
              change={5.2}
              icon={TrendingUp}
              color="purple"
            />
            <KPICard
              title="Empleados Activos"
              value={selectedCompany ? "48" : "384"}
              change={8.1}
              icon={Users}
              color="blue"
            />
            <KPICard
              title="Tareas Completadas"
              value="85%"
              change={-2.3}
              icon={CheckCircle2}
              color="cyan"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Activity className="w-5 h-5 text-primary" />
                  Ingresos Mensuales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Target className="w-5 h-5 text-secondary" />
                  Estado de Tareas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tasksData} layout="vertical">
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

          {/* Companies Overview (only show when no specific company is selected) */}
          {!selectedCompany && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <PieChart className="w-5 h-5 text-accent" />
                Resumen por Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border p-4">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">156</p>
                  <p className="text-xs text-muted-foreground">Proyectos activos</p>
                </div>
              </div>
            </Card>
            <Card className="bg-card/30 backdrop-blur-sm border-border p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">94%</p>
                  <p className="text-xs text-muted-foreground">Objetivos cumplidos</p>
                </div>
              </div>
            </Card>
            <Card className="bg-card/30 backdrop-blur-sm border-border p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">9</p>
                  <p className="text-xs text-muted-foreground">Empresas</p>
                </div>
              </div>
            </Card>
            <Card className="bg-card/30 backdrop-blur-sm border-border p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-foreground">+27%</p>
                  <p className="text-xs text-muted-foreground">Crecimiento anual</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <CEOChatbot />
    </div>
  );
};

export default Dashboard;
