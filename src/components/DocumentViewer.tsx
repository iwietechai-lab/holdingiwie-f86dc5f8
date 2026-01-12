import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText, RotateCw } from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DocumentViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
}

export const DocumentViewer = ({ url, fileName, mimeType }: DocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [imageZoom, setImageZoom] = useState(100);

  // Detect file type
  const isPdf = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  const isVideo = mimeType?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(fileName);

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

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const imageZoomIn = () => setImageZoom(prev => Math.min(prev + 25, 300));
  const imageZoomOut = () => setImageZoom(prev => Math.max(prev - 25, 50));

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setPageNumber(1);
  };

  // PDF Viewer with react-pdf
  if (isPdf) {
    return (
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="flex items-center justify-center gap-2 p-3 bg-muted/20 border-b border-border flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3 min-w-[100px] text-center">
              {loading ? '...' : `${pageNumber} / ${numPages}`}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm px-2">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Document */}
        <div className="flex-1 overflow-auto flex justify-center p-4 bg-muted/10">
          {error ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
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
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                }
                className="shadow-lg rounded-lg overflow-hidden"
              />
            </Document>
          )}
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
          <Button variant="outline" size="sm" onClick={imageZoomOut} disabled={imageZoom <= 50}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm px-3">{imageZoom}%</span>
          <Button variant="outline" size="sm" onClick={imageZoomIn} disabled={imageZoom >= 300}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/10">
          <img
            src={url}
            alt={fileName}
            className="object-contain rounded-lg shadow-lg transition-transform"
            style={{ 
              maxWidth: `${imageZoom}%`,
              maxHeight: `${imageZoom}%`,
            }}
            onError={() => setError('Error al cargar la imagen')}
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
          src={url}
          controls
          className="max-w-full max-h-full rounded-lg shadow-lg"
        />
      </div>
    );
  }

  // Unsupported file type fallback
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
      <FileText className="w-16 h-16 mb-4 text-muted-foreground/50" />
      <p className="text-lg font-medium mb-2">Formato no soportado para vista previa</p>
      <p className="text-sm text-center">Este tipo de archivo no puede previsualizarse directamente.</p>
    </div>
  );
};
