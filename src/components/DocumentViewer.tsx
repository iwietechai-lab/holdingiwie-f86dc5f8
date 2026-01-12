import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText, RotateCw } from 'lucide-react';

interface DocumentViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
}

export const DocumentViewer = ({ url, fileName, mimeType }: DocumentViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(100);

  // Detect file type
  const isPdf = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  const isVideo = mimeType?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(fileName);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;
    
    const fetchFile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the file as blob to bypass CORS/blocking issues
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('No se pudo descargar el archivo');
        }
        
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setBlobUrl(objectUrl);
        }
      } catch (err) {
        console.error('Error fetching file:', err);
        if (isMounted) {
          setError('No se pudo cargar el documento.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFile();
    
    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  const handleRetry = () => {
    setBlobUrl(null);
    setError(null);
    setLoading(true);
    // Re-trigger by changing state
    setTimeout(() => {
      const fetchAgain = async () => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Error');
          const blob = await response.blob();
          setBlobUrl(URL.createObjectURL(blob));
        } catch {
          setError('No se pudo cargar el documento.');
        } finally {
          setLoading(false);
        }
      };
      fetchAgain();
    }, 100);
  };

  const zoomIn = () => setImageZoom(prev => Math.min(prev + 25, 300));
  const zoomOut = () => setImageZoom(prev => Math.max(prev - 25, 50));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
        <p>Cargando documento...</p>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <FileText className="w-16 h-16 mb-4 text-destructive/50" />
        <p className="text-lg font-medium mb-2">Error al cargar</p>
        <p className="text-sm text-center mb-6">{error || 'No se pudo obtener el archivo'}</p>
        <Button onClick={handleRetry} variant="outline">
          <RotateCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  // PDF Viewer using embed element
  if (isPdf) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 bg-muted/10">
          <embed
            src={blobUrl}
            type="application/pdf"
            className="w-full h-full"
            style={{ minHeight: '65vh' }}
          />
        </div>
      </div>
    );
  }

  // Image Viewer with zoom controls
  if (isImage) {
    return (
      <div className="flex flex-col h-full">
        {/* Zoom Controls */}
        <div className="flex items-center justify-center gap-2 p-3 bg-muted/20 border-b border-border">
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={imageZoom <= 50}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm px-3">{imageZoom}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn} disabled={imageZoom >= 300}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/10">
          <img
            src={blobUrl}
            alt={fileName}
            className="object-contain rounded-lg shadow-lg transition-transform"
            style={{ 
              maxWidth: `${imageZoom}%`,
              maxHeight: `${imageZoom}%`,
            }}
          />
        </div>
      </div>
    );
  }

  // Video Viewer
  if (isVideo) {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-muted/10">
        <video
          src={blobUrl}
          controls
          className="max-w-full max-h-full rounded-lg shadow-lg"
        />
      </div>
    );
  }

  // Unsupported file type - show embedded viewer anyway
  return (
    <div className="flex-1 bg-muted/10">
      <embed
        src={blobUrl}
        className="w-full h-full"
        style={{ minHeight: '65vh' }}
      />
    </div>
  );
};
