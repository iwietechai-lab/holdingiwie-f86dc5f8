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
import { Calendar, Clock, Users, Building2, Plus } from 'lucide-react';

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
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [priority, setPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [wantsCollaboration, setWantsCollaboration] = useState(false);
  const [selectedCollaboratingCompanies, setSelectedCollaboratingCompanies] = useState<string[]>([]);
  const [selectedExternalUsers, setSelectedExternalUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch users from user's company only
      const { data: companyUsers } = await supabase
        .from('user_profiles')
        .select('id, full_name, company_id')
        .eq('company_id', companyId);
      
      setUsers(companyUsers || []);

      // Fetch all companies for collaboration
      const { data: allCompanies } = await supabase.from('companies').select('id, name');
      setCompanies((allCompanies || []).filter(c => c.id !== companyId));

      // Fetch all users for external collaboration
      const { data: allUsersData } = await supabase
        .from('user_profiles')
        .select('id, full_name, company_id');
      setAllUsers(allUsersData || []);
    };

    if (open) {
      fetchData();
      // Reset form
      setStep(1);
      setWantsCollaboration(false);
      setSelectedCollaboratingCompanies([]);
      setSelectedExternalUsers([]);
    }
  }, [open, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !area || selectedAssignees.length === 0 || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
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
        team_members: [...selectedTeam, ...selectedExternalUsers],
        collaborating_companies: selectedCollaboratingCompanies,
      });
      
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
      setWantsCollaboration(false);
      setSelectedCollaboratingCompanies([]);
      setSelectedExternalUsers([]);
      setStep(1);
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

  const toggleCollaboratingCompany = (companyId: string) => {
    setSelectedCollaboratingCompanies(prev => {
      if (prev.includes(companyId)) {
        // Remove company and its users
        const companyUserIds = allUsers.filter(u => u.company_id === companyId).map(u => u.id);
        setSelectedExternalUsers(ext => ext.filter(id => !companyUserIds.includes(id)));
        return prev.filter(id => id !== companyId);
      }
      return [...prev, companyId];
    });
  };

  const toggleExternalUser = (userId: string) => {
    setSelectedExternalUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || companyId;
  };

  const externalUsersForSelectedCompanies = allUsers.filter(
    u => selectedCollaboratingCompanies.includes(u.company_id || '')
  );

  const handleNextStep = () => {
    if (step === 1 && title && area && startDate && endDate && selectedAssignees.length > 0) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setWantsCollaboration(false);
    setSelectedCollaboratingCompanies([]);
    setSelectedExternalUsers([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {step === 1 ? 'Nueva Tarea' : 'Colaboración Multi-Empresa'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-4">
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
              </Label>
              <div className="bg-slate-800 border border-slate-600 rounded-md p-3 max-h-40 overflow-y-auto">
                {users.length === 0 ? (
                  <p className="text-slate-400 text-sm">No hay usuarios disponibles</p>
                ) : (
                  users.map(user => (
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
                {users.map(user => (
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
                disabled={!title || !area || selectedAssignees.length === 0 || !startDate || !endDate}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Siguiente
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-slate-300 text-sm">
                ¿Desea que participen otras empresas y usuarios en el desarrollo de esta tarea?
              </p>
              <div className="flex gap-3 mt-3">
                <Button
                  variant={wantsCollaboration ? 'default' : 'outline'}
                  onClick={() => setWantsCollaboration(true)}
                  className={wantsCollaboration ? 'bg-cyan-600' : ''}
                >
                  <Plus className="h-4 w-4 mr-2" /> Sí, agregar colaboradores
                </Button>
                <Button
                  variant={!wantsCollaboration ? 'default' : 'outline'}
                  onClick={() => {
                    setWantsCollaboration(false);
                    setSelectedCollaboratingCompanies([]);
                    setSelectedExternalUsers([]);
                  }}
                  className={!wantsCollaboration ? 'bg-slate-600' : ''}
                >
                  No, crear tarea sin colaboradores externos
                </Button>
              </div>
            </div>

            {wantsCollaboration && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Empresas colaboradoras
                  </Label>
                  <div className="bg-slate-800 border border-slate-600 rounded-md p-3 max-h-40 overflow-y-auto">
                    {companies.length === 0 ? (
                      <p className="text-slate-400 text-sm">No hay otras empresas disponibles</p>
                    ) : (
                      companies.map(company => (
                        <div key={company.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`company-${company.id}`}
                            checked={selectedCollaboratingCompanies.includes(company.id)}
                            onCheckedChange={() => toggleCollaboratingCompany(company.id)}
                          />
                          <label htmlFor={`company-${company.id}`} className="text-white text-sm cursor-pointer">
                            {company.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {selectedCollaboratingCompanies.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Usuarios de empresas colaboradoras
                    </Label>
                    <div className="bg-slate-800 border border-slate-600 rounded-md p-3 max-h-48 overflow-y-auto">
                      {selectedCollaboratingCompanies.map(companyId => {
                        const companyUsers = externalUsersForSelectedCompanies.filter(
                          u => u.company_id === companyId
                        );
                        return (
                          <div key={companyId} className="mb-3">
                            <p className="text-cyan-400 text-sm font-medium mb-2">
                              {getCompanyName(companyId)}
                            </p>
                            {companyUsers.length === 0 ? (
                              <p className="text-slate-400 text-xs ml-2">Sin usuarios</p>
                            ) : (
                              companyUsers.map(user => (
                                <div key={user.id} className="flex items-center space-x-2 py-1 ml-2">
                                  <Checkbox
                                    id={`ext-user-${user.id}`}
                                    checked={selectedExternalUsers.includes(user.id)}
                                    onCheckedChange={() => toggleExternalUser(user.id)}
                                  />
                                  <label htmlFor={`ext-user-${user.id}`} className="text-white text-sm cursor-pointer">
                                    {user.full_name || 'Sin nombre'}
                                  </label>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                Volver
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Tarea'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}