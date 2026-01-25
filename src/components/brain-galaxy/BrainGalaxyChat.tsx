import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Paperclip, 
  Sparkles,
  Brain,
  X,
  FileText,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { BrainModel, ChatMessage, BrainGalaxyArea } from '@/types/brain-galaxy';
import { BRAIN_MODELS as MODELS } from '@/types/brain-galaxy';

interface AttachedFile {
  file: File;
  name: string;
  type: string;
}

interface BrainGalaxyChatProps {
  sessionId?: string;
  initialModel?: BrainModel;
  areas: BrainGalaxyArea[];
  onSaveSession?: (messages: ChatMessage[]) => void;
  onUploadFile?: (file: File) => Promise<string | null>;
}

export function BrainGalaxyChat({
  sessionId,
  initialModel = 'brain-4',
  areas,
  onSaveSession,
  onUploadFile,
}: BrainGalaxyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<BrainModel>(initialModel);
  const [selectedArea, setSelectedArea] = useState<string>('none');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedModelInfo = MODELS.find(m => m.id === selectedModel);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles: AttachedFile[] = [];
    for (let i = 0; i < files.length && attachedFiles.length + newFiles.length < 5; i++) {
      const file = files[i];
      if (file.size <= 20 * 1024 * 1024) { // 20MB limit
        newFiles.push({
          file,
          name: file.name,
          type: file.type,
        });
      }
    }
    setAttachedFiles([...attachedFiles, ...newFiles]);
    e.target.value = ''; // Reset input
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (userMessages: ChatMessage[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-galaxy-ai`;

    const areaContext = selectedArea && selectedArea !== 'none'
      ? areas.find(a => a.id === selectedArea)?.name 
      : undefined;

    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
        brainModel: selectedModel,
        action: 'chat',
        context: { area: areaContext },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to start stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (updated[lastIndex]?.role === 'assistant') {
                updated[lastIndex] = { ...updated[lastIndex], content: assistantContent };
              }
              return updated;
            });
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    return assistantContent;
  }, [selectedModel, selectedArea, areas]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      await streamChat(updatedMessages);
      if (onSaveSession) {
        onSaveSession(updatedMessages);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-error-${Date.now()}`,
          role: 'assistant',
          content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Chat con Brain Galaxy
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as BrainModel)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.icon}</span>
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Area Context */}
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Área (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin área específica</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {selectedModelInfo && (
          <p className="text-xs text-muted-foreground mt-2">
            {selectedModelInfo.description} • {selectedModelInfo.specialization}
          </p>
        )}
      </CardHeader>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">¡Hola! Soy Brain Galaxy</p>
              <p className="text-sm mt-2">
                Tu asistente de aprendizaje. Pregúntame lo que quieras aprender,
                <br />
                puedo ayudarte a crear cursos, resolver dudas y más.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setInput('Ayúdame a crear un curso sobre drones agrícolas')}
                >
                  📚 Crear curso
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setInput('Explícame cómo funciona la inteligencia artificial')}
                >
                  🤖 Aprender IA
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setInput('¿Cuáles son las mejores prácticas en gestión financiera?')}
                >
                  💰 Finanzas
                </Badge>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
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
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
              >
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  onClick={() => removeAttachedFile(index)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          {/* File attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.xls,.pptx,.jpg,.jpeg,.png,.mp3,.mp4"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-[60px] shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || attachedFiles.length >= 5}
            title="Adjuntar archivo"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
