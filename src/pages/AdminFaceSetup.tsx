import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, User, AlertCircle } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

// Import face images
import joelImg from '@/assets/faces/joel.jpeg';
import christopherImg from '@/assets/faces/christopher.jpeg';
import hernanImg from '@/assets/faces/hernan.jpg';
import sebastianImg from '@/assets/faces/sebastian.jpg';
import brunoImg from '@/assets/faces/bruno.jpg';

const FACE_API_MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

interface TeamMember {
  email: string;
  fullName: string;
  role: string;
  companyId: string;
  imageSrc: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  embedding?: number[];
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    email: 'joel@iwie.space',
    fullName: 'Joel Diaz Nuñez',
    role: 'Gerente Comercial',
    companyId: 'iwie-drones',
    imageSrc: joelImg,
    status: 'pending',
  },
  {
    email: 'christopher@iwie.space',
    fullName: 'Christopher Ruiz Gutierrez',
    role: 'Gerente I+D+I',
    companyId: 'iwie-factory',
    imageSrc: christopherImg,
    status: 'pending',
  },
  {
    email: 'hernan@iwie.space',
    fullName: 'Hernan Vargas Gatica',
    role: 'Lider de Area',
    companyId: 'iwie-drones',
    imageSrc: hernanImg,
    status: 'pending',
  },
  {
    email: 'sebastian@iwie.space',
    fullName: 'Sebastian Caroca Colarte',
    role: 'Gerente Legal',
    companyId: 'iwie-legal',
    imageSrc: sebastianImg,
    status: 'pending',
  },
  {
    email: 'bruno@iwie.space',
    fullName: 'Bruno Saez Cardenas',
    role: 'Lider de Area',
    companyId: 'iwie-energy',
    imageSrc: brunoImg,
    status: 'pending',
  },
];

