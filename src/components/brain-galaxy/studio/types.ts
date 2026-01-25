// Types for the NotebookLM-style Studio Builder

export interface Source {
  id: string;
  type: 'file' | 'url' | 'text' | 'brain-content';
  name: string;
  content: string;
  rawContent?: string;
  metadata?: {
    fileType?: string;
    fileSize?: number;
    url?: string;
    contentId?: string;
    scrapedAt?: string;
  };
  status: 'loading' | 'ready' | 'error';
  error?: string;
  addedAt: string;
}

export interface StudioOutput {
  id: string;
  type: StudioToolType;
  title: string;
  content: string;
  status: 'generating' | 'ready' | 'error';
  createdAt: string;
  sourceIds: string[];
}

export type StudioToolType = 
  | 'audio-summary'
  | 'video-summary'
  | 'mind-map'
  | 'report'
  | 'flashcards'
  | 'quiz'
  | 'infographic'
  | 'presentation'
  | 'data-table'
  | 'deep-research'
  | 'course';

export interface StudioTool {
  id: StudioToolType;
  name: string;
  nameEs: string;
  icon: string;
  description: string;
  color: string;
}

export const STUDIO_TOOLS: StudioTool[] = [
  {
    id: 'audio-summary',
    name: 'Audio Summary',
    nameEs: 'Resumen de Audio',
    icon: '🎧',
    description: 'Genera un resumen en formato de audio podcast',
    color: '#8B5CF6',
  },
  {
    id: 'video-summary',
    name: 'Video Summary',
    nameEs: 'Resumen de Video',
    icon: '🎬',
    description: 'Resume el contenido en formato de guión de video',
    color: '#EC4899',
  },
  {
    id: 'mind-map',
    name: 'Mind Map',
    nameEs: 'Mapa Mental',
    icon: '🧠',
    description: 'Visualiza las ideas principales en un mapa conceptual',
    color: '#10B981',
  },
  {
    id: 'report',
    name: 'Report',
    nameEs: 'Informe',
    icon: '📊',
    description: 'Genera un informe ejecutivo detallado',
    color: '#3B82F6',
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    nameEs: 'Tarjetas',
    icon: '🃏',
    description: 'Crea tarjetas de estudio con preguntas y respuestas',
    color: '#F59E0B',
  },
  {
    id: 'quiz',
    name: 'Quiz',
    nameEs: 'Cuestionario',
    icon: '✅',
    description: 'Genera un cuestionario para evaluar el conocimiento',
    color: '#EF4444',
  },
  {
    id: 'infographic',
    name: 'Infographic',
    nameEs: 'Infografía',
    icon: '📈',
    description: 'Diseña una infografía con datos clave',
    color: '#06B6D4',
  },
  {
    id: 'presentation',
    name: 'Presentation',
    nameEs: 'Presentación',
    icon: '📽️',
    description: 'Crea slides para una presentación',
    color: '#8B5CF6',
  },
  {
    id: 'data-table',
    name: 'Data Table',
    nameEs: 'Tabla de Datos',
    icon: '📋',
    description: 'Extrae y organiza datos en formato tabular',
    color: '#64748B',
  },
  {
    id: 'deep-research',
    name: 'Deep Research',
    nameEs: 'Investigación Profunda',
    icon: '🔬',
    description: 'Investigación exhaustiva con búsqueda web',
    color: '#7C3AED',
  },
  {
    id: 'course',
    name: 'Course',
    nameEs: 'Curso',
    icon: '📚',
    description: 'Genera una malla curricular completa',
    color: '#059669',
  },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}
