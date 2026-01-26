import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  FileText, 
  Clock, 
  Target,
  BookOpen,
  ClipboardList,
  CheckSquare,
  Timer,
  Upload,
  Link,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Source } from './types';
import type { BrainGalaxyArea, BrainGalaxyContent } from '@/types/brain-galaxy';

interface ManualModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  content: string;
  topics: string[];
  hasQuiz: boolean;
  quizQuestions: QuizQuestion[];
  resources: ModuleResource[];
  isExpanded: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple' | 'truefalse' | 'open';
  options?: string[];
  correctAnswer: string;
}

interface ModuleResource {
  id: string;
  name: string;
  type: 'file' | 'url' | 'text';
  url?: string;
  content?: string;
}

interface ManualCourseBuilderProps {
  areas: BrainGalaxyArea[];
  existingContent: BrainGalaxyContent[];
  onSaveCourse: (course: {
    title: string;
    description: string;
    areaId: string;
    difficultyLevel: string;
    estimatedHours: number;
    modules: { id: string; title: string; description: string; estimatedMinutes: number }[];
    isPublic: boolean;
  }) => Promise<boolean>;
  sources: Source[];
  onAddSource: (source: Omit<Source, 'id' | 'addedAt'>) => void;
  onRemoveSource: (id: string) => void;
  onScrapeUrl: (url: string) => Promise<string>;
  isScrapingUrl: boolean;
}

