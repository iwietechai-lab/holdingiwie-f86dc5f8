import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SourcesPanel } from './SourcesPanel';
import { StudioChat } from './StudioChat';
import { StudioToolsPanel } from './StudioToolsPanel';
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

  const processCourseCreationRequest = useCallback(async (message: string, allMessages: ChatMessage[]) => {
    setIsCreatingCourse(true);
    
    try {
      const sourcesContext = getSourcesContext();
      
      // First, get a course proposal with sources
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
              {
                role: 'system',
                content: `Eres un experto en diseño instruccional de Brain Galaxy Studio. El usuario quiere crear un curso.

Tu tarea es:
1. Analizar el tema solicitado
2. Proponer una estructura de curso con módulos
3. Identificar fuentes relevantes (URLs reales de internet, documentos internos, o temas sugeridos)
4. Sugerir temas adicionales que el usuario podría querer incluir

${sourcesContext ? `FUENTES DISPONIBLES DEL USUARIO:\n${sourcesContext}\n\nUsa estas fuentes si son relevantes para el curso.` : ''}

RESPONDE SIEMPRE EN FORMATO JSON con esta estructura exacta:
{
  "title": "Título del curso",
  "description": "Descripción breve del curso",
  "modules": [
    {
      "title": "Módulo 1: Nombre",
      "description": "Qué aprenderá el estudiante",
      "topics": ["Tema 1", "Tema 2"]
    }
  ],
  "sources": [
    {
      "title": "Nombre de la fuente",
      "url": "https://...",
      "type": "web",
      "description": "Por qué es útil esta fuente"
    }
  ],
  "suggestedTopics": ["Tema adicional 1", "Tema adicional 2"],
  "explanation": "Breve explicación de la propuesta"
}

Para las fuentes tipo "web", usa URLs reales de sitios educativos conocidos (MDN, W3Schools, Khan Academy, Coursera, documentación oficial, etc.).
Para fuentes tipo "internal", usa contenido de las fuentes del usuario.
Para fuentes tipo "suggested", sugiere búsquedas o recursos que el usuario podría agregar.`,
              },
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
      
      // Try to parse JSON from response
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const proposal = JSON.parse(jsonMatch[0]) as CourseProposal & { explanation?: string };
          setCourseProposal(proposal);
          setFoundSources(proposal.sources || []);
          
          // Add explanation as assistant message
          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: proposal.explanation || `He analizado tu solicitud y preparado una propuesta de curso. Revisa la estructura y las fuentes que encontré. Puedes agregar más material o pedirme que modifique la estructura.`,
            timestamp: new Date().toISOString(),
          };
          setChatMessages(prev => [...prev, assistantMessage]);
          
        } else {
          // No JSON, treat as regular response
          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: responseContent,
            timestamp: new Date().toISOString(),
          };
          setChatMessages(prev => [...prev, assistantMessage]);
        }
      } catch (parseError) {
        // JSON parse failed, use as regular message
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
      // Check if this is a course creation request
      if (detectCourseCreationIntent(message) && sources.length === 0) {
        await processCourseCreationRequest(message, updatedMessages);
        return;
      }

      // Check if user wants to proceed with course creation
      if (message.toLowerCase().includes('procede') && message.toLowerCase().includes('curso') && courseProposal) {
        // Generate the actual course using the tool
        await generateOutput('course');
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

${sourcesContext ? `FUENTES DISPONIBLES:\n${sourcesContext}\n\nResponde basándote en estas fuentes cuando sea relevante.` : 'No hay fuentes cargadas aún.'}

${courseProposal ? `PROPUESTA DE CURSO ACTUAL:\n${JSON.stringify(courseProposal, null, 2)}\n\nPuedes modificar esta propuesta según las indicaciones del usuario.` : ''}

CAPACIDADES:
- Puedo crear cursos completos desde cero
- Busco y sugiero fuentes de información
- Analizo documentos y extraigo conocimiento
- Genero quizzes, flashcards, mapas mentales, etc.

Responde de manera clara, útil y en español.`,
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
  }, [chatMessages, getSourcesContext, isLoading, courseProposal, sources.length, processCourseCreationRequest]);

  const generateOutput = useCallback(async (toolType: StudioToolType) => {
    if (isGenerating) return;

    const readySources = sources.filter(s => s.status === 'ready');
    
    // Allow course generation even without sources if we have a proposal
    if (readySources.length === 0 && toolType !== 'course') {
      toast.error('Añade al menos una fuente primero');
      return;
    }

    setIsGenerating(true);
    setGeneratingTool(toolType);

    try {
      const sourcesContext = getSourcesContext();
      
      const toolPrompts: Record<StudioToolType, string> = {
        'audio-summary': 'Genera un guión para un podcast/audio que resuma el contenido. Incluye: intro, puntos principales, conclusión. Formato conversacional.',
        'video-summary': 'Crea un guión para un video explicativo. Incluye: escenas, texto en pantalla, narración, y duración estimada por sección.',
        'mind-map': 'Genera un mapa mental en formato de texto estructurado. Usa indentación para mostrar jerarquías. Formato:\n- Tema central\n  - Rama 1\n    - Sub-tema 1.1\n    - Sub-tema 1.2\n  - Rama 2',
        'report': 'Genera un informe ejecutivo detallado con: resumen ejecutivo, hallazgos principales, análisis, recomendaciones y conclusiones.',
        'flashcards': 'Genera tarjetas de estudio en formato:\n\n**Tarjeta 1**\nPregunta: [pregunta]\nRespuesta: [respuesta]\n\nCrea al menos 10 tarjetas cubriendo los conceptos más importantes.',
        'quiz': 'Genera un cuestionario con 10 preguntas variadas (opción múltiple, verdadero/falso, respuesta corta). Incluye la respuesta correcta y explicación para cada una.',
        'infographic': 'Diseña el contenido para una infografía. Incluye: título, estadísticas clave, puntos visuales, iconos sugeridos, y flujo visual.',
        'presentation': 'Crea slides para una presentación. Formato:\n\n**Slide 1: [Título]**\n- Punto 1\n- Punto 2\n[Nota del presentador]\n\nGenera al menos 10 slides.',
        'data-table': 'Extrae y organiza la información en tablas. Formato Markdown. Identifica datos estructurables como fechas, números, comparaciones.',
        'deep-research': 'Realiza una investigación profunda. Analiza las fuentes, identifica gaps de información, sugiere preguntas de investigación adicionales, y proporciona un análisis exhaustivo.',
        'course': courseProposal 
          ? `Genera un curso completo basado en esta propuesta:\n${JSON.stringify(courseProposal, null, 2)}\n\nFormato JSON:\n{\n  "title": "Título",\n  "description": "Descripción",\n  "objectives": ["Objetivo 1"],\n  "difficulty": "beginner|intermediate|advanced",\n  "estimated_hours": 10,\n  "modules": [{"title": "Módulo 1", "description": "Desc", "estimated_minutes": 60, "topics": ["Tema 1"], "content": "Contenido completo del módulo..."}]\n}`
          : 'Genera una malla curricular completa en JSON con el formato:\n{\n  "title": "Título del curso",\n  "description": "Descripción",\n  "objectives": ["Objetivo 1"],\n  "difficulty": "beginner|intermediate|advanced|expert",\n  "estimated_hours": 10,\n  "modules": [{"title": "Módulo 1", "description": "Desc", "estimated_minutes": 60, "topics": ["Tema 1"]}]\n}',
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
                content: `Eres un experto en creación de contenido educativo. ${sourcesContext ? `Analiza las siguientes fuentes y genera el contenido solicitado.\n\nFUENTES:\n${sourcesContext}` : 'Genera contenido educativo de alta calidad.'}`,
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

      // If it's a course, try to save it
      if (toolType === 'course') {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const courseData = JSON.parse(jsonMatch[0]);
            // Could auto-save or prompt user
            console.log('Course data:', courseData);
          }
        } catch (e) {
          console.log('Could not parse course JSON');
        }
      }

    } catch (error) {
      console.error('Error generating output:', error);
      toast.error('Error al generar el contenido');
    } finally {
      setIsGenerating(false);
      setGeneratingTool(undefined);
    }
  }, [getSourcesContext, isGenerating, sources, courseProposal]);

  const hasSourcesReady = sources.some(s => s.status === 'ready');

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Brain Galaxy Studio</h2>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="flex-1 grid grid-cols-[280px_1fr_280px] overflow-hidden">
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
  );
}
