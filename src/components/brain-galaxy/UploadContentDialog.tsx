import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  Video, 
  Image, 
  Music, 
  File,
  X,
  Globe,
  Brain,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BrainGalaxyArea } from '@/types/brain-galaxy';

interface UploadContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: BrainGalaxyArea[];
  onUpload: (
    file: File,
    title: string,
    areaId?: string,
    visibility?: 'private' | 'company' | 'holding'
  ) => Promise<any>;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('video/')) return <Video className="h-8 w-8 text-primary" />;
  if (type.startsWith('image/')) return <Image className="h-8 w-8 text-primary" />;
  if (type.startsWith('audio/')) return <Music className="h-8 w-8 text-primary" />;
  if (type.includes('pdf') || type.includes('document') || type.includes('word')) 
    return <FileText className="h-8 w-8 text-primary" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function UploadContentDialog({
  open,
  onOpenChange,
  areas,
  onUpload,
}: UploadContentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('none');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        // Auto-fill title from filename
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) return;

    setIsUploading(true);
    try {
      const areaId = selectedArea === 'none' ? undefined : selectedArea;
      // Always upload as 'holding' visibility for global knowledge
      await onUpload(selectedFile, title.trim(), areaId, 'holding');
      
      // Reset form
      setSelectedFile(null);
      setTitle('');
      setSelectedArea('none');
      onOpenChange(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setTitle('');
      setSelectedArea('none');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Subir Contenido a Brain Galaxy
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-medium mt-2">
              <Sparkles className="h-4 w-4" />
              ¡Tu aporte fortalece el conocimiento del holding!
            </div>
            <p>
              El contenido que subas será utilizado como <strong>conocimiento global</strong> para 
              mejorar la capacidad de Brain Galaxy. Todos los miembros del holding se beneficiarán 
              de tu contribución.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Global knowledge badge */}
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Globe className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              Este contenido será parte del Mega Cerebro del Holding
            </span>
          </div>

          {/* File Upload Area */}
          <div>
            <Label htmlFor="file">Archivo</Label>
            <input
              ref={fileInputRef}
              type="file"
              id="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.mp4,.mov,.avi,.mp3,.wav,.jpg,.jpeg,.png,.gif,.webp"
            />
            
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Haz clic para seleccionar un archivo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, Word, Excel, PowerPoint, Videos, Imágenes, Audio
                </p>
              </div>
            ) : (
              <div className="mt-2 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Título del contenido</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Manual de procesos de ventas"
              className="mt-1"
            />
          </div>

          {/* Area Selection */}
          <div>
            <Label htmlFor="area">Área de conocimiento (opcional)</Label>
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona un área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin área específica</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    <span className="flex items-center gap-2">
                      <span>{area.icon}</span>
                      {area.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedFile || !title.trim() || isUploading}
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir al Mega Cerebro
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
