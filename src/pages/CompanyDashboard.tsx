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
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

export const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { profile, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showSaleDialog, setShowSaleDialog] = useState(false);

  const { stats, salesData, taskProgress, isLoading } = useCompanyDashboard(selectedCompany);
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
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value);

  return (
    <ResponsiveLayout selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany}>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-sm text-slate-400">Usuarios</p><p className="text-2xl font-bold text-white">{isLoading ? '...' : stats.activeUsers}</p></div>
              <Users className="h-8 w-8 text-cyan-400" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-sm text-slate-400">Tareas</p><p className="text-2xl font-bold text-white">{isLoading ? '...' : `${stats.completedTasks}/${stats.totalTasks}`}</p></div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-400">Ingresos</p><p className="text-xl font-bold text-white">{isLoading ? '...' : formatCurrency(stats.monthlyRevenue)}</p></div>
                <DollarSign className="h-8 w-8 text-purple-400" />
              </div>
              {stats.revenueGrowth !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${stats.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.revenueGrowth > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Math.abs(stats.revenueGrowth).toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-sm text-slate-400">Tickets</p><p className="text-2xl font-bold text-white">{isLoading ? '...' : stats.openTickets}</p></div>
              <Ticket className="h-8 w-8 text-orange-400" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: FileText, value: stats.totalDocuments, label: 'Documentos', color: 'text-blue-400' },
            { icon: Calendar, value: stats.scheduledMeetings, label: 'Reuniones', color: 'text-green-400' },
            { icon: Clock, value: stats.pendingTasks, label: 'Pendientes', color: 'text-yellow-400' },
            { icon: Target, value: stats.inProgressTasks, label: 'En Progreso', color: 'text-blue-400' },
            { icon: CheckCircle2, value: stats.resolvedTickets, label: 'Resueltos', color: 'text-green-400' },
          ].map(({ icon: Icon, value, label, color }) => (
            <Card key={label} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={`h-6 w-6 ${color}`} />
                <div><p className="text-lg font-bold text-white">{isLoading ? '...' : value}</p><p className="text-xs text-slate-400">{label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><BarChart3 className="h-5 w-5 text-purple-400" />Ventas</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="month" stroke="#94a3b8" /><YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                      <Area type="monotone" dataKey="amount" stroke="#a855f7" fill="url(#sg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-slate-400">Sin datos de ventas</div>}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Target className="h-5 w-5 text-cyan-400" />Tareas</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center">
                {stats.totalTasks > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={taskProgress} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">{taskProgress.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} /></PieChart>
                  </ResponsiveContainer>
                ) : <div className="w-full text-center text-slate-400">Sin tareas</div>}
                <div className="space-y-2 min-w-[120px]">{taskProgress.map(i => <div key={i.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: i.color }} /><span className="text-sm text-slate-300">{i.name}</span><span className="text-sm font-bold text-white ml-auto">{i.value}</span></div>)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{ icon: Target, label: 'Tareas', path: '/tareas', color: 'cyan' }, { icon: FileText, label: 'Documentos', path: '/documentos', color: 'blue' }, { icon: Calendar, label: 'Reuniones', path: '/reuniones', color: 'green' }, { icon: Ticket, label: 'Tickets', path: '/tickets', color: 'purple' }].map(({ icon: Icon, label, path, color }) => (
            <Button key={label} variant="outline" className={`h-auto p-4 flex flex-col items-center gap-2 bg-slate-800/50 border-slate-700 hover:border-${color}-500 hover:bg-${color}-500/10`} onClick={() => navigate(path)}>
              <Icon className={`h-8 w-8 text-${color}-400`} /><span className="text-white">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {selectedCompany && <CreateSaleDialog open={showSaleDialog} onOpenChange={setShowSaleDialog} onSubmit={createSale} companyId={selectedCompany} />}
    </ResponsiveLayout>
  );
};

export default CompanyDashboard;