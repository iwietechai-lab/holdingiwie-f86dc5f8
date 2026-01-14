import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle2, 
  Clock,
  FileText,
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Briefcase,
  Plus,
  Package,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { useCompanySales } from '@/hooks/useCompanySales';
import { getCompanyById } from '@/data/companies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateSaleDialog } from '@/components/company/CreateSaleDialog';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

export const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { profile, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showSaleDialog, setShowSaleDialog] = useState(false);

  const { stats, salesData, taskProgress, budgetCategories, isLoading } = useCompanyDashboard(selectedCompany);
  const { createSale } = useCompanySales(selectedCompany);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/login');
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (profile?.company_id && !selectedCompany) setSelectedCompany(profile.company_id);
  }, [profile, selectedCompany]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const company = selectedCompany ? getCompanyById(selectedCompany) : null;
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CL', { 
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0, notation: 'compact' 
  }).format(value);

  return (
    <ResponsiveLayout selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany}>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-cyan-400" />
              {company ? <><span className="text-3xl">{company.icon}</span>{company.name}</> : 'Dashboard Empresa'}
            </h1>
            <p className="text-slate-400 mt-1">Métricas, avances y gestión integral</p>
          </div>
          {selectedCompany && (
            <Button onClick={() => setShowSaleDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" /> Registrar Venta
            </Button>
          )}
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Usuarios</p>
                <p className="text-2xl font-bold text-white">{isLoading ? '...' : stats.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-cyan-400" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Tareas</p>
                <p className="text-2xl font-bold text-white">
                  {isLoading ? '...' : `${stats.completedTasks}/${stats.totalTasks}`}
                </p>
                <p className="text-xs text-green-400">{stats.tasksCompletionRate}% completadas</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Ingresos</p>
                  <p className="text-xl font-bold text-white">{isLoading ? '...' : formatCurrency(stats.monthlyRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-400" />
              </div>
              {stats.revenueGrowth !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${stats.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.revenueGrowth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Math.abs(stats.revenueGrowth).toFixed(1)}% vs mes anterior
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Tickets</p>
                <p className="text-2xl font-bold text-white">{isLoading ? '...' : stats.openTickets}</p>
                <p className="text-xs text-slate-400">{stats.resolvedTickets} resueltos</p>
              </div>
              <Ticket className="h-8 w-8 text-orange-400" />
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {[
            { icon: FileText, value: stats.totalDocuments, label: 'Documentos', color: 'text-blue-400' },
            { icon: Calendar, value: stats.scheduledMeetings, label: 'Reuniones', color: 'text-green-400' },
            { icon: Clock, value: stats.pendingTasks, label: 'Pendientes', color: 'text-yellow-400' },
            { icon: Zap, value: stats.inProgressTasks, label: 'En Progreso', color: 'text-blue-400' },
            { icon: AlertTriangle, value: stats.tasksNearDeadline, label: 'Por Vencer', color: 'text-orange-400' },
            { icon: Package, value: stats.totalBudgetItems, label: 'Inventario', color: 'text-cyan-400' },
            { icon: DollarSign, value: stats.totalQuotes, label: 'Cotizaciones', color: 'text-purple-400' },
          ].map(({ icon: Icon, value, label, color }) => (
            <Card key={label} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={`h-5 w-5 ${color}`} />
                <div>
                  <p className="text-lg font-bold text-white">{isLoading ? '...' : value}</p>
                  <p className="text-[10px] text-slate-400">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Ventas Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#a855f7" fill="url(#sg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">Sin datos de ventas</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Pie Chart */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-400" />
                  Estado de Tareas
                </span>
                <span className="text-sm text-slate-400">{stats.completedTasks}/{stats.totalTasks}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center">
                {stats.totalTasks > 0 ? (
                  <>
                    <ResponsiveContainer width="60%" height="100%">
                      <PieChart>
                        <Pie 
                          data={taskProgress} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={90} 
                          paddingAngle={2} 
                          dataKey="value"
                        >
                          {taskProgress.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 min-w-[120px]">
                      {taskProgress.map(i => (
                        <div key={i.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i.color }} />
                          <span className="text-sm text-slate-300">{i.name}</span>
                          <span className="text-sm font-bold text-white ml-auto">{i.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="w-full text-center text-slate-400">Sin tareas</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget/Inventory Section */}
        {stats.totalBudgetItems > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget Value Card */}
            <Card className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-cyan-400" />
                  Resumen de Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Valor Total</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalInventoryValue)}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Items</p>
                    <p className="text-2xl font-bold text-white">{stats.totalBudgetItems}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Cotizaciones</p>
                    <p className="text-2xl font-bold text-white">{stats.totalQuotes}</p>
                    <p className="text-xs text-slate-400">{stats.pendingQuotes} pendientes</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Valor Cotizado</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.quotesValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget Categories Chart */}
            {budgetCategories.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    Valor por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetCategories} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                          formatter={(value: number) => [formatCurrency(value), 'Valor']}
                        />
                        <Bar dataKey="value" fill="#22d3ee" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Target, label: 'Tareas', path: '/tareas', color: 'cyan' },
            { icon: FileText, label: 'Documentos', path: '/documentos', color: 'blue' },
            { icon: Calendar, label: 'Reuniones', path: '/reuniones', color: 'green' },
            { icon: Ticket, label: 'Tickets', path: '/tickets', color: 'purple' },
            { icon: Package, label: 'Presupuestos', path: '/presupuestos', color: 'orange' },
          ].map(({ icon: Icon, label, path, color }) => (
            <Button 
              key={label} 
              variant="outline" 
              className={`h-auto p-4 flex flex-col items-center gap-2 bg-slate-800/50 border-slate-700 hover:border-${color}-500 hover:bg-${color}-500/10`} 
              onClick={() => navigate(path)}
            >
              <Icon className={`h-8 w-8 text-${color}-400`} />
              <span className="text-white">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {selectedCompany && (
        <CreateSaleDialog 
          open={showSaleDialog} 
          onOpenChange={setShowSaleDialog} 
          onSubmit={createSale} 
          companyId={selectedCompany} 
        />
      )}
    </ResponsiveLayout>
  );
};

export default CompanyDashboard;