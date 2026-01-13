import { useState, useEffect } from 'react';
import { Building2, User, Briefcase, Shield, Eye } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { companies } from '@/data/companies';
import { UserWithDetails } from '@/hooks/useUserManagement';

// Available app roles (business roles, not system roles)
const APP_ROLES = [
  'CEO Global',
  'Gerente General',
  'Gerente Comercial',
  'Gerente Legal',
  'Gerente I+D+I',
  'Gerente Operaciones',
  'Gerente Finanzas',
  'Líder de Área',
  'Analista',
  'Ejecutivo',
  'Asistente',
];

const DEPARTMENTS = [
  'Dirección General',
  'Comercial',
  'Legal',
  'Operaciones',
  'Finanzas',
  'Recursos Humanos',
  'Tecnología',
  'Investigación y Desarrollo',
  'Marketing',
  'Energía',
];

interface UserEditDialogProps {
  user: UserWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, updates: {
    full_name: string;
    role: string;
    company_id: string;
    department: string;
    has_full_access: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  fullAccessEmails: string[];
}

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onSave,
  fullAccessEmails,
}: UserEditDialogProps) {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [department, setDepartment] = useState('');
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setRole(user.role || '');
      setCompanyId(user.company_id || '');
      setDepartment((user as any).department || '');
      setHasFullAccess(
        fullAccessEmails.some(
          (email) => email.toLowerCase() === (user.email || '').toLowerCase()
        )
      );
    }
  }, [user, fullAccessEmails]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    const result = await onSave(user.id, {
      full_name: fullName,
      role,
      company_id: companyId,
      department,
      has_full_access: hasFullAccess,
    });

    setIsSaving(false);
    if (result.success) {
      onOpenChange(false);
    }
  };

  const selectedCompany = companies.find((c) => c.id === companyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar Usuario
          </DialogTitle>
          <DialogDescription>
            Modifica la información, empresa, rol y permisos del usuario
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ingresa el nombre completo"
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Empresa
            </Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una empresa">
                  {selectedCompany && (
                    <span className="flex items-center gap-2">
                      <span>{selectedCompany.icon}</span>
                      <span>{selectedCompany.name}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <span className="flex items-center gap-2">
                      <span>{company.icon}</span>
                      <span>{company.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Rol / Cargo
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {APP_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Departamento
            </Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un departamento" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Full Access Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-base">
                <Eye className="w-4 h-4 text-primary" />
                Acceso Completo
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite ver todas las funcionalidades de la plataforma
              </p>
            </div>
            <Switch
              checked={hasFullAccess}
              onCheckedChange={setHasFullAccess}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
