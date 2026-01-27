import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, Rocket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCEOChatbot } from '@/hooks/useCEOChatbot';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface CEOChatbotProps {
  fullScreen?: boolean;
}

// Separate ChatContent component to prevent re-renders
const ChatContentInner = ({
  messages,
  isTyping,
  isLoading,
  inputValue,
  onInputChange,
  onSend,
  onKeyDown,
  onClear,
  scrollRef,
  textareaRef,
  error,
}: {
  messages: Array<{ id: string; content: string; role: 'user' | 'assistant'; created_at: string }>;
  isTyping: boolean;
  isLoading: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClear: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  error: string | null;
}) => (
  <>
    <div className="p-4 bg-primary/10 border-b border-border flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <Rocket className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">CEO AI Assistant</h3>
        <p className="text-xs text-muted-foreground">Asistente Ejecutivo con IA</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          title="Limpiar conversación"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-muted-foreground">Online</span>
      </div>
    </div>

    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg bg-muted text-foreground rounded-bl-none">
              <p className="text-sm whitespace-pre-wrap">
                Hola. Soy el asistente del CEO de IWIE Holding. 
                ¿En qué puedo ayudarte? Consultas sobre empresas, reuniones, tickets, o información estratégica.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
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
                {message.role === 'assistant' ? (
                  <MarkdownRenderer content={message.content} className="text-sm" />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                <p className="text-xs opacity-60 mt-1">
                  {new Date(message.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-lg rounded-bl-none">
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Analizando...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-destructive/20 text-destructive p-3 rounded-lg text-sm">
              {error}
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
          disabled={isTyping}
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
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isLoading, isSending, error, sendMessage, clearConversation } = useCEOChatbot();

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
    if (!inputValue.trim() || isSending) return;
    
    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  }, [inputValue, isSending, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const handleClear = useCallback(async () => {
    await clearConversation();
  }, [clearConversation]);

  if (fullScreen) {
    return (
      <div className="w-full h-full bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <ChatContentInner
          messages={messages}
          isTyping={isSending}
          isLoading={isLoading}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          onClear={handleClear}
          scrollRef={scrollRef}
          textareaRef={textareaRef}
          error={error}
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
            isTyping={isSending}
            isLoading={isLoading}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            onClear={handleClear}
            scrollRef={scrollRef}
            textareaRef={textareaRef}
            error={error}
          />
        </div>
      )}
    </>
  );
};
