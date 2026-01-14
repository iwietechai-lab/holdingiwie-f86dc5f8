import { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Briefcase, 
  Shield, 
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  SuperadminUser, 
  DbCompany, 
  DbDepartment,
  AppRole,
  APP_ROLE_LABELS,
  DashboardVisibility,
  DEFAULT_DASHBOARD_VISIBILITY,
  SUPERADMIN_USER_ID
} from '@/types/superadmin';

const VISIBILITY_LABELS: Record<keyof DashboardVisibility, string> = {
  ver_perfiles: 'Ver Perfiles de Usuarios',
  ver_empresas: 'Ver Empresas',
  ver_reportes: 'Ver Reportes',
  ver_documentos: 'Ver Documentos',
  ver_chatbot: 'Acceder al Chatbot',
  ver_logs: 'Ver Logs de Acceso',
  editar_usuarios: 'Editar Usuarios',
  gestionar_roles: 'Gestionar Roles',
};

interface SuperadminUserEditDialogProps {
  user: SuperadminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: DbCompany[];
  getDepartmentsByCompany: (companyId: string) => DbDepartment[];
  onSaveProfile: (userId: string, updates: {
    full_name: string | null;
    company_id: string | null;
    department_id: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  onSaveRole: (userId: string, role: AppRole) => Promise<{ success: boolean; error?: string }>;
  onSaveVisibility: (userId: string, visibility: DashboardVisibility) => Promise<{ success: boolean; error?: string }>;
}

export function SuperadminUserEditDialog({
  user,
  open,
  onOpenChange,
  companies,
  getDepartmentsByCompany,
  onSaveProfile,
  onSaveRole,
  onSaveVisibility,
}: SuperadminUserEditDialogProps) {
  const [fullName, setFullName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('colaborador');
  const [visibility, setVisibility] = useState<DashboardVisibility>(DEFAULT_DASHBOARD_VISIBILITY);
  const [isSaving, setIsSaving] = useState(false);
  const [departments, setDepartments] = useState<DbDepartment[]>([]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setCompanyId(user.company_id || '');
      setDepartmentId(user.department_id || '');
      setVisibility(user.dashboard_visibility || DEFAULT_DASHBOARD_VISIBILITY);
      
      // Set current role (use first role if exists)
      if (user.roles.length > 0) {
        setSelectedRole(user.roles[0].role);
      } else {
        setSelectedRole('colaborador');
      }
    }
  }, [user]);

  // Update departments when company changes
  useEffect(() => {
    if (companyId) {
      const depts = getDepartmentsByCompany(companyId);
      setDepartments(depts);
      // Reset department if not in new company
      if (!depts.some(d => d.id === departmentId)) {
        setDepartmentId('');
      }
    } else {
      setDepartments([]);
      setDepartmentId('');
    }
  }, [companyId, getDepartmentsByCompany, departmentId]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    const result = await onSaveProfile(user.id, {
      full_name: fullName || null,
      company_id: companyId || null,
      department_id: departmentId || null,
    });

    setIsSaving(false);
    return result;
  };

  const handleSaveRole = async () => {
    if (!user) return;

    setIsSaving(true);
    const result = await onSaveRole(user.id, selectedRole);
    setIsSaving(false);
    return result;
  };

  const handleSaveVisibility = async () => {
    if (!user) return;

    setIsSaving(true);
    const result = await onSaveVisibility(user.id, visibility);
    setIsSaving(false);
    return result;
  };

  const handleSaveAll = async () => {
    if (!user) return;

    setIsSaving(true);
    
    // Save profile
    const profileResult = await onSaveProfile(user.id, {
      full_name: fullName || null,
      company_id: companyId || null,
      department_id: departmentId || null,
    });

    if (!profileResult.success) {
      setIsSaving(false);
      return;
    }

    // Save role (only if user is not the superadmin or role changed)
    if (user.id !== SUPERADMIN_USER_ID || selectedRole !== 'superadmin') {
      const roleResult = await onSaveRole(user.id, selectedRole);
      if (!roleResult.success) {
        setIsSaving(false);
        return;
      }
    }

    // Save visibility
    await onSaveVisibility(user.id, visibility);

    setIsSaving(false);
    onOpenChange(false);
  };

  const toggleVisibility = (key: keyof DashboardVisibility) => {
    setVisibility(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectedCompany = companies.find(c => c.id === companyId);
  const isSuperadminUser = user?.id === SUPERADMIN_USER_ID;

  // Filter roles - don't allow assigning superadmin except to designated user
  const availableRoles = Object.entries(APP_ROLE_LABELS).filter(([role]) => {
    if (role === 'superadmin' && !isSuperadminUser) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Usuario - {user?.full_name || user?.email}
          </DialogTitle>
          <DialogDescription>
            Gestiona perfil, rol, empresa, área y permisos del dashboard
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="role">Rol y Empresa</TabsTrigger>
            <TabsTrigger value="visibility">Visibilidad</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ingresa el nombre completo"
              />
            </div>
          </TabsContent>

          {/* Role & Company Tab */}
          <TabsContent value="role" className="space-y-4 py-4">
            {/* Role */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Rol del Sistema
              </Label>
              <Select 
                value={selectedRole} 
                onValueChange={(v) => setSelectedRole(v as AppRole)}
                disabled={isSuperadminUser && selectedRole === 'superadmin'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {availableRoles.map(([role, label]) => (
                    <SelectItem key={role} value={role}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSuperadminUser && (
                <p className="text-xs text-muted-foreground">
                  Este usuario es el superadmin designado y no puede cambiar su rol principal.
                </p>
              )}
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Empresa
              </Label>
              <Select value={companyId || "_none"} onValueChange={(v) => setCompanyId(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa">
                    {selectedCompany && (
                      <span className="flex items-center gap-2">
                        <span>{selectedCompany.icon || '🏢'}</span>
                        <span>{selectedCompany.name}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="_none">Sin asignar</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <span className="flex items-center gap-2">
                        <span>{company.icon || '🏢'}</span>
                        <span>{company.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Área / Departamento
              </Label>
              <Select 
                value={departmentId || "_none"} 
                onValueChange={(v) => setDepartmentId(v === "_none" ? "" : v)}
                disabled={!companyId || departments.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !companyId 
                      ? "Selecciona primero una empresa" 
                      : departments.length === 0 
                        ? "No hay áreas para esta empresa"
                        : "Selecciona un área"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="_none">Sin asignar</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Visibility Tab */}
          <TabsContent value="visibility" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Permisos del Dashboard
              </Label>
              <p className="text-sm text-muted-foreground">
                Selecciona qué secciones puede ver este usuario
              </p>
            </div>

            <div className="grid gap-3">
              {Object.entries(VISIBILITY_LABELS).map(([key, label]) => {
                const isChecked = visibility[key as keyof DashboardVisibility];
                return (
                  <div 
                    key={key}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleVisibility(key as keyof DashboardVisibility)}
                  >
                    <div className="flex items-center gap-3">
                      {isChecked ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>
                        {label}
                      </span>
                    </div>
                    <Checkbox 
                      checked={isChecked}
                      onCheckedChange={() => toggleVisibility(key as keyof DashboardVisibility)}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? (
              'Guardando...'
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Guardar Todo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
