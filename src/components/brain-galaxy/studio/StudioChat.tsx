import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Send, 
  Loader2, 
  Sparkles,
  Settings2,
  Search,
  BookOpen,
  Plus,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Lightbulb,
  GraduationCap,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { ChatMessage, Source, StudioOutput } from './types';

interface FoundSource {
  title: string;
  url?: string;
  type: 'web' | 'internal' | 'suggested';
  description?: string;
}

interface CourseProposal {
  title: string;
  description: string;
  modules: { title: string; description: string; topics: string[] }[];
  sources: FoundSource[];
  suggestedTopics?: string[];
}

interface StudioChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  sources: Source[];
  currentOutput?: StudioOutput;
  onClearOutput: () => void;
  onAddSourceFromSuggestion?: (suggestion: { type: 'url' | 'text'; name: string; content?: string; url?: string }) => void;
  courseProposal?: CourseProposal | null;
  onClearProposal?: () => void;
  foundSources?: FoundSource[];
  isCreatingCourse?: boolean;
  creationMode?: 'studio' | 'ai' | 'manual';
  onStartNewChat?: () => void;
}

const QUICK_PROMPTS = [
  {
    icon: '🎓',
    label: 'Crear curso desde cero',
    prompt: 'Quiero crear un curso sobre ',
    placeholder: true,
  },
  {
    icon: '📝',
    label: 'Resumir',
    prompt: 'Resume los puntos principales de mis documentos',
    placeholder: false,
  },
  {
    icon: '💡',
    label: 'Ideas clave',
    prompt: '¿Cuáles son las ideas más importantes?',
    placeholder: false,
  },
  {
    icon: '🎓',
    label: 'Explicar simple',
    prompt: 'Explícame esto como si fuera un principiante',
    placeholder: false,
  },
];

const STUDIO_MODE_STARTERS = [
  'Necesito un curso completo de programación en Python',
  'Crea un programa de capacitación en liderazgo empresarial',
  'Quiero un curso de marketing digital con certificación',
];

const AI_MODE_STARTERS = [
  'Ayúdame a diseñar un curso de finanzas personales',
  'Quiero explorar opciones para un curso de diseño UX/UI',
  'Necesito ideas para un curso de gestión de proyectos',
];

