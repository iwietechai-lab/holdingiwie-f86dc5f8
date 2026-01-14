import { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Briefcase, 
  Shield, 
  Eye,
  EyeOff,
  Check,
  Network,
  Upload
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
import { Switch } from '@/components/ui/switch';
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
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/lib/supabase';

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
    gerencia_id?: string | null;
    sub_gerencia_id?: string | null;
    area_id?: string | null;
    position_id?: string | null;
    can_upload_documents?: boolean;
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
  const [gerenciaId, setGerenciaId] = useState('');
  const [subGerenciaId, setSubGerenciaId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [canUploadDocuments, setCanUploadDocuments] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('colaborador');
  const [visibility, setVisibility] = useState<DashboardVisibility>(DEFAULT_DASHBOARD_VISIBILITY);
  const [isSaving, setIsSaving] = useState(false);
  const [departments, setDepartments] = useState<DbDepartment[]>([]);

  const { 
    gerencias, 
    subGerencias, 
    areas, 
    positions, 
    fetchByCompany,
    getSubGerenciasByGerencia,
    getAreasByGerencia,
    getPositionsByGerencia
  } = useOrganization();

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setCompanyId(user.company_id || '');
      setDepartmentId(user.department_id || '');
      setVisibility(user.dashboard_visibility || DEFAULT_DASHBOARD_VISIBILITY);
      setCanUploadDocuments((user as any).can_upload_documents || false);
      
      // Load organization data
      if (user.company_id) {
        fetchByCompany(user.company_id);
      }
      
      // Load existing org structure assignments
      loadUserOrgData(user.id);
      
      // Set current role (use first role if exists)
      if (user.roles.length > 0) {
        setSelectedRole(user.roles[0].role);
      } else {
        setSelectedRole('colaborador');
      }
    }
  }, [user, fetchByCompany]);

  const loadUserOrgData = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('gerencia_id, sub_gerencia_id, area_id, position_id, can_upload_documents')
      .eq('id', userId)
      .single();
    
    if (data) {
      setGerenciaId(data.gerencia_id || '');
      setSubGerenciaId(data.sub_gerencia_id || '');
      setAreaId(data.area_id || '');
      setPositionId(data.position_id || '');
      setCanUploadDocuments(data.can_upload_documents || false);
    }
  };

  // Update departments when company changes
  useEffect(() => {
    if (companyId) {
      const depts = getDepartmentsByCompany(companyId);
      setDepartments(depts);
      fetchByCompany(companyId);
      // Reset department if not in new company
      if (!depts.some(d => d.id === departmentId)) {
        setDepartmentId('');
      }
      // Reset org structure
      setGerenciaId('');
      setSubGerenciaId('');
      setAreaId('');
      setPositionId('');
    } else {
      setDepartments([]);
      setDepartmentId('');
    }
  }, [companyId, getDepartmentsByCompany, fetchByCompany]);

  // Reset sub-gerencia when gerencia changes
  useEffect(() => {
    if (!gerenciaId) {
      setSubGerenciaId('');
      setAreaId('');
      setPositionId('');
    }
  }, [gerenciaId]);

  const handleSaveAll = async () => {
    if (!user) return;

    setIsSaving(true);
    
    // Save profile with org structure
    const profileResult = await onSaveProfile(user.id, {
      full_name: fullName || null,
      company_id: companyId || null,
      department_id: departmentId || null,
      gerencia_id: gerenciaId || null,
      sub_gerencia_id: subGerenciaId || null,
      area_id: areaId || null,
      position_id: positionId || null,
      can_upload_documents: canUploadDocuments,
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

  const filteredSubGerencias = gerenciaId ? getSubGerenciasByGerencia(gerenciaId) : [];
  const filteredAreas = gerenciaId ? getAreasByGerencia(gerenciaId) : [];
  const filteredPositions = gerenciaId ? getPositionsByGerencia(gerenciaId) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Usuario - {user?.full_name || user?.email}
          </DialogTitle>
          <DialogDescription>
            Gestiona perfil, rol, empresa, estructura organizacional y permisos
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="role">Rol y Empresa</TabsTrigger>
            <TabsTrigger value="organization">Organización</TabsTrigger>
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

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Puede subir documentos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permite al usuario subir documentos al gestor
                </p>
              </div>
              <Switch
                checked={canUploadDocuments}
                onCheckedChange={setCanUploadDocuments}
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
                Departamento
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
                        ? "No hay departamentos para esta empresa"
                        : "Selecciona un departamento"
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

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              <Network className="w-4 h-4 inline mr-2" />
              Asigna la posición del usuario en la estructura organizacional
            </div>

            {!companyId && (
              <p className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-lg">
                Selecciona primero una empresa en la pestaña "Rol y Empresa"
              </p>
            )}

            {companyId && (
              <>
                {/* Gerencia */}
                <div className="space-y-2">
                  <Label>Gerencia</Label>
                  <Select value={gerenciaId || "_none"} onValueChange={(v) => setGerenciaId(v === "_none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una gerencia" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-60">
                      <SelectItem value="_none">Sin asignar</SelectItem>
                      {gerencias.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-Gerencia */}
                <div className="space-y-2">
                  <Label>Sub-Gerencia (Cargo Gerencial)</Label>
                  <Select 
                    value={subGerenciaId || "_none"} 
                    onValueChange={(v) => setSubGerenciaId(v === "_none" ? "" : v)}
                    disabled={!gerenciaId || filteredSubGerencias.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !gerenciaId 
                          ? "Selecciona primero una gerencia" 
                          : filteredSubGerencias.length === 0 
                            ? "No hay sub-gerencias"
                            : "Selecciona una sub-gerencia"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-60">
                      <SelectItem value="_none">Sin asignar</SelectItem>
                      {filteredSubGerencias.map((sg) => (
                        <SelectItem key={sg.id} value={sg.id}>
                          {sg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Área */}
                <div className="space-y-2">
                  <Label>Área</Label>
                  <Select 
                    value={areaId || "_none"} 
                    onValueChange={(v) => setAreaId(v === "_none" ? "" : v)}
                    disabled={!gerenciaId || filteredAreas.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !gerenciaId 
                          ? "Selecciona primero una gerencia" 
                          : filteredAreas.length === 0 
                            ? "No hay áreas"
                            : "Selecciona un área"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-60">
                      <SelectItem value="_none">Sin asignar</SelectItem>
                      {filteredAreas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Posición */}
                <div className="space-y-2">
                  <Label>Posición / Cargo</Label>
                  <Select 
                    value={positionId || "_none"} 
                    onValueChange={(v) => setPositionId(v === "_none" ? "" : v)}
                    disabled={!gerenciaId || filteredPositions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !gerenciaId 
                          ? "Selecciona primero una gerencia" 
                          : filteredPositions.length === 0 
                            ? "No hay posiciones"
                            : "Selecciona una posición"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-60">
                      <SelectItem value="_none">Sin asignar</SelectItem>
                      {filteredPositions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
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