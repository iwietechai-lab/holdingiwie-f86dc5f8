import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Mail, Lock, Eye, EyeOff, Sparkles, Shield, MapPin, Clock, Fingerprint, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FaceRecognition } from '@/components/FaceRecognition';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';
import earthImage from '@/assets/tierra_desde_espacio.jpg';

type LoginStep = 'credentials' | 'face-recognition';

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
  const { login, isAuthenticated, isLoading: authLoading } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

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
      setStep('face-recognition');
    } else {
      toast({
        title: 'Error de autenticación',
        description: result.error || 'Credenciales inválidas',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
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

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Branding with Earth Background (50%) */}
      <div className="relative w-full lg:w-1/2 h-[50vh] lg:h-full flex flex-col items-center justify-center overflow-hidden">
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
        <div className="relative z-10 text-center space-y-6 lg:space-y-8 animate-slide-up px-4">
          {/* Logo Icon */}
          <div className="mx-auto w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center neon-glow animate-pulse-glow border border-primary/30">
            <Rocket className="w-10 h-10 lg:w-14 lg:h-14 text-primary" />
          </div>
          
          {/* Company Name */}
          <div className="space-y-1 lg:space-y-2">
            <h1 className="text-3xl lg:text-5xl font-bold neon-text tracking-wider">
              HOLDING
            </h1>
            <h2 className="text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
              IWIE
            </h2>
          </div>
          
          {/* Slogan */}
          <div className="relative">
            <p className="text-lg lg:text-xl text-foreground/90 italic font-light tracking-widest">
              "Creatividad Colaborativa"
            </p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          
          {/* Tagline */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2">
            <Satellite className="w-4 h-4 text-secondary" />
            <p className="text-xs lg:text-sm">
              Drones · IA · Energía · Agro · Aeroespacial
            </p>
          </div>
        </div>
        
        {/* Floating decorative elements */}
        <div className="absolute bottom-10 left-10 w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 blur-xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/4 right-10 w-10 h-10 rounded-full bg-gradient-to-br from-secondary/15 to-accent/15 blur-lg animate-float" style={{ animationDelay: '3s' }} />
      </div>
      
      {/* Right Side - Login Form (50%) */}
      <div className="relative w-full lg:w-1/2 h-[50vh] lg:h-full flex flex-col items-center justify-center overflow-hidden">
        {/* Background with subtle animation */}
        <div 
          className="absolute inset-0 animate-earth-drift opacity-30"
          style={{
            backgroundImage: `url(${earthImage})`,
            backgroundSize: '150%',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm" />
        
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
        
        {/* Form Card */}
        <Card className="relative z-10 w-full max-w-md glass-effect gradient-border animate-slide-up">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center neon-glow-blue border border-secondary/30">
              <Shield className="w-7 h-7 text-secondary" />
            </div>
            <CardTitle className="text-xl lg:text-2xl font-bold text-foreground">
              {step === 'credentials' ? 'Acceso Seguro a IWIE Holding' : 'Verificación Facial'}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {step === 'credentials' 
                ? 'Ingresa tus credenciales para acceder al sistema'
                : 'Verificación de identidad requerida para continuar'
              }
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
                      placeholder="mauricio@iwie.space"
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
            ) : (
              <FaceRecognition
                onSuccess={handleFaceRecognitionSuccess}
                onCancel={handleFaceRecognitionCancel}
              />
            )}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <p className="relative z-10 text-xs text-muted-foreground/50 mt-6 text-center">
          © 2024 IWIE Holding. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
