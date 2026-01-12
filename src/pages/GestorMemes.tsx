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
  Rocket,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

// Types for memes - expanded to support social media
interface Meme {
  id: string;
  type: 'image' | 'gif' | 'video' | 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'facebook' | 'vimeo';
  url: string;
  title: string;
  createdAt: Date;
  platform?: string;
}

// Local storage key
const MEMES_STORAGE_KEY = 'iwie-memes-collection';

// Helper to extract YouTube video ID
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Helper to extract TikTok video ID
const getTikTokVideoId = (url: string): string | null => {
  const regExp = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Helper to extract Vimeo video ID
const getVimeoVideoId = (url: string): string | null => {
  const regExp = /vimeo\.com\/(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Detect content type and platform from URL
const detectContentType = (url: string): { type: Meme['type'], platform: string } => {
  const lowerUrl = url.toLowerCase();
  
  // YouTube
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return { type: 'youtube', platform: 'YouTube' };
  }
  
  // TikTok
  if (lowerUrl.includes('tiktok.com')) {
    return { type: 'tiktok', platform: 'TikTok' };
  }
  
  // Instagram
  if (lowerUrl.includes('instagram.com')) {
    return { type: 'instagram', platform: 'Instagram' };
  }
  
  // Twitter/X
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return { type: 'twitter', platform: 'X/Twitter' };
  }
  
  // Facebook
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
    return { type: 'facebook', platform: 'Facebook' };
  }
  
  // Vimeo
  if (lowerUrl.includes('vimeo.com')) {
    return { type: 'vimeo', platform: 'Vimeo' };
  }
  
  // Direct media files
  if (lowerUrl.endsWith('.gif') || lowerUrl.includes('.gif?')) {
    return { type: 'gif', platform: 'GIF' };
  }
  if (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov')) {
    return { type: 'video', platform: 'Video' };
  }
  if (lowerUrl.match(/\.(jpg|jpeg|png|webp|bmp|svg)(\?|$)/i)) {
    return { type: 'image', platform: 'Imagen' };
  }
  
  // Default to video for unknown social media links
  return { type: 'video', platform: 'Enlace' };
};

// Get embed URL for different platforms
const getEmbedUrl = (meme: Meme): string | null => {
  switch (meme.type) {
    case 'youtube':
      const ytId = getYouTubeVideoId(meme.url);
      return ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0` : null;
    
    case 'vimeo':
      const vimeoId = getVimeoVideoId(meme.url);
      return vimeoId ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1` : null;
    
    case 'tiktok':
      // TikTok requires oEmbed - we'll open in new tab
      return null;
    
    case 'instagram':
    case 'twitter':
    case 'facebook':
      // These require authentication - open in new tab
      return null;
    
    default:
      return meme.url;
  }
};

export default function GestorMemes() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<Meme['type']>('video');
  const [newPlatform, setNewPlatform] = useState<string>('Video');

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

    const { type, platform } = detectContentType(newUrl);
    
    const meme: Meme = {
      id: Date.now().toString(),
      type: newType || type,
      url: newUrl.trim(),
      title: newTitle.trim() || `Meme ${memes.length + 1}`,
      createdAt: new Date(),
      platform: newPlatform || platform
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
    // For platforms that can't be embedded, open in new tab
    const nonEmbeddable = ['tiktok', 'instagram', 'twitter', 'facebook'];
    if (nonEmbeddable.includes(meme.type)) {
      window.open(meme.url, '_blank');
      toast.info('Abriendo en nueva pestaña...');
      return;
    }
    
    // Dispatch custom event to trigger the idle overlay with this meme
    window.dispatchEvent(new CustomEvent('trigger-meme-overlay', { 
      detail: { meme } 
    }));
  };

  const getTypeIcon = (type: Meme['type']) => {
    switch (type) {
      case 'youtube':
      case 'video':
      case 'tiktok':
      case 'vimeo':
        return <Video className="w-4 h-4" />;
      case 'instagram':
      case 'twitter':
      case 'facebook':
        return <Globe className="w-4 h-4" />;
      case 'gif':
        return <Smile className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
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
      
      case 'tiktok':
      case 'instagram':
      case 'twitter':
      case 'facebook':
        return (
          <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded flex flex-col items-center justify-center">
            <Globe className="w-8 h-8 text-primary/60 mb-2" />
            <span className="text-xs text-muted-foreground">{meme.platform}</span>
          </div>
        );
      
      case 'vimeo':
        const vimeoId = getVimeoVideoId(meme.url);
        return (
          <div className="w-full h-32 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded flex flex-col items-center justify-center">
            <Video className="w-8 h-8 text-blue-400/60 mb-2" />
            <span className="text-xs text-muted-foreground">Vimeo</span>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="meme-url">URL del meme</Label>
                  <Input
                    id="meme-url"
                    placeholder="Pega cualquier enlace de YouTube, TikTok, Instagram, Twitter, etc."
                    value={newUrl}
                    onChange={(e) => {
                      setNewUrl(e.target.value);
                      // Auto-detect type
                      if (e.target.value) {
                        const { type, platform } = detectContentType(e.target.value);
                        setNewType(type);
                        setNewPlatform(platform);
                      }
                    }}
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Soporta: YouTube, TikTok, Instagram, Twitter/X, Facebook, Vimeo, GIFs, imágenes y videos
                  </p>
                </div>
                <div>
                  <Label htmlFor="meme-title">Título</Label>
                  <Input
                    id="meme-title"
                    placeholder="Mi meme favorito"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-background/50"
                  />
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
                  {/* Preview section - no badges, no URLs */}
                  <div className="relative">
                    {renderMemePreview(meme)}
                  </div>
                  
                  <CardContent className="p-3 space-y-2">
                    {/* Title only - no URL displayed */}
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate flex-1">{meme.title}</p>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteMeme(meme.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Action button */}
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handlePlayMeme(meme)}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Activar
                    </Button>
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