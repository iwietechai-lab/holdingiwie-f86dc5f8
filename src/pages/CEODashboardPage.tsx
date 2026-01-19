import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Lightbulb,
  FileText,
  Users,
  FolderKanban,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Eye,
  Trash2,
  Edit,
  Download
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useCEOChat, CEOTeamSubmission, CEOThought, CEOInternalReport } from '@/hooks/useCEOChat';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const THOUGHT_TYPES = [
  { value: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-yellow-400' },
  { value: 'pensamiento', label: 'Pensamiento', icon: Brain, color: 'text-purple-400' },
  { value: 'estrategia', label: 'Estrategia', icon: TrendingUp, color: 'text-blue-400' },
  { value: 'directriz', label: 'Directriz', icon: FileText, color: 'text-green-400' },
  { value: 'reflexion', label: 'Reflexión', icon: MessageSquare, color: 'text-cyan-400' },
  { value: 'decision', label: 'Decisión', icon: CheckCircle2, color: 'text-emerald-400' },
];

const PRIORITIES = [
  { value: 'baja', label: 'Baja', color: 'bg-slate-500' },
  { value: 'media', label: 'Media', color: 'bg-blue-500' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-500' },
];

export default function CEODashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, profile } = useSupabaseAuth();
  const { isSuperadmin, isCheckingRole } = useSuperadmin();
  
  const {
    projects,
    thoughts,
    teamSubmissions,
    pendingReviews,
    reports,
    selectedProjectId,
    isLoading,
    setSelectedProjectId,
    createProject,
    createThought,
    updateSubmissionNotes,
    markReviewAsRead
  } = useCEOChat();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pendientes');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [showThoughtDialog, setShowThoughtDialog] = useState(false);
  const [showSubmissionDetail, setShowSubmissionDetail] = useState<CEOTeamSubmission | null>(null);
  const [showReportDetail, setShowReportDetail] = useState<CEOInternalReport | null>(null);
  
  // New thought form
  const [newThought, setNewThought] = useState({
    title: '',
    content: '',
    thought_type: 'idea',
    priority: 'media',
    project_id: null as string | null
  });

  // CEO notes for submission
  const [ceoNotes, setCeoNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isCheckingRole && !isSuperadmin) {
      toast.error('Solo el CEO puede acceder a este dashboard');
      navigate('/ceo-chat');
    }
  }, [isCheckingRole, isSuperadmin, navigate]);

  const handleCreateThought = async () => {
    if (!newThought.title.trim() || !newThought.content.trim()) {
      toast.error('Título y contenido son requeridos');
      return;
    }
    const success = await createThought({
      ...newThought,
      project_id: newThought.project_id || selectedProjectId
    });
    if (success) {
      setNewThought({ title: '', content: '', thought_type: 'idea', priority: 'media', project_id: null });
      setShowThoughtDialog(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!showSubmissionDetail) return;
    await updateSubmissionNotes(showSubmissionDetail.id, ceoNotes);
    setShowSubmissionDetail(null);
    setCeoNotes('');
  };

  const handleOpenSubmission = (submission: CEOTeamSubmission) => {
    setShowSubmissionDetail(submission);
    setCeoNotes(submission.ceo_notes || '');
    // Mark related pending review as read
    const review = pendingReviews.find(r => r.reference_id === submission.id);
    if (review) {
      markReviewAsRead(review.id);
    }
  };

  if (authLoading || isLoading || isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingSubmissions = teamSubmissions.filter(s => s.status === 'pendiente' || s.status === 'en_revision');
  const reviewedSubmissions = teamSubmissions.filter(s => s.status === 'revisado');
  
  const filteredThoughts = thoughts.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getThoughtTypeInfo = (type: string) => THOUGHT_TYPES.find(t => t.value === type) || THOUGHT_TYPES[0];
  const getPriorityInfo = (priority: string) => PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />
      <Sidebar selectedCompany={selectedCompany} onSelectCompany={setSelectedCompany} />

      <main className="flex-1 overflow-hidden">
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Brain className="w-7 h-7 text-primary" />
                Dashboard CEO
              </h1>
              <p className="text-muted-foreground text-sm">
                Gestiona tu conocimiento, ideas y revisiones del equipo
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/ceo-chat')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Ir al Chat
              </Button>
              <Button onClick={() => setShowThoughtDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Pensamiento
              </Button>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-card/50 backdrop-blur-sm border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                    <p className="text-2xl font-bold text-amber-400">{pendingSubmissions.length}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-400/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Proyectos</p>
                    <p className="text-2xl font-bold text-primary">{projects.length}</p>
                  </div>
                  <FolderKanban className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ideas/Pensamientos</p>
                    <p className="text-2xl font-bold text-purple-400">{thoughts.length}</p>
                  </div>
                  <Lightbulb className="w-8 h-8 text-purple-400/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Informes</p>
                    <p className="text-2xl font-bold text-green-400">{reports.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-green-400/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="pendientes" className="gap-2">
                <AlertCircle className="w-4 h-4" />
                Pendientes ({pendingSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="pensamientos" className="gap-2">
                <Lightbulb className="w-4 h-4" />
                Pensamientos
              </TabsTrigger>
              <TabsTrigger value="informes" className="gap-2">
                <FileText className="w-4 h-4" />
                Informes
              </TabsTrigger>
              <TabsTrigger value="revisados" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Revisados
              </TabsTrigger>
            </TabsList>

            {/* Pendientes Tab */}
            <TabsContent value="pendientes" className="flex-1 mt-0">
              <Card className="h-full bg-card/50 backdrop-blur-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Documentos del Equipo Pendientes de Revisión</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {pendingSubmissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <CheckCircle2 className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">¡Todo al día!</p>
                      <p className="text-sm">No hay documentos pendientes de revisión</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[calc(100vh-400px)]">
                      <div className="space-y-3">
                        {pendingSubmissions.map(submission => (
                          <Card 
                            key={submission.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleOpenSubmission(submission)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{submission.submission_type}</Badge>
                                    {submission.ai_score && (
                                      <Badge variant={submission.ai_score >= 80 ? 'default' : 'secondary'}>
                                        Score: {submission.ai_score}
                                      </Badge>
                                    )}
                                  </div>
                                  <h3 className="font-medium">{submission.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    De: {submission.submitter_name} • {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true, locale: es })}
                                  </p>
                                  {submission.ai_feedback && (
                                    <p className="text-sm mt-2 p-2 bg-muted rounded-md">
                                      <span className="font-medium">AI Feedback:</span> {submission.ai_feedback.substring(0, 150)}...
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pensamientos Tab */}
            <TabsContent value="pensamientos" className="flex-1 mt-0">
              <Card className="h-full bg-card/50 backdrop-blur-sm">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Mis Pensamientos e Ideas</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Buscar..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 w-64"
                        />
                      </div>
                      <Select value={selectedProjectId || 'all'} onValueChange={(v) => setSelectedProjectId(v === 'all' ? null : v)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Proyecto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="grid grid-cols-2 gap-4">
                      {filteredThoughts.map(thought => {
                        const typeInfo = getThoughtTypeInfo(thought.thought_type);
                        const priorityInfo = getPriorityInfo(thought.priority);
                        const TypeIcon = typeInfo.icon;
                        
                        return (
                          <Card key={thought.id} className="hover:bg-muted/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg bg-muted ${typeInfo.color}`}>
                                  <TypeIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium truncate">{thought.title}</h3>
                                    <div className={`w-2 h-2 rounded-full ${priorityInfo.color}`} />
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {thought.content}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {typeInfo.label}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(thought.created_at), { addSuffix: true, locale: es })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Informes Tab */}
            <TabsContent value="informes" className="flex-1 mt-0">
              <Card className="h-full bg-card/50 backdrop-blur-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Informes Generados</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Sin informes aún</p>
                      <p className="text-sm">Los informes se generan desde las conversaciones del chat</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[calc(100vh-400px)]">
                      <div className="space-y-3">
                        {reports.map(report => (
                          <Card 
                            key={report.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setShowReportDetail(report)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-medium">{report.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Proyecto: {report.project_name} • {format(new Date(report.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                                  </p>
                                  <p className="text-sm mt-2 line-clamp-2">{report.summary}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Revisados Tab */}
            <TabsContent value="revisados" className="flex-1 mt-0">
              <Card className="h-full bg-card/50 backdrop-blur-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">Documentos Revisados</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="space-y-3">
                      {reviewedSubmissions.map(submission => (
                        <Card 
                          key={submission.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleOpenSubmission(submission)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  <h3 className="font-medium">{submission.title}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  De: {submission.submitter_name} • Revisado: {submission.ceo_reviewed_at ? formatDistanceToNow(new Date(submission.ceo_reviewed_at), { addSuffix: true, locale: es }) : 'N/A'}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-green-500 border-green-500/30">
                                Revisado
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* New Thought Dialog */}
      <Dialog open={showThoughtDialog} onOpenChange={setShowThoughtDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Nuevo Pensamiento
            </DialogTitle>
            <DialogDescription>
              Registra tus ideas, pensamientos o decisiones para incorporarlos a tu base de conocimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={newThought.thought_type} 
                  onValueChange={(v) => setNewThought(prev => ({ ...prev, thought_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THOUGHT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className={`w-4 h-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select 
                  value={newThought.priority} 
                  onValueChange={(v) => setNewThought(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.color}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Proyecto (opcional)</Label>
              <Select 
                value={newThought.project_id || 'none'} 
                onValueChange={(v) => setNewThought(prev => ({ ...prev, project_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proyecto</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={newThought.title}
                onChange={(e) => setNewThought(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título del pensamiento"
              />
            </div>
            <div className="space-y-2">
              <Label>Contenido</Label>
              <Textarea
                value={newThought.content}
                onChange={(e) => setNewThought(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Desarrolla tu idea, pensamiento o decisión..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowThoughtDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateThought}>
              Guardar Pensamiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Detail Dialog */}
      <Dialog open={!!showSubmissionDetail} onOpenChange={(open) => !open && setShowSubmissionDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{showSubmissionDetail?.title}</DialogTitle>
            <DialogDescription>
              Enviado por {showSubmissionDetail?.submitter_name} • {showSubmissionDetail?.created_at && formatDistanceToNow(new Date(showSubmissionDetail.created_at), { addSuffix: true, locale: es })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {showSubmissionDetail?.content && (
                <div>
                  <Label className="text-muted-foreground text-xs">Contenido</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <MarkdownRenderer content={showSubmissionDetail.content} />
                  </div>
                </div>
              )}
              
              {showSubmissionDetail?.file_url && (
                <div>
                  <Label className="text-muted-foreground text-xs">Archivo Adjunto</Label>
                  <div className="mt-1 flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="w-5 h-5" />
                    <span>{showSubmissionDetail.file_name}</span>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={showSubmissionDetail.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {showSubmissionDetail?.ai_analysis && (
                <div>
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Análisis AI
                  </Label>
                  <div className="mt-1 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <MarkdownRenderer content={showSubmissionDetail.ai_analysis} />
                  </div>
                </div>
              )}

              {showSubmissionDetail?.ai_feedback && (
                <div>
                  <Label className="text-muted-foreground text-xs">Feedback Automático</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg flex items-start gap-3">
                    {showSubmissionDetail.ai_score !== null && (
                      <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        showSubmissionDetail.ai_score >= 80 ? 'bg-green-500/20 text-green-400' :
                        showSubmissionDetail.ai_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {showSubmissionDetail.ai_score}
                      </div>
                    )}
                    <p className="text-sm">{showSubmissionDetail.ai_feedback}</p>
                  </div>
                </div>
              )}

              {showSubmissionDetail?.ai_improvement_suggestions && showSubmissionDetail.ai_improvement_suggestions.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Sugerencias de Mejora</Label>
                  <ul className="mt-1 space-y-1">
                    {showSubmissionDetail.ai_improvement_suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                        <Star className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        {String(suggestion)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-xs">Tus Notas (CEO)</Label>
                <Textarea
                  value={ceoNotes}
                  onChange={(e) => setCeoNotes(e.target.value)}
                  placeholder="Escribe tus comentarios personales sobre este documento..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmissionDetail(null)}>
              Cerrar
            </Button>
            <Button onClick={handleSaveNotes}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Guardar y Marcar Revisado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Detail Dialog */}
      <Dialog open={!!showReportDetail} onOpenChange={(open) => !open && setShowReportDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{showReportDetail?.title}</DialogTitle>
            <DialogDescription>
              Proyecto: {showReportDetail?.project_name} • {showReportDetail?.created_at && format(new Date(showReportDetail.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              <div>
                <Label className="text-muted-foreground text-xs">Resumen Ejecutivo</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <MarkdownRenderer content={showReportDetail?.summary || ''} />
                </div>
              </div>

              {showReportDetail?.key_decisions && showReportDetail.key_decisions.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Decisiones Clave</Label>
                  <ul className="mt-1 space-y-1">
                    {showReportDetail.key_decisions.map((decision, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm p-2 bg-primary/10 rounded">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {String(decision)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showReportDetail?.action_items && showReportDetail.action_items.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Acciones a Tomar</Label>
                  <ul className="mt-1 space-y-1">
                    {showReportDetail.action_items.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded">
                        <div className="w-4 h-4 border-2 border-muted-foreground rounded shrink-0 mt-0.5" />
                        {String(action)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showReportDetail?.conclusions && (
                <div>
                  <Label className="text-muted-foreground text-xs">Conclusiones</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <MarkdownRenderer content={showReportDetail.conclusions} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDetail(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
