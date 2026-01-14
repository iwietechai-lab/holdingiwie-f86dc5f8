import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Plus, 
  Trash2, 
  Save, 
  Building2, 
  FileText, 
  Target, 
  Lightbulb, 
  TrendingUp, 
  BookOpen,
  Users,
  Shield,
  ChevronDown,
  X,
  Check,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';

interface KnowledgeEntry {
  id: string;
  company_id: string;
  category: string;
  title: string;
  content: string;
  is_confidential: boolean;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface UserAccess {
  id: string;
  user_id: string;
  company_id: string;
  user_name?: string;
  user_email?: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
}

const CATEGORIES = [
  { value: 'estrategia', label: 'Estrategia', icon: Target, color: 'text-blue-400' },
  { value: 'proyeccion', label: 'Proyección', icon: TrendingUp, color: 'text-green-400' },
  { value: 'directriz', label: 'Directriz', icon: BookOpen, color: 'text-purple-400' },
  { value: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-yellow-400' },
  { value: 'informacion', label: 'Información', icon: FileText, color: 'text-cyan-400' },
  { value: 'proyecto', label: 'Proyecto', icon: Building2, color: 'text-orange-400' },
];

export default function CEOKnowledgeManager() {
  const navigate = useNavigate();
  const { profile } = useSupabaseAuth();
  const { isSuperadmin, isCheckingRole } = useSuperadmin();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  
  // New entry form
  const [newEntry, setNewEntry] = useState({
    category: 'informacion',
    title: '',
    content: '',
    is_confidential: false,
  });

  useEffect(() => {
    // Wait for role check to complete before redirecting
    if (isCheckingRole) return;
    
    if (!isSuperadmin) {
      toast.error('No tienes permisos para acceder a esta página');
      navigate('/dashboard');
      return;
    }
    loadCompanies();
    loadAllUsers();
  }, [isSuperadmin, isCheckingRole, navigate]);

  useEffect(() => {
    if (selectedCompany) {
      loadKnowledge();
      loadUserAccess();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
      if (data && data.length > 0) {
        setSelectedCompany(data[0].id);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Error al cargar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, company_id')
        .order('full_name');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadKnowledge = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('ceo_knowledge')
        .select('*')
        .eq('company_id', selectedCompany)
        .order('category', { ascending: true });

      if (error) throw error;
      setKnowledgeEntries(data || []);
    } catch (error) {
      console.error('Error loading knowledge:', error);
      toast.error('Error al cargar conocimiento');
    }
  };

  const loadUserAccess = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('ceo_knowledge_access')
        .select('*')
        .eq('company_id', selectedCompany);

      if (error) throw error;
      
      // Enrich with user names
      const enrichedAccess = await Promise.all((data || []).map(async (access) => {
        const user = allUsers.find(u => u.id === access.user_id);
        return {
          ...access,
          user_name: user?.full_name || 'Usuario desconocido',
          user_email: user?.email || '',
        };
      }));
      
      setUserAccess(enrichedAccess);
    } catch (error) {
      console.error('Error loading user access:', error);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ceo_knowledge')
        .insert({
          company_id: selectedCompany,
          category: newEntry.category,
          title: newEntry.title,
          content: newEntry.content,
          is_confidential: newEntry.is_confidential,
          created_by: profile?.id,
        });

      if (error) throw error;

      toast.success('Conocimiento agregado exitosamente');
      setNewEntry({ category: 'informacion', title: '', content: '', is_confidential: false });
      setShowAddDialog(false);
      loadKnowledge();
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Error al agregar conocimiento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ceo_knowledge')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Conocimiento eliminado');
      loadKnowledge();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleGrantAccess = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('ceo_knowledge_access')
        .insert({
          user_id: userId,
          company_id: selectedCompany,
          granted_by: profile?.id,
        });

      if (error) throw error;

      toast.success('Acceso concedido');
      loadUserAccess();
    } catch (error) {
      console.error('Error granting access:', error);
      toast.error('Error al conceder acceso');
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('ceo_knowledge_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast.success('Acceso revocado');
      loadUserAccess();
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error('Error al revocar acceso');
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[4];
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || companyId;
  };

  // Filter users who don't have access yet and are not from this company
  const usersWithoutAccess = allUsers.filter(user => 
    user.company_id !== selectedCompany && 
    !userAccess.some(access => access.user_id === user.id)
  );

  if (isLoading || isCheckingRole) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="ml-4 text-muted-foreground">Verificando permisos...</p>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Gestor de Conocimiento CEO</h1>
                <p className="text-muted-foreground text-sm">
                  Administra la información que el chatbot comparte con tu equipo
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Seleccionar Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {company.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedCompany && (
          <Tabs defaultValue="knowledge" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="knowledge" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Conocimiento
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Control de Acceso
              </TabsTrigger>
            </TabsList>

            {/* Knowledge Tab */}
            <TabsContent value="knowledge" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {knowledgeEntries.length} entradas de conocimiento para {getCompanyName(selectedCompany)}
                </p>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Agregar Conocimiento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Agregar Conocimiento</DialogTitle>
                      <DialogDescription>
                        Añade información, estrategias o directrices para {getCompanyName(selectedCompany)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select 
                          value={newEntry.category} 
                          onValueChange={(v) => setNewEntry(prev => ({ ...prev, category: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                  <cat.icon className={`w-4 h-4 ${cat.color}`} />
                                  {cat.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={newEntry.title}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Ej: Visión Q1 2026"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contenido</Label>
                        <Textarea
                          value={newEntry.content}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Describe la información, estrategia o directriz..."
                          rows={5}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newEntry.is_confidential}
                          onCheckedChange={(checked) => setNewEntry(prev => ({ ...prev, is_confidential: checked }))}
                        />
                        <Label className="cursor-pointer">Marcar como confidencial</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddEntry} disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {knowledgeEntries.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-semibold mb-2">Sin conocimiento configurado</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Agrega información para que el chatbot pueda compartirla con tu equipo
                    </p>
                    <Button onClick={() => setShowAddDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar primer conocimiento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {CATEGORIES.map((category) => {
                    const categoryEntries = knowledgeEntries.filter(e => e.category === category.value);
                    if (categoryEntries.length === 0) return null;

                    return (
                      <Card key={category.value}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <category.icon className={`w-5 h-5 ${category.color}`} />
                            {category.label}
                            <Badge variant="secondary" className="ml-2">
                              {categoryEntries.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {categoryEntries.map((entry) => (
                            <div 
                              key={entry.id}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 group hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium truncate">{entry.title}</h4>
                                  {entry.is_confidential && (
                                    <Badge variant="destructive" className="text-xs">
                                      Confidencial
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {entry.content}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(entry.created_at).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Access Control Tab */}
            <TabsContent value="access" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Usuarios con acceso a {getCompanyName(selectedCompany)}
                  </CardTitle>
                  <CardDescription>
                    Por defecto, los usuarios solo pueden ver información de su propia empresa. 
                    Aquí puedes otorgar acceso adicional a otras empresas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Access List */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Accesos otorgados</Label>
                    {userAccess.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No hay accesos adicionales configurados
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {userAccess.map((access) => (
                          <div 
                            key={access.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Users className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{access.user_name}</p>
                                <p className="text-xs text-muted-foreground">{access.user_email}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeAccess(access.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Revocar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Grant Access */}
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">Otorgar nuevo acceso</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Selecciona usuarios de otras empresas para darles acceso a esta información
                    </p>
                    
                    {usersWithoutAccess.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Todos los usuarios externos ya tienen acceso
                      </p>
                    ) : (
                      <ScrollArea className="h-60 border rounded-lg p-2">
                        <div className="space-y-2">
                          {usersWithoutAccess.map((user) => (
                            <div 
                              key={user.id}
                              className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{user.full_name || 'Sin nombre'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {user.email} • {getCompanyName(user.company_id || '')}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGrantAccess(user.id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Otorgar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ResponsiveLayout>
  );
}