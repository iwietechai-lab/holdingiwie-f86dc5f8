import React, { useState, useEffect, useRef } from 'react';
import { Tarea, TareaDecision, UserStats } from '@/hooks/useAITareas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Send, 
  Lightbulb, 
  AlertTriangle, 
  Target, 
  TrendingUp,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AISuggestion {
  type: 'prioritization' | 'overload' | 'focus' | 'pattern' | 'result';
  content: string;
  priority: 'high' | 'medium' | 'low';
}

interface TareasAIAssistantProps {
  tasks: Tarea[];
  decisions: TareaDecision[];
  userStats: UserStats | null;
  overloadStatus: {
    totalPending: number;
    totalHours: number;
    isOverloaded: boolean;
    isHoursOverloaded: boolean;
  };
}

export function TareasAIAssistant({
  tasks,
  decisions,
  userStats,
  overloadStatus,
}: TareasAIAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSuggestions: AISuggestion[] = [];

    if (overloadStatus.isOverloaded) {
      newSuggestions.push({
        type: 'overload',
        content: `Tienes ${overloadStatus.totalPending} tareas pendientes. Considera archivar algunas o delegar.`,
        priority: 'high',
      });
    }

    if (overloadStatus.isHoursOverloaded) {
      newSuggestions.push({
        type: 'overload',
        content: `Tienes ${overloadStatus.totalHours.toFixed(1)}h de trabajo estimado. Quizás sea momento de priorizar.`,
        priority: 'high',
      });
    }

    const hasFocusToday = [...tasks, ...decisions].some(
      item => item.is_focus_mission && item.date_for === new Date().toISOString().split('T')[0]
    );
    if (!hasFocusToday && tasks.length > 0) {
      newSuggestions.push({
        type: 'focus',
        content: 'No tienes una Tarea Focus para hoy. ¿Cuál es tu prioridad principal?',
        priority: 'medium',
      });
    }

    const pendingResults = decisions.filter(d => d.completed_at && !d.real_result_type);
    if (pendingResults.length > 0) {
      newSuggestions.push({
        type: 'result',
        content: `Tienes ${pendingResults.length} decisiones sin resultado registrado.`,
        priority: 'low',
      });
    }

    setSuggestions(newSuggestions.slice(0, 3));
  }, [tasks, decisions, overloadStatus]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const context = {
        pendingTasks: tasks.filter(t => t.status !== 'completed').length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        urgentTasks: tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
        totalHours: overloadStatus.totalHours,
        streak: userStats?.current_streak || 0,
        points: userStats?.total_points || 0,
        decisions: decisions.length,
      };

      const response = await supabase.functions.invoke('mision-iwie-ai', {
        body: { 
          message: userMessage,
          context,
          history: messages.slice(-10)
        }
      });

      if (response.error) throw response.error;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response 
      }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSuggestionIcon = (type: AISuggestion['type']) => {
    switch (type) {
      case 'overload': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'focus': return <Target className="w-4 h-4 text-primary" />;
      case 'pattern': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'result': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      default: return <Lightbulb className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300",
      isExpanded ? "fixed inset-4 z-50" : "relative"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Asistente IA
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {suggestions.length > 0 && !isExpanded && (
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg text-sm",
                  suggestion.priority === 'high' && "bg-destructive/10 border border-destructive/20",
                  suggestion.priority === 'medium' && "bg-yellow-500/10 border border-yellow-500/20",
                  suggestion.priority === 'low' && "bg-primary/10 border border-primary/20"
                )}
              >
                {getSuggestionIcon(suggestion.type)}
                <p className="flex-1">{suggestion.content}</p>
              </div>
            ))}
          </div>
        )}

        <div className={cn(
          "flex flex-col",
          isExpanded ? "h-[calc(100vh-200px)]" : "h-64"
        )}>
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">¡Hola! 👋</p>
                  <p className="text-xs mt-1">
                    Pregúntame sobre productividad o cualquier duda
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] p-3 rounded-lg text-sm",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
