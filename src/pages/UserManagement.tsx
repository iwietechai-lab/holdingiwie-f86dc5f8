import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Clock, 
  MapPin, 
  Trash2, 
  Eye,
  ArrowLeft,
  RefreshCw,
  UserCog,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Building2,
  LogOut,
  UserPlus,
  ClipboardList,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserManagement, UserWithDetails, AccessLog } from '@/hooks/useUserManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { UserEditDialog } from '@/components/UserEditDialog';
import { getFullAccessEmails } from '@/config/allowedEmails';
import { companies, getCompanyById } from '@/data/companies';
import { CreateUserRequestDialog } from '@/components/CreateUserRequestDialog';
import { UserRequestsList } from '@/components/UserRequestsList';
import { useUserCreationRequests } from '@/hooks/useUserCreationRequests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AVAILABLE_ROLES = [
  { value: 'superadmin', label: 'Super Admin', icon: ShieldAlert, color: 'text-red-500' },
  { value: 'manager', label: 'Manager', icon: ShieldCheck, color: 'text-yellow-500' },
  { value: 'employee', label: 'Empleado', icon: Shield, color: 'text-blue-500' },
] as const;

export const UserManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const { users, isLoading, error, fetchUsers, addRole, removeRole, deleteUser, getAccessLogsByUser, updateUserWithFullAccess } = useUserManagement();
  
  // Get company filter from URL
  const companyFilterId = searchParams.get('empresa');
  const companyFilter = companyFilterId ? getCompanyById(companyFilterId) : null;
  
  const [selectedCompany, setSelectedCompany] = useState<string | null>(companyFilterId);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [showAccessLogs, setShowAccessLogs] = useState(false);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithDetails | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  
  // Get pending requests count
  const { pendingCount } = useUserCreationRequests(companyFilterId || undefined);
  
  // Check if current user can create requests (gerente, lider, or superadmin)
  const canCreateRequests = useMemo(() => {
    if (!profile) return false;
    const allowedRoles = ['gerente_area', 'lider_area', 'jefe_area', 'superadmin', 'ceo'];
    return allowedRoles.includes(profile.role || '') || profile.id === 'e5251256-2f23-4613-8f07-22b149fbad72';
  }, [profile]);
  
  // Check if current user is CEO/superadmin
  const isCEO = useMemo(() => {
    if (!profile) return false;
    return profile.id === 'e5251256-2f23-4613-8f07-22b149fbad72' || profile.role === 'ceo';
  }, [profile]);

  // Update selected company when URL param changes
  useEffect(() => {
    if (companyFilterId) {
      setSelectedCompany(companyFilterId);
    }
  }, [companyFilterId]);

  // Filter users by company if company filter is active
  const filteredUsers = useMemo(() => {
    if (!companyFilterId) {
      return users; // No filter - show all users
    }
    return users.filter(user => user.company_id === companyFilterId);
  }, [users, companyFilterId]);

  const handleSaveUser = async (
    userId: string,
    updates: {
      full_name: string;
      role: string;
      company_id: string;
      department: string;
      has_full_access: boolean;
    }
  ) => {
    const result = await updateUserWithFullAccess(userId, updates);
    if (result.success) {
      toast.success('Usuario actualizado correctamente');
    } else {
      toast.error(result.error || 'Error al actualizar usuario');
    }
    return result;
  };

  const handleViewAccessLogs = async (user: UserWithDetails) => {
    setSelectedUser(user);
    setLogsLoading(true);
    setShowAccessLogs(true);
    
    const result = await getAccessLogsByUser(user.id);
    if (result.success) {
      setAccessLogs(result.data);
    } else {
      toast.error(result.error || 'Error al cargar logs');
    }
    setLogsLoading(false);
  };

  const handleAddRole = async (userId: string, role: 'superadmin' | 'manager' | 'employee') => {
    const result = await addRole(userId, role);
    if (result.success) {
      toast.success(`Rol ${role} agregado correctamente`);
    } else {
      toast.error(result.error || 'Error al agregar rol');
    }
  };

  const handleRemoveRole = async (userId: string, role: 'superadmin' | 'manager' | 'employee') => {
    const result = await removeRole(userId, role);
    if (result.success) {
      toast.success(`Rol ${role} eliminado correctamente`);
    } else {
      toast.error(result.error || 'Error al eliminar rol');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    
    const result = await deleteUser(deleteConfirmUser.id);
    if (result.success) {
      toast.success('Usuario eliminado correctamente');
      setDeleteConfirmUser(null);
    } else {
      toast.error(result.error || 'Error al eliminar usuario');
    }
  };

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = AVAILABLE_ROLES.find(r => r.value === role);
    if (!roleConfig) return null;
    
    const Icon = roleConfig.icon;
    return (
      <Badge key={role} variant="outline" className={`${roleConfig.color} border-current`}>
        <Icon className="w-3 h-3 mr-1" />
        {roleConfig.label}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SpaceBackground />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          selectedCompany={selectedCompany} 
          onSelectCompany={setSelectedCompany} 
        />
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <MobileNav
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
        />
        <h1 className="text-lg font-bold text-foreground">Usuarios</h1>
        <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
          {/* Header - Desktop */}
          <header className="hidden lg:flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/dashboard')}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <UserCog className="w-8 h-8 text-primary" />
                  {companyFilter ? (
                    <>
                      <span className="text-xl">{companyFilter.icon}</span>
                      Usuarios de {companyFilter.name}
                    </>
                  ) : (
                    'Gestión de Usuarios'
                  )}
                </h1>
              </div>
              <p className="text-muted-foreground ml-12">
                {companyFilter 
                  ? `Administra los usuarios de ${companyFilter.name}`
                  : 'Administra usuarios, permisos y visualiza logs de acceso'
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              {companyFilterId && canCreateRequests && (
                <Button
                  onClick={() => setShowCreateRequest(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Solicitar Usuario
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => fetchUsers()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </header>

          {/* Mobile Header Content */}
          <div className="lg:hidden flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <UserCog className="w-5 h-5 text-primary" />
                {companyFilter ? (
                  <>
                    <span className="text-lg">{companyFilter.icon}</span>
                    {companyFilter.name}
                  </>
                ) : (
                  'Gestión de Usuarios'
                )}
              </h2>
            </div>
            <div className="flex gap-2">
              {companyFilterId && canCreateRequests && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateRequest(true)}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xl md:text-2xl font-bold text-foreground">{filteredUsers.length}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">Usuarios {companyFilter ? 'Empresa' : 'Totales'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {filteredUsers.filter(u => u.roles.some(r => r.role === 'superadmin')).length}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">Super Admins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {filteredUsers.filter(u => u.roles.some(r => r.role === 'manager')).length}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">Managers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <Clock className="w-6 h-6 md:w-8 md:h-8 text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {filteredUsers.filter(u => u.lastAccess && new Date(u.lastAccess) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">Activos (24h)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error message */}
          {error && (
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="p-4">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Tabs for Users and Requests (when filtering by company) */}
          {companyFilterId ? (
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Usuarios
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Solicitudes
                  {pendingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      Lista de Usuarios de {companyFilter?.name}
                    </CardTitle>
                  </CardHeader>
            <CardContent className="p-2 md:p-6 md:pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {companyFilter 
                    ? `No hay usuarios registrados en ${companyFilter.name}`
                    : 'No hay usuarios registrados'
                  }
                </div>
              ) : (
                <>
                  {/* Mobile Cards View */}
                  <div className="md:hidden space-y-3">
                    {filteredUsers.map((user) => (
                      <Card key={user.id} className="bg-card/30 border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{user.full_name || 'Sin nombre'}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email || 'Sin email'}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {user.company_id && (
                                  <span className="text-sm">
                                    {getCompanyById(user.company_id)?.icon || '🏢'}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">{user.role || 'Sin cargo'}</span>
                              </div>
                              {user.has_full_access && (
                                <Badge variant="outline" className="text-primary border-primary text-[10px] mt-2">
                                  <Eye className="w-2 h-2 mr-1" />
                                  Acceso Completo
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewAccessLogs(user)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingUser(user)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteConfirmUser(user)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Cargo / Acceso</TableHead>
                          <TableHead>Último Acceso</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <React.Fragment key={user.id}>
                            <TableRow className="hover:bg-muted/50">
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleUserExpand(user.id)}
                                >
                                  {expandedUsers.has(user.id) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-foreground">{user.full_name || 'Sin nombre'}</p>
                                  <p className="text-sm text-muted-foreground">{user.email || 'Sin email'}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {user.company_id ? (
                                  <div className="flex items-center gap-2">
                                    <span>{getCompanyById(user.company_id)?.icon || '🏢'}</span>
                                    <span className="text-sm">{getCompanyById(user.company_id)?.name || user.company_id}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Sin asignar</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-medium">{user.role || 'Sin cargo'}</span>
                                  {user.has_full_access && (
                                    <Badge variant="outline" className="text-primary border-primary w-fit text-xs">
                                      <Eye className="w-3 h-3 mr-1" />
                                      Acceso Completo
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {user.lastAccess ? (
                                  <span className="text-sm">
                                    {format(new Date(user.lastAccess), "dd MMM yyyy, HH:mm", { locale: es })}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Nunca</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewAccessLogs(user)}
                                    title="Ver logs de acceso"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" title="Gestionar roles">
                                        <Shield className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-popover">
                                      <div className="px-2 py-1.5 text-sm font-semibold">Agregar Rol</div>
                                      {AVAILABLE_ROLES.map((role) => {
                                        const hasRole = user.roles.some(r => r.role === role.value);
                                        const Icon = role.icon;
                                        return (
                                          <DropdownMenuItem
                                            key={role.value}
                                            onClick={() => !hasRole && handleAddRole(user.id, role.value)}
                                            disabled={hasRole}
                                            className="cursor-pointer"
                                          >
                                            <Icon className={`w-4 h-4 mr-2 ${role.color}`} />
                                            {role.label}
                                            {hasRole && <CheckCircle className="w-4 h-4 ml-auto text-green-500" />}
                                          </DropdownMenuItem>
                                        );
                                      })}
                                      
                                      {user.roles.length > 0 && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <div className="px-2 py-1.5 text-sm font-semibold text-destructive">Eliminar Rol</div>
                                          {user.roles.map((userRole) => {
                                            const roleConfig = AVAILABLE_ROLES.find(r => r.value === userRole.role);
                                            if (!roleConfig) return null;
                                            const Icon = roleConfig.icon;
                                            return (
                                              <DropdownMenuItem
                                                key={userRole.id}
                                                onClick={() => handleRemoveRole(user.id, userRole.role)}
                                                className="cursor-pointer text-destructive"
                                              >
                                                <Icon className="w-4 h-4 mr-2" />
                                                Quitar {roleConfig.label}
                                              </DropdownMenuItem>
                                            );
                                          })}
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingUser(user)}
                                    title="Editar usuario"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteConfirmUser(user)}
                                    title="Eliminar usuario"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {/* Expanded details row */}
                            {expandedUsers.has(user.id) && (
                              <TableRow>
                                <TableCell colSpan={6} className="bg-muted/30 p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Información del Usuario</h4>
                                      <div className="space-y-1 text-sm">
                                        <p><span className="text-muted-foreground">ID:</span> {user.id}</p>
                                        <p><span className="text-muted-foreground">Rol en App:</span> {user.role || 'No definido'}</p>
                                        <p><span className="text-muted-foreground">Creado:</span> {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy", { locale: es }) : 'N/A'}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Últimos Accesos ({user.accessLogs.length})</h4>
                                      <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                                        {user.accessLogs.slice(0, 5).map((log) => (
                                          <div key={log.id} className="flex items-center gap-2">
                                            {log.success ? (
                                              <CheckCircle className="w-3 h-3 text-green-500" />
                                            ) : (
                                              <XCircle className="w-3 h-3 text-red-500" />
                                            )}
                                            <span>{log.timestampt ? format(new Date(log.timestampt), "dd/MM HH:mm", { locale: es }) : 'N/A'}</span>
                                            {log.city && (
                                              <span className="text-muted-foreground flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {log.city}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                        {user.accessLogs.length === 0 && (
                                          <p className="text-muted-foreground">Sin registros de acceso</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
              </TabsContent>

              <TabsContent value="requests">
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                      <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      Solicitudes de Nuevos Usuarios
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 md:pt-0">
                    <UserRequestsList companyId={companyFilterId} isCEO={isCEO} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            /* No company filter - show all users without tabs */
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  Lista de Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-6 md:pt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay usuarios registrados
                  </div>
                ) : (
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.company_id && (
                                <span>{getCompanyById(user.company_id)?.name || user.company_id}</span>
                              )}
                            </TableCell>
                            <TableCell>{user.role || 'Sin cargo'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {user.roles.map(r => getRoleBadge(r.role))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewAccessLogs(user)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirmUser(user)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Access Logs Dialog */}
      <Dialog open={showAccessLogs} onOpenChange={setShowAccessLogs}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Logs de Acceso - {selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
            <DialogDescription>
              Historial de accesos del usuario al sistema
            </DialogDescription>
          </DialogHeader>
          
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay registros de acceso
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Dispositivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.success ? (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Exitoso
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-500 border-red-500">
                          <XCircle className="w-3 h-3 mr-1" />
                          Fallido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.timestampt ? format(new Date(log.timestampt), "dd MMM yyyy, HH:mm:ss", { locale: es }) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {log.city || log.country ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[log.city, log.country].filter(Boolean).join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Desconocida</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                        {log.device_info || 'N/A'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccessLogs(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{' '}
              <strong>{deleteConfirmUser?.full_name || deleteConfirmUser?.email}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit User Dialog */}
      <UserEditDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSave={handleSaveUser}
        fullAccessEmails={getFullAccessEmails()}
      />

      {/* Create User Request Dialog */}
      {companyFilterId && (
        <CreateUserRequestDialog
          open={showCreateRequest}
          onOpenChange={setShowCreateRequest}
          companyId={companyFilterId}
        />
      )}
    </div>
  );
};

export default UserManagement;