export function StudioChat({
  messages,
  onSendMessage,
  isLoading,
  sources,
  currentOutput,
  onClearOutput,
  onAddSourceFromSuggestion,
  courseProposal,
  onClearProposal,
  foundSources = [],
  isCreatingCourse = false,
  creationMode = 'ai',
  onStartNewChat,
}: StudioChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentOutput, courseProposal]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string, hasPlaceholder: boolean) => {
    if (hasPlaceholder) {
      setInput(prompt);
    } else {
      onSendMessage(prompt);
    }
  };

  const handleAddSource = (source: FoundSource) => {
    if (onAddSourceFromSuggestion && source.url) {
      onAddSourceFromSuggestion({
        type: 'url',
        name: source.title,
        url: source.url,
      });
    }
  };

  const readySources = sources.filter(s => s.status === 'ready');
  const showEmptyState = messages.length === 0 && !currentOutput && !courseProposal;

  return (
    <div className="h-full flex flex-col border-x overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">
            {creationMode === 'ai' ? 'Chat con IA' : 'Definir Estructura'}
          </h3>
          {isCreatingCourse && (
            <Badge variant="secondary" className="gap-1">
              <GraduationCap className="h-3 w-3" />
              Creando curso...
            </Badge>
          )}
          {creationMode === 'manual' && (
            <Badge variant="outline" className="gap-1 text-xs">
              Modo Manual
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Output Display, Course Proposal, or Chat */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
        {currentOutput ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{currentOutput.type}</Badge>
              <Button variant="ghost" size="sm" onClick={onClearOutput}>
                Volver al chat
              </Button>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <h2>{currentOutput.title}</h2>
              <MarkdownRenderer content={currentOutput.content} />
            </div>
          </div>
        ) : courseProposal ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="default" className="gap-1">
                <BookOpen className="h-3 w-3" />
                Propuesta de Curso
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClearProposal}>
                Volver al chat
              </Button>
            </div>
            
            {/* Course Preview */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{courseProposal.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{courseProposal.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Módulos propuestos</h4>
                  <div className="space-y-2">
                    {courseProposal.modules.map((module, i) => (
                      <div key={i} className="p-2 rounded bg-muted/50 text-sm">
                        <p className="font-medium">{i + 1}. {module.title}</p>
                        <p className="text-muted-foreground text-xs">{module.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Found Sources */}
            {courseProposal.sources.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Fuentes encontradas para tu curso
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Estas son las fuentes que utilizaré para crear el contenido. Puedes agregar más.
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {courseProposal.sources.map((source, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {source.type === 'web' ? (
                          <Globe className="h-4 w-4 text-primary shrink-0" />
                        ) : source.type === 'internal' ? (
                          <FileText className="h-4 w-4 text-accent-foreground shrink-0" />
                        ) : (
                          <Lightbulb className="h-4 w-4 text-secondary-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{source.title}</p>
                          {source.description && (
                            <p className="text-xs text-muted-foreground truncate">{source.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {source.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => window.open(source.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAddSource(source)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Suggested Topics to Add */}
            {courseProposal.suggestedTopics && courseProposal.suggestedTopics.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    ¿Quieres agregar más temas?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {courseProposal.suggestedTopics.map((topic, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => setInput(`Agrega información sobre: ${topic}`)}
                      >
                        + {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2"
                onClick={() => onSendMessage('Procede a crear el curso con las fuentes actuales')}
              >
                <CheckCircle2 className="h-4 w-4" />
                Crear curso con estas fuentes
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              O escribe en el chat para agregar más fuentes o modificar la estructura
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {showEmptyState && (
              <div className="text-center py-4 text-muted-foreground">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  {creationMode === 'studio' ? (
                    <>
                      <Sparkles className="h-16 w-16 mx-auto opacity-50 text-primary" />
                      <GraduationCap className="h-8 w-8 absolute -bottom-1 -right-1 text-primary" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-16 w-16 mx-auto opacity-50" />
                      <GraduationCap className="h-8 w-8 absolute -bottom-1 -right-1 text-primary" />
                    </>
                  )}
                </div>
                <p className="font-medium text-foreground">
                  {creationMode === 'studio' ? 'Crear con Studio' : 'Crear con IA'}
                </p>
                <p className="text-sm mt-2 max-w-md mx-auto">
                  {creationMode === 'studio' 
                    ? 'Dime qué curso necesitas y Studio lo creará automáticamente: estructura, contenido, metodología y recursos. Tú solo describes, yo hago el resto.'
                    : (readySources.length > 0 
                        ? `Tienes ${readySources.length} fuente${readySources.length > 1 ? 's' : ''} lista${readySources.length > 1 ? 's' : ''}. Conversemos sobre cómo estructurar tu curso.`
                        : 'Trabajemos juntos para diseñar tu curso. Te haré preguntas para entender mejor lo que necesitas y construiremos la estructura paso a paso.'
                      )
                  }
                </p>
                
                {/* Quick actions */}
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Empieza así
                  </p>
                  
                  <div className="space-y-2 max-w-md mx-auto">
                    {(creationMode === 'studio' ? STUDIO_MODE_STARTERS : AI_MODE_STARTERS).map((starter, i) => (
                      <button
                        key={i}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm"
                        onClick={() => onSendMessage(starter)}
                      >
                        <span className="text-primary mr-2">{creationMode === 'studio' ? '✨' : '💡'}</span>
                        {starter}
                      </button>
                    ))}
                  </div>
                  
                  {readySources.length > 0 && (
                    <div className="pt-4">
                      <p className="text-xs text-muted-foreground mb-2">Acciones rápidas</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {QUICK_PROMPTS.map((item, i) => (
                          <Badge 
                            key={i}
                            variant="outline" 
                            className="cursor-pointer hover:bg-muted py-1.5 px-3"
                            onClick={() => handleQuickPrompt(item.prompt, item.placeholder)}
                          >
                            {item.icon} {item.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Found sources inline */}
            {foundSources.length > 0 && !courseProposal && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Fuentes encontradas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {foundSources.map((source, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-2 rounded border bg-background"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Globe className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm truncate">{source.title}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => handleAddSource(source)}
                      >
                        <Plus className="h-3 w-3" />
                        Agregar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      {isCreatingCourse ? 'Buscando fuentes y estructurando curso...' : 'Analizando fuentes...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Deep Research Banner */}
      {readySources.length > 0 && !currentOutput && !courseProposal && (
        <div className="px-4 py-2 border-t">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary">
            <Search className="h-4 w-4" />
            <span className="text-xs">
              Prueba <strong>Deep Research</strong> para obtener un informe detallado y nuevas fuentes.
            </span>
          </div>
        </div>
      )}

      {/* Input - Fixed Height Textarea */}
      <div className="p-4 border-t shrink-0 bg-background">
        {onStartNewChat && messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button variant="ghost" size="sm" onClick={onStartNewChat} className="text-xs">
              + Nueva conversación
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                creationMode === 'manual'
                  ? "Describe tu curso, sube materiales y estructura los módulos..."
                  : isCreatingCourse 
                    ? "Agrega más detalles o fuentes..." 
                    : readySources.length > 0 
                      ? "Pregunta sobre tus documentos..." 
                      : "¿Qué curso quieres crear? Describe el tema y te ayudo a estructurarlo..."
              }
              className="min-h-[80px] max-h-[120px] resize-none pr-12"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-20 w-12"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {creationMode === 'ai' 
            ? `${readySources.length} fuente${readySources.length !== 1 ? 's' : ''} • La IA estructura tu curso automáticamente`
            : `${readySources.length} fuente${readySources.length !== 1 ? 's' : ''} • Tú defines la estructura del curso`
          }
        </p>
      </div>
    </div>
  );
}
