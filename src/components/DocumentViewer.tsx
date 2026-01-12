import { useState, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText, RotateCw, Hand } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker using the exact version that matches react-pdf
// This prevents "API version does not match Worker version" errors
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DocumentViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
}

// Zoom levels: 50% to 200%
const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const DocumentViewer = ({ url, fileName, mimeType }: DocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [imageZoom, setImageZoom] = useState(100);
  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing'>('grab');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Detect file type
  const isPdf = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  const isVideo = mimeType?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(fileName);

  // Memoize document options for caching and large file support
  const documentOptions = useMemo(() => ({
    cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    // Enable range requests for large files - this allows streaming
    disableRange: false,
    disableStream: false,
  }), []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('No se pudo cargar el documento PDF');
    setLoading(false);
  };

  // Page navigation - only render current page for performance
  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));
  
  // Zoom handlers - limited to 50%-200%
  const zoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= scale);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    setScale(ZOOM_LEVELS[nextIndex]);
  };
  
  const zoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= scale);
    const prevIndex = Math.max(currentIndex - 1, 0);
    setScale(ZOOM_LEVELS[prevIndex]);
  };

  // Image zoom handlers
  const imageZoomIn = () => setImageZoom(prev => Math.min(prev + 25, 200));
  const imageZoomOut = () => setImageZoom(prev => Math.max(prev - 25, 50));

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
  };

  // Drag to scroll handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
  }, []);

  // PDF Viewer - renders only current page for optimal performance
  if (isPdf) {
    return (
      <div className="flex flex-col h-full">
        {/* Controls: Page nav + Zoom only (NO download button) */}
        <div className="flex items-center justify-center gap-2 p-3 bg-muted/20 border-b border-border flex-wrap shrink-0">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPrevPage} 
              disabled={currentPage <= 1 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3 min-w-[100px] text-center">
              {loading ? '...' : `${currentPage} / ${numPages}`}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextPage} 
              disabled={currentPage >= numPages || loading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Zoom Controls - 50% to 200% */}
          <div className="flex items-center gap-2 ml-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={zoomOut} 
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm px-2 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={zoomIn} 
              disabled={scale >= 2.0}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 ml-4 text-xs text-muted-foreground">
            <Hand className="w-3 h-3" />
            <span>Arrastra para desplazar</span>
          </div>
        </div>

        {/* PDF Document - single page render for speed */}
        <div 
          ref={containerRef}
          className="flex-1 min-h-0 select-none bg-muted/10 overflow-auto"
          style={{ 
            cursor: cursorStyle,
            height: '80vh',
          }}
        >
          <div 
            className="flex justify-center py-4"
            style={{ minWidth: scale > 1 ? 'max-content' : undefined }}
          >
            {error ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
                <FileText className="w-16 h-16 mb-4 text-destructive/50" />
                <p className="text-lg font-medium mb-2">Error al cargar PDF</p>
                <p className="text-sm text-center mb-6">{error}</p>
                <Button onClick={handleRetry} variant="outline">
                  <RotateCw className="w-4 h-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            ) : (
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                options={documentOptions}
                loading={
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                    <p className="text-muted-foreground">Cargando PDF...</p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center py-12 text-destructive">
                    <FileText className="w-12 h-12 mb-4" />
                    <p>Error al cargar el documento</p>
                  </div>
                }
              >
                {/* Only render current page - key includes scale to force re-render on zoom */}
                <Page
                  key={`page-${currentPage}-scale-${scale}`}
                  pageNumber={currentPage}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={
                    <div className="flex items-center justify-center py-12 min-h-[400px] bg-background/50 rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  }
                  className="shadow-lg rounded-lg overflow-hidden bg-white"
                />
              </Document>
            )}
          </div>
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
          <Button variant="outline" size="sm" onClick={imageZoomIn} disabled={imageZoom >= 200}>
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