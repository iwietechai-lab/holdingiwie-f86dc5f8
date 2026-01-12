import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText, Hand, AlertTriangle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
}

// Threshold for very large files (50 MB)
const VERY_LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;

// Zoom levels: 50% to 200%
const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

// Format file size for display
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const DocumentViewer = ({ url, fileName, mimeType, fileSize }: DocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [imageZoom, setImageZoom] = useState(100);
  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing'>('grab');
  const [showLargeFileWarning, setShowLargeFileWarning] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const scrollTopRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const renderTaskRef = useRef<any>(null);

  // Detect file type
  const isPdf = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  const isVideo = mimeType?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(fileName);
  
  // Check if file is very large (>50MB)
  const isVeryLargeFile = fileSize && fileSize > VERY_LARGE_FILE_THRESHOLD;

  // Load PDF document
  useEffect(() => {
    if (!isPdf || !url) return;

    // Show warning for very large files
    if (isVeryLargeFile && !showLargeFileWarning) {
      setShowLargeFileWarning(true);
      setLoading(false);
      return;
    }

    const loadPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        // Configure loading with range requests for large files
        const loadingTask = pdfjsLib.getDocument({
          url: url,
          rangeChunkSize: 65536, // 64KB chunks for progressive loading
          disableAutoFetch: true, // Only fetch pages when needed
          disableStream: false,
        });

        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err: any) {
        console.error('PDF load error:', err);
        setError('No se pudo cargar el documento PDF');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (pdfDocument) {
        pdfDocument.destroy();
      }
    };
  }, [url, isPdf, isVeryLargeFile, showLargeFileWarning]);

  // Render current page to canvas
  const renderPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return;

    setPageLoading(true);

    try {
      // Cancel any ongoing render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDocument.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Calculate viewport with scale
      const viewport = page.getViewport({ scale: scale * 1.5 }); // 1.5x for better quality

      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      renderTaskRef.current = page.render(renderContext as any);
      await renderTaskRef.current.promise;
      
      setPageLoading(false);
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
        setPageLoading(false);
      }
    }
  }, [pdfDocument, currentPage, scale]);

  // Render page when document, page, or scale changes
  useEffect(() => {
    if (pdfDocument && !loading) {
      renderPage();
    }
  }, [pdfDocument, currentPage, scale, loading, renderPage]);

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

  const handleContinueLoading = () => {
    setShowLargeFileWarning(false);
    setLoading(true);
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

  // PDF Viewer with pdf.js direct rendering
  if (isPdf) {
    // Show warning for very large files
    if (showLargeFileWarning) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8" style={{ height: '80vh' }}>
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Archivo grande detectado</h3>
          <p className="text-muted-foreground text-center mb-2">
            {fileSize ? formatSize(fileSize) : '>50 MB'}
          </p>
          <p className="text-muted-foreground text-center text-sm mb-6 max-w-md">
            Este archivo es muy grande. La carga progresiva puede tardar entre 10-30 segundos.
            El documento se renderizará página por página para optimizar el rendimiento.
          </p>
          <Button onClick={handleContinueLoading} className="bg-primary hover:bg-primary/90">
            Continuar y cargar documento
          </Button>
        </div>
      );
    }

    // Loading state
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full" style={{ height: '80vh' }}>
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando documento...</p>
          {isVeryLargeFile && (
            <p className="text-xs text-muted-foreground mt-2">
              Archivo grande: puede tardar 10-30 segundos
            </p>
          )}
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground" style={{ height: '80vh' }}>
          <FileText className="w-16 h-16 mb-4 text-destructive/50" />
          <p className="text-lg font-medium mb-2">Error al cargar PDF</p>
          <p className="text-sm text-center">{error}</p>
        </div>
      );
    }

    // PDF viewer with canvas
    return (
      <div className="flex flex-col h-full">
        {/* Controls: Page nav + Zoom only - NO download button */}
        <div className="flex items-center justify-center gap-2 p-3 bg-muted/20 border-b border-border flex-wrap shrink-0">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPrevPage} 
              disabled={currentPage <= 1 || pageLoading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3 min-w-[100px] text-center">
              {pageLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {currentPage} / {numPages}
                </span>
              ) : (
                `${currentPage} / ${numPages}`
              )}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextPage} 
              disabled={currentPage >= numPages || pageLoading}
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
              disabled={scale <= 0.5 || pageLoading}
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
              disabled={scale >= 2.0 || pageLoading}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 ml-4 text-xs text-muted-foreground">
            <Hand className="w-3 h-3" />
            <span>Arrastra para desplazar</span>
          </div>
        </div>

        {/* PDF Canvas - single page render for performance */}
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
            <div className="relative">
              {/* Loading overlay for page changes */}
              {pageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-10">
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Cargando página...</span>
                  </div>
                </div>
              )}
              
              {/* PDF Canvas */}
              <canvas 
                ref={canvasRef}
                className="shadow-lg rounded-lg bg-white"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />
            </div>
          </div>
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