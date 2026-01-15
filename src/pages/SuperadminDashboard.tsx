import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Users, 
  Building2,
  RefreshCw,
  ArrowLeft,
  Search,
  Edit,
  Filter,
  Crown,
  Briefcase,
  Eye,
  Plus,
  Brain
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { CompanyIcon } from '@/components/CompanyIcon';
import { SpaceBackground } from '@/components/SpaceBackground';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { SuperadminUserEditDialog } from '@/components/SuperadminUserEditDialog';
import { CreateCompanyDialog } from '@/components/CreateCompanyDialog';
import { ChatbotKnowledgeManager } from '@/components/ChatbotKnowledgeManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  SuperadminUser, 
  AppRole,
  SUPERADMIN_USER_ID
} from '@/types/superadmin';

export default function SuperadminDashboard() {
  const navigate = useNavigate();
  const {
    isSuperadmin,
    isCheckingRole,
    users,
    companies,
    departments,
    isLoading,
    error,
    fetchUsers,
    getDepartmentsByCompany,
    updateUserProfile,
    updateUserRole,
    updateDashboardVisibility,
    createCompany,
  } = useSuperadmin();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<SuperadminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [showCreateCompany, setShowCreateCompany] = useState(false);

  // Filter users
  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchLower) || false) ||
      (user.email?.toLowerCase().includes(searchLower) || false) ||
      (user.role?.toLowerCase().includes(searchLower) || false);

    // Role filter
    const matchesRole = roleFilter === 'all' || user.roles.some(r => r.role === roleFilter);

    // Company filter
    const matchesCompany = companyFilter === 'all' || user.company_id === companyFilter;

    return matchesSearch && matchesRole && matchesCompany;
  });

  const handleSaveProfile = async (userId: string, updates: any) => {
    const result = await updateUserProfile(userId, updates);
    if (result.success) {
      toast.success('Perfil actualizado correctamente');
    } else {
      toast.error(result.error || 'Error al actualizar perfil');
    }
    return result;
  };

  const handleSaveRole = async (userId: string, role: AppRole) => {
    const result = await updateUserRole(userId, role);
    if (result.success) {
      toast.success('Rol actualizado correctamente');
    } else {
      toast.error(result.error || 'Error al actualizar rol');
    }
    return result;
  };

  const handleSaveVisibility = async (userId: string, visibility: any) => {
    const result = await updateDashboardVisibility(userId, visibility);
    if (result.success) {
      toast.success('Visibilidad actualizada correctamente');
    } else {
      toast.error(result.error || 'Error al actualizar visibilidad');
    }
    return result;
  };

  const handleCreateCompany = async (company: { id: string; name: string; icon?: string; color?: string; description?: string }) => {
    const result = await createCompany(company);
    if (result.success) {
      toast.success('Empresa creada correctamente');
    } else {
      toast.error(result.error || 'Error al crear empresa');
    }
    return result;
  };

  // Map database roles to display labels
  const DB_ROLE_LABELS: Record<string, string> = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    employee: 'Empleado',
    user: 'Usuario',
  };

  const DB_ROLE_COLORS: Record<string, string> = {
    superadmin: 'bg-red-500/20 text-red-400 border-red-500',
    admin: 'bg-purple-500/20 text-purple-400 border-purple-500',
    manager: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
    employee: 'bg-green-500/20 text-green-400 border-green-500',
    user: 'bg-gray-500/20 text-gray-400 border-gray-500',
  };

  const getRoleBadge = (role: string) => {
    const color = DB_ROLE_COLORS[role] || 'bg-gray-500/20 text-gray-400 border-gray-500';
    const label = DB_ROLE_LABELS[role] || role;

    return (
      <Badge variant="outline" className={`${color} border`}>
        {role === 'superadmin' && <Crown className="w-3 h-3 mr-1" />}
        {label}
      </Badge>
    );
  };

  // Loading state
  if (isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (!isSuperadmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <Card className="max-w-md mx-auto bg-card/50 backdrop-blur-sm border-destructive">
          <CardContent className="p-8 text-center space-y-4">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
            <p className="text-muted-foreground">
              No tienes permisos de superadmin para acceder a esta sección.
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      
      <Sidebar 
        selectedCompany={selectedCompany} 
        onSelectCompany={setSelectedCompany} 
      />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <header className="flex items-center justify-between">
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
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                  Panel Super Admin
                </h1>
              </div>
              <p className="text-muted-foreground ml-12">
                Gestión exclusiva de usuarios, roles, empresas y permisos
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={() => fetchUsers()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </header>

          {/* Tabs for different sections */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="companies" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Empresas
              </TabsTrigger>
              <TabsTrigger value="chatbot" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Knowledge Base
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold text-foreground">{users.length}</p>
                        <p className="text-xs text-muted-foreground">Usuarios Totales</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold text-foreground">{companies.length}</p>
                        <p className="text-xs text-muted-foreground">Empresas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card 
                  className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 cursor-pointer transition-colors"
                  onClick={() => setShowCreateCompany(true)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Plus className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Nueva Empresa</p>
                        <p className="text-xs text-muted-foreground">Añadir empresa</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold text-foreground">{departments.length}</p>
                        <p className="text-xs text-muted-foreground">Departamentos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-card/50 backdrop-blur-sm border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Crown className="w-8 h-8 text-yellow-500" />
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {users.filter(u => u.roles.some(r => ['superadmin', 'admin', 'manager'].includes(r.role))).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Líderes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

          {/* Filters */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, email o cargo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por rol" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos los roles</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="user">Usuario</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-[200px]">
                    <Building2 className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por empresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todas las empresas</SelectItem>
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
            </CardContent>
          </Card>

          {/* Error message */}
          {error && (
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="p-4">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Gestión de Usuarios ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron usuarios
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Empresa / Área</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Visibilidad</TableHead>
                      <TableHead>Fecha Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className={`hover:bg-muted/50 ${user.id === SUPERADMIN_USER_ID ? 'bg-red-500/5' : ''}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">
                                {(user.full_name || user.email || '?')[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground flex items-center gap-2">
                                {user.full_name || 'Sin nombre'}
                                {user.id === SUPERADMIN_USER_ID && (
                                  <Crown className="w-4 h-4 text-yellow-500" />
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.company ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <span>{user.company.icon || '🏢'}</span>
                                <span className="text-sm font-medium">{user.company.name}</span>
                              </div>
                              {user.department && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {user.department.name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <span key={role.id}>
                                  {getRoleBadge(role.role)}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin rol</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {user.role || 'Sin definir'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.dashboard_visibility ? (
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {Object.values(user.dashboard_visibility).filter(Boolean).length} permisos
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Predeterminado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.created_at ? (
                            <span className="text-sm">
                              {format(new Date(user.created_at), "dd MMM yyyy", { locale: es })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* Companies Tab */}
            <TabsContent value="companies" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                  <Card key={company.id} className="bg-card/50 backdrop-blur-sm border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CompanyIcon companyId={company.id} icon={company.icon} size="xl" />
                        <div>
                          <p className="font-medium text-foreground">{company.name}</p>
                          <p className="text-sm text-muted-foreground">{company.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {users.filter(u => u.company_id === company.id).length} usuarios
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card 
                  className="bg-card/30 border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors"
                  onClick={() => setShowCreateCompany(true)}
                >
                  <CardContent className="p-4 flex items-center justify-center h-full">
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Agregar Empresa</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Chatbot Knowledge Base Tab */}
            <TabsContent value="chatbot">
              <ChatbotKnowledgeManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit User Dialog */}
      <SuperadminUserEditDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        companies={companies}
        getDepartmentsByCompany={getDepartmentsByCompany}
        onSaveProfile={handleSaveProfile}
        onSaveRole={handleSaveRole}
        onSaveVisibility={handleSaveVisibility}
      />

      {/* Create Company Dialog */}
      <CreateCompanyDialog
        open={showCreateCompany}
        onOpenChange={setShowCreateCompany}
        onSave={handleCreateCompany}
      />
    </div>
  );
}
