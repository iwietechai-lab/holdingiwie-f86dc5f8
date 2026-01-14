import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Loader2,
  Trash2,
  Bot,
  User,
  Plus,
  FileText,
  Upload,
  Lightbulb,
  CheckCircle,
  Clock,
  Brain,
  Paperclip,
  Link,
  X,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useCompanyKnowledge } from '@/hooks/useCompanyKnowledge';
import { getCompanyById } from '@/data/companies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import uavIcon from '@/assets/uav-icon.png';

// Allowed file types for security
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Security scan for files
const scanFileForSecurity = (file: File): { safe: boolean; message: string } => {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { safe: false, message: `Tipo de archivo no permitido: ${file.type || 'desconocido'}` };
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { safe: false, message: 'El archivo excede el tamaño máximo de 10MB' };
  }
  
  // Check file name for suspicious patterns
  const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.js', '.vbs', '.php'];
  const fileName = file.name.toLowerCase();
  if (suspiciousPatterns.some(pattern => fileName.endsWith(pattern))) {
    return { safe: false, message: 'Extensión de archivo no permitida por seguridad' };
  }
  
  return { safe: true, message: 'Archivo verificado' };
};

// Security scan for URLs
const scanUrlForSecurity = (url: string): { safe: boolean; message: string } => {
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { safe: false, message: 'Solo se permiten URLs HTTP/HTTPS' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (suspiciousPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
      return { safe: false, message: 'URL contiene patrones sospechosos' };
    }
    
    return { safe: true, message: 'URL verificada' };
  } catch {
    return { safe: false, message: 'URL inválida' };
  }
};

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'estrategia', label: 'Estrategia' },
  { value: 'procesos', label: 'Procesos' },
  { value: 'productos', label: 'Productos/Servicios' },
  { value: 'proyectos', label: 'Proyectos' },
  { value: 'propuestas', label: 'Propuestas' },
  { value: 'mejoras', label: 'Ideas de Mejora' },
  { value: 'problemas', label: 'Problemas/Soluciones' },
];

