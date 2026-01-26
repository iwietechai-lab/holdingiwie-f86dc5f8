import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Sparkles, 
  Copy, 
  Check, 
  Wand2, 
  MessageSquare,
  Brain,
  Zap,
  Target,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  improvedPrompt?: string;
  timestamp: string;
}

const PROMPT_STARTERS = [
  {
    icon: '📊',
    title: 'Análisis de datos',
    prompt: 'Quiero pedirle a la IA que analice datos de ventas mensuales'
  },
  {
    icon: '✍️',
    title: 'Redacción',
    prompt: 'Necesito que la IA me ayude a escribir un email profesional'
  },
  {
    icon: '💡',
    title: 'Brainstorming',
    prompt: 'Quiero generar ideas creativas para un nuevo proyecto'
  },
  {
    icon: '📋',
    title: 'Resumen',
    prompt: 'Necesito resumir un documento largo de manera efectiva'
  }
];

const AI_SYSTEMS = [
  { id: 'brain-galaxy', name: 'Brain Galaxy Chat', icon: '🧠' },
  { id: 'ceo-chatbot', name: 'CEO Chatbot', icon: '👔' },
  { id: 'mision-iwie', name: 'Misión iWie AI', icon: '🎯' },
  { id: 'general', name: 'IA General', icon: '🤖' }
];

export function StudioPrompt() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAI, setSelectedAI] = useState('general');
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
      const aiSystem = AI_SYSTEMS.find(ai => ai.id === selectedAI);
      
      const systemPrompt = `Eres un experto en ingeniería de prompts (Prompt Engineering). Tu misión es ayudar a los usuarios a mejorar sus prompts para obtener mejores respuestas de sistemas de IA.

El usuario quiere interactuar con: ${aiSystem?.name || 'una IA general'}

Tu trabajo es:
1. **Analizar** el prompt o intención del usuario
2. **Identificar** áreas de mejora (claridad, contexto, especificidad, formato esperado)
3. **Proponer** una versión mejorada del prompt
4. **Explicar** por qué la versión mejorada es más efectiva

Formato de respuesta:
- Primero, analiza brevemente qué quiere lograr el usuario
- Luego, presenta el **PROMPT MEJORADO** claramente marcado
- Finalmente, explica las mejoras aplicadas

Principios de un buen prompt:
- **Contexto claro**: Proporcionar información relevante
- **Instrucciones específicas**: Decir exactamente qué se espera
- **Formato definido**: Indicar cómo debe estructurarse la respuesta
- **Rol del asistente**: Definir desde qué perspectiva debe responder
- **Restricciones**: Límites o requisitos específicos

Responde siempre en español y sé amigable pero profesional.`;

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

      // Extract improved prompt if present
      const promptMatch = assistantContent.match(/\*\*PROMPT MEJORADO\*\*[:\s]*([\s\S]*?)(?=\n\n|$)/i);
      const improvedPrompt = promptMatch ? promptMatch[1].trim() : undefined;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        improvedPrompt,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Studio Prompt error:', error);
      toast.error('Error al procesar tu solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Prompt copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2000);
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
    <div className="flex flex-col h-[calc(100vh-200px)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Wand2 className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Studio Prompt</h2>
            <p className="text-sm text-muted-foreground">
              Mejora tus prompts para obtener mejores respuestas de la IA
            </p>
          </div>
        </div>

        {/* AI System Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">IA destino:</span>
          <div className="flex gap-1">
            {AI_SYSTEMS.map(ai => (
              <Button
                key={ai.id}
                variant={selectedAI === ai.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedAI(ai.id)}
                className="gap-1"
              >
                <span>{ai.icon}</span>
                <span className="hidden md:inline">{ai.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-card/50 rounded-xl border border-border/50 overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
              <div className="text-center space-y-2">
                <div className="p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 inline-block">
                  <Sparkles className="h-8 w-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold">¿Cómo puedo ayudarte hoy?</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Cuéntame qué quieres pedirle a la IA y te ayudaré a crear un prompt 
                  más efectivo para obtener mejores resultados.
                </p>
              </div>

              {/* Quick Tips */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
                <Card className="bg-background/50 border-border/50 p-3 text-center">
                  <Target className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs font-medium">Sé específico</p>
                </Card>
                <Card className="bg-background/50 border-border/50 p-3 text-center">
                  <Brain className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs font-medium">Da contexto</p>
                </Card>
                <Card className="bg-background/50 border-border/50 p-3 text-center">
                  <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs font-medium">Define formato</p>
                </Card>
                <Card className="bg-background/50 border-border/50 p-3 text-center">
                  <Lightbulb className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs font-medium">Itera y mejora</p>
                </Card>
              </div>

              {/* Prompt Starters */}
              <div className="w-full max-w-2xl">
                <p className="text-sm text-muted-foreground mb-2 text-center">Prueba con estos ejemplos:</p>
                <div className="grid grid-cols-2 gap-2">
                  {PROMPT_STARTERS.map((starter, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="justify-start gap-2 h-auto py-3 px-4 text-left"
                      onClick={() => handleStarterClick(starter.prompt)}
                    >
                      <span className="text-lg">{starter.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{starter.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{starter.prompt}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
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
                          <MarkdownRenderer content={message.content} />
                          
                          {message.improvedPrompt && (
                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Prompt Mejorado
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopy(message.improvedPrompt!, message.id)}
                                  className="h-7 gap-1"
                                >
                                  {copiedId === message.id ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                  Copiar
                                </Button>
                              </div>
                              <p className="text-sm font-mono bg-background/50 p-2 rounded">
                                {message.improvedPrompt}
                              </p>
                            </div>
                          )}
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
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                          <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                        <span className="text-sm text-muted-foreground">Mejorando tu prompt...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border/50">
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe qué quieres pedirle a la IA... Ej: 'Quiero que me ayude a redactar un informe de ventas'"
                className="min-h-[80px] max-h-[120px] resize-none pr-12"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute bottom-2 right-2 bg-amber-500 hover:bg-amber-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tips Sidebar */}
        <div className="hidden lg:block w-72">
          <Card className="bg-card/50 border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                Tips para mejores prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">🎯 Sé específico</h4>
                <p className="text-muted-foreground text-xs">
                  En lugar de "ayúdame con un email", di "escribe un email formal para solicitar una reunión con el equipo de ventas"
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">📝 Proporciona contexto</h4>
                <p className="text-muted-foreground text-xs">
                  Incluye información relevante como tu rol, la audiencia objetivo y el propósito
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">📋 Define el formato</h4>
                <p className="text-muted-foreground text-xs">
                  Indica cómo quieres la respuesta: lista, párrafos, tabla, bullet points, etc.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">🔄 Itera</h4>
                <p className="text-muted-foreground text-xs">
                  No tengas miedo de pedir ajustes o reformular. Los mejores prompts se refinan con práctica
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">⚡ Usa ejemplos</h4>
                <p className="text-muted-foreground text-xs">
                  Si tienes un ejemplo de lo que buscas, inclúyelo en tu prompt
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