export function ManualCourseBuilder({
  areas,
  existingContent,
  onSaveCourse,
  sources,
  onAddSource,
  onRemoveSource,
  onScrapeUrl,
  isScrapingUrl,
}: ManualCourseBuilderProps) {
  // Course details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [isPublic, setIsPublic] = useState(true);
  const [learningObjectives, setLearningObjectives] = useState<string[]>(['']);
  
  // Modules
  const [modules, setModules] = useState<ManualModule[]>([]);
  
  // URL input
  const [urlInput, setUrlInput] = useState('');
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  const addModule = () => {
    const newModule: ManualModule = {
      id: `module-${Date.now()}`,
      title: `Módulo ${modules.length + 1}`,
      description: '',
      estimatedMinutes: 30,
      content: '',
      topics: [''],
      hasQuiz: false,
      quizQuestions: [],
      resources: [],
      isExpanded: true,
    };
    setModules(prev => [...prev, newModule]);
  };

  const updateModule = (id: string, updates: Partial<ManualModule>) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeModule = (id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
  };

  const toggleModuleExpand = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, isExpanded: !m.isExpanded } : m));
  };

  const addQuizQuestion = (moduleId: string) => {
    const newQuestion: QuizQuestion = {
      id: `q-${Date.now()}`,
      question: '',
      type: 'multiple',
      options: ['', '', '', ''],
      correctAnswer: '',
    };
    setModules(prev => prev.map(m => 
      m.id === moduleId 
        ? { ...m, quizQuestions: [...m.quizQuestions, newQuestion] }
        : m
    ));
  };

  const updateQuizQuestion = (moduleId: string, questionId: string, updates: Partial<QuizQuestion>) => {
    setModules(prev => prev.map(m => 
      m.id === moduleId 
        ? { 
            ...m, 
            quizQuestions: m.quizQuestions.map(q => 
              q.id === questionId ? { ...q, ...updates } : q
            )
          }
        : m
    ));
  };

  const removeQuizQuestion = (moduleId: string, questionId: string) => {
    setModules(prev => prev.map(m => 
      m.id === moduleId 
        ? { ...m, quizQuestions: m.quizQuestions.filter(q => q.id !== questionId) }
        : m
    ));
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    
    try {
      const content = await onScrapeUrl(urlInput);
      onAddSource({
        type: 'url',
        name: new URL(urlInput).hostname,
        content,
        metadata: { url: urlInput },
        status: 'ready',
      });
      setUrlInput('');
    } catch (error) {
      // Error handled in parent
    }
  };

  const handleSaveCourse = async () => {
    if (!title.trim()) {
      toast.error('El título del curso es obligatorio');
      return;
    }
    if (!selectedArea) {
      toast.error('Selecciona un área para el curso');
      return;
    }
    if (modules.length === 0) {
      toast.error('Agrega al menos un módulo');
      return;
    }

    setIsSaving(true);
    try {
      const totalMinutes = modules.reduce((acc, m) => acc + m.estimatedMinutes, 0);
      const success = await onSaveCourse({
        title,
        description,
        areaId: selectedArea,
        difficultyLevel: difficulty,
        estimatedHours: Math.ceil(totalMinutes / 60),
        modules: modules.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          estimatedMinutes: m.estimatedMinutes,
        })),
        isPublic,
      });

      if (success) {
        toast.success('Curso guardado correctamente');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('Error al guardar el curso');
    } finally {
      setIsSaving(false);
    }
  };

  const totalDuration = modules.reduce((acc, m) => acc + m.estimatedMinutes, 0);
  const hours = Math.floor(totalDuration / 60);
  const minutes = totalDuration % 60;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Sources & Files */}
      <div className="w-72 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Material del Curso
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Sube archivos, URLs o contenido para tu curso
          </p>
        </div>

        {/* Add URL */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Pegar URL..."
              className="text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            />
            <Button 
              size="icon" 
              variant="outline"
              onClick={handleAddUrl}
              disabled={isScrapingUrl}
            >
              {isScrapingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Sources List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {sources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto opacity-50 mb-2" />
                <p className="text-sm">No hay material añadido</p>
                <p className="text-xs">Añade URLs o archivos arriba</p>
              </div>
            ) : (
              sources.map(source => (
                <div key={source.id} className="p-2 rounded border bg-background flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm truncate">{source.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => onRemoveSource(source.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}

            {/* Existing Content from Brain Galaxy */}
            {existingContent.length > 0 && (
              <div className="pt-4 border-t mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Contenido de Brain Galaxy</p>
                {existingContent.slice(0, 5).map(content => (
                  <button
                    key={content.id}
                    className="w-full text-left p-2 rounded border bg-background text-sm hover:bg-muted/50 mb-1"
                    onClick={() => onAddSource({
                      type: 'brain-content',
                      name: content.title,
                      content: content.content_text || content.ai_summary || '',
                      metadata: { contentId: content.id },
                      status: 'ready',
                    })}
                  >
                    <BookOpen className="h-3 w-3 inline mr-2" />
                    <span className="truncate">{content.title}</span>
                  </button>
                ))
                }
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Center: Course Structure */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Información del Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Título del curso *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Fundamentos de Python para principiantes"
                    className="mt-1"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe de qué trata el curso..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                <div>
                  <Label>Área *</Label>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map(area => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.icon} {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Dificultad</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                    <SelectTrigger className="mt-1">
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

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                    id="public"
                  />
                  <Label htmlFor="public" className="text-sm">Curso público para el Holding</Label>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Duración: {hours > 0 && `${hours}h `}{minutes}min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Objetivos de Aprendizaje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {learningObjectives.map((obj, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={obj}
                    onChange={(e) => {
                      const newObjs = [...learningObjectives];
                      newObjs[i] = e.target.value;
                      setLearningObjectives(newObjs);
                    }}
                    placeholder={`Objetivo ${i + 1}`}
                  />
                  {learningObjectives.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLearningObjectives(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLearningObjectives(prev => [...prev, ''])}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir objetivo
              </Button>
            </CardContent>
          </Card>

          {/* Modules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Módulos del Curso
              </h3>
              <Button onClick={addModule} className="gap-2">
                <Plus className="h-4 w-4" />
                Añadir módulo
              </Button>
            </div>

            {modules.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto opacity-30 mb-4" />
                  <p className="text-muted-foreground">No hay módulos aún</p>
                  <p className="text-sm text-muted-foreground">Haz clic en "Añadir módulo" para empezar</p>
                </CardContent>
              </Card>
            ) : (
              modules.map((module, idx) => (
                <Card key={module.id} className="overflow-hidden">
                  <div 
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleModuleExpand(module.id)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{module.title || 'Sin título'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Timer className="h-3 w-3" />
                        {module.estimatedMinutes} min
                        {module.hasQuiz && (
                          <>
                            <span>•</span>
                            <CheckSquare className="h-3 w-3" />
                            {module.quizQuestions.length} preguntas
                          </>
                        )}
                      </p>
                    </div>
                    {module.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); removeModule(module.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {module.isExpanded && (
                    <CardContent className="border-t pt-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Label>Título del módulo</Label>
                          <Input
                            value={module.title}
                            onChange={(e) => updateModule(module.id, { title: e.target.value })}
                            placeholder="Título del módulo"
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label>Descripción</Label>
                          <Textarea
                            value={module.description}
                            onChange={(e) => updateModule(module.id, { description: e.target.value })}
                            placeholder="¿Qué aprenderá el estudiante en este módulo?"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Duración estimada (minutos)</Label>
                          <Input
                            type="number"
                            value={module.estimatedMinutes}
                            onChange={(e) => updateModule(module.id, { estimatedMinutes: parseInt(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-6">
                          <Switch
                            checked={module.hasQuiz}
                            onCheckedChange={(checked) => updateModule(module.id, { hasQuiz: checked })}
                          />
                          <Label className="text-sm">Incluir cuestionario</Label>
                        </div>
                      </div>

                      <div>
                        <Label>Contenido del módulo</Label>
                        <Textarea
                          value={module.content}
                          onChange={(e) => updateModule(module.id, { content: e.target.value })}
                          placeholder="Escribe o pega el contenido de este módulo..."
                          className="mt-1 min-h-[120px]"
                        />
                      </div>

                      {/* Quiz Section */}
                      {module.hasQuiz && (
                        <div className="border-t pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <CheckSquare className="h-4 w-4" />
                              Cuestionario del módulo
                            </Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addQuizQuestion(module.id)}
                              className="gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Pregunta
                            </Button>
                          </div>

                          {module.quizQuestions.map((q, qIdx) => (
                            <Card key={q.id} className="p-4 bg-muted/30">
                              <div className="flex items-start justify-between mb-2">
                                <Label className="text-xs">Pregunta {qIdx + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeQuizQuestion(module.id, q.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <Input
                                value={q.question}
                                onChange={(e) => updateQuizQuestion(module.id, q.id, { question: e.target.value })}
                                placeholder="Escribe la pregunta..."
                                className="mb-2"
                              />
                              <Select 
                                value={q.type} 
                                onValueChange={(v) => updateQuizQuestion(module.id, q.id, { type: v as QuizQuestion['type'] })}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="multiple">Opción múltiple</SelectItem>
                                  <SelectItem value="truefalse">Verdadero/Falso</SelectItem>
                                  <SelectItem value="open">Respuesta abierta</SelectItem>
                                </SelectContent>
                              </Select>

                              {q.type === 'multiple' && q.options && (
                                <div className="mt-2 space-y-1">
                                  {q.options.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`correct-${q.id}`}
                                        checked={q.correctAnswer === opt && opt !== ''}
                                        onChange={() => updateQuizQuestion(module.id, q.id, { correctAnswer: opt })}
                                      />
                                      <Input
                                        value={opt}
                                        onChange={(e) => {
                                          const newOptions = [...q.options!];
                                          newOptions[optIdx] = e.target.value;
                                          updateQuizQuestion(module.id, q.id, { options: newOptions });
                                        }}
                                        placeholder={`Opción ${optIdx + 1}`}
                                        className="flex-1"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Card>
                          ))}

                          {module.quizQuestions.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No hay preguntas. Haz clic en "Pregunta" para añadir.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              size="lg" 
              className="gap-2" 
              onClick={handleSaveCourse}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Curso
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
