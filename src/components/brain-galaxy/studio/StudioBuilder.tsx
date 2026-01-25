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
                content: `Eres un asistente experto que analiza documentos. Tienes acceso a las siguientes fuentes:\n\n${sourcesContext}\n\nResponde las preguntas del usuario basándote en estas fuentes. Si la información no está en las fuentes, indícalo claramente.`,
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
  }, [chatMessages, getSourcesContext, isLoading]);

  const generateOutput = useCallback(async (toolType: StudioToolType) => {
    if (isGenerating) return;

    const readySources = sources.filter(s => s.status === 'ready');
    if (readySources.length === 0) {
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
        'course': 'Genera una malla curricular completa en JSON con el formato:\n{\n  "title": "Título del curso",\n  "description": "Descripción",\n  "objectives": ["Objetivo 1"],\n  "difficulty": "beginner|intermediate|advanced",\n  "estimated_hours": 10,\n  "modules": [{"title": "Módulo 1", "description": "Desc", "estimated_minutes": 60, "topics": ["Tema 1"]}]\n}',
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
                content: `Eres un experto en creación de contenido educativo. Analiza las siguientes fuentes y genera el contenido solicitado.\n\nFUENTES:\n${sourcesContext}`,
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
  }, [getSourcesContext, isGenerating, sources]);

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
          isLoading={isLoading}
          sources={sources}
          currentOutput={currentOutput}
          onClearOutput={() => setCurrentOutput(undefined)}
        />

        {/* Studio Tools Panel */}
        <StudioToolsPanel
          outputs={outputs}
          onGenerateOutput={generateOutput}
          onViewOutput={setCurrentOutput}
          isGenerating={isGenerating}
          generatingTool={generatingTool}
          hasSourcesReady={hasSourcesReady}
        />
      </div>
    </div>
  );
}
