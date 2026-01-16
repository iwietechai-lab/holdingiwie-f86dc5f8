import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { CreateTaskInput } from '@/hooks/useTasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, Users, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface UserProfile {
  id: string;
  full_name: string | null;
  company_id: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTaskInput) => Promise<any>;
  companyId: string;
  isSuperadmin?: boolean;
}

const AREAS = [
  'Dirección Estratégica',
  'Finanzas',
  'Recursos Humanos',
  'Operaciones',
  'Producción',
  'Comercial',
  'Marketing',
  'Tecnología',
  'I+D',
  'Calidad',
  'Logística',
  'Legal',
  'Sostenibilidad',
  'Proyectos',
];

export function CreateTaskDialog({ open, onOpenChange, onSubmit, companyId, isSuperadmin }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedAssigneeCompanies, setExpandedAssigneeCompanies] = useState<string[]>([]);
  const [expandedTeamCompanies, setExpandedTeamCompanies] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      setAllCompanies(companiesData || []);

      // Fetch all users from all companies
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, full_name, company_id')
        .order('full_name');
      
      setAllUsers(usersData || []);

      // Expand current company by default
      if (companyId) {
        setExpandedAssigneeCompanies([companyId]);
        setExpandedTeamCompanies([companyId]);
      }
    };

    if (open) {
      fetchData();
      // Reset form
      setTitle('');
      setDescription('');
      setArea('');
      setPriority('media');
      setEstimatedHours('');
      setStartDate('');
      setEndDate('');
      setSelectedAssignees([]);
      setSelectedTeam([]);
    }
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !area || selectedAssignees.length === 0 || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      // Determine collaborating companies (companies with selected users that aren't the main company)
      const assigneeCompanies = new Set(
        allUsers.filter(u => selectedAssignees.includes(u.id)).map(u => u.company_id)
      );
      const teamCompanies = new Set(
        allUsers.filter(u => selectedTeam.includes(u.id)).map(u => u.company_id)
      );
      const allInvolvedCompanies = new Set([...assigneeCompanies, ...teamCompanies]);
      allInvolvedCompanies.delete(companyId);
      
      const collaboratingCompanies = Array.from(allInvolvedCompanies).filter(Boolean) as string[];

      await onSubmit({
        company_id: companyId,
        title,
        description,
        area,
        priority,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        start_date: startDate,
        end_date: endDate,
        assigned_to: selectedAssignees,
        team_members: selectedTeam,
        collaborating_companies: collaboratingCompanies,
      });
      
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleTeamMember = (userId: string) => {
    setSelectedTeam(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleExpandedAssigneeCompany = (companyId: string) => {
    setExpandedAssigneeCompanies(prev =>
      prev.includes(companyId) ? prev.filter(id => id !== companyId) : [...prev, companyId]
    );
  };

  const toggleExpandedTeamCompany = (companyId: string) => {
    setExpandedTeamCompanies(prev =>
      prev.includes(companyId) ? prev.filter(id => id !== companyId) : [...prev, companyId]
    );
  };

  const selectAllFromCompany = (companyId: string, type: 'assignee' | 'team') => {
    const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id);
    if (type === 'assignee') {
      setSelectedAssignees(prev => {
        const allSelected = companyUserIds.every(id => prev.includes(id));
        if (allSelected) {
          return prev.filter(id => !companyUserIds.includes(id));
        }
        return [...new Set([...prev, ...companyUserIds])];
      });
    } else {
      setSelectedTeam(prev => {
        const allSelected = companyUserIds.every(id => prev.includes(id));
        if (allSelected) {
          return prev.filter(id => !companyUserIds.includes(id));
        }
        return [...new Set([...prev, ...companyUserIds])];
      });
    }
  };

  const getUsersByCompany = (companyId: string) => {
    return allUsers.filter(u => u.company_id === companyId);
  };

  const getCompanyName = (companyId: string) => {
    return allCompanies.find(c => c.id === companyId)?.name || companyId;
  };

  const getSelectedCountByCompany = (companyId: string, type: 'assignee' | 'team') => {
    const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id);
    const selected = type === 'assignee' ? selectedAssignees : selectedTeam;
    return companyUserIds.filter(id => selected.includes(id)).length;
  };

  // Sort companies: current company first, then alphabetically
  const sortedCompanies = [...allCompanies].sort((a, b) => {
    if (a.id === companyId) return -1;
    if (b.id === companyId) return 1;
    return a.name.localeCompare(b.name);
  });

  const renderUserSelector = (
    type: 'assignee' | 'team',
    expandedCompanies: string[],
    toggleExpanded: (id: string) => void,
    toggleUser: (id: string) => void,
    selectedUsers: string[]
  ) => (
    <ScrollArea className="h-48 pr-2">
      <div className="space-y-1">
        {sortedCompanies.map(company => {
          const users = getUsersByCompany(company.id);
          if (users.length === 0) return null;
          
          const isExpanded = expandedCompanies.includes(company.id);
          const selectedCount = getSelectedCountByCompany(company.id, type);
          const isCurrentCompany = company.id === companyId;

          return (
            <Collapsible 
              key={company.id} 
              open={isExpanded}
              onOpenChange={() => toggleExpanded(company.id)}
            >
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start text-left h-8 px-2 hover:bg-slate-700"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 mr-2 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2 text-slate-400" />
                    )}
                    <Building2 className="h-4 w-4 mr-2 text-cyan-400" />
                    <span className={`text-sm ${isCurrentCompany ? 'text-cyan-300 font-medium' : 'text-slate-300'}`}>
                      {company.name}
                    </span>
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-cyan-600 text-white text-xs">
                        {selectedCount}
                      </Badge>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectAllFromCompany(company.id, type)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 h-8 px-2"
                >
                  {selectedCount === users.length ? 'Quitar todos' : 'Seleccionar todos'}
                </Button>
              </div>
              <CollapsibleContent>
                <div className="ml-6 pl-2 border-l border-slate-700 space-y-1 py-1">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-slate-700/50">
                      <Checkbox
                        id={`${type}-${user.id}`}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <label 
                        htmlFor={`${type}-${user.id}`} 
                        className="text-white text-sm cursor-pointer flex-1"
                      >
                        {user.full_name || 'Sin nombre'}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            Nueva Tarea
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Título de la tarea *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre de la tarea"
              className="bg-slate-800 border-slate-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Descripción</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción detallada de la tarea..."
              className="bg-slate-800 border-slate-600 text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Área *</Label>
              <Select value={area} onValueChange={setArea} required>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Seleccionar área" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {AREAS.map(a => (
                    <SelectItem key={a} value={a} className="text-white">
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Prioridad *</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="baja" className="text-white">🟢 Baja</SelectItem>
                  <SelectItem value="media" className="text-white">🟡 Media</SelectItem>
                  <SelectItem value="alta" className="text-white">🟠 Alta</SelectItem>
                  <SelectItem value="urgente" className="text-white">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Horas estimadas
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={estimatedHours}
              onChange={e => setEstimatedHours(e.target.value)}
              placeholder="Ej: 8, 16, 40"
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Fecha de inicio *
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Fecha de término *
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
                className="bg-slate-800 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4" /> Asignar a (responsables) *
              {selectedAssignees.length > 0 && (
                <Badge className="bg-cyan-600 text-white">
                  {selectedAssignees.length} seleccionado{selectedAssignees.length > 1 ? 's' : ''}
                </Badge>
              )}
            </Label>
            <div className="bg-slate-800 border border-slate-600 rounded-md p-2">
              {renderUserSelector(
                'assignee',
                expandedAssigneeCompanies,
                toggleExpandedAssigneeCompany,
                toggleAssignee,
                selectedAssignees
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4" /> Equipo de solución (opcional)
              {selectedTeam.length > 0 && (
                <Badge className="bg-purple-600 text-white">
                  {selectedTeam.length} seleccionado{selectedTeam.length > 1 ? 's' : ''}
                </Badge>
              )}
            </Label>
            <div className="bg-slate-800 border border-slate-600 rounded-md p-2">
              {renderUserSelector(
                'team',
                expandedTeamCompanies,
                toggleExpandedTeamCompany,
                toggleTeamMember,
                selectedTeam
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={!title || !area || selectedAssignees.length === 0 || !startDate || !endDate || isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isSubmitting ? 'Creando...' : 'Crear Tarea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
