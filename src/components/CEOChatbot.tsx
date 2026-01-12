import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface CEOChatbotProps {
  fullScreen?: boolean;
}

const CEO_RESPONSES = [
  "¡Excelente pregunta! En IWIE siempre buscamos innovar. Déjame explicarte nuestra visión sobre esto...",
  "Como CEO de IWIE, mi enfoque siempre ha sido la tecnología disruptiva. Los drones, la IA y la energía renovable son pilares fundamentales de nuestro holding.",
  "La clave del éxito está en la ejecución. No basta con tener ideas brillantes, hay que materializarlas con precisión aeroespacial.",
  "En IWIE creemos que el futuro es ahora. Cada una de nuestras empresas está diseñada para liderar en su sector.",
  "La inteligencia artificial es el motor que impulsa todas nuestras operaciones. Desde IWIE Drones hasta AIPasajes, la IA está en nuestro ADN.",
  "Mi filosofía es simple: innovar o quedarse atrás. Por eso invertimos constantemente en I+D.",
  "El mercado agrícola tiene un potencial enorme. Con IWIE Agro y Beeflee estamos revolucionando la agricultura inteligente.",
  "La movilidad del futuro es eléctrica y autónoma. IWIE Motors está en la vanguardia de esta transformación.",
  "Cada decisión que tomamos está basada en datos. Los KPIs que ves en el dashboard son nuestra brújula.",
];

// Separate ChatContent component to prevent re-renders
const ChatContentInner = ({
  messages,
  isTyping,
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  scrollRef,
  textareaRef,
}: {
  messages: Message[];
  isTyping: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) => (
  <>
    <div className="p-4 bg-primary/10 border-b border-border flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <Rocket className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">CEO Mauricio</h3>
        <p className="text-xs text-muted-foreground">Asistente Ejecutivo IA</p>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-muted-foreground">Online</span>
      </div>
    </div>

    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === 'user' ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] p-3 rounded-lg",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted text-foreground rounded-bl-none"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-lg rounded-bl-none">
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Escribiendo...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>

    <div className="p-4 border-t border-border">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe tu mensaje..."
          className="flex-1 bg-input border-border focus:border-primary resize-none min-h-[44px] max-h-[120px] py-3"
          rows={1}
        />
        <Button 
          onClick={onSend} 
          disabled={!inputValue.trim() || isTyping} 
          className="bg-primary hover:bg-primary/80 h-11 w-11 p-0 shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Presiona Enter para enviar, Shift+Enter para nueva línea
      </p>
    </div>
  </>
);

export const CEOChatbot = ({ fullScreen = false }: CEOChatbotProps) => {
  const [isOpen, setIsOpen] = useState(fullScreen);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '¡Hola! Soy Mauricio, CEO de IWIE Holding. ¿En qué puedo ayudarte hoy? Pregúntame sobre nuestras empresas, estrategias de innovación, o cualquier tema relacionado con drones, IA, energía o aeroespacial. 🚀',
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const responseIndex = Math.floor(Math.random() * CEO_RESPONSES.length);
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      content: CEO_RESPONSES[responseIndex],
      role: 'assistant',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  }, [inputValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  if (fullScreen) {
    return (
      <div className="w-full h-full bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <ChatContentInner
          messages={messages}
          isTyping={isTyping}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          scrollRef={scrollRef}
          textareaRef={textareaRef}
        />
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 z-50",
          isOpen ? "bg-destructive hover:bg-destructive/80" : "bg-primary hover:bg-primary/80 animate-pulse-glow"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-50 animate-scale-in">
          <ChatContentInner
            messages={messages}
            isTyping={isTyping}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            scrollRef={scrollRef}
            textareaRef={textareaRef}
          />
        </div>
      )}
    </>
  );
};