export default function AdminFaceSetup() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>(TEAM_MEMBERS);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'loading' | 'processing' | 'complete'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load face-api models
  const loadModels = useCallback(async () => {
    setOverallStatus('loading');
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODELS_URL),
      ]);
      setModelsLoaded(true);
      setOverallStatus('idle');
      console.log('Face-api models loaded successfully');
    } catch (err) {
      console.error('Error loading models:', err);
      setOverallStatus('idle');
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Extract embedding from a single image
  const extractEmbedding = async (imageSrc: string): Promise<number[] | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({
              inputSize: 416,
              scoreThreshold: 0.5,
            }))
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            const embedding = Array.from(detection.descriptor);
            console.log('Embedding extracted, length:', embedding.length);
            resolve(embedding);
          } else {
            console.error('No face detected in image');
            resolve(null);
          }
        } catch (err) {
          console.error('Error extracting embedding:', err);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.error('Error loading image');
        resolve(null);
      };
      img.src = imageSrc;
    });
  };

  // Get user ID by email from auth.users
  const getUserIdByEmail = async (email: string): Promise<string | null> => {
    try {
      // First check if user exists in user_profiles by email (via auth.users join would be ideal, but we'll check profiles)
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(100);

      if (error) {
        console.error('Error fetching profiles:', error);
        return null;
      }

      // We need to find the user by email - but user_profiles might not have email
      // Let's check if we can get user from supabase auth admin (we can't from client)
      // Alternative: create a mapping or use the sign-in flow to get the UUID
      
      // For now, return null and we'll handle user creation differently
      return null;
    } catch (err) {
      console.error('Error getting user ID:', err);
      return null;
    }
  };

  // Save embedding to user_profiles
  // SECURITY: Embeddings are now stored ONLY in the database, not in localStorage
  const saveEmbeddingToProfile = async (
    email: string, 
    embedding: number[], 
    fullName: string, 
    role: string, 
    companyId: string
  ): Promise<{ success: boolean; userNotFound?: boolean }> => {
    try {
      // Check existing profiles to find a match by email or name
      const { data: existingProfiles, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .limit(100);

      if (fetchError) {
        console.error('Error fetching profiles:', fetchError);
        return { success: false };
      }

      // Try to find matching profile by full_name or email
      const matchingProfile = existingProfiles?.find(p => 
        p.full_name?.toLowerCase() === fullName.toLowerCase() ||
        p.email?.toLowerCase() === email.toLowerCase()
      );

      if (matchingProfile) {
        // Update existing profile with embedding
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            facial_embedding: embedding,
            role: role,
            company_id: companyId,
          })
          .eq('id', matchingProfile.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          return { success: false };
        }
        
        console.log(`Updated facial embedding for ${fullName} (${matchingProfile.id})`);
        return { success: true };
      }

      // SECURITY: No longer storing in localStorage for security reasons
      // User must sign up first, then admin can re-process to store embedding
      console.warn(`No existing profile found for ${email}. User needs to sign up first.`);
      return { success: false, userNotFound: true };
    } catch (err) {
      console.error('Error saving embedding:', err);
      return { success: false };
    }
  };

  // Process all team members
  const processAllMembers = async () => {
    if (!modelsLoaded) {
      alert('Los modelos aún no han cargado. Espera un momento.');
      return;
    }

    setIsProcessing(true);
    setOverallStatus('processing');

    const updatedMembers = [...members];

    for (let i = 0; i < updatedMembers.length; i++) {
      const member = updatedMembers[i];
      
      // Update status to processing
      updatedMembers[i] = { ...member, status: 'processing' };
      setMembers([...updatedMembers]);

      try {
        // Extract embedding
        const embedding = await extractEmbedding(member.imageSrc);
        
        if (!embedding) {
          updatedMembers[i] = { 
            ...member, 
            status: 'error', 
            errorMessage: 'No se detectó rostro en la imagen' 
          };
          setMembers([...updatedMembers]);
          continue;
        }

        // Save to profile
        const saveResult = await saveEmbeddingToProfile(
          member.email,
          embedding,
          member.fullName,
          member.role,
          member.companyId
        );

        if (saveResult.success) {
          updatedMembers[i] = { 
            ...member, 
            status: 'success', 
            embedding 
          };
        } else if (saveResult.userNotFound) {
          updatedMembers[i] = { 
            ...member, 
            status: 'error', 
            errorMessage: 'Usuario no registrado - debe crear cuenta primero' 
          };
        } else {
          updatedMembers[i] = { 
            ...member, 
            status: 'error', 
            errorMessage: 'Error al guardar en base de datos' 
          };
        }
        
        setMembers([...updatedMembers]);
        
        // Small delay between processing
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error processing ${member.fullName}:`, err);
        updatedMembers[i] = { 
          ...member, 
          status: 'error', 
          errorMessage: 'Error durante el procesamiento' 
        };
        setMembers([...updatedMembers]);
      }
    }

    setIsProcessing(false);
    setOverallStatus('complete');
  };

  // Process single member
  const processSingleMember = async (index: number) => {
    if (!modelsLoaded) {
      alert('Los modelos aún no han cargado. Espera un momento.');
      return;
    }

    const updatedMembers = [...members];
    const member = updatedMembers[index];

    updatedMembers[index] = { ...member, status: 'processing' };
    setMembers([...updatedMembers]);

    try {
      const embedding = await extractEmbedding(member.imageSrc);
      
      if (!embedding) {
        updatedMembers[index] = { 
          ...member, 
          status: 'error', 
          errorMessage: 'No se detectó rostro en la imagen' 
        };
        setMembers([...updatedMembers]);
        return;
      }

      const saveResult = await saveEmbeddingToProfile(
        member.email,
        embedding,
        member.fullName,
        member.role,
        member.companyId
      );

      if (saveResult.success) {
        updatedMembers[index] = { 
          ...member, 
          status: 'success', 
          embedding 
        };
      } else if (saveResult.userNotFound) {
        updatedMembers[index] = { 
          ...member, 
          status: 'error', 
          errorMessage: 'Usuario no registrado - debe crear cuenta primero' 
        };
      } else {
        updatedMembers[index] = { 
          ...member, 
          status: 'error', 
          errorMessage: 'Error al guardar en base de datos' 
        };
      }
      
      setMembers([...updatedMembers]);
    } catch (err) {
      console.error(`Error processing ${member.fullName}:`, err);
      updatedMembers[index] = { 
        ...member, 
        status: 'error', 
        errorMessage: 'Error durante el procesamiento' 
      };
      setMembers([...updatedMembers]);
    }
  };

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'pending':
        return <User className="w-5 h-5 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const successCount = members.filter(m => m.status === 'success').length;
  const errorCount = members.filter(m => m.status === 'error').length;

  return (
    <div className="min-h-screen bg-background p-6">
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuración de Reconocimiento Facial</h1>
            <p className="text-muted-foreground mt-1">
              Extrae y guarda los embeddings faciales del equipo
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            Volver al Inicio
          </Button>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {!modelsLoaded ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cargando modelos de IA...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Modelos listos
                </>
              )}
            </CardTitle>
            <CardDescription>
              {modelsLoaded 
                ? 'Los modelos de face-api.js están cargados y listos para procesar.'
                : 'Descargando modelos de detección facial desde el CDN...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button 
                onClick={processAllMembers}
                disabled={!modelsLoaded || isProcessing}
                className="min-w-[200px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Procesar Todos'
                )}
              </Button>
              
              {overallStatus === 'complete' && (
                <div className="text-sm">
                  <span className="text-green-500">{successCount} exitosos</span>
                  {errorCount > 0 && (
                    <span className="text-red-500 ml-2">{errorCount} errores</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600">Nota importante:</p>
                <p className="text-muted-foreground mt-1">
                  Los embeddings se guardarán en <code className="bg-muted px-1 rounded">user_profiles.facial_embedding</code> 
                  <strong> solo si el usuario ya existe en la base de datos</strong>. 
                  Si el usuario no está registrado, primero debe crear su cuenta y luego volver a procesar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member, index) => (
            <Card key={member.email} className={`transition-all ${
              member.status === 'success' ? 'border-green-500/50' :
              member.status === 'error' ? 'border-red-500/50' :
              member.status === 'processing' ? 'border-primary/50' : ''
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img 
                      src={member.imageSrc} 
                      alt={member.fullName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      {getStatusIcon(member.status)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{member.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    
                    {member.status === 'error' && member.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">{member.errorMessage}</p>
                    )}
                    
                    {member.status === 'success' && member.embedding && (
                      <p className="text-xs text-green-500 mt-1">
                        Embedding: {member.embedding.length} dimensiones
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => processSingleMember(index)}
                    disabled={!modelsLoaded || member.status === 'processing'}
                  >
                    {member.status === 'processing' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : member.status === 'success' ? (
                      'Reprocesar'
                    ) : member.status === 'error' ? (
                      'Reintentar'
                    ) : (
                      'Procesar'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Debug Info */}
        {overallStatus === 'complete' && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado del procesamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono">
                {members.map((member) => (
                  <div key={member.email} className="flex items-center gap-2">
                    {getStatusIcon(member.status)}
                    <span className="text-muted-foreground">{member.email}:</span>
                    {member.status === 'success' && member.embedding ? (
                      <span className="text-green-500">
                        [{member.embedding.slice(0, 3).map(n => n.toFixed(4)).join(', ')}...] 
                        ({member.embedding.length}D)
                      </span>
                    ) : (
                      <span className="text-red-500">{member.errorMessage || 'Pendiente'}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
