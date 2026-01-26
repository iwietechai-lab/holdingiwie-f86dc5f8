import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Book, Sparkles, Upload, History, GraduationCap, Wand2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SourcesPanel } from './SourcesPanel';
import { StudioChat } from './StudioChat';
import { StudioToolsPanel } from './StudioToolsPanel';
import { ManualCourseBuilder } from './ManualCourseBuilder';
import type { Source, StudioOutput, StudioToolType, ChatMessage } from './types';
import type { BrainGalaxyArea, BrainGalaxyContent } from '@/types/brain-galaxy';

interface FoundSource {
  title: string;
  url?: string;
  type: 'web' | 'internal' | 'suggested';
  description?: string;
}

interface CourseProposal {
  title: string;
  description: string;
  modules: { title: string; description: string; topics: string[] }[];
  sources: FoundSource[];
  suggestedTopics?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: string;
  messages: ChatMessage[];
  mode: CreationMode;
}

interface CreatedCourse {
  id: string;
  title: string;
  createdAt: string;
  mode: CreationMode;
}

interface StudioBuilderProps {
  areas: BrainGalaxyArea[];
  existingContent: BrainGalaxyContent[];
  onBack: () => void;
  onSaveCourse: (course: {
    title: string;
    description: string;
    areaId: string;
    difficultyLevel: string;
    estimatedHours: number;
    modules: { id: string; title: string; description: string; estimatedMinutes: number }[];
    isPublic: boolean;
  }) => Promise<boolean>;
}

// 3 creation modes
type CreationMode = 'studio' | 'ai' | 'manual';

// Course creation detection patterns
const COURSE_CREATION_PATTERNS = [
  /quiero (crear|hacer|diseñar|armar) un curso/i,
  /crear un curso/i,
  /diseñar un curso/i,
  /necesito un curso/i,
  /ayúdame a (crear|diseñar|hacer) un curso/i,
  /curso sobre/i,
  /curso de/i,
  /curso para/i,
  /crear capacitación/i,
  /programa de aprendizaje/i,
];

function detectCourseCreationIntent(message: string): boolean {
  return COURSE_CREATION_PATTERNS.some(pattern => pattern.test(message));
}