export default function CompanyChatbotPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('empresa');
  const company = companyId ? getCompanyById(companyId) : null;
  
  const { user, isAuthenticated, isLoading: authLoading, profile } = useSupabaseAuth();
  const { knowledge, isLoading: knowledgeLoading, addKnowledge, analyzeKnowledge, pendingAnalysis, approvedCount } = useCompanyKnowledge(companyId || undefined);

  const [selectedCompany, setSelectedCompany] = useState<string | null>(companyId);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add knowledge dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // File and link attachment states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSecurityStatus, setFileSecurityStatus] = useState<{ safe: boolean; message: string } | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkSecurityStatus, setLinkSecurityStatus] = useState<{ safe: boolean; message: string } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isSending || !companyId) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    try {
      // Call company chatbot - uses company knowledge
      const { data, error } = await supabase.functions.invoke('ceo-chatbot', {
        body: {
          message,
          companyId,
          isCompanyChatbot: true, // Flag to use company-specific knowledge
        },
      });

      if (error) throw error;

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: data.response || 'No pude procesar tu mensaje.',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const securityResult = scanFileForSecurity(file);
      setFileSecurityStatus(securityResult);
      if (securityResult.safe) {
        setSelectedFile(file);
      } else {
        setSelectedFile(null);
        toast.error('Archivo rechazado', { description: securityResult.message });
      }
    }
  };

  const handleLinkChange = (url: string) => {
    setLinkUrl(url);
    if (url.trim()) {
      const securityResult = scanUrlForSecurity(url);
      setLinkSecurityStatus(securityResult);
    } else {
      setLinkSecurityStatus(null);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${companyId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('company-knowledge')
      .upload(fileName, file);
      
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('company-knowledge')
      .getPublicUrl(fileName);
      
    return data.publicUrl;
  };

  const handleAddKnowledge = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    // Validate file and link security
    if (selectedFile && !fileSecurityStatus?.safe) {
      toast.error('El archivo no pasó la verificación de seguridad');
      return;
    }
    
    if (linkUrl && !linkSecurityStatus?.safe) {
      toast.error('El enlace no pasó la verificación de seguridad');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let documentUrl: string | undefined;
      let documentName: string | undefined;
      let documentType: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        setIsUploadingFile(true);
        const uploadedUrl = await uploadFile(selectedFile);
        if (uploadedUrl) {
          documentUrl = uploadedUrl;
          documentName = selectedFile.name;
          documentType = selectedFile.type;
        }
        setIsUploadingFile(false);
      }

      // Add link to content if provided
      let finalContent = newContent;
      if (linkUrl && linkSecurityStatus?.safe) {
        finalContent = `${newContent}\n\n📎 Enlace adjunto: ${linkUrl}`;
        if (!documentUrl) {
          documentUrl = linkUrl;
          documentName = 'Enlace externo';
          documentType = 'link';
        }
      }

      const result = await addKnowledge({
        title: newTitle,
        content: finalContent,
        category: newCategory,
        document_name: documentName,
        document_type: documentType,
        document_url: documentUrl,
      });

      if (result.success) {
        toast.success('Conocimiento agregado', {
          description: 'Será analizado e incorporado al sistema.',
        });
        setShowAddDialog(false);
        setNewTitle('');
        setNewContent('');
        setNewCategory('general');
        setSelectedFile(null);
        setFileSecurityStatus(null);
        setLinkUrl('');
        setLinkSecurityStatus(null);
      } else {
        toast.error('Error al agregar conocimiento');
      }
    } catch (error) {
      console.error('Error adding knowledge:', error);
      toast.error('Error al agregar conocimiento');
    }
    
    setIsSubmitting(false);
  };

  const handleAnalyze = async (knowledgeId: string) => {
    const result = await analyzeKnowledge(knowledgeId);
    if (result.success) {
      toast.success('Análisis completado');
    } else {
      toast.error('Error al analizar');
    }
  };

  const clearChat = () => {
    setMessages([]);
  };
  
  const resetDialogState = () => {
    setShowAddDialog(false);
    setNewTitle('');
    setNewContent('');
    setNewCategory('general');
    setSelectedFile(null);
    setFileSecurityStatus(null);
    setLinkUrl('');
    setLinkSecurityStatus(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!companyId || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Selecciona una empresa</h2>
            <p className="text-muted-foreground mb-4">
              Accede al chatbot desde el menú de una empresa específica
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      <div className="hidden lg:block">
        <Sidebar selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />
      </div>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <MobileNav selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />
        <h1 className="text-lg font-bold flex items-center gap-2">
          <span>{company.icon}</span> Chatbot
        </h1>
        <div className="w-8" />
      </header>

      <main className="flex-1 overflow-hidden flex flex-col pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 flex-1 flex flex-col max-h-screen">
          {/* Header */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {companyId === 'iwie-drones' ? (
                  <img src={uavIcon} alt="IWIE Drones" className="w-8 h-8 lg:w-10 lg:h-10 object-contain" />
                ) : (
                  <span className="text-2xl lg:text-3xl">{company.icon}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
                  <Bot className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                  Chatbot {company.name}
                </h1>
                <p className="text-muted-foreground text-xs lg:text-sm">
                  Asistente inteligente basado en el conocimiento de la empresa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="text-primary border-primary/30 hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Aportar Conocimiento
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="text-muted-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </header>

          {/* Main Content with Tabs */}
          <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mb-4">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Base de Conocimiento
                {pendingAnalysis > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {pendingAnalysis}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0">
              <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border flex flex-col min-h-0">
                <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
                  <ScrollArea className="flex-1 h-full">
                    <div className="p-4">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                          <p className="text-lg font-medium">¡Hola! Soy el asistente de {company.name}</p>
                          <p className="text-sm mt-2 text-center max-w-md">
                            Puedo ayudarte con consultas sobre la empresa basándome en el conocimiento que el equipo ha aportado.
                          </p>
                          <div className="flex flex-wrap gap-2 mt-4 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInputMessage('¿Cuáles son los proyectos actuales?')}
                            >
                              <Lightbulb className="w-4 h-4 mr-2" />
                              Proyectos actuales
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInputMessage('¿Qué mejoras se han propuesto?')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Propuestas de mejora
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {message.role === 'assistant' && (
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className="bg-primary/20 p-1">
                                    {companyId === 'iwie-drones' ? (
                                      <img src={uavIcon} alt="IWIE Drones" className="w-5 h-5 object-contain" />
                                    ) : (
                                      <span className="text-sm">{company.icon}</span>
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                {message.role === 'assistant' ? (
                                  <MarkdownRenderer content={message.content} />
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                )}
                                <span className="text-xs opacity-60 mt-2 block">
                                  {formatDistanceToNow(new Date(message.created_at), {
                                    addSuffix: true,
                                    locale: es,
                                  })}
                                </span>
                              </div>
                              {message.role === 'user' && (
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback>
                                    <User className="w-4 h-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                          {isSending && (
                            <div className="flex gap-3">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarFallback className="bg-primary/20 p-1">
                                  {companyId === 'iwie-drones' ? (
                                    <img src={uavIcon} alt="IWIE Drones" className="w-5 h-5 object-contain" />
                                  ) : (
                                    <span className="text-sm">{company.icon}</span>
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="bg-muted rounded-lg p-3">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2 items-end">
                      <Textarea
                        placeholder="Escribe tu pregunta..."
                        value={inputMessage}
                        onChange={(e) => {
                          setInputMessage(e.target.value);
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        disabled={isSending}
                        className="flex-1 min-h-[44px] max-h-[150px] resize-none py-3"
                        style={{ height: '44px' }}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!inputMessage.trim() || isSending}
                        className="bg-gradient-to-r from-primary to-secondary h-11"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="knowledge" className="flex-1 min-h-0 mt-0">
              <Card className="bg-card/50 backdrop-blur-sm border-border h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      Conocimiento de {company.name}
                    </span>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {pendingAnalysis} pendientes
                      </Badge>
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {approvedCount} aprobados
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {knowledgeLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : knowledge.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">Aún no hay conocimiento</p>
                        <p className="text-sm mt-1">
                          Sé el primero en aportar conocimiento valioso
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddDialog(true)}
                          className="mt-4"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Aportar Conocimiento
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {knowledge.map((item) => (
                          <Card key={item.id} className="bg-card/30">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 className="font-medium">{item.title}</h4>
                                    <Badge variant="secondary" className="text-xs">
                                      {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                                    </Badge>
                                    {item.is_analyzed ? (
                                      <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Analizado
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pendiente
                                      </Badge>
                                    )}
                                    {item.is_approved_for_ceo && (
                                      <Badge className="bg-primary/20 text-primary text-xs">
                                        CEO
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {item.content}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    <span>Por {item.contributor_name}</span>
                                    <span>•</span>
                                    <span>{format(new Date(item.created_at), "d MMM yyyy", { locale: es })}</span>
                                  </div>
                                  {item.analysis_summary && (
                                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                                      <p className="font-medium mb-1">Resumen del análisis:</p>
                                      <p className="text-muted-foreground">{item.analysis_summary}</p>
                                    </div>
                                  )}
                                </div>
                                {!item.is_analyzed && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAnalyze(item.id)}
                                  >
                                    <Brain className="w-4 h-4 mr-1" />
                                    Analizar
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Add Knowledge Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) resetDialogState();
        else setShowAddDialog(open);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Aportar Conocimiento
            </DialogTitle>
            <DialogDescription>
              Comparte información valiosa para {company.name}. Será analizada e incorporada al sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Título</Label>
              <Input
                placeholder="Ej: Proceso de control de calidad"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div>
              <Label>Categoría</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Contenido</Label>
              <Textarea
                placeholder="Describe detalladamente el conocimiento, proceso, idea o propuesta..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="min-h-[150px] resize-y"
              />
            </div>

            {/* File Attachment Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Adjuntar Archivo (opcional)
              </Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
              />
              
              {selectedFile ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {fileSecurityStatus && (
                    <div className={`flex items-center gap-1 text-xs ${fileSecurityStatus.safe ? 'text-green-500' : 'text-red-500'}`}>
                      {fileSecurityStatus.safe ? (
                        <>
                          <Shield className="w-4 h-4" />
                          Seguro
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          {fileSecurityStatus.message}
                        </>
                      )}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileSecurityStatus(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Seleccionar archivo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Tipos permitidos: PDF, Word, Excel, PowerPoint, texto, imágenes. Máx 10MB.
              </p>
            </div>

            {/* Link Attachment Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Agregar Enlace (opcional)
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://ejemplo.com/documento"
                  value={linkUrl}
                  onChange={(e) => handleLinkChange(e.target.value)}
                  className="flex-1"
                />
                {linkUrl && linkSecurityStatus && (
                  <div className={`flex items-center gap-1 px-2 text-xs ${linkSecurityStatus.safe ? 'text-green-500' : 'text-red-500'}`}>
                    {linkSecurityStatus.safe ? (
                      <Shield className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </div>
                )}
              </div>
              {linkUrl && linkSecurityStatus && !linkSecurityStatus.safe && (
                <p className="text-xs text-red-500">{linkSecurityStatus.message}</p>
              )}
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg text-xs">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
              <p className="text-muted-foreground">
                Todos los archivos y enlaces son escaneados automáticamente antes de ser incorporados al sistema.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetDialogState}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddKnowledge} disabled={isSubmitting || isUploadingFile}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploadingFile ? 'Subiendo archivo...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Aportar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
