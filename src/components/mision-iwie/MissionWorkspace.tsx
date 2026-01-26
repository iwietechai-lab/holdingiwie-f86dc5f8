import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Loader2,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react';
import { Mission, CONTEXT_CONFIG, MISSION_TYPE_CONFIG, ConversationContext, PanelType } from '@/types/mision-iwie';
import { useMissionWorkspace } from '@/hooks/useMissionWorkspace';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WorkspacePanels } from './workspace/WorkspacePanels';

interface MissionWorkspaceProps {
  mission: Mission;
  onBack: () => void;
}

export function MissionWorkspace({ mission, onBack }: MissionWorkspaceProps) {
  const {
    loading,
    chatMessages,
    currentContext,
    isAITyping,
    costEstimates,
    timeEstimates,
    currentUserId,
    sendMessage,
    insertLocalMessage,
  } = useMissionWorkspace({ mission });

  const [inputValue, setInputValue] = useState('');
  const [showPanels, setShowPanels] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAITyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isAITyping) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    insertLocalMessage(messageContent);
    await sendMessage(messageContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const typeConfig = MISSION_TYPE_CONFIG[mission.mission_type] || MISSION_TYPE_CONFIG.general;
  const contextConfig = currentContext ? CONTEXT_CONFIG[currentContext.detected_context] : CONTEXT_CONFIG.general;

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{typeConfig.icon}</span>
              <h2 className="font-semibold">{mission.title}</h2>
              {mission.ai_enabled && (
                <Badge variant="secondary" className="gap-1">
                  <Bot className="w-3 h-3" />
                  IA Activa
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{mission.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Context Indicator */}
          {currentContext && (
            <Badge
              variant="outline"
              className="gap-1"
              style={{ 
                borderColor: contextConfig.color, 
                color: contextConfig.color,
                backgroundColor: `${contextConfig.color}10`
              }}
            >
              <Sparkles className="w-3 h-3" />
              {contextConfig.icon} {contextConfig.label}
              <span className="text-xs opacity-70">
                ({Math.round(currentContext.confidence * 100)}%)
              </span>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPanels(!showPanels)}
          >
            {showPanels ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 pt-4">
        <ResizablePanelGroup direction="horizontal">
          {/* Chat Panel */}
          <ResizablePanel defaultSize={showPanels ? 40 : 100} minSize={30}>
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  Chat de Misión
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                {/* Messages */}
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-4 py-4">
                    {chatMessages.length === 0 && !loading && (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">
                          ¡Hola! Soy tu asistente de misión.
                        </p>
                        <p className="text-xs mt-1">
                          Pregúntame sobre tu proyecto y te ayudaré con análisis, costos y más.
                        </p>
                      </div>
                    )}

                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-3',
                          msg.is_ai_message ? 'flex-row' : 'flex-row-reverse'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                            msg.is_ai_message
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary'
                          )}
                        >
                          {msg.is_ai_message ? (
                            <Bot className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={cn(
                            'rounded-lg px-3 py-2 max-w-[80%]',
                            msg.is_ai_message
                              ? 'bg-muted'
                              : 'bg-primary text-primary-foreground'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                            {msg.ai_model && ` • ${msg.ai_model}`}
                          </p>
                        </div>
                      </div>
                    ))}

                    {isAITyping && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Escribe tu mensaje..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isAITyping}
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isAITyping}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ResizablePanel>

          {/* Panels */}
          {showPanels && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={60} minSize={40}>
                <WorkspacePanels
                  mission={mission}
                  currentContext={currentContext}
                  costEstimates={costEstimates}
                  timeEstimates={timeEstimates}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
