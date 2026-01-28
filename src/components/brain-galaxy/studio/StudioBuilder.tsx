import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Book, Sparkles, Upload, History, GraduationCap, Wand2, MessageSquare, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SourcesPanel } from './SourcesPanel';
import { StudioChat } from './StudioChat';
import { StudioToolsPanel } from './StudioToolsPanel';
import { ManualCourseBuilder } from './ManualCourseBuilder';
import type { Source, StudioOutput, StudioToolType, ChatMessage } from './types';
import type { BrainGalaxyArea, BrainGalaxyContent, BrainGalaxyCourse } from '@/types/brain-galaxy';
import { useStudioSessions, type StudioSession } from '@/hooks/useStudioSessions';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface FoundSource {
  title: string;
  url?: string;
  type: 'web' | 'internal' | 'suggested';
  description?: string;
}

interface CourseProposal {
  title: string;
  description: string;
  modules: { title: string; description: string; topics: string[]; content?: string }[];
  sources: FoundSource[];
  suggestedTopics?: string[];
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
  editingCourse?: BrainGalaxyCourse | null;
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

// Timeout for API calls (60 seconds)
const API_TIMEOUT_MS = 60000;

export function StudioBuilder({
  areas,
  existingContent,
  onBack,
  onSaveCourse,
  editingCourse,
}: StudioBuilderProps) {
  const { user } = useSupabaseAuth();
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    isLoading: isLoadingSessions,
    isSaving,
    createSession,
    saveSession,
    loadSession,
    deleteSession,
    getCurrentSession,
  } = useStudioSessions({ userId: user?.id });

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
  const [showHistory, setShowHistory] = useState(false);
  
  // Abort controller for cancellable operations
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load editing course if provided
  useEffect(() => {
    if (editingCourse) {
      // Set up state for editing existing course
      const modules = (editingCourse.curriculum_structure as { title: string; description: string; topics?: string[] }[]) || [];
      setCourseProposal({
        title: editingCourse.title,
        description: editingCourse.description || '',
        modules: modules.map(m => ({
          title: m.title,
          description: m.description,
          topics: m.topics || [],
        })),
        sources: [],
      });
      toast.info('Curso cargado para edición');
    }
  }, [editingCourse]);

  // Auto-save effect - debounced save when state changes
  useEffect(() => {
    if (!currentSessionId || chatMessages.length === 0) return;

    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(async () => {
      const title = chatMessages[0]?.content.substring(0, 50) || 'Nueva sesión';
      await saveSession(currentSessionId, {
        messages: chatMessages,
        sources,
        outputs,
        course_proposal: courseProposal,
        title,
        mode: creationMode,
      });
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [chatMessages, sources, outputs, courseProposal, currentSessionId, creationMode, saveSession]);

  // Cancel ongoing operation
  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      setGeneratingTool(undefined);
      setIsLoading(false);
      setIsCreatingCourse(false);
      toast.info('Operación cancelada');
    }
  }, []);

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
        
        // Course is saved via onSaveCourse, just clear the proposal
        setCourseProposal(null);
        toast.success('¡Curso creado correctamente!');
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

