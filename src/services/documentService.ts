import { supabase } from '@/lib/supabase';
import { Document, DocumentUpload, getDocumentTypeFromMime } from '@/types/documents';

const BUCKET_NAME = 'documentos';

export const documentService = {
  // Initialize bucket if needed (should be created via SQL migration)
  async ensureBucketExists(): Promise<void> {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 104857600, // 100MB max per file
      });
    }
  },

  // Upload file to Supabase Storage with progress tracking
  async uploadFile(
    file: File,
    empresaId: string,
    areaId: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ path: string; error: Error | null }> {
    try {
      await this.ensureBucketExists();
      
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${empresaId}/${areaId}/${timestamp}_${sanitizedName}`;

      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // After XHR upload, we need to use Supabase SDK
            // So we'll simulate progress and use SDK for actual upload
            resolve({ path: filePath, error: null });
          } else {
            resolve({ path: '', error: new Error('Upload failed') });
          }
        });

        xhr.addEventListener('error', () => {
          resolve({ path: '', error: new Error('Upload failed') });
        });

        // Actually use Supabase SDK but track progress via file size estimation
        this.uploadWithProgress(file, filePath, onProgress)
          .then(result => resolve(result))
          .catch(error => resolve({ path: '', error }));
      });
    } catch (error) {
      console.error('Upload error:', error);
      return { path: '', error: error as Error };
    }
  },

  // Internal upload with simulated progress
  async uploadWithProgress(
    file: File,
    filePath: string,
    onProgress?: (progress: number) => void
  ): Promise<{ path: string; error: Error | null }> {
    try {
      // Start progress animation
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 90) {
          // Simulate progress based on file size
          const increment = file.size > 10000000 ? 2 : 5; // Slower for larger files
          currentProgress = Math.min(currentProgress + increment, 90);
          onProgress?.(currentProgress);
        }
      }, 200);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) {
        onProgress?.(0);
        throw error;
      }

      // Complete the progress
      onProgress?.(100);

      return { path: data.path, error: null };
    } catch (error) {
      console.error('Upload error:', error);
      return { path: '', error: error as Error };
    }
  },

  // Create document record in database
  async createDocument(
    upload: DocumentUpload,
    filePath: string,
    userId: string
  ): Promise<{ data: Document | null; error: Error | null }> {
    try {
      const tipo = getDocumentTypeFromMime(upload.file.type);

      const { data, error } = await supabase
        .from('documentos')
        .insert({
          nombre: upload.nombre || upload.file.name,
          tipo,
          empresa_id: upload.empresa_id,
          area_id: upload.area_id,
          version: 1,
          file_path: filePath,
          file_size: upload.file.size,
          mime_type: upload.file.type,
          is_development: upload.is_development,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Create document error:', error);
      return { data: null, error: error as Error };
    }
  },

  // Get all documents with filters
  async getDocuments(filters?: {
    empresa_id?: string;
    area_id?: string;
    tipo?: string;
  }): Promise<{ data: Document[]; error: Error | null }> {
    try {
      let query = supabase
        .from('documentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.empresa_id) {
        query = query.eq('empresa_id', filters.empresa_id);
      }
      if (filters?.area_id) {
        query = query.eq('area_id', filters.area_id);
      }
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Get documents error:', error);
      return { data: [], error: error as Error };
    }
  },

  // Get signed URL for download
  async getDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;

      return data.signedUrl;
    } catch (error) {
      console.error('Get download URL error:', error);
      return null;
    }
  },

  // Delete document
  async deleteDocument(id: string, filePath: string): Promise<{ error: Error | null }> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      return { error: null };
    } catch (error) {
      console.error('Delete document error:', error);
      return { error: error as Error };
    }
  },

  // Update document version (for development files)
  async updateDocumentVersion(
    id: string,
    file: File,
    empresaId: string,
    areaId: string,
    userId: string
  ): Promise<{ data: Document | null; error: Error | null }> {
    try {
      // Upload new version
      const { path, error: uploadError } = await this.uploadFile(file, empresaId, areaId, userId);
      if (uploadError) throw uploadError;

      // Get current version
      const { data: current } = await supabase
        .from('documentos')
        .select('version')
        .eq('id', id)
        .single();

      // Update record with new version
      const { data, error } = await supabase
        .from('documentos')
        .update({
          file_path: path,
          file_size: file.size,
          version: (current?.version || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Update version error:', error);
      return { data: null, error: error as Error };
    }
  },
};
