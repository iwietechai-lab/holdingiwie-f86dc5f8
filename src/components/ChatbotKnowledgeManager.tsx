import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { 
  Brain, 
  Plus, 
  Trash2, 
  FileText, 
  Link as LinkIcon, 
  Save,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { KnowledgeEntry } from '@/types/organization';
import { companies } from '@/data/companies';

interface Chatbot {
  id: string;
  company_id: string;
  name: string;
  knowledge_base: KnowledgeEntry[];
  system_prompt?: string;
  is_active: boolean;
}

export function ChatbotKnowledgeManager() {
  const { toast } = useToast();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // New entry form
  const [newEntryType, setNewEntryType] = useState<'text' | 'url'>('text');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryContent, setNewEntryContent] = useState('');

  useEffect(() => {
    loadChatbots();
  }, []);

  const loadChatbots = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .order('created_at');

      if (error) throw error;

      const parsed = (data || []).map(cb => ({
        ...cb,
        knowledge_base: Array.isArray(cb.knowledge_base) 
          ? cb.knowledge_base 
          : JSON.parse(JSON.stringify(cb.knowledge_base || []))
      }));
      
      setChatbots(parsed as Chatbot[]);
      
      if (parsed.length > 0 && !selectedChatbot) {
        setSelectedChatbot(parsed[0] as Chatbot);
      }
    } catch (error) {
      logger.error('Error loading chatbots:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los chatbots',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = () => {
    if (!selectedChatbot || !newEntryTitle || !newEntryContent) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    const newEntry: KnowledgeEntry = {
      id: crypto.randomUUID(),
      type: newEntryType,
      title: newEntryTitle,
      content: newEntryContent,
      added_at: new Date().toISOString(),
    };

    setSelectedChatbot({
      ...selectedChatbot,
      knowledge_base: [...selectedChatbot.knowledge_base, newEntry],
    });

    // Reset form
    setNewEntryTitle('');
    setNewEntryContent('');
    setShowAddDialog(false);

    toast({
      title: 'Entrada agregada',
      description: 'Recuerda guardar los cambios',
    });
  };

  const handleRemoveEntry = (entryId: string) => {
    if (!selectedChatbot) return;

    setSelectedChatbot({
      ...selectedChatbot,
      knowledge_base: selectedChatbot.knowledge_base.filter(e => e.id !== entryId),
    });
  };

  const handleSave = async () => {
    if (!selectedChatbot) return;

    setIsSaving(true);
    try {
      // Convert to JSON-compatible format
      const knowledgeBaseJson = JSON.parse(JSON.stringify(selectedChatbot.knowledge_base));
      
      const { error } = await supabase
        .from('chatbots')
        .update({
          knowledge_base: knowledgeBaseJson,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedChatbot.id);

      if (error) throw error;

      toast({
        title: '¡Guardado!',
        description: 'La base de conocimiento se actualizó correctamente',
      });

      // Update local state
      setChatbots(prev => 
        prev.map(cb => cb.id === selectedChatbot.id ? selectedChatbot : cb)
      );
    } catch (error) {
      logger.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la base de conocimiento',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || companyId;
  };

  const getCompanyIcon = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.icon || '🏢';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Gestor de Knowledge Base</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Select 
            value={selectedChatbot?.id || ''} 
            onValueChange={(v) => {
              const cb = chatbots.find(c => c.id === v);
              setSelectedChatbot(cb || null);
            }}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecciona un chatbot" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {chatbots.map((cb) => (
                <SelectItem key={cb.id} value={cb.id}>
                  <span className="flex items-center gap-2">
                    <span>{getCompanyIcon(cb.company_id)}</span>
                    <span>{getCompanyName(cb.company_id)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedChatbot && (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{getCompanyIcon(selectedChatbot.company_id)}</span>
              {selectedChatbot.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Conocimiento
              </Button>
              <Button onClick={handleSave} disabled={isSaving} variant="outline">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedChatbot.knowledge_base.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay conocimiento agregado aún</p>
                <p className="text-sm">Agrega textos o URLs para entrenar al chatbot</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {selectedChatbot.knowledge_base.map((entry) => (
                    <div 
                      key={entry.id}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30 group"
                    >
                      <div className="shrink-0 mt-1">
                        {entry.type === 'url' ? (
                          <LinkIcon className="w-5 h-5 text-blue-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{entry.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {entry.type === 'url' ? 'URL' : 'Texto'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {entry.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Agregado: {new Date(entry.added_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Conocimiento</DialogTitle>
            <DialogDescription>
              Agrega información que el chatbot usará para responder preguntas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de contenido</Label>
              <Select value={newEntryType} onValueChange={(v) => setNewEntryType(v as 'text' | 'url')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="text">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Texto
                    </span>
                  </SelectItem>
                  <SelectItem value="url">
                    <span className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      URL
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                value={newEntryTitle}
                onChange={(e) => setNewEntryTitle(e.target.value)}
                placeholder="Ej: Política de vacaciones"
              />
            </div>

            <div className="space-y-2">
              <Label>{newEntryType === 'url' ? 'URL' : 'Contenido'}</Label>
              {newEntryType === 'url' ? (
                <Input 
                  value={newEntryContent}
                  onChange={(e) => setNewEntryContent(e.target.value)}
                  placeholder="https://ejemplo.com/documento"
                />
              ) : (
                <Textarea 
                  value={newEntryContent}
                  onChange={(e) => setNewEntryContent(e.target.value)}
                  placeholder="Escribe el contenido que el chatbot debe conocer..."
                  rows={6}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEntry}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}