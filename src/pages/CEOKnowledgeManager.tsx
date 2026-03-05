import { useState, useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Plus, 
  Trash2, 
  Building2, 
  FileText, 
  Target, 
  Lightbulb, 
  TrendingUp, 
  BookOpen,
  Shield,
  ArrowLeft,
  Upload,
  MessageSquare,
  Send,
  Sparkles,
  FileUp,
  X,
  Loader2
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface KnowledgeEntry {
  id: string;
  company_id: string;
  category: string;
  title: string;
  content: string;
  is_confidential: boolean;
  created_at: string;
  document_url?: string | null;
  document_name?: string | null;
  document_type?: string | null;
  analyzed_summary?: string | null;
  key_points?: any[] | null;
}

interface Company {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

type AccessLevel = 'global_holding' | 'empresa' | 'proyecto' | 'desarrollo' | 'confidencial';

interface UserAccess {
  id: string;
  user_id: string;
  company_id: string;
  access_level: AccessLevel;
  allowed_categories: string[];
  notes?: string;
  user_name?: string;
  user_email?: string;
}

const ACCESS_LEVELS = [
  { value: 'global_holding' as AccessLevel, label: 'Global Holding', description: 'Acceso a todo el conocimiento de todas las empresas' },
  { value: 'empresa' as AccessLevel, label: 'Empresa', description: 'Acceso a todo el conocimiento de la empresa seleccionada' },
  { value: 'proyecto' as AccessLevel, label: 'Proyecto', description: 'Acceso limitado a información de proyectos' },
  { value: 'desarrollo' as AccessLevel, label: 'Desarrollo', description: 'Acceso a información de desarrollo técnico' },
  { value: 'confidencial' as AccessLevel, label: 'Confidencial', description: 'Acceso a información confidencial estratégica' },
];

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  company_id: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // New entry form
  const [newEntry, setNewEntry] = useState({
    category: 'informacion',
    title: '',
    content: '',
    is_confidential: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Chatbot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [selectedEntryForAnalysis, setSelectedEntryForAnalysis] = useState<KnowledgeEntry | null>(null);
  
  // Access grant dialog state
  const [showGrantAccessDialog, setShowGrantAccessDialog] = useState(false);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<UserProfile | null>(null);
  const [accessConfig, setAccessConfig] = useState<{
    access_level: AccessLevel;
    allowed_categories: string[];
    notes: string;
  }>({
    access_level: 'empresa',
    allowed_categories: ['informacion'],
    notes: '',
  });

  useEffect(() => {
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
      logger.error('Error loading companies:', error);
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
      logger.error('Error loading users:', error);
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
      
      // Parse entries with proper typing
      const entries: KnowledgeEntry[] = (data || []).map(entry => ({
        id: entry.id,
        company_id: entry.company_id,
        category: entry.category,
        title: entry.title,
        content: entry.content,
        is_confidential: entry.is_confidential || false,
        created_at: entry.created_at,
        document_url: entry.document_url,
        document_name: entry.document_name,
        document_type: entry.document_type,
        analyzed_summary: entry.analyzed_summary,
        key_points: entry.key_points ? (Array.isArray(entry.key_points) ? entry.key_points : []) : null,
      }));
      
      setKnowledgeEntries(entries);
    } catch (error) {
      logger.error('Error loading knowledge:', error);
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
      
      const enrichedAccess = (data || []).map((access) => {
        const user = allUsers.find(u => u.id === access.user_id);
        return {
          ...access,
          user_name: user?.full_name || 'Usuario desconocido',
          user_email: user?.email || '',
        };
      });
      
      setUserAccess(enrichedAccess);
    } catch (error) {
      logger.error('Error loading user access:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de archivo no soportado. Usa PDF, DOC, DOCX o TXT.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande. Máximo 50MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadDocument = async (): Promise<{ url: string; name: string; type: string } | null> => {
    if (!selectedFile) return null;
    
    setIsUploading(true);
    try {
      const fileName = `${selectedCompany}/${Date.now()}-${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ceo-knowledge-docs')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('ceo-knowledge-docs')
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        name: selectedFile.name,
        type: selectedFile.type,
      };
    } catch (error) {
      logger.error('Error uploading document:', error);
      toast.error('Error al subir documento');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.title.trim() || (!newEntry.content.trim() && !selectedFile)) {
      toast.error('Por favor completa el título y contenido o sube un documento');
      return;
    }

    setIsSaving(true);
    try {
      let documentData = null;
      if (selectedFile) {
        documentData = await uploadDocument();
      }

      const insertData: any = {
        company_id: selectedCompany,
        category: newEntry.category,
        title: newEntry.title,
        content: newEntry.content || `Documento: ${selectedFile?.name}`,
        is_confidential: newEntry.is_confidential,
        created_by: profile?.id,
      };

      if (documentData) {
        insertData.document_url = documentData.url;
        insertData.document_name = documentData.name;
        insertData.document_type = documentData.type;
      }

      const { error } = await supabase
        .from('ceo_knowledge')
        .insert(insertData);

      if (error) throw error;

      toast.success('Conocimiento agregado exitosamente');
      setNewEntry({ category: 'informacion', title: '', content: '', is_confidential: false });
      setSelectedFile(null);
      setShowAddDialog(false);
      loadKnowledge();
    } catch (error) {
      logger.error('Error adding entry:', error);
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
      logger.error('Error deleting entry:', error);
      toast.error('Error al eliminar');
    }
  };

  const openGrantAccessDialog = (user: UserProfile) => {
    setSelectedUserForAccess(user);
    setAccessConfig({
      access_level: 'empresa',
      allowed_categories: ['informacion'],
      notes: '',
    });
    setShowGrantAccessDialog(true);
  };

  const handleGrantAccess = async () => {
    if (!selectedUserForAccess) return;
    
    try {
      const { error } = await supabase
        .from('ceo_knowledge_access')
        .insert({
          user_id: selectedUserForAccess.id,
          company_id: selectedCompany,
          granted_by: profile?.id,
          access_level: accessConfig.access_level,
          allowed_categories: accessConfig.allowed_categories,
          notes: accessConfig.notes || null,
        });

      if (error) throw error;

      toast.success(`Acceso concedido a ${selectedUserForAccess.full_name || selectedUserForAccess.email}`);
      setShowGrantAccessDialog(false);
      setSelectedUserForAccess(null);
      loadUserAccess();
    } catch (error) {
      logger.error('Error granting access:', error);
      toast.error('Error al conceder acceso');
    }
  };

  const toggleCategory = (category: string) => {
    setAccessConfig(prev => ({
      ...prev,
      allowed_categories: prev.allowed_categories.includes(category)
        ? prev.allowed_categories.filter(c => c !== category)
        : [...prev.allowed_categories, category],
    }));
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
      logger.error('Error revoking access:', error);
      toast.error('Error al revocar acceso');
    }
  };

  const analyzeKnowledge = async (entry: KnowledgeEntry) => {
    setIsAnalyzing(true);
    setSelectedEntryForAnalysis(entry);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-knowledge', {
        body: {
          action: 'analyze',
          content: entry.content,
          title: entry.title,
          category: entry.category,
          companyName: getCompanyName(entry.company_id),
        },
      });

      if (error) throw error;

      if (data.success) {
        // Update the entry with analysis
        await supabase
          .from('ceo_knowledge')
          .update({
            analyzed_summary: data.summary,
            key_points: data.keyPoints,
          })
          .eq('id', entry.id);

        // Add analysis to chat
        setChatMessages([
          { role: 'assistant', content: data.response }
        ]);
        
        toast.success('Análisis completado');
        loadKnowledge();
      }
    } catch (error) {
      logger.error('Error analyzing knowledge:', error);
      toast.error('Error al analizar conocimiento');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSendingChat(true);

    try {
      // Build context from all knowledge entries
      const knowledgeContext = knowledgeEntries
        .map(e => `**${e.title}** (${e.category}):\n${e.content}`)
        .join('\n\n---\n\n');

      const { data, error } = await supabase.functions.invoke('analyze-knowledge', {
        body: {
          action: 'chat',
          message: userMessage,
          context: `Empresa: ${getCompanyName(selectedCompany)}\n\nConocimiento disponible:\n${knowledgeContext}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      logger.error('Error sending chat message:', error);
      toast.error('Error al enviar mensaje');
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error al procesar tu mensaje.' }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const suggestChatbotResponse = async (entry: KnowledgeEntry) => {
    setIsSendingChat(true);
    setChatMessages([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-knowledge', {
        body: {
          action: 'suggest_response',
          message: `Para el conocimiento "${entry.title}", ¿cómo debería el chatbot CEO comunicar esta información al equipo?`,
          context: `Título: ${entry.title}\nCategoría: ${entry.category}\nContenido: ${entry.content}\nConfidencial: ${entry.is_confidential ? 'Sí' : 'No'}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setChatMessages([
          { role: 'user', content: `Sugiere cómo comunicar "${entry.title}" al equipo` },
          { role: 'assistant', content: data.response }
        ]);
      }
    } catch (error) {
      logger.error('Error getting suggestion:', error);
      toast.error('Error al obtener sugerencia');
    } finally {
      setIsSendingChat(false);
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[4];
  };

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || companyId;
  };

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
            <Button variant="ghost" size="icon" onClick={() => navigate('/ceo-chatbot')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Base de Conocimiento Gerencial</h1>
                <p className="text-muted-foreground text-sm">
                  Enseña al sistema tu conocimiento de gestión empresarial
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="knowledge" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Conocimiento
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Analizar
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Accesos
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
                      Enseñar Conocimiento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Enseñar Conocimiento</DialogTitle>
                      <DialogDescription>
                        Comparte tu conocimiento gerencial para que el sistema aprenda sobre {getCompanyName(selectedCompany)}
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
                      
                      {/* Document Upload */}
                      <div className="space-y-2">
                        <Label>Documento (opcional)</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          {selectedFile ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileUp className="w-5 h-5 text-primary" />
                                <span className="text-sm">{selectedFile.name}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedFile(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className="gap-2"
                            >
                              <Upload className="w-4 h-4" />
                              Subir Documento
                            </Button>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            PDF, DOC, DOCX o TXT (máx. 50MB)
                          </p>
                        </div>
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
                      <Button onClick={handleAddEntry} disabled={isSaving || isUploading}>
                        {(isSaving || isUploading) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isUploading ? 'Subiendo...' : 'Guardando...'}
                          </>
                        ) : 'Guardar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {knowledgeEntries.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-semibold mb-2">Comienza a enseñar al sistema</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Comparte tu conocimiento gerencial para que el sistema aprenda cómo gestionas tus empresas
                    </p>
                    <Button onClick={() => setShowAddDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Enseñar primer conocimiento
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
                                  <span className="font-medium truncate">{entry.title}</span>
                                  {entry.is_confidential && (
                                    <Badge variant="destructive" className="text-xs">Confidencial</Badge>
                                  )}
                                  {entry.document_name && (
                                    <Badge variant="outline" className="text-xs">
                                      <FileUp className="w-3 h-3 mr-1" />
                                      Documento
                                    </Badge>
                                  )}
                                  {entry.analyzed_summary && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Analizado
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {entry.content}
                                </p>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => analyzeKnowledge(entry)}
                                  disabled={isAnalyzing}
                                  title="Analizar"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => suggestChatbotResponse(entry)}
                                  title="Sugerir respuesta"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Analysis Tab with Internal Chatbot */}
            <TabsContent value="analysis" className="space-y-4">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    Tu Asistente Gerencial
                  </CardTitle>
                  <CardDescription>
                    He aprendido de tu conocimiento. Pregúntame lo que necesites y te ayudaré basándome en lo que me has enseñado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0">
                  {/* Chat Messages */}
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 pb-4">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                          <h3 className="font-semibold mb-2">Estoy listo para asistirte</h3>
                          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                            He aprendido del conocimiento que me compartiste. Ahora puedo ayudarte a recordar estrategias, estructurar ideas o responder consultas basándome en lo que me enseñaste.
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setChatInput('¿Qué estrategias tengo definidas para esta empresa?');
                              }}
                            >
                              Mis estrategias
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setChatInput('Ayúdame a estructurar un mensaje para mi equipo');
                              }}
                            >
                              Estructurar mensaje
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setChatInput('Dame un resumen de las directrices principales');
                              }}
                            >
                              Resumen de directrices
                            </Button>
                          </div>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {msg.role === 'assistant' ? (
                                <MarkdownRenderer content={msg.content} />
                              ) : (
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isSendingChat && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-2xl px-4 py-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                  
                  {/* Chat Input */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Pregúntame sobre lo que me enseñaste..."
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                      disabled={isSendingChat || knowledgeEntries.length === 0}
                    />
                    <Button 
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || isSendingChat || knowledgeEntries.length === 0}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {knowledgeEntries.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Enséñame tu conocimiento primero para poder asistirte
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Access Control Tab */}
            <TabsContent value="access" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Usuarios con Acceso
                  </CardTitle>
                  <CardDescription>
                    Estos usuarios pueden consultar el conocimiento de {getCompanyName(selectedCompany)} según su nivel de acceso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userAccess.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay usuarios con acceso especial. Los usuarios de {getCompanyName(selectedCompany)} tienen acceso automático al contenido no confidencial.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {userAccess.map((access) => {
                        const levelInfo = ACCESS_LEVELS.find(l => l.value === access.access_level);
                        return (
                          <div key={access.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/30">
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium">{access.user_name}</p>
                                <p className="text-sm text-muted-foreground">{access.user_email}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                  {levelInfo?.label || access.access_level}
                                </Badge>
                                {access.access_level !== 'global_holding' && access.access_level !== 'empresa' && (
                                  access.allowed_categories?.map((cat: string) => {
                                    const catInfo = CATEGORIES.find(c => c.value === cat);
                                    return (
                                      <Badge key={cat} variant="outline" className="text-xs">
                                        {catInfo?.label || cat}
                                      </Badge>
                                    );
                                  })
                                )}
                              </div>
                              {access.notes && (
                                <p className="text-xs text-muted-foreground italic">{access.notes}</p>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRevokeAccess(access.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Revocar
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Conceder Acceso</CardTitle>
                  <CardDescription>
                    Selecciona usuarios de otras empresas para darles acceso a este conocimiento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {usersWithoutAccess.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30">
                          <div>
                            <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openGrantAccessDialog(user)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Conceder
                          </Button>
                        </div>
                      ))}
                      {usersWithoutAccess.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Todos los usuarios ya tienen acceso
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Grant Access Dialog */}
              <Dialog open={showGrantAccessDialog} onOpenChange={setShowGrantAccessDialog}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configurar Acceso</DialogTitle>
                    <DialogDescription>
                      Define el nivel de acceso y las categorías que puede consultar {selectedUserForAccess?.full_name || selectedUserForAccess?.email}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Access Level Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Nivel de Acceso</Label>
                      <div className="space-y-2">
                        {ACCESS_LEVELS.map((level) => (
                          <div 
                            key={level.value}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              accessConfig.access_level === level.value 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border hover:bg-muted/50'
                            }`}
                            onClick={() => setAccessConfig(prev => ({ ...prev, access_level: level.value }))}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                accessConfig.access_level === level.value 
                                  ? 'border-primary' 
                                  : 'border-muted-foreground'
                              }`}>
                                {accessConfig.access_level === level.value && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{level.label}</p>
                                <p className="text-xs text-muted-foreground">{level.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Category Filters - Only show for proyecto, desarrollo, confidencial */}
                    {['proyecto', 'desarrollo', 'confidencial'].includes(accessConfig.access_level) && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Categorías Permitidas</Label>
                        <p className="text-xs text-muted-foreground">
                          Selecciona qué tipo de información puede consultar este usuario
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {CATEGORIES.map((cat) => {
                            const isSelected = accessConfig.allowed_categories.includes(cat.value);
                            const Icon = cat.icon;
                            return (
                              <div
                                key={cat.value}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-2 ${
                                  isSelected 
                                    ? 'border-primary bg-primary/10' 
                                    : 'border-border hover:bg-muted/50'
                                }`}
                                onClick={() => toggleCategory(cat.value)}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                }`}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <Icon className={`w-4 h-4 ${cat.color}`} />
                                <span className="text-sm">{cat.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        {accessConfig.allowed_categories.length === 0 && (
                          <p className="text-xs text-destructive">Debes seleccionar al menos una categoría</p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Notas (opcional)</Label>
                      <Textarea
                        value={accessConfig.notes}
                        onChange={(e) => setAccessConfig(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Razón del acceso, limitaciones, etc."
                        rows={2}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowGrantAccessDialog(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleGrantAccess}
                      disabled={
                        ['proyecto', 'desarrollo', 'confidencial'].includes(accessConfig.access_level) && 
                        accessConfig.allowed_categories.length === 0
                      }
                    >
                      Conceder Acceso
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ResponsiveLayout>
  );
}
