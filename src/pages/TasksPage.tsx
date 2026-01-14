import { useState, useEffect } from 'react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useTasks } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Plus, Search, Filter, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TasksPage() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companies, setCompanies] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { tasks, isLoading, createTask, updateTask, deleteTask, addComment, getTaskComments, refetch } = useTasks(
    selectedCompany || userCompanyId,
    isSuperadmin
  );

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if superadmin
      const { data: isSA } = await supabase.rpc('is_superadmin');
      setIsSuperadmin(!!isSA);

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserCompanyId(profile.company_id);
        setUserRole(profile.role);
        if (!isSA) {
          setSelectedCompany(profile.company_id);
        }
      }

      // Fetch companies for superadmin
      if (isSA) {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name, icon');
        setCompanies(companiesData || []);
      }
    };

    init();
  }, []);

  const canCreateTask = isSuperadmin || userRole === 'gerente_area' || userRole === 'lider_area' || userRole === 'admin';

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesCompany = !selectedCompany || selectedCompany === 'all' || task.company_id === selectedCompany;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesCompany;
  });

  const taskStats = {
    total: filteredTasks.length,
    pending: filteredTasks.filter(t => t.status === 'pendiente').length,
    inProgress: filteredTasks.filter(t => t.status === 'en_progreso').length,
    completed: filteredTasks.filter(t => t.status === 'completada').length,
    blocked: filteredTasks.filter(t => t.status === 'bloqueada').length,
  };

  return (
    <ResponsiveLayout
      selectedCompany={selectedCompany}
      onSelectCompany={isSuperadmin ? setSelectedCompany : undefined}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              📋 Gestor de Tareas
            </h1>
            <p className="text-slate-400">
              {isSuperadmin ? 'Dashboard global de tareas' : 'Tareas de tu empresa'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={refetch}
              className="border-slate-600"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {canCreateTask && (
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Tarea
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total" value={taskStats.total} color="cyan" />
          <StatCard label="Pendientes" value={taskStats.pending} color="slate" />
          <StatCard label="En Progreso" value={taskStats.inProgress} color="blue" />
          <StatCard label="Completadas" value={taskStats.completed} color="green" />
          <StatCard label="Bloqueadas" value={taskStats.blocked} color="red" />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-600 text-white"
            />
          </div>

          {isSuperadmin && (
            <Select value={selectedCompany || 'all'} onValueChange={v => setSelectedCompany(v === 'all' ? null : v)}>
              <SelectTrigger className="w-48 bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">Todas las empresas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-white">
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36 bg-slate-900 border-slate-600 text-white">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-white">Todas</SelectItem>
              <SelectItem value="baja" className="text-white">🟢 Baja</SelectItem>
              <SelectItem value="media" className="text-white">🟡 Media</SelectItem>
              <SelectItem value="alta" className="text-white">🟠 Alta</SelectItem>
              <SelectItem value="urgente" className="text-white">🔴 Urgente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-600 text-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all" className="text-white">Todos</SelectItem>
              <SelectItem value="pendiente" className="text-white">Pendiente</SelectItem>
              <SelectItem value="en_progreso" className="text-white">En Progreso</SelectItem>
              <SelectItem value="completada" className="text-white">Completada</SelectItem>
              <SelectItem value="bloqueada" className="text-white">Bloqueada</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-cyan-600' : 'border-slate-600'}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-cyan-600' : 'border-slate-600'}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tasks List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
            <p className="text-slate-400 mb-4">No hay tareas que mostrar</p>
            {canCreateTask && (
              <Button onClick={() => setIsCreateOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="h-4 w-4 mr-2" />
                Crear primera tarea
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onAddComment={addComment}
                getComments={getTaskComments}
                canEdit={isSuperadmin || task.created_by === userCompanyId || 
                  task.assigned_to?.includes(userCompanyId || '') || 
                  task.team_members?.includes(userCompanyId || '')}
              />
            ))}
          </div>
        )}
      </div>

      <CreateTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={createTask}
        companyId={selectedCompany || userCompanyId || 'iwie-holding'}
        isSuperadmin={isSuperadmin}
      />
    </ResponsiveLayout>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}
