import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Download, FileText } from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  url: string;
  fileName: string;
  mimeType?: string;
  onDownload?: () => void;
}

export const DocumentViewer = ({ url, fileName, mimeType, onDownload }: DocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect file type
  const isPdf = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const isImage = mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
  const isVideo = mimeType?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(fileName);

  useEffect(() => {
    const fetchFile = async () => {
      if (!isPdf) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch the PDF as blob to bypass CORS/blocking issues
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('No se pudo descargar el archivo');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        setPdfData(arrayBuffer);
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError('No se pudo cargar el documento. Intenta descargarlo directamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [url, isPdf]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
        <p>Cargando documento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <FileText className="w-16 h-16 mb-4 text-destructive/50" />
        <p className="text-lg font-medium mb-2">Error al cargar</p>
        <p className="text-sm text-center mb-6">{error}</p>
        {onDownload && (
          <Button onClick={onDownload} className="bg-gradient-to-r from-primary to-secondary">
            <Download className="w-4 h-4 mr-2" />
            Descargar archivo
          </Button>
        )}
      </div>
    );
  }

  // PDF Viewer
  if (isPdf && pdfData) {
    return (
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="flex items-center justify-center gap-2 p-3 bg-muted/20 border-b border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm px-3">
            Página {pageNumber} de {numPages || '?'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm px-2">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* PDF Document */}
        <div className="flex-1 overflow-auto flex justify-center p-4 bg-muted/10">
          <Document
            file={{ data: pdfData }}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Cargando PDF...</span>
              </div>
            }
            error={
              <div className="text-destructive text-center">
                <p>Error al renderizar el PDF</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              className="shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>
    );
  }

  // Image Viewer
  if (isImage) {
    return (
      <div className="flex items-center justify-center h-full p-4 overflow-auto">
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          onError={() => setError('No se pudo cargar la imagen')}
        />
      </div>
    );
  }

  // Video Viewer
  if (isVideo) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <video
          src={url}
          controls
          className="max-w-full max-h-full rounded-lg shadow-lg"
          onError={() => setError('No se pudo cargar el video')}
        />
      </div>
    );
  }

  // Unsupported file type
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
      <FileText className="w-16 h-16 mb-4 text-muted-foreground/50" />
      <p className="text-lg font-medium mb-2">Vista previa no disponible</p>
      <p className="text-sm text-center mb-6">
        Este tipo de archivo no puede previsualizarse
      </p>
      {onDownload && (
        <Button onClick={onDownload} className="bg-gradient-to-r from-primary to-secondary">
          <Download className="w-4 h-4 mr-2" />
          Descargar archivo
        </Button>
      )}
    </div>
  );
};
