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
  Link as LinkIcon,
  FileImage,
  FileVideo,
  File,
  Globe,
  Search,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { BrainModel, ChatMessage, BrainGalaxyArea } from '@/types/brain-galaxy';
import { BRAIN_MODELS as MODELS } from '@/types/brain-galaxy';
import { toast } from 'sonner';

interface AttachedFile {
  file: File;
  name: string;
  type: string;
  previewUrl?: string;
}

interface BrainGalaxyChatProps {
  sessionId?: string;
  initialModel?: BrainModel;
  initialMessages?: ChatMessage[];
  initialAreaId?: string;
  areas: BrainGalaxyArea[];
  onSaveSession?: (messages: ChatMessage[], model?: BrainModel, areaId?: string) => void;
  onUploadFile?: (file: File) => Promise<string | null>;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <FileImage className="h-4 w-4 text-primary" />;
  if (type.startsWith('video/')) return <FileVideo className="h-4 w-4 text-accent-foreground" />;
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-destructive" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const getFileTypeLabel = (type: string, name: string): string => {
  if (type.startsWith('image/')) return 'Imagen';
  if (type.startsWith('video/')) return 'Video';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'Documento Word';
  if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xlsx')) return 'Hoja de cálculo';
  if (type.includes('presentation') || name.endsWith('.pptx')) return 'Presentación';
  if (type.includes('audio') || name.endsWith('.mp3')) return 'Audio';
  return 'Archivo';
};

