import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Mail, Lock, Eye, EyeOff, Sparkles, Shield, MapPin, Clock, Fingerprint, Satellite, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RealFaceRecognition } from '@/components/RealFaceRecognition';
import { RegisterForm } from '@/components/RegisterForm';
import { ProfileSetupForm } from '@/components/ProfileSetupForm';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { SUPERADMIN_USER_ID } from '@/types/superadmin';
import earthImage from '@/assets/tierra_desde_espacio.jpg';

type LoginStep = 'credentials' | 'register' | 'profile-setup' | 'face-recognition';

// Animated stars component
const AnimatedStars = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: Math.random() * 0.7 + 0.3,
          }}
        />
      ))}
      {/* Floating rockets */}
      <div className="absolute top-[15%] left-[10%] text-2xl animate-float opacity-40" style={{ animationDelay: '0s' }}>🚀</div>
      <div className="absolute top-[60%] right-[15%] text-xl animate-float opacity-30" style={{ animationDelay: '2s' }}>🛸</div>
      <div className="absolute bottom-[20%] left-[20%] text-lg animate-float opacity-25" style={{ animationDelay: '4s' }}>🛰️</div>
    </div>
  );
};

export const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading, user, profile } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingProfileCheck, setPendingProfileCheck] = useState(false);

  // Redirect if already authenticated and has profile
  useEffect(() => {
    if (isAuthenticated && !authLoading && profile) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, profile, navigate]);

  // Check if user needs profile setup after login
  useEffect(() => {
    const checkProfileExists = async () => {
      if (isAuthenticated && user && step === 'credentials' && !pendingProfileCheck) {
        setPendingProfileCheck(true);
        
        try {
          // Direct query for user profile
          const { data: existingProfile, error } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error checking profile:', error);
            // If there's an error, check if it's the superadmin by UUID
            if (user.id === SUPERADMIN_USER_ID) {
              console.log('Superadmin detected, skipping to face recognition');
              setStep('face-recognition');
              setPendingProfileCheck(false);
              return;
            }
            setStep('profile-setup');
            setPendingProfileCheck(false);
            return;
          }

          // Check if profile is complete enough to skip setup
          const profileIsComplete = existingProfile && 
            existingProfile.full_name && 
            existingProfile.full_name.trim() !== '';

          // Superadmin always skips profile setup if they have any profile data
          if (user.id === SUPERADMIN_USER_ID && existingProfile) {
            console.log('Superadmin with existing profile, skipping to face recognition');
            setStep('face-recognition');
          } else if (!existingProfile) {
            // New user - needs profile setup
            setStep('profile-setup');
          } else if (profileIsComplete) {
            // Existing user with complete profile - proceed to face recognition
            setStep('face-recognition');
          } else {
            // Existing user but incomplete profile - needs setup
            setStep('profile-setup');
          }
        } catch (err) {
          console.error('Profile check error:', err);
          // On error, if it's superadmin, skip to face recognition
          if (user.id === SUPERADMIN_USER_ID) {
            setStep('face-recognition');
          }
        }
        
        setPendingProfileCheck(false);
      }
    };

    checkProfileExists();
  }, [isAuthenticated, user, step, pendingProfileCheck]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Por favor, completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Error',
        description: 'Por favor, ingresa un correo válido',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      // Profile check will be handled by useEffect
    } else {
      toast({
        title: 'Error de autenticación',
        description: result.error || 'Credenciales inválidas',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  const handleRegisterSuccess = async (regEmail: string, regPassword: string) => {
    // Auto-login after registration
    setIsLoading(true);
    const result = await login(regEmail, regPassword);
    
    if (result.success) {
      // Will trigger profile setup via useEffect
      setEmail(regEmail);
    } else {
      toast({
        title: 'Error',
        description: 'Registro exitoso. Por favor, inicia sesión manualmente.',
        variant: 'destructive',
      });
      setStep('credentials');
    }
    setIsLoading(false);
  };

  const handleProfileSetupComplete = () => {
    setStep('face-recognition');
  };

  const handleFaceRecognitionSuccess = () => {
    toast({
      title: '¡Bienvenido!',
      description: 'Acceso concedido al sistema IWIE',
    });
    navigate('/dashboard');
  };

  const handleFaceRecognitionCancel = () => {
    setStep('credentials');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Rocket className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show profile setup form
  if (step === 'profile-setup' && user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div 
          className="absolute inset-0 animate-earth-drift"
          style={{
            backgroundImage: `url(${earthImage})`,
            backgroundSize: '120%',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-black/70" />
        <AnimatedStars />
        
        <div className="relative z-10 p-4">
          <ProfileSetupForm
            userId={user.id}
            email={user.email || email}
            onComplete={handleProfileSetupComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Branding with Earth Background (hidden on mobile, 50% on desktop) */}
      <div className="hidden lg:flex relative lg:w-1/2 h-full flex-col items-center justify-center overflow-hidden">
        {/* Animated Earth Background */}
        <div 
          className="absolute inset-0 animate-earth-drift"
          style={{
            backgroundImage: `url(${earthImage})`,
            backgroundSize: '120%',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Animated stars */}
        <AnimatedStars />
        
        {/* Content */}
        <div className="relative z-10 text-center space-y-4 animate-slide-up px-4">
          {/* Logo Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center neon-glow animate-pulse-glow border border-primary/30">
            <Rocket className="w-10 h-10 text-primary" />
          </div>
          
          {/* Company Name */}
          <div className="space-y-1">
            <h1 className="text-4xl font-bold neon-text tracking-wider">
              HOLDING
            </h1>
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
              IWIE
            </h2>
          </div>
          
          {/* Slogan */}
          <div className="relative">
            <p className="text-lg text-foreground/90 italic font-light tracking-widest">
              "Creatividad Colaborativa"
            </p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          
          {/* Tagline */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2">
            <Satellite className="w-4 h-4 text-secondary" />
            <p className="text-xs">
              Drones · IA · Energía · Agro · Aeroespacial
            </p>
          </div>
        </div>
        
        {/* Floating decorative elements */}
        <div className="absolute bottom-10 left-10 w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 blur-xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/4 right-10 w-10 h-10 rounded-full bg-gradient-to-br from-secondary/15 to-accent/15 blur-lg animate-float" style={{ animationDelay: '3s' }} />
      </div>
      
      {/* Right Side - Login/Register Form (100% on mobile, 50% on desktop) */}
      <div className="relative w-full lg:w-1/2 h-full flex flex-col items-center justify-center overflow-hidden p-4 lg:p-6">
        {/* Background with subtle animation */}
        <div 
          className="absolute inset-0 animate-earth-drift opacity-50 lg:opacity-30"
          style={{
            backgroundImage: `url(${earthImage})`,
            backgroundSize: '150%',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-background/90 lg:bg-background/95 backdrop-blur-sm" />
        
        {/* Subtle stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-primary rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Mobile Header - Only visible on mobile */}
        <div className="lg:hidden relative z-10 text-center mb-4 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold neon-text tracking-wider">HOLDING IWIE</h1>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">"Creatividad Colaborativa"</p>
        </div>
        
        {/* Form Card */}
        <Card className="relative z-10 w-full max-w-md glass-effect gradient-border animate-slide-up max-h-[85vh] lg:max-h-[90vh] overflow-y-auto">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center neon-glow-blue border border-secondary/30">
              <Shield className="w-7 h-7 text-secondary" />
            </div>
            <CardTitle className="text-xl lg:text-2xl font-bold text-foreground">
              {step === 'credentials' && 'Acceso Seguro a IWIE Holding'}
              {step === 'register' && 'Registro de Nuevo Usuario'}
              {step === 'face-recognition' && 'Verificación Facial'}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {step === 'credentials' && 'Ingresa tus credenciales para acceder al sistema'}
              {step === 'register' && 'Crea tu cuenta con un correo autorizado'}
              {step === 'face-recognition' && 'Verificación de identidad requerida para continuar'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5">
            {/* Security Notice */}
            {step === 'credentials' && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-secondary">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-semibold">Aviso de Seguridad</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para garantizar la seguridad de la plataforma, pasarás por un proceso de validación que incluye reconocimiento facial obligatorio.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3 h-3 text-accent" />
                    </div>
                    <span>Tu ubicación será registrada</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-3 h-3 text-accent" />
                    </div>
                    <span>Fecha y hora del acceso quedará guardada</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Fingerprint className="w-3 h-3 text-accent" />
                    </div>
                    <span>Reconocimiento facial requerido</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/70 pt-2 border-t border-border/30">
                  Esta información se almacena para trazabilidad y auditoría de la plataforma.
                </p>
              </div>
            )}
            
            {step === 'credentials' ? (
              <>
                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground text-sm">
                      Correo Electrónico
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu.email@iwie.space"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-input border-border focus:border-primary h-11"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground text-sm">
                      Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 bg-input border-border focus:border-primary h-11"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 neon-glow bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-spin mr-2" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-5 h-5 mr-2" />
                        Continuar con Reconocimiento Facial
                      </>
                    )}
                  </Button>
                </form>

                {/* Register Link */}
                <div className="pt-4 border-t border-border/50 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    ¿No tienes cuenta?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => setStep('register')}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Registrarse
                  </Button>
                </div>
              </>
            ) : step === 'register' ? (
              <RegisterForm
                onBack={() => setStep('credentials')}
                onSuccess={handleRegisterSuccess}
              />
            ) : null}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <p className="relative z-10 text-xs text-muted-foreground/50 mt-6 text-center">
          © 2026 IWIE Holding. Todos los derechos reservados.
        </p>
      </div>
      
      {/* Face Recognition Overlay - Full Screen */}
      {step === 'face-recognition' && user && (
        <RealFaceRecognition
          userId={user.id}
          onSuccess={handleFaceRecognitionSuccess}
          onCancel={handleFaceRecognitionCancel}
        />
      )}
    </div>
  );
};

export default Login;
