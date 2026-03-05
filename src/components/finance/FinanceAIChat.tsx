import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const FinanceAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('finance-ai-chat', {
        body: { messages: [...messages, userMsg] },
      });

      if (error) throw error;
      const reply = data?.reply || 'No pude procesar la consulta.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm h-[calc(100vh-220px)] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <Bot className="w-4 h-4 text-primary" />
          Agente Financiero IA
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12 space-y-2">
                <Bot className="w-12 h-12 mx-auto text-primary/40" />
                <p>Pregunta sobre las finanzas del holding</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {[
                    '¿Cuánto gastó iwie-drones este mes?',
                    '¿Cuál es el flujo de caja de la semana?',
                    'Compara ingresos de enero vs febrero',
                  ].map(q => (
                    <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setInput(q); }}>
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`rounded-lg p-3 max-w-[80%] ${m.role === 'user' ? 'bg-primary/20 text-foreground' : 'bg-muted/50'}`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <MarkdownRenderer content={m.content} />
                    </div>
                  ) : (
                    <p className="text-sm">{m.content}</p>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex gap-1"><span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" /><span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:150ms]" /><span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:300ms]" /></div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Pregunta sobre las finanzas del holding..."
            className="bg-input"
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