export function BrainGalaxyChat({
  sessionId,
  initialModel = 'brain-4',
  initialMessages = [],
  initialAreaId,
  areas,
  onSaveSession,
  onUploadFile,
}: BrainGalaxyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [selectedModel, setSelectedModel] = useState<BrainModel>(initialModel);
  const [selectedArea, setSelectedArea] = useState<string>(initialAreaId || 'none');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [processingFiles, setProcessingFiles] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedModelInfo = MODELS.find(m => m.id === selectedModel);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: AttachedFile[] = [];
    for (let i = 0; i < files.length && attachedFiles.length + newFiles.length < 5; i++) {
      const file = files[i];
      const previewUrl = file.type.startsWith('image/') 
        ? URL.createObjectURL(file) 
        : undefined;
      newFiles.push({
        file,
        name: file.name,
        type: file.type,
        previewUrl,
      });
    }
    
    if (newFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
    
    // Automatically send files to chat for AI to analyze
    await processFilesForChat(newFiles);
  };

  const processFilesForChat = async (files: AttachedFile[]) => {
    if (files.length === 0) return;
    
    setProcessingFiles(true);
    
    try {
      // Upload files if handler provided
      const uploadedUrls: string[] = [];
      if (onUploadFile) {
        for (const file of files) {
          const url = await onUploadFile(file.file);
          if (url) uploadedUrls.push(url);
        }
      }

      // Create file summary for AI
      const fileDescriptions = files.map((f, i) => {
        const typeLabel = getFileTypeLabel(f.type, f.name);
        const url = uploadedUrls[i] || 'archivo local';
        return `- **${f.name}** (${typeLabel})`;
      }).join('\n');

      // Create user message with file info
      const fileMessage: ChatMessage = {
        id: `msg-file-${Date.now()}`,
        role: 'user',
        content: `He adjuntado los siguientes archivos:\n\n${fileDescriptions}`,
        timestamp: new Date().toISOString(),
        attachments: files.map((f, i) => ({
          type: 'file' as const,
          name: f.name,
          mimeType: f.type,
          url: uploadedUrls[i] || undefined,
          previewUrl: f.previewUrl,
        })),
      };

      // Send to AI with context about the files
      const aiContextMessage = {
        role: 'user' as const,
        content: `El usuario ha subido ${files.length} archivo(s): ${files.map(f => `"${f.name}" (${getFileTypeLabel(f.type, f.name)})`).join(', ')}. 

Por favor:
1. Reconoce los archivos recibidos
2. Pregunta al usuario qué acción desea realizar con ellos. Las opciones son:
   - 📊 **Analizar**: Examinar el contenido y proporcionar un resumen detallado
   - 📚 **Usar como contenido de curso**: Extraer información para crear módulos de aprendizaje
   - 🔍 **Extraer puntos clave**: Identificar los conceptos más importantes
   - 💡 **Generar preguntas de evaluación**: Crear un quiz basado en el contenido
   - 📝 **Resumir**: Crear un resumen ejecutivo del documento
   
Presenta estas opciones de forma clara y amigable.`,
      };

      // CRITICAL FIX: Create a system context message to persist file context for future messages
      // This message will be included in subsequent API calls to maintain context
      const fileContextForState: ChatMessage = {
        id: `msg-file-context-${Date.now()}`,
        role: 'system',
        content: `[CONTEXTO: Archivos cargados por el usuario: ${files.map(f => `"${f.name}" (${getFileTypeLabel(f.type, f.name)})`).join(', ')}. Mantén este contexto para respuestas futuras.]`,
        timestamp: new Date().toISOString(),
      };

      // Update messages with BOTH the visible file message AND the hidden context message
      const updatedMessages = [...messages, fileMessage, fileContextForState];
      setMessages(updatedMessages);

      // Make AI respond about the files - include context message in API call
      setIsLoading(true);
      const messagesForAI = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      // Add the detailed context for AI (not stored in state)
      messagesForAI.push({ role: 'user', content: aiContextMessage.content });
      await streamChat(messagesForAI);
      
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Error al procesar los archivos');
    } finally {
      setProcessingFiles(false);
      setIsLoading(false);
    }
  };

  const removeAttachedFile = (index: number) => {
    const file = attachedFiles[index];
    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      attachedFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const streamChat = useCallback(async (userMessages: { role: string; content: string }[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-galaxy-ai`;

    const areaContext = selectedArea && selectedArea !== 'none'
      ? areas.find(a => a.id === selectedArea)?.name 
      : undefined;

    // Detect if query might need web search (mirror server-side logic for UI indicator)
    const lastMsg = userMessages.filter(m => m.role === 'user').pop();
    if (lastMsg) {
      const lm = lastMsg.content.toLowerCase();
      const temporalTerms = ['hoy', 'ahora', 'actualmente', 'actual', '2025', '2026', 'reciente', 'últimas', 'últimos'];
      const marketTerms = ['precio', 'mercado', 'tendencia', 'industria', 'sector', 'estadística', 'crecimiento', 'noticias'];
      const hasTime = temporalTerms.some(t => lm.includes(t));
      const hasMarket = marketTerms.some(t => lm.includes(t));
      if (hasTime || hasMarket) {
        setIsSearchingWeb(true);
      }
    }

    // Use FUSION mode by default - combines all available AI brains
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
        mode: 'fusion',
      }),
    });

    setIsSearchingWeb(false);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get response');
    }

    // Check if it's a fusion response (JSON) or stream
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      // Fusion mode returns complete JSON response
      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || '';
      
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      return assistantContent;
    }

    // Stream mode fallback
    if (!response.body) {
      throw new Error('No response body');
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

  // Auto-save session when messages change
  const saveSession = useCallback((msgs: ChatMessage[]) => {
    if (onSaveSession && msgs.length > 0) {
      const areaId = selectedArea === 'none' ? undefined : selectedArea;
      onSaveSession(msgs, selectedModel, areaId);
    }
  }, [onSaveSession, selectedModel, selectedArea]);

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    // If there are pending files that haven't been processed, process them first
    if (attachedFiles.length > 0 && input.trim()) {
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: input.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      setAttachedFiles([]);
      setIsLoading(true);

      try {
        await streamChat(updatedMessages.map(m => ({ role: m.role, content: m.content })));
        // Get final messages after streaming
        setMessages(prev => {
          saveSession(prev);
          return prev;
        });
    } catch (error) {
      console.error('Chat error:', error);
      setIsSearchingWeb(false);
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
    return;
  }

    if (!input.trim()) return;

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
      await streamChat(updatedMessages.map(m => ({ role: m.role, content: m.content })));
      // Get final messages after streaming
      setMessages(prev => {
        saveSession(prev);
        return prev;
      });
    } catch (error) {
      console.error('Chat error:', error);
      setIsSearchingWeb(false);
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

  const renderMessageAttachments = (attachments?: ChatMessage['attachments']) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((attachment, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border text-sm"
          >
            {attachment.previewUrl ? (
              <img 
                src={attachment.previewUrl} 
                alt={attachment.name}
                className="h-8 w-8 object-cover rounded"
              />
            ) : (
              getFileIcon(attachment.mimeType || '')
            )}
            <div className="flex flex-col">
              <span className="font-medium truncate max-w-[150px]">{attachment.name}</span>
              <span className="text-xs text-muted-foreground">
                {getFileTypeLabel(attachment.mimeType || '', attachment.name)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
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
                o adjunta archivos para analizarlos y convertirlos en conocimiento.
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
                  onClick={() => fileInputRef.current?.click()}
                >
                  📎 Subir archivo
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setInput('Explícame cómo funciona la inteligencia artificial')}
                >
                  🤖 Aprender IA
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
                  <>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {renderMessageAttachments(message.attachments)}
                  </>
                )}
              </div>
            </div>
          ))}

          {(isLoading || processingFiles) && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                {isSearchingWeb ? (
                  <>
                    <Globe className="h-4 w-4 animate-pulse text-primary" />
                    <span className="text-sm text-muted-foreground">
                      🔍 Buscando información actualizada en la web...
                    </span>
                  </>
                ) : processingFiles ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Analizando archivos...</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando con Multi-Brain Fusion...</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
        {/* Attached files preview - before sending */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border text-sm group"
              >
                {file.previewUrl ? (
                  <img 
                    src={file.previewUrl} 
                    alt={file.name}
                    className="h-8 w-8 object-cover rounded"
                  />
                ) : (
                  getFileIcon(file.type)
                )}
                <div className="flex flex-col">
                  <span className="font-medium truncate max-w-[120px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getFileTypeLabel(file.type, file.name)}
                  </span>
                </div>
                <button
                  onClick={() => removeAttachedFile(index)}
                  className="ml-1 p-1 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
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
            disabled={isLoading || processingFiles || attachedFiles.length >= 5}
            title="Adjuntar archivo (máx. 5)"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje o adjunta un archivo..."
            className="min-h-[60px] resize-none"
            disabled={isLoading || processingFiles}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || processingFiles}
            size="icon"
            className="h-[60px] shrink-0"
          >
            {isLoading || processingFiles ? (
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