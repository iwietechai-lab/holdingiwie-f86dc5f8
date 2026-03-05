import { useState, useRef, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Sparkles, 
  Wand2,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Brain,
  Zap,
  Target,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  optimizedPrompt?: string;
}

const AI_TARGETS = [
  { id: 'ceo-chat', name: 'CEO Chat', icon: '👔', description: 'Para consultas estratégicas y de negocio' },
  { id: 'brain-galaxy', name: 'Brain Galaxy', icon: '🧠', description: 'Para aprendizaje y conocimiento' },
  { id: 'mision-iwie', name: 'Misión Iwie', icon: '🚀', description: 'Para gestión de tareas y proyectos' },
  { id: 'general', name: 'IA General', icon: '✨', description: 'Para cualquier asistente de IA' },
];

const PROMPT_EXAMPLES = [
  {
    icon: '📊',
    original: 'Dame un reporte de ventas',
    description: 'Reportes y análisis'
  },
  {
    icon: '💡',
    original: 'Necesito ideas para mi proyecto',
    description: 'Brainstorming'
  },
  {
    icon: '📝',
    original: 'Escribe un email profesional',
    description: 'Redacción'
  },
  {
    icon: '🔍',
    original: 'Explícame cómo funciona X',
    description: 'Explicaciones'
  }
];

export function StudioPrompt() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(AI_TARGETS[3]); // General by default
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopyPrompt = async (text: string, messageId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    toast.success('Prompt copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `Eres Studio Prompt, un experto en ingeniería de prompts. Tu única misión es ayudar a los usuarios a redactar prompts más efectivos para obtener mejores respuestas de las IAs.

Contexto de destino: El usuario quiere usar el prompt en "${selectedTarget.name}" (${selectedTarget.description}).

Cuando el usuario te dé un prompt o idea:
1. **Analiza** qué quiere lograr el usuario
2. **Identifica** qué información falta o podría mejorar el prompt
3. **Redacta** una versión optimizada del prompt que sea:
   - Claro y específico
   - Con contexto relevante
   - Con el formato de salida esperado
   - Con restricciones o parámetros si aplica

Formato de respuesta:
1. Breve análisis del prompt original (1-2 líneas)
2. El prompt optimizado en un bloque destacado
3. Explicación breve de las mejoras (opcional, solo si es útil)

Si el usuario hace preguntas sobre cómo escribir prompts, responde con consejos prácticos.

IMPORTANTE: 
- No generes contenido, solo optimiza prompts
- Sé conciso y directo
- Responde siempre en español`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-galaxy-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: input.trim() }
            ],
            model: 'gemini-2.5-flash'
          })
        }
      );

      if (!response.ok) {
        throw new Error('Error al procesar la solicitud');
      }

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || data.response || '';

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      logger.error('Studio Prompt error:', error);
      toast.error('Error al procesar tu solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex flex-1 min-h-0 bg-card/30 rounded-xl border border-border/50 overflow-hidden">
      {/* Sidebar - AI Target Selector */}
      <div className="w-56 border-r border-border/50 flex flex-col bg-background/50">
        <div className="p-3 border-b border-border/50">
          <span className="text-sm font-medium">Destino del Prompt</span>
        </div>
        
        <div className="flex-1 p-3 space-y-2">
          {AI_TARGETS.map((target) => (
            <button
              key={target.id}
              onClick={() => setSelectedTarget(target)}
              className={`w-full text-left p-2 rounded-lg transition-colors ${
                selectedTarget.id === target.id 
                  ? 'bg-primary/10 border border-primary/30' 
                  : 'hover:bg-muted/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{target.icon}</span>
                <div>
                  <p className="text-sm font-medium">{target.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{target.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-border/50">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2"
            onClick={handleNewChat}
          >
            <RefreshCw className="h-3 w-3" />
            Nueva conversación
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          /* Empty State - Welcome */
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
            {/* Studio Prompt Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30">
                <div className="relative">
                  <Wand2 className="h-10 w-10 text-primary" />
                  <Sparkles className="h-5 w-5 text-primary absolute -bottom-1 -right-1" />
                </div>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center space-y-2 max-w-md">
              <h2 className="text-xl font-bold">Studio Prompt</h2>
              <p className="text-sm text-muted-foreground">
                Escribe tu idea o prompt básico y lo transformaré en un prompt optimizado 
                para obtener mejores respuestas de las IAs del holding.
              </p>
              <Badge variant="outline" className="gap-1">
                <Target className="h-3 w-3" />
                Destino: {selectedTarget.name}
              </Badge>
            </div>

            {/* Examples */}
            <div className="w-full max-w-md space-y-3">
              <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">
                Ejemplos de prompts a optimizar
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PROMPT_EXAMPLES.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(example.original)}
                    className="flex flex-col items-start gap-1 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-accent/50 hover:border-primary/30 transition-colors text-left group"
                  >
                    <span className="text-lg">{example.icon}</span>
                    <span className="text-xs font-medium text-muted-foreground">{example.description}</span>
                    <span className="text-xs text-muted-foreground/70 group-hover:text-foreground transition-colors line-clamp-2">
                      "{example.original}"
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="w-full max-w-md bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-primary" />
                Tips para mejores prompts
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Sé específico sobre lo que necesitas</li>
                <li>• Indica el formato de respuesta deseado</li>
                <li>• Proporciona contexto relevante</li>
                <li>• Define restricciones si las hay</li>
              </ul>
            </div>

            {/* Input at Bottom of Empty State */}
            <div className="w-full max-w-md pt-4">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu prompt o idea aquí para optimizarlo..."
                  className="min-h-[80px] resize-none pr-14 text-sm bg-background/80"
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute bottom-3 right-3"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 border border-border/50'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1 rounded-md bg-primary/20">
                              <Wand2 className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-primary">Studio Prompt</span>
                          </div>
                          <MarkdownRenderer content={message.content} />
                          
                          {/* Copy Button */}
                          <div className="flex justify-end pt-2 border-t border-border/30">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs gap-1"
                              onClick={() => handleCopyPrompt(message.content, message.id)}
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Copiado
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  Copiar respuesta
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 border border-border/50 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1 rounded-md bg-primary/20">
                          <Wand2 className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                        <span className="text-sm text-muted-foreground">Optimizando tu prompt...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50 bg-background/50">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Target className="h-3 w-3" />
                    {selectedTarget.name}
                  </Badge>
                </div>
                <div className="relative">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe otro prompt para optimizar..."
                    className="min-h-[60px] max-h-[120px] resize-none pr-14 text-sm"
                    disabled={isLoading}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute bottom-3 right-3"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
