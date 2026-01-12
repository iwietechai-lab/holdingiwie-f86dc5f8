export interface Document {
  id: string;
  nombre: string;
  tipo: string;
  empresa_id: string;
  area_id: string;
  version: number;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  is_development: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface DocumentUpload {
  file: File;
  nombre: string;
  empresa_id: string;
  area_id: string;
  is_development: boolean;
}

export const DOCUMENT_TYPES = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'image', label: 'Imagen', icon: '🖼️' },
  { value: 'video', label: 'Video', icon: '🎬' },
  { value: 'engineering', label: 'Ingeniería', icon: '📐' },
  { value: 'spreadsheet', label: 'Hoja de cálculo', icon: '📊' },
  { value: 'presentation', label: 'Presentación', icon: '📽️' },
  { value: 'document', label: 'Documento', icon: '📝' },
  { value: 'other', label: 'Otro', icon: '📁' },
];

export const AREAS = [
  { value: 'direccion-general', label: 'Dirección General' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'legal', label: 'Legal' },
  { value: 'operaciones', label: 'Operaciones' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'rrhh', label: 'Recursos Humanos' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'investigacion', label: 'Investigación y Desarrollo' },
  { value: 'produccion', label: 'Producción' },
  { value: 'calidad', label: 'Calidad' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'logistica', label: 'Logística' },
];

export const getDocumentTypeFromMime = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('dwg') || mimeType.includes('dxf') || mimeType.includes('cad')) return 'engineering';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return 'other';
};

export const getDocumentIcon = (tipo: string): string => {
  const docType = DOCUMENT_TYPES.find(t => t.value === tipo);
  return docType?.icon || '📁';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
