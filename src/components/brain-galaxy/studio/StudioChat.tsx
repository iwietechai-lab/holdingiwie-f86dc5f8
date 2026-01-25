import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Sparkles,
  Settings2,
  Search,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { ChatMessage, Source, StudioOutput } from './types';

interface StudioChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  sources: Source[];
  currentOutput?: StudioOutput;
  onClearOutput: () => void;
}

export function StudioChat({
  messages,
  onSendMessage,
  isLoading,
  sources,
  currentOutput,
  onClearOutput,
}: StudioChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentOutput]);

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

  const readySources = sources.filter(s => s.status === 'ready');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Chat</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Output Display or Chat */}
      <ScrollArea ref={scrollRef} className="flex-1">
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
        ) : (
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Chat con tus documentos</p>
                <p className="text-sm mt-2">
                  {readySources.length > 0 
                    ? `Tienes ${readySources.length} fuente${readySources.length > 1 ? 's' : ''} lista${readySources.length > 1 ? 's' : ''}. ¡Pregunta lo que quieras!`
                    : 'Añade fuentes para comenzar a chatear con ellas.'
                  }
                </p>
                {readySources.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setInput('Resume los puntos principales de mis documentos')}
                    >
                      📝 Resumir
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setInput('¿Cuáles son las ideas más importantes?')}
                    >
                      💡 Ideas clave
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setInput('Explícame esto como si fuera un principiante')}
                    >
                      🎓 Explicar simple
                    </Badge>
                  </div>
                )}
              </div>
            )}

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

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Analizando fuentes...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Deep Research Banner */}
      {readySources.length > 0 && !currentOutput && (
        <div className="px-4 py-2 border-t">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Search className="h-4 w-4" />
            <span className="text-xs">
              Prueba <strong>Deep Research</strong> para obtener un informe detallado y nuevas fuentes.
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={readySources.length > 0 
              ? "Pregunta sobre tus documentos..." 
              : "Sube una fuente para empezar"
            }
            className="min-h-[60px] resize-none"
            disabled={isLoading || readySources.length === 0}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || readySources.length === 0}
            size="icon"
            className="h-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {readySources.length} fuente{readySources.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