export function StudioBuilder({
  areas,
  existingContent,
  onBack,
  onSaveCourse,
}: StudioBuilderProps) {
  const [creationMode, setCreationMode] = useState<CreationMode>('studio');
  const [sources, setSources] = useState<Source[]>([]);
  const [outputs, setOutputs] = useState<StudioOutput[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingTool, setGeneratingTool] = useState<StudioToolType>();
  const [currentOutput, setCurrentOutput] = useState<StudioOutput>();
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [courseProposal, setCourseProposal] = useState<CourseProposal | null>(null);
  const [foundSources, setFoundSources] = useState<FoundSource[]>([]);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  
  // History
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [createdCourses, setCreatedCourses] = useState<CreatedCourse[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const addSource = useCallback((sourceData: Omit<Source, 'id' | 'addedAt'>) => {
    const newSource: Source = {
      ...sourceData,
      id: `source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
    };
    setSources(prev => [...prev, newSource]);
    toast.success(`Fuente "${sourceData.name}" añadida`);
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  const scrapeUrl = useCallback(async (url: string): Promise<string> => {
    setIsScrapingUrl(true);
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { url, options: { formats: ['markdown'] } },
      });

      if (error) throw error;
      
      const content = data?.data?.markdown || data?.markdown || '';
      if (!content) throw new Error('No se pudo extraer contenido');
      
      return content;
    } catch (error) {
      console.error('Error scraping URL:', error);
      toast.error('Error al extraer contenido de la URL');
      throw error;
    } finally {
      setIsScrapingUrl(false);
    }
  }, []);

  const getSourcesContext = useCallback(() => {
    const readySources = sources.filter(s => s.status === 'ready');
    if (readySources.length === 0) return '';
    
    return readySources.map((s, i) => 
      `--- FUENTE ${i + 1}: ${s.name} ---\n${s.content.substring(0, 5000)}\n`
    ).join('\n\n');
  }, [sources]);

  const handleAddSourceFromSuggestion = useCallback(async (suggestion: { 
    type: 'url' | 'text'; 
    name: string; 
    content?: string; 
    url?: string 
  }) => {
    if (suggestion.type === 'url' && suggestion.url) {
      try {
        const content = await scrapeUrl(suggestion.url);
        addSource({
          type: 'url',
          name: suggestion.name,
          content,
          metadata: { url: suggestion.url, scrapedAt: new Date().toISOString() },
          status: 'ready',
        });
      } catch (error) {
        // Error handled in scrapeUrl
      }
    } else if (suggestion.content) {
      addSource({
        type: 'text',
        name: suggestion.name,
        content: suggestion.content,
        status: 'ready',
      });
    }
  }, [addSource, scrapeUrl]);

  const processCourseCreationRequest = useCallback(async (message: string, allMessages: ChatMessage[], isAutoMode: boolean = false) => {
    setIsCreatingCourse(true);
    
    try {
      const sourcesContext = getSourcesContext();
      
      // System prompt varies based on mode
      const systemPrompt = isAutoMode 
        ? `Eres Brain Galaxy Studio en MODO AUTOMÁTICO. Tu trabajo es crear un curso COMPLETO sin intervención del usuario.

El usuario te dirá qué curso necesita y TÚ DECIDES TODO:
- La estructura completa
- Los módulos y su contenido
- Las metodologías de aprendizaje
- Los recursos y fuentes a utilizar
- Las evaluaciones y ejercicios

Debes buscar fuentes relevantes de internet y del conocimiento interno disponible.

${sourcesContext ? `FUENTES DISPONIBLES:\n${sourcesContext}` : ''}

RESPONDE EN FORMATO JSON con esta estructura exacta:
{
  "title": "Título del curso",
  "description": "Descripción completa",
  "modules": [
    {
      "title": "Módulo 1: Nombre",
      "description": "Qué aprenderá",
      "topics": ["Tema 1", "Tema 2"],
      "methodology": "Descripción de la metodología de enseñanza",
      "estimatedMinutes": 60,
      "activities": ["Actividad 1", "Actividad 2"]
    }
  ],
  "sources": [
    {
      "title": "Nombre de la fuente",
      "url": "https://...",
      "type": "web",
      "description": "Por qué es útil"
    }
  ],
  "learningObjectives": ["Objetivo 1", "Objetivo 2"],
  "evaluationMethods": ["Método de evaluación 1"],
  "difficulty": "beginner|intermediate|advanced",
  "estimatedHours": 10,
  "explanation": "Breve explicación de por qué estructuré el curso así y de dónde obtuve la información"
}`
        : `Eres un experto en diseño instruccional de Brain Galaxy. El usuario quiere crear un curso de manera COLABORATIVA.

Tu tarea es:
1. Analizar el tema solicitado
2. Proponer una estructura inicial que el usuario puede modificar
3. Identificar fuentes relevantes
4. Sugerir temas adicionales para discutir

${sourcesContext ? `FUENTES DISPONIBLES:\n${sourcesContext}` : ''}

RESPONDE EN FORMATO JSON:
{
  "title": "Título propuesto",
  "description": "Descripción breve",
  "modules": [
    {
      "title": "Módulo 1: Nombre",
      "description": "Qué aprenderá",
      "topics": ["Tema 1"]
    }
  ],
  "sources": [
    {
      "title": "Nombre de la fuente",
      "url": "https://...",
      "type": "web",
      "description": "Por qué es útil"
    }
  ],
  "suggestedTopics": ["Tema adicional 1"],
  "questionsForUser": ["¿Prefieres enfocarte más en teoría o práctica?"],
  "explanation": "Breve explicación de la propuesta"
}`;

      const proposalResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-galaxy-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              ...allMessages.map(m => ({ role: m.role, content: m.content })),
            ],
            brainModel: 'brain-4',
            action: 'chat',
            mode: 'fusion',
          }),
        }
      );

      if (!proposalResponse.ok) throw new Error('Error generando propuesta');

      const data = await proposalResponse.json();
      const responseContent = data.choices?.[0]?.message?.content || '';
      
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const proposal = JSON.parse(jsonMatch[0]) as CourseProposal & { 
            explanation?: string;
            questionsForUser?: string[];
            learningObjectives?: string[];
          };
          setCourseProposal(proposal);
          setFoundSources(proposal.sources || []);
          
          let assistantContent = proposal.explanation || '';
          
          if (isAutoMode) {
            assistantContent = `✨ **Curso diseñado automáticamente**\n\n${proposal.explanation || 'He analizado tu solicitud y creado un curso completo.'}\n\nRevisa la estructura propuesta. Si estás de acuerdo, puedo proceder a generar todo el contenido.`;
          } else {
            if (proposal.questionsForUser?.length) {
              assistantContent += `\n\n**Algunas preguntas para personalizar mejor:**\n${proposal.questionsForUser.map(q => `- ${q}`).join('\n')}`;
            }
          }
          
          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date().toISOString(),
          };
          setChatMessages(prev => [...prev, assistantMessage]);
          
        } else {
          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: responseContent,
            timestamp: new Date().toISOString(),
          };
          setChatMessages(prev => [...prev, assistantMessage]);
        }
      } catch (parseError) {
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
      
    } catch (error) {
      console.error('Course creation error:', error);
      toast.error('Error al crear la propuesta del curso');
    } finally {
      setIsCreatingCourse(false);
    }
  }, [getSourcesContext]);

  const sendChatMessage = useCallback(async (message: string) => {
    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setIsLoading(true);

    try {
      const isStudioMode = creationMode === 'studio';
      
      // Check if this is a course creation request
      if (detectCourseCreationIntent(message) || chatMessages.length === 0) {
        await processCourseCreationRequest(message, updatedMessages, isStudioMode);
        return;
      }

      // Check if user wants to proceed with course creation
      if ((message.toLowerCase().includes('procede') || message.toLowerCase().includes('crear')) && courseProposal) {
        await generateOutput('course');
        
        // Save to created courses
        const newCourse: CreatedCourse = {
          id: `course-${Date.now()}`,
          title: courseProposal.title,
          createdAt: new Date().toISOString(),
          mode: creationMode,
        };
        setCreatedCourses(prev => [newCourse, ...prev]);
        setCourseProposal(null);
        return;
      }

      const sourcesContext = getSourcesContext();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-galaxy-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `Eres Brain Galaxy Studio, un asistente experto en educación y creación de contenido.

${isStudioMode ? 'MODO STUDIO: Tomas decisiones autónomas sobre la estructura y contenido del curso.' : 'MODO COLABORATIVO: Trabajas junto al usuario para definir la estructura.'}

${sourcesContext ? `FUENTES DISPONIBLES:\n${sourcesContext}` : ''}

${courseProposal ? `PROPUESTA DE CURSO ACTUAL:\n${JSON.stringify(courseProposal, null, 2)}` : ''}

Responde de manera clara y en español.`,
              },
              ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
            ],
            brainModel: 'brain-4',
            action: 'chat',
            mode: 'fusion',
          }),
        }
      );

      if (!response.ok) throw new Error('Error en la respuesta');

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || 'Sin respuesta';

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Error al procesar el mensaje');
    } finally {
      setIsLoading(false);
    }
  }, [chatMessages, getSourcesContext, isLoading, courseProposal, creationMode, processCourseCreationRequest]);

  const generateOutput = useCallback(async (toolType: StudioToolType) => {
    if (isGenerating) return;

    const readySources = sources.filter(s => s.status === 'ready');
    
    if (readySources.length === 0 && toolType !== 'course') {
      toast.error('Añade al menos una fuente primero');
      return;
    }

    setIsGenerating(true);
    setGeneratingTool(toolType);

    try {
      const sourcesContext = getSourcesContext();
      
      const toolPrompts: Record<StudioToolType, string> = {
        'audio-summary': 'Genera un guión para un podcast/audio que resuma el contenido.',
        'video-summary': 'Crea un guión para un video explicativo.',
        'mind-map': 'Genera un mapa mental en formato de texto estructurado.',
        'report': 'Genera un informe ejecutivo detallado.',
        'flashcards': 'Genera tarjetas de estudio. Crea al menos 10.',
        'quiz': 'Genera un cuestionario con 10 preguntas variadas.',
        'infographic': 'Diseña el contenido para una infografía.',
        'presentation': 'Crea slides para una presentación. Al menos 10.',
        'data-table': 'Extrae y organiza la información en tablas.',
        'deep-research': 'Realiza una investigación profunda.',
        'course': courseProposal 
          ? `Genera un curso completo basado en esta propuesta:\n${JSON.stringify(courseProposal, null, 2)}\n\nIncluye contenido detallado para cada módulo, actividades, evaluaciones y recursos.`
          : 'Genera una malla curricular completa.',
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brain-galaxy-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `Eres un experto en creación de contenido educativo. ${sourcesContext ? `Analiza las siguientes fuentes:\n\n${sourcesContext}` : ''}`,
              },
              {
                role: 'user',
                content: toolPrompts[toolType],
              },
            ],
            brainModel: 'brain-4',
            action: 'chat',
            mode: 'fusion',
          }),
        }
      );

      if (!response.ok) throw new Error('Error generando contenido');

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const toolNames: Record<StudioToolType, string> = {
        'audio-summary': 'Resumen de Audio',
        'video-summary': 'Resumen de Video',
        'mind-map': 'Mapa Mental',
        'report': 'Informe',
        'flashcards': 'Tarjetas de Estudio',
        'quiz': 'Cuestionario',
        'infographic': 'Infografía',
        'presentation': 'Presentación',
        'data-table': 'Tabla de Datos',
        'deep-research': 'Investigación Profunda',
        'course': 'Curso',
      };

      const newOutput: StudioOutput = {
        id: `output-${Date.now()}`,
        type: toolType,
        title: toolNames[toolType],
        content,
        status: 'ready',
        createdAt: new Date().toISOString(),
        sourceIds: readySources.map(s => s.id),
      };

      setOutputs(prev => [...prev, newOutput]);
      setCurrentOutput(newOutput);
      toast.success(`${toolNames[toolType]} generado correctamente`);

    } catch (error) {
      console.error('Error generating output:', error);
      toast.error('Error al generar el contenido');
    } finally {
      setIsGenerating(false);
      setGeneratingTool(undefined);
    }
  }, [getSourcesContext, isGenerating, sources, courseProposal]);

  const hasSourcesReady = sources.some(s => s.status === 'ready');

  const handleModeChange = (mode: string) => {
    setCreationMode(mode as CreationMode);
    // Save current session before switching
    if (chatMessages.length > 0) {
      const session: ChatSession = {
        id: `session-${Date.now()}`,
        title: chatMessages[0]?.content.substring(0, 50) || 'Conversación',
        lastMessage: chatMessages[chatMessages.length - 1]?.content.substring(0, 100) || '',
        createdAt: new Date().toISOString(),
        messages: [...chatMessages],
        mode: creationMode,
      };
      setChatSessions(prev => [session, ...prev]);
    }
    // Clear state when switching modes
    setChatMessages([]);
    setSources([]);
    setCourseProposal(null);
    setFoundSources([]);
    setCurrentOutput(undefined);
  };

  const startNewChat = () => {
    if (chatMessages.length > 0) {
      const session: ChatSession = {
        id: `session-${Date.now()}`,
        title: chatMessages[0]?.content.substring(0, 50) || 'Nueva conversación',
        lastMessage: chatMessages[chatMessages.length - 1]?.content.substring(0, 100) || '',
        createdAt: new Date().toISOString(),
        messages: [...chatMessages],
        mode: creationMode,
      };
      setChatSessions(prev => [session, ...prev]);
    }
    setChatMessages([]);
    setCourseProposal(null);
    setFoundSources([]);
  };

  const loadChatSession = (session: ChatSession) => {
    setChatMessages(session.messages);
    setCreationMode(session.mode);
    setShowHistory(false);
  };

  // Render Manual Mode
  if (creationMode === 'manual') {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Brain Galaxy Studio</h2>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4" />
              Historial
            </Button>
          </div>
          
          {/* Mode Tabs */}
          <Tabs value={creationMode} onValueChange={handleModeChange} className="px-4">
            <TabsList className="w-full max-w-2xl">
              <TabsTrigger value="studio" className="flex-1 gap-2">
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Crear con Studio</span>
                <span className="sm:hidden">Studio</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1 gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Crear con IA</span>
                <span className="sm:hidden">Con IA</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Crear Manual</span>
                <span className="sm:hidden">Manual</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Manual Course Builder */}
        <ManualCourseBuilder
          areas={areas}
          existingContent={existingContent}
          onSaveCourse={onSaveCourse}
          sources={sources}
          onAddSource={addSource}
          onRemoveSource={removeSource}
          onScrapeUrl={scrapeUrl}
          isScrapingUrl={isScrapingUrl}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-16rem)] flex flex-col">
      {/* Header with Tabs */}
      <div className="border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Brain Galaxy Studio</h2>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4" />
            Historial
          </Button>
        </div>
        
        {/* Mode Tabs - Now with 3 options */}
        <Tabs value={creationMode} onValueChange={handleModeChange} className="px-4">
          <TabsList className="w-full max-w-2xl">
            <TabsTrigger value="studio" className="flex-1 gap-2">
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Crear con Studio</span>
              <span className="sm:hidden">Studio</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Crear con IA</span>
              <span className="sm:hidden">Con IA</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Crear Manual</span>
              <span className="sm:hidden">Manual</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content with optional History Sidebar */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* History Sidebar */}
        {showHistory && (
          <div className="w-64 border-r flex flex-col bg-muted/30">
            <div className="p-3 border-b">
              <h3 className="font-medium text-sm">Historial</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {chatSessions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Conversaciones</p>
                    {chatSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => loadChatSession(session)}
                        className="w-full text-left p-2 rounded hover:bg-muted text-sm truncate"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {session.mode === 'studio' && <Wand2 className="h-3 w-3 text-primary" />}
                          {session.mode === 'ai' && <MessageSquare className="h-3 w-3 text-primary" />}
                          <p className="font-medium truncate text-xs">{session.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{session.lastMessage}</p>
                      </button>
                    ))}
                  </div>
                )}
                
                {createdCourses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Cursos creados</p>
                    {createdCourses.map(course => (
                      <div
                        key={course.id}
                        className="p-2 rounded hover:bg-muted text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          <p className="font-medium truncate text-xs">{course.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {course.mode === 'studio' ? 'Studio' : course.mode === 'ai' ? 'Con IA' : 'Manual'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {chatSessions.length === 0 && createdCourses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay historial aún
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Three Column Layout for Studio/AI modes */}
        <div className={`flex-1 grid ${showHistory ? 'grid-cols-[240px_1fr_240px]' : 'grid-cols-[280px_1fr_280px]'} min-h-0 overflow-hidden`}>
          {/* Sources Panel */}
          <SourcesPanel
            sources={sources}
            onAddSource={addSource}
            onRemoveSource={removeSource}
            onScrapeUrl={scrapeUrl}
            existingContent={existingContent}
            isScrapingUrl={isScrapingUrl}
          />

          {/* Chat Panel */}
          <StudioChat
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            isLoading={isLoading || isCreatingCourse}
            sources={sources}
            currentOutput={currentOutput}
            onClearOutput={() => setCurrentOutput(undefined)}
            onAddSourceFromSuggestion={handleAddSourceFromSuggestion}
            courseProposal={courseProposal}
            onClearProposal={() => setCourseProposal(null)}
            foundSources={foundSources}
            isCreatingCourse={isCreatingCourse}
            creationMode={creationMode}
            onStartNewChat={startNewChat}
          />

          {/* Studio Tools Panel */}
          <StudioToolsPanel
            outputs={outputs}
            onGenerateOutput={generateOutput}
            onViewOutput={setCurrentOutput}
            isGenerating={isGenerating}
            generatingTool={generatingTool}
            hasSourcesReady={hasSourcesReady || !!courseProposal}
          />
        </div>
      </div>
    </div>
  );
}
