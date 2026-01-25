import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Bot, 
  PenLine, 
  Plus, 
  Trash2, 
  GripVertical, 
  Loader2,
  Send,
  ArrowLeft,
  Sparkles,
  Save,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { BrainGalaxyArea, ChatMessage } from '@/types/brain-galaxy';

interface CourseModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
}

interface CourseBuilderProps {
  areas: BrainGalaxyArea[];
  onBack: () => void;
  onSaveCourse: (course: {
    title: string;
    description: string;
    areaId: string;
    difficultyLevel: string;
    estimatedHours: number;
    modules: CourseModule[];
    isPublic: boolean;
  }) => Promise<boolean>;
}

export function CourseBuilder({ areas, onBack, onSaveCourse }: CourseBuilderProps) {
  const [mode, setMode] = useState<'select' | 'manual' | 'ai'>('select');
  const [isSaving, setIsSaving] = useState(false);

  // Course form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState('none');
  const [difficultyLevel, setDifficultyLevel] = useState('beginner');
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isPublic, setIsPublic] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addModule = () => {
    setModules([
      ...modules,
      {
        id: `module-${Date.now()}`,
        title: `Módulo ${modules.length + 1}`,
        description: '',
        estimatedMinutes: 30,
      },
    ]);
  };

  const updateModule = (id: string, updates: Partial<CourseModule>) => {
    setModules(modules.map(m => (m.id === id ? { ...m, ...updates } : m)));
  };

  const removeModule = (id: string) => {
    setModules(modules.filter(m => m.id !== id));
  };

  const handleSaveCourse = async () => {
    if (!title.trim()) return;
    
    setIsSaving(true);
    const success = await onSaveCourse({
      title: title.trim(),
      description: description.trim(),
      areaId: areaId === 'none' ? '' : areaId,
      difficultyLevel,
      estimatedHours,
      modules,
      isPublic,
    });
    setIsSaving(false);
    
    if (success) {
      onBack();
    }
  };

  // AI Chat for course generation
  const sendAiMessage = useCallback(async () => {
    if (!chatInput.trim() || isAiLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsAiLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-galaxy-ai`;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          brainModel: 'brain-4',
          action: 'generate_curriculum',
          context: { generateCourse: true },
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

      setChatMessages(prev => [...prev, assistantMessage]);

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
              setChatMessages(prev => {
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

      // Try to extract course structure from the AI response
      extractCourseFromResponse(assistantContent);

    } catch (error) {
      console.error('AI chat error:', error);
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-error-${Date.now()}`,
          role: 'assistant',
          content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  }, [chatInput, chatMessages, isAiLoading]);

  const extractCourseFromResponse = (content: string) => {
    // Try to find course structure in the response
    // This is a simple extraction - the AI is prompted to format it properly
    const titleMatch = content.match(/(?:título|curso|tema):\s*(.+?)(?:\n|$)/i);
    const modulesMatch = content.match(/(?:módulos?|contenido|estructura):\s*([\s\S]*?)(?:\n\n|$)/i);
    
    if (titleMatch) {
      setGeneratedCourse({
        title: titleMatch[1].trim(),
        content: content,
      });
    }
  };

  const applyGeneratedCourse = () => {
    if (generatedCourse) {
      setTitle(generatedCourse.title);
      setMode('manual'); // Switch to manual mode to review/edit
    }
  };

  // Mode selection screen
  if (mode === 'select') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Crear Nuevo Curso</h2>
            <p className="text-sm text-muted-foreground">
              Elige cómo quieres crear tu curso
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
            onClick={() => setMode('manual')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                <PenLine className="h-6 w-6 text-blue-500" />
              </div>
              <CardTitle>Creación Manual</CardTitle>
              <CardDescription>
                Diseña tu curso paso a paso, definiendo módulos, contenido y estructura a tu medida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Control total sobre el contenido</li>
                <li>• Define módulos personalizados</li>
                <li>• Agrega recursos propios</li>
              </ul>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
            onClick={() => setMode('ai')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
                <Bot className="h-6 w-6 text-purple-500" />
              </div>
              <CardTitle>Crear con IA</CardTitle>
              <CardDescription>
                Conversa con Brain Galaxy y genera la estructura de tu curso automáticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Generación automática de estructura</li>
                <li>• Sugerencias de contenido</li>
                <li>• Personalizable después</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // AI Chat mode
  if (mode === 'ai') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setMode('select')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              Crear Curso con IA
            </h2>
            <p className="text-sm text-muted-foreground">
              Describe el curso que quieres crear y la IA te ayudará
            </p>
          </div>
        </div>

        <Card className="flex flex-col h-[calc(100vh-16rem)]">
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">¿Sobre qué tema quieres crear un curso?</p>
                  <p className="text-sm mt-2">
                    Cuéntame el tema, nivel de dificultad y cualquier detalle que tengas en mente.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setChatInput('Quiero crear un curso de introducción a Python para principiantes')}
                    >
                      Python básico
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setChatInput('Ayúdame a diseñar un curso sobre gestión de proyectos ágiles')}
                    >
                      Gestión ágil
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => setChatInput('Necesito un curso sobre operación de drones agrícolas')}
                    >
                      Drones agrícolas
                    </Badge>
                  </div>
                </div>
              )}

              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
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

              {isAiLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t space-y-3">
            {generatedCourse && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Curso generado: {generatedCourse.title}</p>
                  <p className="text-xs text-muted-foreground">Puedes aplicarlo y editarlo</p>
                </div>
                <Button size="sm" onClick={applyGeneratedCourse}>
                  Aplicar y Editar
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAiMessage();
                  }
                }}
                placeholder="Describe el curso que quieres crear..."
                className="min-h-[60px] resize-none"
                disabled={isAiLoading}
              />
              <Button
                onClick={sendAiMessage}
                disabled={!chatInput.trim() || isAiLoading}
                size="icon"
                className="h-[60px]"
              >
                {isAiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Manual creation mode
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setMode('select')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PenLine className="h-5 w-5 text-blue-500" />
              Creación Manual
            </h2>
            <p className="text-sm text-muted-foreground">
              Define los detalles de tu curso
            </p>
          </div>
        </div>
        <Button onClick={handleSaveCourse} disabled={!title.trim() || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Curso
            </>
          )}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course-title">Título del Curso *</Label>
              <Input
                id="course-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Introducción a Python"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-description">Descripción</Label>
              <Textarea
                id="course-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe de qué trata el curso..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin área</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.icon} {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dificultad</Label>
                <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Principiante</SelectItem>
                    <SelectItem value="intermediate">Intermedio</SelectItem>
                    <SelectItem value="advanced">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duración estimada (horas)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm">Curso Público</p>
                <p className="text-xs text-muted-foreground">Visible para todos en el holding</p>
              </div>
              <Button
                variant={isPublic ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsPublic(!isPublic)}
              >
                {isPublic ? 'Público' : 'Privado'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Módulos</CardTitle>
            <Button size="sm" onClick={addModule}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </CardHeader>
          <CardContent>
            {modules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay módulos aún</p>
                <p className="text-xs">Agrega módulos para estructurar tu curso</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="p-3 rounded-lg border bg-card flex items-start gap-3"
                  >
                    <div className="mt-1 cursor-grab text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={module.title}
                        onChange={(e) => updateModule(module.id, { title: e.target.value })}
                        placeholder="Título del módulo"
                        className="h-8"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={5}
                          max={180}
                          value={module.estimatedMinutes}
                          onChange={(e) =>
                            updateModule(module.id, { estimatedMinutes: Number(e.target.value) })
                          }
                          className="h-8 w-20"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeModule(module.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
