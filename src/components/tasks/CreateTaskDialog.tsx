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

interface UserProfile {
  id: string;
  full_name: string | null;
  company_id: string | null;
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
  const [area, setArea] = useState('');
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [executionTime, setExecutionTime] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(companyId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      let query = supabase.from('user_profiles').select('id, full_name, company_id');
      
      if (!isSuperadmin) {
        query = query.eq('company_id', companyId);
      }
      
      const { data } = await query;
      setUsers(data || []);
    };

    const fetchCompanies = async () => {
      if (isSuperadmin) {
        const { data } = await supabase.from('companies').select('id, name');
        setCompanies(data || []);
      }
    };

    if (open) {
      fetchUsers();
      fetchCompanies();
      setSelectedCompany(companyId);
    }
  }, [open, companyId, isSuperadmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !area || selectedAssignees.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        company_id: selectedCompany,
        title,
        area,
        priority,
        execution_time: executionTime || undefined,
        assigned_to: selectedAssignees,
        team_members: selectedTeam,
      });
      
      // Reset form
      setTitle('');
      setArea('');
      setPriority('media');
      setExecutionTime('');
      setSelectedAssignees([]);
      setSelectedTeam([]);
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

  const filteredUsers = isSuperadmin && selectedCompany !== companyId
    ? users.filter(u => u.company_id === selectedCompany)
    : users;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Nueva Tarea</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSuperadmin && companies.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300">Empresa</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Seleccionar empresa" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id} className="text-white">
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Label className="text-slate-300">Tiempo de ejecución estimado</Label>
            <Input
              value={executionTime}
              onChange={e => setExecutionTime(e.target.value)}
              placeholder="Ej: 2 horas, 3 días"
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Asignar a (responsables) *</Label>
            <div className="bg-slate-800 border border-slate-600 rounded-md p-3 max-h-40 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-400 text-sm">No hay usuarios disponibles</p>
              ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`assignee-${user.id}`}
                      checked={selectedAssignees.includes(user.id)}
                      onCheckedChange={() => toggleAssignee(user.id)}
                    />
                    <label htmlFor={`assignee-${user.id}`} className="text-white text-sm cursor-pointer">
                      {user.full_name || 'Sin nombre'}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Equipo de solución (opcional)</Label>
            <div className="bg-slate-800 border border-slate-600 rounded-md p-3 max-h-40 overflow-y-auto">
              {filteredUsers.map(user => (
                <div key={user.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`team-${user.id}`}
                    checked={selectedTeam.includes(user.id)}
                    onCheckedChange={() => toggleTeamMember(user.id)}
                  />
                  <label htmlFor={`team-${user.id}`} className="text-white text-sm cursor-pointer">
                    {user.full_name || 'Sin nombre'}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!title || !area || selectedAssignees.length === 0 || isSubmitting}
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
