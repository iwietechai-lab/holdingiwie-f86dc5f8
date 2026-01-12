import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Upload,
  Download,
  Trash2,
  Eye,
  Filter,
  Search,
  FileText,
  RefreshCw,
  Plus,
  X,
  Check,
  AlertCircle,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { SpaceBackground } from '@/components/SpaceBackground';
import { Sidebar } from '@/components/Sidebar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { companies } from '@/data/companies';
import { documentService } from '@/services/documentService';
import { DocumentViewer } from '@/components/DocumentViewer';
import {
  Document as DocType,
  AREAS,
  DOCUMENT_TYPES,
  getDocumentIcon,
  formatFileSize,
} from '@/types/documents';

export const GestorDocumentos = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading, logout } = useSupabaseAuth();
  const { toast } = useToast();

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocType | null>(null);

  // Filters
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNombre, setUploadNombre] = useState('');
  const [uploadEmpresa, setUploadEmpresa] = useState('');
  const [uploadArea, setUploadArea] = useState('');
  const [uploadIsDevelopment, setUploadIsDevelopment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Auth check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Load documents
  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const filters: any = {};
      if (filterEmpresa !== 'all') filters.empresa_id = filterEmpresa;
      if (filterArea !== 'all') filters.area_id = filterArea;
      if (filterTipo !== 'all') filters.tipo = filterTipo;

      const { data, error } = await documentService.getDocuments(filters);
      
      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los documentos',
          variant: 'destructive',
        });
      } else {
        setDocuments(data);
      }
    } catch (error) {
      console.error('Load documents error:', error);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [filterEmpresa, filterArea, filterTipo, toast]);

  useEffect(() => {
    if (isAuthenticated && profile) {
      loadDocuments();
    }
  }, [isAuthenticated, profile, loadDocuments]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadNombre) {
        setUploadNombre(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadEmpresa || !uploadArea || !user) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      // Upload file with progress tracking
      const { path, error: uploadError } = await documentService.uploadFile(
        uploadFile,
        uploadEmpresa,
        uploadArea,
        user.id,
        (progress) => setUploadProgress(progress)
      );

      if (uploadError) throw uploadError;

      // Create document record
      const { error: docError } = await documentService.createDocument(
        {
          file: uploadFile,
          nombre: uploadNombre || uploadFile.name,
          empresa_id: uploadEmpresa,
          area_id: uploadArea,
          is_development: uploadIsDevelopment,
        },
        path,
        user.id
      );

      if (docError) throw docError;

      toast({
        title: '¡Éxito!',
        description: 'Documento subido correctamente',
      });

      // Reset form
      setUploadFile(null);
      setUploadNombre('');
      setUploadEmpresa('');
      setUploadArea('');
      setUploadIsDevelopment(false);
      setUploadProgress(0);
      setShowUploadModal(false);

      // Reload documents
      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo subir el documento',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePreview = async (doc: DocType) => {
    const url = await documentService.getDownloadUrl(doc.file_path);
    if (url) {
      setPreviewUrl(url);
      setPreviewDocument(doc);
      setShowPreviewModal(true);
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo obtener la vista previa',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (doc: DocType) => {
    const url = await documentService.getDownloadUrl(doc.file_path);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (doc: DocType) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    const { error } = await documentService.deleteDocument(doc.id, doc.file_path);
    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Eliminado',
        description: 'Documento eliminado correctamente',
      });
      loadDocuments();
    }
  };

  // Filter documents by search query
  const filteredDocuments = documents.filter((doc) =>
    doc.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEmpresaName = (id: string) => {
    const company = companies.find((c) => c.id === id);
    return company?.name || id;
  };

  const getAreaName = (id: string) => {
    const area = AREAS.find((a) => a.value === id);
    return area?.label || id;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpaceBackground />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <SpaceBackground />

      <Sidebar
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
      />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <FolderOpen className="w-8 h-8 text-primary" />
                Gestor de Documentos
              </h1>
              <p className="text-muted-foreground">
                Gestiona los documentos de todas las empresas del holding
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </header>

          {/* Filters */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5 text-secondary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-input border-border"
                  />
                </div>

                <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todas las empresas</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todas las áreas</SelectItem>
                    {AREAS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={loadDocuments}
                  disabled={isLoadingDocs}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isLoadingDocs ? 'animate-spin' : ''}`}
                  />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Documentos ({filteredDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground w-16">Tipo</TableHead>
                      <TableHead className="text-muted-foreground min-w-[150px]">Nombre</TableHead>
                      <TableHead className="text-muted-foreground">Empresa</TableHead>
                      <TableHead className="text-muted-foreground">Área</TableHead>
                      <TableHead className="text-muted-foreground w-20">Versión</TableHead>
                      <TableHead className="text-muted-foreground w-24">Tamaño</TableHead>
                      <TableHead className="text-muted-foreground w-28">Fecha</TableHead>
                      <TableHead className="text-muted-foreground text-right w-32">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground py-12"
                        >
                          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          No hay documentos disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <TableRow 
                          key={doc.id} 
                          className="border-border hover:bg-muted/20 cursor-pointer group"
                          onClick={() => handlePreview(doc)}
                        >
                          <TableCell>
                            <span className="text-2xl">{getDocumentIcon(doc.tipo)}</span>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{doc.nombre}</span>
                              {doc.is_development && (
                                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                                  Dev
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getEmpresaName(doc.empresa_id)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getAreaName(doc.area_id)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            v{doc.version}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {doc.file_size ? formatFileSize(doc.file_size) : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('es-ES')}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePreview(doc)}
                                className="h-8 w-8 hover:bg-primary/20"
                                title="Ver documento"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(doc)}
                                className="h-8 w-8 hover:bg-secondary/20"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(doc)}
                                className="h-8 w-8 hover:bg-destructive/20 text-destructive"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Subir Documento
            </DialogTitle>
            <DialogDescription>
              Sube un nuevo documento al gestor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Archivo *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.dwg,.dxf"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-foreground">{uploadFile.name}</span>
                      <span className="text-muted-foreground">
                        ({formatFileSize(uploadFile.size)})
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Haz clic o arrastra un archivo aquí
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, Word, Excel, Imágenes, Videos, CAD
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del documento</Label>
              <Input
                id="nombre"
                value={uploadNombre}
                onChange={(e) => setUploadNombre(e.target.value)}
                placeholder="Nombre descriptivo"
                className="bg-input border-border"
              />
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={uploadEmpresa} onValueChange={setUploadEmpresa}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area */}
            <div className="space-y-2">
              <Label>Área *</Label>
              <Select value={uploadArea} onValueChange={setUploadArea}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Development checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-development"
                checked={uploadIsDevelopment}
                onCheckedChange={(checked) =>
                  setUploadIsDevelopment(checked === true)
                }
              />
              <Label htmlFor="is-development" className="text-sm cursor-pointer">
                Implica desarrollo (activar versionado)
              </Label>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subiendo archivo...</span>
                  <span className="font-medium text-primary">{uploadProgress}%</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {uploadProgress < 100 
                    ? 'Por favor espera mientras se sube el archivo...' 
                    : '¡Completado! Guardando registro...'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                className="flex-1"
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
                disabled={isUploading || !uploadFile}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {uploadProgress}% Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal - Full Screen */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] bg-card border-border flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              {previewDocument?.nombre}
              {previewDocument?.is_development && (
                <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                  v{previewDocument.version}
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>{getEmpresaName(previewDocument?.empresa_id || '')}</span>
              <span>•</span>
              <span>{getAreaName(previewDocument?.area_id || '')}</span>
              {previewDocument?.file_size && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(previewDocument.file_size)}</span>
                </>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-hidden">
            {previewUrl && previewDocument && (
              <DocumentViewer
                url={previewUrl}
                fileName={previewDocument.nombre}
                mimeType={previewDocument.mime_type}
              />
            )}
          </div>

          <div className="px-6 py-3 border-t border-border shrink-0 flex justify-center items-center bg-card">
            <Button
              variant="outline"
              onClick={() => setShowPreviewModal(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestorDocumentos;
