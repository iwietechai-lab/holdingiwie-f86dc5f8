import { useState, useRef, useEffect } from 'react';
import { Viewer, Worker, SpecialZoomLevel  } from '@react-pdf-viewer/core';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Loader2, FileText, RotateCw, Download, AlertTriangle, Hand } from 'lucide-react';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';

interface DocumentViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number; // in bytes
}

// Zoom presets for quick access
const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const MAX_ZOOM_LARGE_FILE = 1.5; // 150% max for large files
const LARGE_FILE_THRESHOLD = 15 * 1024 * 1024; // 15 MB

export const DocumentViewer = ({ url, fileName, mimeType, fileSize = 0 }: DocumentViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(1.0);
  const [showZoomWarning, setShowZoomWarning] = useState(false);
  const [imageZoom, setImageZoom] = useState(100);
  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing'>('grab');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Create zoom plugin instance
  const zoomPluginInstance = zoomPlugin();
  const { zoomTo, CurrentScale } = zoomPluginInstance;

  // Detect file type
  const isPdf = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  const isVideo = mimeType?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(fileName);
  
  // Check if file is large
  const isLargeFile = fileSize > LARGE_FILE_THRESHOLD;
  const maxZoom = isLargeFile ? MAX_ZOOM_LARGE_FILE : 2.0;

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= currentZoom);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    const newZoom = Math.min(ZOOM_LEVELS[nextIndex], maxZoom);
    
    if (isLargeFile && newZoom > 1.25) {
      setShowZoomWarning(true);
    }
    
    setCurrentZoom(newZoom);
    zoomTo(newZoom);
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= currentZoom);
    const prevIndex = Math.max(currentIndex - 1, 0);
    const newZoom = ZOOM_LEVELS[prevIndex];
    
    setShowZoomWarning(false);
    setCurrentZoom(newZoom);
    zoomTo(newZoom);
  };

  const handleZoomPreset = (zoom: number) => {
    const clampedZoom = Math.min(zoom, maxZoom);
    if (isLargeFile && clampedZoom > 1.25) {
      setShowZoomWarning(true);
    } else {
      setShowZoomWarning(false);
    }
    setCurrentZoom(clampedZoom);
    zoomTo(clampedZoom);
  };

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
  };

  // Image zoom handlers
  const imageZoomIn = () => setImageZoom(prev => Math.min(prev + 25, 300));
  const imageZoomOut = () => setImageZoom(prev => Math.max(prev - 25, 50));

  // Drag to scroll for images
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isPdf) return;

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      
      isDraggingRef.current = true;
      startYRef.current = e.clientY;
      startXRef.current = e.clientX;
      scrollTopRef.current = container.scrollTop;
      scrollLeftRef.current = container.scrollLeft;
      setCursorStyle('grabbing');
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const deltaY = e.clientY - startYRef.current;
      const deltaX = e.clientX - startXRef.current;
      
      container.scrollTop = scrollTopRef.current - deltaY;
      if (container.scrollWidth > container.clientWidth) {
        container.scrollLeft = scrollLeftRef.current - deltaX;
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setCursorStyle('grab');
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPdf]);

  // PDF Viewer with @react-pdf-viewer/core - optimized lazy loading
  if (isPdf) {
    return (
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="flex items-center justify-center gap-2 p-3 bg-muted/20 border-b border-border flex-wrap shrink-0">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleZoomOut} 
              disabled={currentZoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            {/* Zoom presets */}
            <div className="flex items-center gap-1">
              {[0.5, 0.75, 1.0, 1.25, 1.5].map((zoom) => (
                <Button
                  key={zoom}
                  variant={Math.abs(currentZoom - zoom) < 0.01 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleZoomPreset(zoom)}
                  disabled={zoom > maxZoom}
                  className="text-xs px-2"
                >
                  {Math.round(zoom * 100)}%
                </Button>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleZoomIn} 
              disabled={currentZoom >= maxZoom}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Download button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="ml-4"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>

        {/* Zoom warning for large files */}
        {showZoomWarning && (
          <div className="flex items-center justify-center gap-2 p-2 bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Zoom alto puede tardar en archivos grandes</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
              className="ml-2 text-xs"
            >
              Descargar PDF
            </Button>
          </div>
        )}

        {/* PDF Viewer Container */}
        <div 
          className="flex-1 min-h-0 bg-muted/10"
          style={{ height: '80vh' }}
        >
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <FileText className="w-16 h-16 mb-4 text-destructive/50" />
              <p className="text-lg font-medium mb-2">Error al cargar PDF</p>
              <p className="text-sm text-center mb-6">{error}</p>
              <Button onClick={handleRetry} variant="outline">
                <RotateCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          ) : (
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <div 
                className="h-full [&_.rpv-core__viewer]:h-full [&_.rpv-core__inner-pages]:scrollbar-thin [&_.rpv-core__inner-pages]:scrollbar-thumb-primary/50 [&_.rpv-core__inner-pages]:scrollbar-track-transparent"
                style={{
                  // Custom styling for the viewer
                }}
              >
                <Viewer
                  fileUrl={url}
                  plugins={[zoomPluginInstance]}
                  defaultScale={SpecialZoomLevel.PageWidth}
                  onDocumentLoad={() => {
                    setLoading(false);
                    setError(null);
                  }}
                  renderLoader={(percentages: number) => (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                      <p className="text-muted-foreground">
                        Cargando PDF... {Math.round(percentages)}%
                      </p>
                    </div>
                  )}
                  renderError={() => {
                    setError('No se pudo cargar el documento PDF');
                    return (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-destructive">
                        <FileText className="w-12 h-12 mb-4" />
                        <p>Error al cargar el documento</p>
                      </div>
                    );
                  }}
                  // Performance: only render visible pages (lazy loading built-in)
                  // Caching is handled internally by the viewer
                />
              </div>
            </Worker>
          )}
        </div>
      </div>
    );
  }

  // Image Viewer with zoom controls and drag-to-scroll
  if (isImage) {
    return (
      <div className="flex flex-col h-full">
        {/* Zoom Controls */}
        <div className="flex items-center justify-center gap-2 p-3 bg-muted/20 border-b border-border shrink-0">
          <Button variant="outline" size="sm" onClick={imageZoomOut} disabled={imageZoom <= 50}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm px-3">{imageZoom}%</span>
          <Button variant="outline" size="sm" onClick={imageZoomIn} disabled={imageZoom >= 300}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1 ml-4 text-xs text-muted-foreground">
            <Hand className="w-3 h-3" />
            <span>Arrastra para desplazar</span>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto p-4 bg-muted/10 select-none"
          style={{ 
            cursor: cursorStyle,
            height: '80vh',
          }}
        >
          <div className="flex justify-center items-center min-h-full min-w-max">
            <img
              src={url}
              alt={fileName}
              className="object-contain rounded-lg shadow-lg"
              style={{ 
                width: `${imageZoom}%`,
                height: 'auto',
              }}
              onError={() => setError('Error al cargar la imagen')}
              draggable={false}
            />
          </div>
        </div>
      </div>
    );
  }

  // Video Viewer
  if (isVideo) {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-muted/10" style={{ height: '80vh' }}>
        <video
          src={url}
          controls
          className="max-w-full max-h-full rounded-lg shadow-lg"
        />
      </div>
    );
  }

  // Unsupported file type fallback
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8" style={{ height: '80vh' }}>
      <FileText className="w-16 h-16 mb-4 text-muted-foreground/50" />
      <p className="text-lg font-medium mb-2">Formato no soportado para vista previa</p>
      <p className="text-sm text-center">Este tipo de archivo no puede previsualizarse directamente.</p>
    </div>
  );
};