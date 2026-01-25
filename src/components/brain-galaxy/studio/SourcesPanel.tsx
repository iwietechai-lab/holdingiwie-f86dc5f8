import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  FileText, 
  Globe, 
  Type, 
  Database,
  Trash2,
  Loader2,
  Search,
  Upload,
  Link as LinkIcon,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Source } from './types';
import type { BrainGalaxyContent } from '@/types/brain-galaxy';

interface SourcesPanelProps {
  sources: Source[];
  onAddSource: (source: Omit<Source, 'id' | 'addedAt'>) => void;
  onRemoveSource: (id: string) => void;
  onScrapeUrl: (url: string) => Promise<string>;
  existingContent?: BrainGalaxyContent[];
  isScrapingUrl?: boolean;
}

export function SourcesPanel({
  sources,
  onAddSource,
  onRemoveSource,
  onScrapeUrl,
  existingContent = [],
  isScrapingUrl = false,
}: SourcesPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('file');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onAddSource({
          type: 'file',
          name: file.name,
          content: content || '',
          metadata: {
            fileType: file.type,
            fileSize: file.size,
          },
          status: 'ready',
        });
      };
      
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For binary files, just store the name
        onAddSource({
          type: 'file',
          name: file.name,
          content: `[Archivo: ${file.name}]`,
          metadata: {
            fileType: file.type,
            fileSize: file.size,
          },
          status: 'ready',
        });
      }
    }
    
    setIsDialogOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    
    setIsProcessing(true);
    try {
      const content = await onScrapeUrl(urlInput.trim());
      onAddSource({
        type: 'url',
        name: new URL(urlInput.trim()).hostname,
        content,
        metadata: {
          url: urlInput.trim(),
          scrapedAt: new Date().toISOString(),
        },
        status: 'ready',
      });
      setUrlInput('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error scraping URL:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    
    onAddSource({
      type: 'text',
      name: textTitle.trim() || 'Texto pegado',
      content: textInput.trim(),
      status: 'ready',
    });
    
    setTextInput('');
    setTextTitle('');
    setIsDialogOpen(false);
  };

  const handleContentSelect = (content: BrainGalaxyContent) => {
    onAddSource({
      type: 'brain-content',
      name: content.title,
      content: content.content_text || content.ai_summary || '',
      metadata: {
        contentId: content.id,
      },
      status: 'ready',
    });
    setIsDialogOpen(false);
  };

  const filteredContent = existingContent.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: Source['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
      case 'ready':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const getTypeIcon = (type: Source['type']) => {
    switch (type) {
      case 'file':
        return <FileText className="h-4 w-4" />;
      case 'url':
        return <Globe className="h-4 w-4" />;
      case 'text':
        return <Type className="h-4 w-4" />;
      case 'brain-content':
        return <Database className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col border-r bg-muted/30">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">Fuentes</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              Añadir fuentes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-center">
                Crea resúmenes de audio y video a partir de
                <br />
                <span className="text-primary">Tus documentos</span>
              </DialogTitle>
            </DialogHeader>

            {/* Web Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nuevas fuentes en la Web"
                className="pl-10"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" />
                  Web
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Search className="h-3 w-3" />
                  Investigación rápida
                </Badge>
                {urlInput && (
                  <Button 
                    size="sm" 
                    onClick={handleUrlSubmit}
                    disabled={isProcessing || isScrapingUrl}
                  >
                    {isProcessing || isScrapingUrl ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Buscar'
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Drop Zone */}
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-muted-foreground mb-4">or drop your files</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" className="gap-2" onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}>
                  <Upload className="h-4 w-4" />
                  Subir archivos
                </Button>
                <Button variant="outline" className="gap-2" onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('url');
                }}>
                  <LinkIcon className="h-4 w-4" />
                  Sitios web
                </Button>
                <Button variant="outline" className="gap-2" onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('content');
                }}>
                  <Database className="h-4 w-4" />
                  Brain Galaxy
                </Button>
                <Button variant="outline" className="gap-2" onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('text');
                }}>
                  <ClipboardPaste className="h-4 w-4" />
                  Texto copiado
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx"
                onChange={handleFileUpload}
              />
            </div>

            {/* Tabs for different input types */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="file">Archivos</TabsTrigger>
                <TabsTrigger value="url">URLs</TabsTrigger>
                <TabsTrigger value="content">Brain Galaxy</TabsTrigger>
                <TabsTrigger value="text">Texto</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra archivos o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, Excel, PowerPoint, TXT, MD
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="https://ejemplo.com/articulo"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                  <Button 
                    onClick={handleUrlSubmit} 
                    disabled={!urlInput.trim() || isProcessing || isScrapingUrl}
                    className="w-full"
                  >
                    {isProcessing || isScrapingUrl ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Extrayendo contenido...
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Extraer contenido de URL
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <Input
                  placeholder="Buscar contenido existente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {filteredContent.map((content) => (
                      <div
                        key={content.id}
                        className="p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => handleContentSelect(content)}
                      >
                        <p className="font-medium text-sm">{content.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {content.description || content.content_text?.substring(0, 100)}
                        </p>
                      </div>
                    ))}
                    {filteredContent.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No hay contenido disponible
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <Input
                  placeholder="Título del texto (opcional)"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Pega aquí el texto que quieres analizar..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={6}
                />
                <Button 
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="w-full"
                >
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  Añadir texto
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {sources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Las fuentes guardadas aparecerán aquí</p>
              <p className="text-xs mt-2">
                Haz clic en el botón Añadir fuente de arriba para añadir PDFs, sitios web, texto, videos o archivos de audio.
              </p>
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className="group p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-muted">
                    {getTypeIcon(source.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{source.name}</p>
                      {getStatusIcon(source.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {source.type === 'url' ? source.metadata?.url : 
                       source.type === 'file' ? source.metadata?.fileType :
                       'Texto'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={() => onRemoveSource(source.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          {sources.length} fuente{sources.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
