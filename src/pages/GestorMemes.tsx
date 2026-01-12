import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Play, 
  Image as ImageIcon, 
  Video, 
  Smile,
  ExternalLink,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';

// Types for memes
interface Meme {
  id: string;
  type: 'image' | 'gif' | 'video' | 'youtube';
  url: string;
  title: string;
  createdAt: Date;
}

// Local storage key
const MEMES_STORAGE_KEY = 'iwie-memes-collection';

// Helper to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Detect content type from URL
const detectContentType = (url: string): Meme['type'] => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.endsWith('.gif') || lowerUrl.includes('.gif?')) {
    return 'gif';
  }
  if (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov')) {
    return 'video';
  }
  if (lowerUrl.match(/\.(jpg|jpeg|png|webp|bmp|svg)(\?|$)/i)) {
    return 'image';
  }
  
  // Default to image
  return 'image';
};

export default function GestorMemes() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Meme['type']>('image');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  // Load memes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(MEMES_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMemes(parsed.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) })));
      } catch (e) {
        console.error('Error loading memes:', e);
      }
    }
  }, []);

  // Save memes to localStorage
  useEffect(() => {
    localStorage.setItem(MEMES_STORAGE_KEY, JSON.stringify(memes));
  }, [memes]);

  const handleAddMeme = () => {
    if (!newUrl.trim()) {
      toast.error('Por favor ingresa una URL');
      return;
    }

    const detectedType = detectContentType(newUrl);
    
    const meme: Meme = {
      id: Date.now().toString(),
      type: newType || detectedType,
      url: newUrl.trim(),
      title: newTitle.trim() || `Meme ${memes.length + 1}`,
      createdAt: new Date()
    };

    setMemes(prev => [meme, ...prev]);
    setNewUrl('');
    setNewTitle('');
    toast.success('¡Meme agregado! 🎉');
  };

  const handleDeleteMeme = (id: string) => {
    setMemes(prev => prev.filter(m => m.id !== id));
    toast.success('Meme eliminado');
  };

  const handlePlayMeme = (meme: Meme) => {
    setIsPlaying(meme.id);
    
    // Dispatch custom event to trigger the idle overlay with this meme
    window.dispatchEvent(new CustomEvent('trigger-meme-overlay', { 
      detail: { meme } 
    }));
  };

  const getTypeIcon = (type: Meme['type']) => {
    switch (type) {
      case 'youtube':
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'gif':
        return <Smile className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: Meme['type']) => {
    switch (type) {
      case 'youtube': return 'YouTube';
      case 'video': return 'Video';
      case 'gif': return 'GIF';
      default: return 'Imagen';
    }
  };

  const renderMemePreview = (meme: Meme) => {
    switch (meme.type) {
      case 'youtube':
        const videoId = getYouTubeVideoId(meme.url);
        return videoId ? (
          <img 
            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
            alt={meme.title}
            className="w-full h-32 object-cover rounded"
          />
        ) : (
          <div className="w-full h-32 bg-muted/50 rounded flex items-center justify-center">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
        );
      case 'video':
        return (
          <video 
            src={meme.url} 
            className="w-full h-32 object-cover rounded"
            muted
          />
        );
      case 'gif':
      case 'image':
      default:
        return (
          <img 
            src={meme.url}
            alt={meme.title}
            className="w-full h-32 object-cover rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666">Error</text></svg>';
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        selectedCompany={selectedCompany} 
        onSelectCompany={setSelectedCompany} 
      />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold neon-text flex items-center gap-3">
                <Smile className="w-8 h-8 text-primary" />
                Gestor de Memes
              </h1>
              <p className="text-muted-foreground mt-1">
                Agrega tus memes favoritos y actívalos cuando quieras 🚀
              </p>
            </div>
          </div>

          {/* Add new meme form */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Agregar Nuevo Meme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="meme-url">URL del meme</Label>
                  <Input
                    id="meme-url"
                    placeholder="https://youtube.com/watch?v=... o URL de imagen/GIF"
                    value={newUrl}
                    onChange={(e) => {
                      setNewUrl(e.target.value);
                      // Auto-detect type
                      if (e.target.value) {
                        setNewType(detectContentType(e.target.value));
                      }
                    }}
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label htmlFor="meme-title">Título (opcional)</Label>
                  <Input
                    id="meme-title"
                    placeholder="Mi meme favorito"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label htmlFor="meme-type">Tipo</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as Meme['type'])}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="gif">GIF</SelectItem>
                      <SelectItem value="image">Imagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddMeme} className="w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Meme
              </Button>
            </CardContent>
          </Card>

          {/* Memes grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {memes.length === 0 ? (
              <Card className="col-span-full border-dashed border-2 border-muted-foreground/30 bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Rocket className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    No hay memes todavía.<br />
                    ¡Agrega tu primer meme arriba! 🎉
                  </p>
                </CardContent>
              </Card>
            ) : (
              memes.map((meme) => (
                <Card 
                  key={meme.id} 
                  className="border-primary/10 bg-card/50 backdrop-blur hover:border-primary/30 transition-all overflow-hidden"
                >
                  {/* Preview section */}
                  <div className="relative">
                    {renderMemePreview(meme)}
                    
                    {/* Type badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-xs flex items-center gap-1 text-white">
                      {getTypeIcon(meme.type)}
                      {getTypeLabel(meme.type)}
                    </div>
                  </div>
                  
                  <CardContent className="p-3 space-y-3">
                    {/* Title and delete */}
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate flex-1">{meme.title}</p>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteMeme(meme.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {meme.createdAt.toLocaleDateString()}
                    </p>
                    
                    {/* Always visible action buttons */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handlePlayMeme(meme)}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Activar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(meme.url, '_blank')}
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}