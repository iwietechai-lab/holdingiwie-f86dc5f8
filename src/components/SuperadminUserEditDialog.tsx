import { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Building2, 
  Briefcase, 
  Shield, 
  Eye,
  EyeOff,
  Check,
  Network,
  Upload,
  Lock,
  AlertTriangle
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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/lib/supabase';
import { 
  canModifyUser, 
  canAssignRole, 
  getAssignableRoles, 
  canModifyPermission,
  isSelfEdit 
} from '@/utils/roleHierarchy';

const VISIBILITY_LABELS: Record<keyof DashboardVisibility, { label: string; category: string }> = {
  // Módulos principales
  ver_dashboard: { label: 'Dashboard', category: 'Módulos Principales' },
  ver_ventas: { label: 'Ventas', category: 'Módulos Principales' },
  ver_documentos: { label: 'Gestor de Documentos', category: 'Módulos Principales' },
  ver_chat_interno: { label: 'Chat Interno', category: 'Módulos Principales' },
  ver_tareas: { label: 'Gestión de Tareas', category: 'Módulos Principales' },
  ver_tickets: { label: 'Sistema de Tickets', category: 'Módulos Principales' },
  ver_reuniones: { label: 'Reuniones', category: 'Módulos Principales' },
  ver_estructura_org: { label: 'Estructura Organizacional', category: 'Módulos Principales' },
  // Chatbots
  acceso_chatbot_empresa: { label: 'Chatbot de Empresa', category: 'Asistentes IA' },
  acceso_chatbot_ceo: { label: 'Chatbot CEO', category: 'Asistentes IA' },
  // Gestión
  gestionar_usuarios: { label: 'Gestionar Usuarios', category: 'Administración' },
  gestionar_conocimiento: { label: 'Gestionar Base de Conocimiento', category: 'Administración' },
  ver_reportes: { label: 'Reportes y Estadísticas', category: 'Administración' },
  ver_logs: { label: 'Logs de Acceso', category: 'Administración' },
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
  currentUserIsSuperadmin?: boolean;
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
  currentUserIsSuperadmin = false,
}: SuperadminUserEditDialogProps) {
  const { profile: currentUserProfile } = useSupabaseAuth();
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
    // Check if user can modify this permission
    if (!canModifyPermission(key, currentUserProfile?.role, currentUserIsSuperadmin)) {
      return;
    }
    setVisibility(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectedCompany = companies.find(c => c.id === companyId);
  const isSuperadminUser = user?.id === SUPERADMIN_USER_ID;
  
  // Check if current user is editing themselves
  const isEditingSelf = isSelfEdit(currentUserProfile?.id, user?.id || null);
  
  // Check if current user can modify this target user
  const canModifyTarget = useMemo(() => {
    if (currentUserIsSuperadmin) return true;
    if (isEditingSelf) return false; // Cannot edit own permissions
    return canModifyUser(currentUserProfile?.role, user?.role, currentUserIsSuperadmin);
  }, [currentUserIsSuperadmin, currentUserProfile?.role, user?.role, isEditingSelf]);

  // Filter roles - only show roles the current user can assign
  const availableRoles = useMemo(() => {
    const assignable = getAssignableRoles(currentUserProfile?.role, currentUserIsSuperadmin);
    return Object.entries(APP_ROLE_LABELS).filter(([role]) => {
      // Never allow assigning superadmin unless current user is superadmin
      if (role === 'superadmin' && !currentUserIsSuperadmin) return false;
      // Only show roles the user can assign
      return assignable.includes(role as AppRole);
    });
  }, [currentUserProfile?.role, currentUserIsSuperadmin]);

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
            {/* Warning if editing self */}
            {isEditingSelf && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No puedes modificar tus propios permisos. Contacta a un administrador.
                </AlertDescription>
              </Alert>
            )}

            {/* Warning if cannot modify target */}
            {!canModifyTarget && !isEditingSelf && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Solo puedes modificar permisos de usuarios con rol inferior al tuyo.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Permisos y Funcionalidades
              </Label>
              <p className="text-sm text-muted-foreground">
                {canModifyTarget 
                  ? 'Selecciona las herramientas y módulos que puede acceder este usuario'
                  : 'Solo visualización - no tienes permisos para modificar'
                }
              </p>
            </div>

            {/* Group by category */}
            {['Módulos Principales', 'Asistentes IA', 'Administración'].map((category) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                <div className="grid gap-2">
                  {Object.entries(VISIBILITY_LABELS)
                    .filter(([_, config]) => config.category === category)
                    .map(([key, config]) => {
                      const isChecked = visibility[key as keyof DashboardVisibility];
                      const canModify = canModifyTarget && canModifyPermission(
                        key as keyof DashboardVisibility, 
                        currentUserProfile?.role, 
                        currentUserIsSuperadmin
                      );
                      const isLocked = !canModify;
                      
                      return (
                        <div 
                          key={key}
                          className={`flex items-center justify-between rounded-lg border p-3 ${
                            canModify 
                              ? 'hover:bg-muted/50 cursor-pointer' 
                              : 'opacity-60 cursor-not-allowed'
                          }`}
                          onClick={() => canModify && toggleVisibility(key as keyof DashboardVisibility)}
                        >
                          <div className="flex items-center gap-3">
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            ) : isChecked ? (
                              <Eye className="w-4 h-4 text-primary" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>
                              {config.label}
                            </span>
                            {isLocked && (
                              <span className="text-xs text-muted-foreground ml-1">(Bloqueado)</span>
                            )}
                          </div>
                          <Checkbox 
                            checked={isChecked}
                            disabled={!canModify}
                            onCheckedChange={() => canModify && toggleVisibility(key as keyof DashboardVisibility)}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
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