    // Create abort controller for this operation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current === controller) {
        controller.abort();
        toast.error('La generación tardó demasiado. Intenta de nuevo.');
      }
    }, API_TIMEOUT_MS);

    setIsGenerating(true);
    setGeneratingTool(toolType);

    try {
      const sourcesContext = getSourcesContext();
      
      // Enhanced prompts that ask for DETAILED content, not just structure
      const toolPrompts: Record<StudioToolType, string> = {
        'audio-summary': 'Genera un guión COMPLETO para un podcast/audio que resuma el contenido. Incluye: introducción, desarrollo de cada punto con explicaciones detalladas, ejemplos, y conclusión.',
        'video-summary': 'Crea un guión COMPLETO para un video explicativo con: escenas, narración detallada, puntos clave visuales, y sugerencias de elementos gráficos.',
        'mind-map': 'Genera un mapa mental DETALLADO en formato de texto estructurado con múltiples niveles de profundidad.',
        'report': 'Genera un informe ejecutivo COMPLETO con: resumen, análisis detallado, datos relevantes, conclusiones y recomendaciones.',
        'flashcards': 'Genera al menos 15 tarjetas de estudio con preguntas Y respuestas detalladas. Incluye explicaciones adicionales en cada respuesta.',
        'quiz': 'Genera un cuestionario con 15 preguntas variadas (opción múltiple, verdadero/falso, respuesta corta). Incluye las respuestas correctas Y explicaciones.',
        'infographic': 'Diseña el contenido COMPLETO para una infografía con: título, secciones, datos, estadísticas, y descripciones de elementos visuales.',
        'presentation': 'Crea una presentación de al menos 15 slides. Cada slide debe tener: título, puntos principales CON desarrollo, y notas del presentador.',
        'data-table': 'Extrae y organiza TODA la información relevante en tablas estructuradas con explicaciones.',
        'deep-research': 'Realiza una investigación profunda y exhaustiva. Incluye: contexto, análisis, fuentes, conclusiones y recomendaciones detalladas.',
        'course': courseProposal 
          ? `Genera un curso COMPLETO basado en esta propuesta:
${JSON.stringify(courseProposal, null, 2)}

IMPORTANTE: Para cada módulo, desarrolla el CONTENIDO COMPLETO incluyendo:
1. Introducción del módulo (2-3 párrafos explicativos)
2. Desarrollo de cada tema con explicaciones detalladas (no solo títulos)
3. Ejemplos prácticos y casos de estudio
4. Actividades de aprendizaje con instrucciones claras
5. Recursos y lecturas recomendadas
6. Preguntas de autoevaluación con respuestas

NO generes solo la estructura. Genera TODO el contenido educativo desarrollado.`
          : 'Genera una malla curricular completa con TODO el contenido desarrollado para cada módulo.',
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
                content: `Eres un experto en creación de contenido educativo de alta calidad. Tu trabajo es generar contenido COMPLETO y DETALLADO, no solo estructuras o temarios.
                
${sourcesContext ? `Analiza las siguientes fuentes y usa su información:\n\n${sourcesContext}` : ''}

REGLA IMPORTANTE: Siempre genera contenido completo y desarrollado. Nunca des solo títulos o estructuras vacías.`,
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
          signal: controller.signal,
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
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('Generación cancelada');
      } else {
        console.error('Error generating output:', error);
        toast.error('Error al generar el contenido');
      }
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsGenerating(false);
      setGeneratingTool(undefined);
    }
  }, [getSourcesContext, isGenerating, sources, courseProposal]);

  const hasSourcesReady = sources.some(s => s.status === 'ready');

  const handleModeChange = async (mode: string) => {
    setCreationMode(mode as CreationMode);
    // Save current session before switching (auto-save handles this via effect)
    // Clear state when switching modes
    setChatMessages([]);
    setSources([]);
    setCourseProposal(null);
    setFoundSources([]);
    setCurrentOutput(undefined);
    setCurrentSessionId(null);
  };

  const startNewChat = async () => {
    // Create a new session in the database
    const newSession = await createSession(creationMode);
    if (newSession) {
      setChatMessages([]);
      setCourseProposal(null);
      setFoundSources([]);
      setSources([]);
      setOutputs([]);
    }
  };

  const handleLoadSession = async (session: StudioSession) => {
    const fullSession = await loadSession(session.id);
    if (fullSession) {
      setChatMessages(fullSession.messages || []);
      setSources(fullSession.sources || []);
      setOutputs(fullSession.outputs || []);
      // Cast the course_proposal to the local type since sources types might differ
      if (fullSession.course_proposal) {
        const proposal = fullSession.course_proposal as unknown as CourseProposal;
        setCourseProposal(proposal);
      } else {
        setCourseProposal(null);
      }
      setCreationMode(fullSession.mode);
      setShowHistory(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
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
    <div className="flex-1 flex flex-col min-h-0">
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
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-medium text-sm">Historial</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={startNewChat}
              >
                <Sparkles className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Sesiones guardadas</p>
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        className={`w-full text-left p-2 rounded hover:bg-muted text-sm truncate cursor-pointer group ${
                          currentSessionId === session.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => handleLoadSession(session)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {session.mode === 'studio' && <Wand2 className="h-3 w-3 text-primary shrink-0" />}
                            {session.mode === 'ai' && <MessageSquare className="h-3 w-3 text-primary shrink-0" />}
                            {session.mode === 'manual' && <Upload className="h-3 w-3 text-primary shrink-0" />}
                            <p className="font-medium truncate text-xs">{session.title}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(session.updated_at).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay historial aún
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Three Column Layout for Studio/AI modes */}
        <div className={`flex-1 grid ${showHistory ? 'grid-cols-[240px_1fr_240px]' : 'grid-cols-[280px_1fr_280px]'} min-h-0 overflow-hidden`} style={{ gridTemplateRows: '1fr' }}>
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
            onCancelGeneration={cancelOperation}
          />
        </div>
      </div>
    </div>
  );
}
