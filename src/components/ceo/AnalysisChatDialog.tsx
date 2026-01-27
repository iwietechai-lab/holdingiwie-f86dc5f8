import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Star,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  Bot,
  User,
  GraduationCap
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mauricioAvatar from '@/assets/faces/mauricio.jpg';

interface AnalysisResult {
  submission: {
    id: string;
    title: string;
    content?: string;
    file_url?: string;
  } | null;
  analysis: string;
  feedback: string;
  score: number;
  suggestions: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnalysisChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisResult: AnalysisResult | null;
  submitterName?: string;
}

// Helper function to format analysis text with proper line breaks
const formatAnalysisText = (text: string): string => {
  if (!text) return '';
  
  let formatted = text.replace(/\. ([A-ZÁÉÍÓÚÑ])/g, '.\n\n$1');
  formatted = formatted.replace(/: ([A-ZÁÉÍÓÚÑ])/g, ':\n\n$1');
  formatted = formatted.replace(/(\d+\.\s)/g, '\n$1');
  formatted = formatted.replace(/(•\s|–\s|-\s)/g, '\n$1');
  
  return formatted;
};

export function AnalysisChatDialog({
  open,
  onOpenChange,
  analysisResult,
  submitterName = 'Usuario'
}: AnalysisChatDialogProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [lastAnalyzedId, setLastAnalyzedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Reset chat ONLY when dialog opens with a DIFFERENT document
  useEffect(() => {
    const currentId = analysisResult?.submission?.id;
    if (open && currentId && currentId !== lastAnalyzedId) {
      setChatMessages([]);
      setShowChat(false);
      setLastAnalyzedId(currentId);
    }
  }, [open, analysisResult?.submission?.id, lastAnalyzedId]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending || !analysisResult) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setShowChat(true);
    
    // Create new message object
    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    
    // Update UI immediately
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsSending(true);

    try {
      // CRITICAL FIX: Build full history BEFORE sending (React setState is async)
      const fullHistory = [...chatMessages, newUserMessage];
      
      const { data, error } = await supabase.functions.invoke('ceo-internal-chat', {
        body: {
          action: 'educational_chat',
          message: userMessage,
          document_context: {
            title: analysisResult.submission?.title,
            content: analysisResult.submission?.content,
            analysis: analysisResult.analysis,
            feedback: analysisResult.feedback,
            suggestions: analysisResult.suggestions,
            score: analysisResult.score
          },
          history: fullHistory,  // Now includes ALL messages including the current one
          submitter_name: submitterName
        }
      });

      if (error) throw error;

      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || 'No pude generar una respuesta.' 
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.' 
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "¿Cómo puedo mejorar este documento?",
    "¿Qué debo aprender para hacerlo mejor?",
    "Explícame las sugerencias en detalle",
    "¿Cuáles son las mejores prácticas?"
  ];

  if (!analysisResult) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Análisis AI CEO
          </DialogTitle>
          <DialogDescription>
            {analysisResult.submission?.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-6 pb-4">
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

            {/* Chat Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h4 className="font-medium">Chat Educativo - Pregunta y Aprende</h4>
              </div>

              {/* Quick Questions */}
              {!showChat && (
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setInputMessage(question);
                        setShowChat(true);
                      }}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              )}

              {/* Chat Messages */}
              {showChat && chatMessages.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={mauricioAvatar} alt="CEO" />
                          <AvatarFallback><Bot className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div 
                        className={`p-3 rounded-lg max-w-[80%] ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <MarkdownRenderer content={msg.content} />
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={mauricioAvatar} alt="CEO" />
                        <AvatarFallback><Bot className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div className="p-3 rounded-lg bg-muted flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Escribiendo...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="shrink-0 border-t p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Escribe tu pregunta sobre el análisis..."
              disabled={isSending}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isSending}
              size="icon"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            💡 Pregunta para entender mejor el feedback y aprender a mejorar tus entregas
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
