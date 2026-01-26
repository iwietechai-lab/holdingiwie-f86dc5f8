import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Sparkles, 
  GraduationCap,
  Settings2,
  Loader2,
  BookOpen,
  FileText,
  Video,
  ListChecks
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  courseStructure?: CourseStructure;
}

interface CourseModule {
  title: string;
  description: string;
  estimatedMinutes: number;
  contentTypes: string[];
}

interface CourseStructure {
  title: string;
  description: string;
  objectives: string[];
  modules: CourseModule[];
  totalHours: number;
  difficulty: string;
}

const COURSE_STARTERS = [
  {
    icon: '💻',
    title: 'Curso de programación en Python',
    prompt: 'Necesito un curso completo de programación en Python'
  },
  {
    icon: '🚀',
    title: 'Programa de liderazgo empresarial',
    prompt: 'Crea un programa de capacitación en liderazgo empresarial'
  },
  {
    icon: '📱',
    title: 'Marketing digital con certificación',
    prompt: 'Quiero un curso de marketing digital con certificación'
  },
  {
    icon: '🛸',
    title: 'Operación de drones',
    prompt: 'Genera un curso de operación de drones para principiantes'
  }
];

export function StudioPrompt() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      const systemPrompt = `Eres Studio, un experto en diseño instruccional y creación de cursos. Tu misión es ayudar a los usuarios a crear cursos y programas de capacitación completos.

Cuando el usuario te pida crear un curso, debes:
1. **Entender** qué tipo de curso necesita
2. **Proponer** una estructura completa del curso con módulos
3. **Incluir** objetivos de aprendizaje claros
4. **Definir** tipos de contenido (videos, lecturas, ejercicios, quizzes)
5. **Estimar** la duración de cada módulo

Formato de respuesta para propuestas de cursos:
- Título del curso
- Descripción general
- Objetivos de aprendizaje (3-5)
- Estructura de módulos con:
  - Nombre del módulo
  - Descripción breve
  - Duración estimada
  - Tipos de contenido incluidos
- Nivel de dificultad
- Duración total estimada

Si el usuario quiere ajustes, modifica la propuesta según sus necesidades.
Si hace preguntas generales sobre educación o diseño instruccional, responde de manera útil.

Sé creativo, profesional y orienta tus respuestas al contexto latinoamericano.
Responde siempre en español.`;

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
      console.error('Studio error:', error);
      toast.error('Error al procesar tu solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarterClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] bg-card/30 rounded-xl border border-border/50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 border-r border-border/50 flex flex-col bg-background/50">
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <span className="text-sm font-medium">Definir Estructura</span>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 p-3">
          <p className="text-xs text-muted-foreground mb-2">Historial de sesiones</p>
          <div className="space-y-1">
            {messages.length > 0 && (
              <div className="text-xs bg-primary/10 border border-primary/20 rounded-md px-2 py-1.5 truncate">
                {messages[0]?.content.slice(0, 30)}...
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span>Cursos</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>Docs</span>
            </div>
            <div className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              <span>Videos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          /* Empty State - Welcome */
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
            {/* Studio Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30">
                <div className="relative">
                  <Sparkles className="h-10 w-10 text-primary" />
                  <GraduationCap className="h-5 w-5 text-primary absolute -bottom-1 -right-1" />
                </div>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="text-center space-y-2 max-w-md">
              <h2 className="text-xl font-bold">Crear con Studio</h2>
              <p className="text-sm text-muted-foreground">
                Dime qué curso necesitas y Studio lo creará automáticamente: 
                estructura, contenido, metodología y recursos. Tú solo describes, yo hago el resto.
              </p>
            </div>

            {/* Starters */}
            <div className="w-full max-w-md space-y-3">
              <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">
                Empieza así
              </p>
              <div className="space-y-2">
                {COURSE_STARTERS.map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStarterClick(starter.prompt)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-accent/50 hover:border-primary/30 transition-colors text-left group"
                  >
                    <span className="text-lg">{starter.icon}</span>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {starter.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input at Bottom of Empty State */}
            <div className="w-full max-w-md pt-4">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe el curso que necesitas crear..."
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
                              <Sparkles className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-primary">Studio</span>
                          </div>
                          <MarkdownRenderer content={message.content} />
                          
                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-border/30">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                              <ListChecks className="h-3 w-3" />
                              Crear este curso
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              Ajustar estructura
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
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                        <span className="text-sm text-muted-foreground">Studio está diseñando tu curso...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50 bg-background/50">
              <div className="max-w-3xl mx-auto relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe aquí para continuar la conversación con Studio..."
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
          </>
        )}
      </div>
    </div>
  );
}
