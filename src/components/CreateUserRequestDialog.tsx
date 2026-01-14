import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Mail, User, Briefcase, FileText, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUserCreationRequests } from '@/hooks/useUserCreationRequests';
import { APP_ROLE_LABELS, AppRole, DashboardVisibility, DEFAULT_DASHBOARD_VISIBILITY } from '@/types/superadmin';
import { getCompanyById } from '@/data/companies';

const formSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un email válido'),
  proposed_role: z.string().min(1, 'Selecciona un cargo'),
  justification: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateUserRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

const PERMISSION_LABELS: Record<keyof DashboardVisibility, string> = {
  ver_perfiles: 'Ver perfiles de usuarios',
  ver_empresas: 'Ver información de empresas',
  ver_reportes: 'Ver reportes y estadísticas',
  ver_documentos: 'Acceso a documentos',
  ver_chatbot: 'Acceso al chatbot',
  ver_logs: 'Ver logs del sistema',
  editar_usuarios: 'Editar usuarios',
  gestionar_roles: 'Gestionar roles',
};

export function CreateUserRequestDialog({
  open,
  onOpenChange,
  companyId,
}: CreateUserRequestDialogProps) {
  const { createRequest } = useUserCreationRequests(companyId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<DashboardVisibility>(DEFAULT_DASHBOARD_VISIBILITY);
  
  const company = getCompanyById(companyId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      proposed_role: '',
      justification: '',
    },
  });

  const handlePermissionChange = (key: keyof DashboardVisibility, value: boolean) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const result = await createRequest({
        company_id: companyId,
        full_name: values.full_name,
        email: values.email,
        proposed_role: values.proposed_role,
        justification: values.justification,
        access_permissions: permissions,
      });

      if (result.success) {
        toast.success('Solicitud enviada', {
          description: 'El CEO será notificado para aprobar la creación del usuario.',
        });
        form.reset();
        setPermissions(DEFAULT_DASHBOARD_VISIBILITY);
        onOpenChange(false);
      } else {
        toast.error('Error al enviar solicitud', {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error('Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableRoles: AppRole[] = [
    'gerente_area',
    'lider_area',
    'jefe_area',
    'jefe_seccion',
    'colaborador',
    'investigador',
    'asesor',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Solicitar Nuevo Usuario
          </DialogTitle>
          <DialogDescription>
            Solicita la creación de un nuevo usuario para {company?.name || 'la empresa'}.
            El CEO deberá aprobar esta solicitud.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nombre Completo
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del usuario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="proposed_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Cargo Propuesto
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cargo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role} value={role}>
                          {APP_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Justificación
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explica por qué es necesario agregar este usuario..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Proporciona contexto sobre el rol y responsabilidades del nuevo usuario.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Permisos Solicitados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground mb-4">
                  Selecciona los permisos que necesitará este usuario. El CEO aprobará el nivel de acceso final.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(permissions) as (keyof DashboardVisibility)[]).map(key => (
                    <div key={key} className="flex items-center justify-between space-x-2 p-2 rounded-lg bg-muted/30">
                      <Label htmlFor={key} className="text-xs font-normal cursor-pointer flex-1">
                        {PERMISSION_LABELS[key]}
                      </Label>
                      <Switch
                        id={key}
                        checked={permissions[key]}
                        onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Enviar Solicitud
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
