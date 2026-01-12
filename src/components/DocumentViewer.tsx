import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText, Hand } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
}

export const DocumentViewer = ({ url, fileName, mimeType, fileSize }: DocumentViewerProps) => {
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

  // PDF handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF load error:', err);
    setError('Error al cargar el PDF. El archivo puede estar dañado o ser demasiado grande.');
    setLoading(false);
  };

  // Page navigation
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  // Zoom handlers - 50% to 200%
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 2.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  // Image zoom handlers
  const imageZoomIn = () => setImageZoom(prev => Math.min(prev + 25, 200));
  const imageZoomOut = () => setImageZoom(prev => Math.max(prev - 25, 50));

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

  // PDF Viewer using react-pdf
  if (isPdf) {
    return (
      <div className="flex flex-col h-full">
        {/* Controls: Page nav + Zoom */}
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
              {loading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Cargando...
                </span>
              ) : (
                `${currentPage} / ${numPages}`
              )}
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
              disabled={scale <= 0.5 || loading}
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
              disabled={scale >= 2.0 || loading}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 ml-4 text-xs text-muted-foreground">
            <Hand className="w-3 h-3" />
            <span>Arrastra para desplazar</span>
          </div>
        </div>

        {/* PDF Document */}
        <div 
          ref={containerRef}
          className="flex-1 min-h-0 select-none bg-muted/10 overflow-auto"
          style={{ 
            cursor: cursorStyle,
            height: '80vh',
          }}
        >
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="w-16 h-16 mb-4 text-destructive/50" />
              <p className="text-lg font-medium mb-2">Error al cargar PDF</p>
              <p className="text-sm text-center max-w-md">{error}</p>
            </div>
          ) : (
            <div 
              className="flex justify-center py-4"
              style={{ minWidth: scale > 1 ? 'max-content' : undefined }}
            >
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                    <p className="text-muted-foreground">Cargando documento...</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Archivos grandes pueden tardar más en cargar
                    </p>
                  </div>
                }
                error={
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <FileText className="w-16 h-16 mb-4 text-destructive/50" />
                    <p className="text-lg font-medium">Error al cargar PDF</p>
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  className="shadow-lg rounded-lg overflow-hidden"
                  loading={
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  }
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Image Viewer
  if (isImage) {
    return (
      <div className="flex flex-col h-full">
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
