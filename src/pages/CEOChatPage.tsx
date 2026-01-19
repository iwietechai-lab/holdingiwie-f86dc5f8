import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  FolderKanban,
  Plus,
  FileUp,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Bell,
  Brain,
  Wand2,
  Star,
  Lightbulb,
  TrendingUp,
  X
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useCEOChat } from '@/hooks/useCEOChat';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import mauricioAvatar from '@/assets/faces/mauricio.jpg';

// Helper function to format analysis text with proper line breaks
const formatAnalysisText = (text: string): string => {
  if (!text) return '';
  
  // Add line breaks after periods followed by a space and uppercase letter (new sentence)
  let formatted = text.replace(/\. ([A-ZÁÉÍÓÚÑ])/g, '.\n\n$1');
  
  // Add line breaks after colons when followed by text
  formatted = formatted.replace(/: ([A-ZÁÉÍÓÚÑ])/g, ':\n\n$1');
  
  // Ensure bullet points and numbered lists have proper formatting
  formatted = formatted.replace(/(\d+\.\s)/g, '\n$1');
  formatted = formatted.replace(/(•\s|–\s|-\s)/g, '\n$1');
  
  return formatted;
};

export default function CEOChatPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, profile } = useSupabaseAuth();
  const { isSuperadmin } = useSuperadmin();
  
  const {
    projects,
    internalMessages,
    pendingReviews,
    teamSubmissions,
    userSubmissions,
    selectedProjectId,
    isLoading,
    isSending,
    isSubmitting,
    setSelectedProjectId,
    createProject,
    sendInternalMessage,
    generateReport,
    submitForCEOReview,
    analyzeSubmissionNow
  } = useCEOChat();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', color: '#8B5CF6' });
  const [submission, setSubmission] = useState({ title: '', content: '', file: null as File | null });
  const [activeTab, setActiveTab] = useState('chat');
  const [analyzingSubmissionId, setAnalyzingSubmissionId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    submission: typeof userSubmissions[0] | null;
    analysis: string;
    feedback: string;
    score: number;
    suggestions: string[];
  } | null>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [chatAttachment, setChatAttachment] = useState<File | null>(null);
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [internalMessages]);

  const handleSend = async () => {
    if ((!inputMessage.trim() && !chatAttachment) || isSending) return;
    const message = inputMessage.trim();
    setInputMessage('');
    
    // If there's an attachment, analyze it first
    if (chatAttachment) {
      await handleQuickAnalysis(message);
    } else {
      await sendInternalMessage(message);
    }
  };

  const handleQuickAnalysis = async (message: string) => {
    if (!chatAttachment) return;
    
    setIsUploadingChatFile(true);
    try {
      const result = await submitForCEOReview({
        title: chatAttachment.name,
        content: message || `Análisis rápido de: ${chatAttachment.name}`,
        file: chatAttachment,
        project_id: selectedProjectId
      });
      
      if (result) {
        // Immediately analyze the submission
        const analysisResult = await analyzeSubmissionNow(result as any);
        if (analysisResult) {
          setAnalysisResult({
            submission: result as any,
            ...analysisResult
          });
          setShowAnalysisDialog(true);
        }
      }
      setChatAttachment(null);
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = '';
      }
    } finally {
      setIsUploadingChatFile(false);
    }
  };

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setChatAttachment(file);
    }
  };

  const removeChatAttachment = () => {
    setChatAttachment(null);
    if (chatFileInputRef.current) {
      chatFileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('El nombre del proyecto es requerido');
      return;
    }
    await createProject(newProject);
    setNewProject({ name: '', description: '', color: '#8B5CF6' });
    setShowProjectDialog(false);
  };

  const handleSubmitForReview = async () => {
    if (!submission.title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    const result = await submitForCEOReview({
      title: submission.title,
      content: submission.content,
      file: submission.file || undefined,
      project_id: selectedProjectId
    });
    if (result) {
      setSubmission({ title: '', content: '', file: null });
      setShowSubmitDialog(false);
    }
  };

  const handleGenerateReport = async () => {
    await generateReport(selectedProjectId);
  };

  const handleAnalyzeNow = async (sub: typeof userSubmissions[0]) => {
    setAnalyzingSubmissionId(sub.id);
    const result = await analyzeSubmissionNow(sub);
    setAnalyzingSubmissionId(null);
    
    if (result) {
      setAnalysisResult({
        submission: sub,
        ...result
      });
      setShowAnalysisDialog(true);
    }
  };

  const handleViewExistingAnalysis = (sub: typeof userSubmissions[0]) => {
    if (sub.ai_analysis || sub.ai_feedback) {
      setAnalysisResult({
        submission: sub,
        analysis: sub.ai_analysis || '',
        feedback: sub.ai_feedback || '',
        score: sub.ai_score || 0,
        suggestions: Array.isArray(sub.ai_improvement_suggestions) ? sub.ai_improvement_suggestions : []
      });
      setShowAnalysisDialog(true);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectMessages = selectedProjectId 
    ? internalMessages.filter(m => m.project_id === selectedProjectId)
    : internalMessages;

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      <Sidebar selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="p-6 flex-1 flex gap-6 max-h-screen">
          {/* Left Panel - Projects & Status */}
          <div className="w-80 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary">
                <AvatarImage src={mauricioAvatar} alt="CEO" />
                <AvatarFallback>MC</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  CEOChat
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isSuperadmin ? 'Modo CEO' : 'Consultas al CEO'}
                </p>
              </div>
            </div>

            {/* Pending Reviews (CEO only) */}
            {isSuperadmin && pendingReviews.length > 0 && (
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                    <Bell className="w-4 h-4" />
                    {pendingReviews.length} Pendiente{pendingReviews.length > 1 ? 's' : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  {pendingReviews.slice(0, 3).map(review => (
                    <div key={review.id} className="flex items-center gap-2 text-xs py-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span className="truncate">{review.title}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Projects */}
            <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FolderKanban className="w-4 h-4" />
                    Proyectos
                  </CardTitle>
                  {isSuperadmin && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowProjectDialog(true)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="py-2 px-2">
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedProjectId(null)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedProjectId ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      General
                    </button>
                    {projects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProjectId(project.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedProjectId === project.id ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
                        }`}
                      >
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="truncate flex-1 text-left">{project.name}</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* User Submissions History - Always visible for non-superadmins */}
            {!isSuperadmin && (
              <Card className="bg-card/50 backdrop-blur-sm border-border">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Mis Documentos Enviados
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-2">
                  <ScrollArea className="h-48">
                    <div className="space-y-2 px-2">
                      {userSubmissions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                          <FileText className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-xs text-center">No hay documentos enviados aún</p>
                        </div>
                      ) : (
                        userSubmissions.map(sub => (
                          <div 
                            key={sub.id} 
                            className="flex flex-col gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{sub.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true, locale: es })}
                                </p>
                              </div>
                              <Badge 
                                variant={
                                  sub.status === 'revisado' ? 'default' : 
                                  sub.status === 'en_revision' ? 'secondary' : 
                                  'outline'
                                }
                                className="shrink-0 text-[10px]"
                              >
                                {sub.status === 'pendiente' && <Clock className="w-3 h-3 mr-1" />}
                                {sub.status === 'en_revision' && <AlertCircle className="w-3 h-3 mr-1" />}
                                {sub.status === 'revisado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {sub.status}
                              </Badge>
                            </div>
                            {/* Quick Analyze Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs h-7"
                              disabled={analyzingSubmissionId === sub.id}
                              onClick={() => handleAnalyzeNow(sub)}
                            >
                              {analyzingSubmissionId === sub.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Analizando...
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-3 h-3 mr-1" />
                                  Analizar Ahora por AI CEO
                                </>
                              )}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
              {!isSuperadmin && (
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setShowSubmitDialog(true)}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Enviar Documento para Revisión
                </Button>
              )}
              {isSuperadmin && (
                <>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => navigate('/ceo-dashboard')}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Dashboard CEO
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleGenerateReport}
                    disabled={projectMessages.length === 0}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generar Informe
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right Panel - Chat */}
          <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border flex flex-col min-h-0">
            <CardHeader className="py-3 px-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    {selectedProject ? selectedProject.name : 'Chat General'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isSuperadmin 
                      ? 'Trabaja ideas, debate estrategias, desarrolla proyectos'
                      : 'Consulta con el asistente del CEO'}
                  </CardDescription>
                </div>
                {selectedProject && (
                  <Badge 
                    variant="outline" 
                    style={{ borderColor: selectedProject.color, color: selectedProject.color }}
                  >
                    {selectedProject.status}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
              <ScrollArea className="flex-1 h-full">
                <div className="p-4 space-y-4">
                  {projectMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Sparkles className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">
                        {isSuperadmin ? '¡Comienza a trabajar tus ideas!' : '¡Hola! ¿En qué puedo ayudarte?'}
                      </p>
                      <p className="text-sm mt-2 text-center max-w-md">
                        {isSuperadmin 
                          ? 'Escribe tus pensamientos, plantea problemas o ideas de negocio para debatir.'
                          : 'Puedo responder consultas sobre la empresa, proyectos y estrategias.'}
                      </p>
                    </div>
                  ) : (
                    projectMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={mauricioAvatar} alt="CEO" />
                            <AvatarFallback>
                              <Bot className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[75%] rounded-lg p-3 ${
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
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs opacity-60">
                              {formatDistanceToNow(new Date(message.created_at), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                            {message.message_type !== 'normal' && (
                              <Badge variant="secondary" className="text-[10px] py-0">
                                {message.message_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {message.role === 'user' && (
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback>
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                  {isSending && (
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={mauricioAvatar} alt="CEO" />
                        <AvatarFallback>
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t border-border">
                {/* Attachment Preview */}
                {chatAttachment && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{chatAttachment.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={removeChatAttachment}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleChatFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png"
                  />
                  
                  {/* Attach file button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 self-end"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isSending || isUploadingChatFile}
                    title="Adjuntar documento para análisis rápido"
                  >
                    <FileUp className="w-4 h-4" />
                  </Button>
                  
                  <Textarea
                    placeholder={chatAttachment 
                      ? "Describe el documento o deja vacío para análisis automático..." 
                      : (isSuperadmin 
                        ? "Escribe tu idea, pregunta o tema para debatir..." 
                        : "Escribe tu consulta...")}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending || isUploadingChatFile}
                    className="flex-1 min-h-[44px] max-h-32 resize-none"
                    rows={1}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={(!inputMessage.trim() && !chatAttachment) || isSending || isUploadingChatFile}
                    className="bg-gradient-to-r from-primary to-secondary self-end"
                  >
                    {isSending || isUploadingChatFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : chatAttachment ? (
                      <Wand2 className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Project Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Proyecto</DialogTitle>
            <DialogDescription>
              Crea un proyecto para organizar tus ideas y conversaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del proyecto"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción breve..."
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'].map(color => (
                  <button
                    key={color}
                    onClick={() => setNewProject(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newProject.color === color ? 'scale-125 ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProject}>
              Crear Proyecto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit for Review Dialog (Team) */}
      <Dialog open={showSubmitDialog} onOpenChange={(open) => !isSubmitting && setShowSubmitDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Enviar para Revisión del CEO
            </DialogTitle>
            <DialogDescription>
              Tu documento será analizado y recibirás feedback inmediato.
            </DialogDescription>
          </DialogHeader>
          
          {isSubmitting ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Subiendo documento...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Por favor espera mientras procesamos tu envío
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={submission.title}
                    onChange={(e) => setSubmission(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título del documento o consulta"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contenido o Descripción</Label>
                  <Textarea
                    value={submission.content}
                    onChange={(e) => setSubmission(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Describe tu documento o escribe tu consulta..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Archivo (opcional)</Label>
                  <Input
                    type="file"
                    onChange={(e) => setSubmission(prev => ({ 
                      ...prev, 
                      file: e.target.files?.[0] || null 
                    }))}
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos: PDF, Word, Excel, PowerPoint, TXT
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmitForReview}>
                  <FileUp className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Analysis Results Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Análisis AI CEO
            </DialogTitle>
            <DialogDescription>
              {analysisResult?.submission?.title}
            </DialogDescription>
          </DialogHeader>
          
          {analysisResult && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 pb-4 pr-4">
                {/* Score */}
                {analysisResult.score > 0 && (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20">
                      <span className="text-2xl font-bold text-primary">{analysisResult.score}</span>
                    </div>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        Puntuación del Documento
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.score >= 80 ? 'Excelente trabajo' : 
                         analysisResult.score >= 60 ? 'Buen documento, hay oportunidades de mejora' : 
                         'Se recomienda revisar las sugerencias'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Analysis */}
                {analysisResult.analysis && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      Análisis
                    </h4>
                    <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
                      <MarkdownRenderer content={formatAnalysisText(analysisResult.analysis)} />
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {analysisResult.feedback && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-500" />
                      Feedback
                    </h4>
                    <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
                      <MarkdownRenderer content={formatAnalysisText(analysisResult.feedback)} />
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Sugerencias de Mejora
                    </h4>
                    <div className="space-y-2">
                      {analysisResult.suggestions.map((suggestion, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-sm leading-relaxed">{String(suggestion)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="shrink-0 border-t pt-4 mt-2">
            <Button onClick={() => setShowAnalysisDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
