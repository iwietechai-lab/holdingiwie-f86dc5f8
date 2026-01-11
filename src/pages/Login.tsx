import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Mail, Lock, Eye, EyeOff, Sparkles, Shield, MapPin, Clock, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpaceBackground } from '@/components/SpaceBackground';
import { FaceRecognition } from '@/components/FaceRecognition';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type LoginStep = 'credentials' | 'face-recognition';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <SpaceBackground />
      
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative z-10">
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 text-4xl animate-float opacity-50">🚀</div>
        <div className="absolute bottom-20 right-20 text-3xl animate-float opacity-40" style={{ animationDelay: '1s' }}>🛸</div>
        <div className="absolute top-1/3 right-1/4 text-2xl animate-twinkle opacity-30">⭐</div>
        <div className="absolute bottom-1/3 left-1/4 text-2xl animate-twinkle opacity-30" style={{ animationDelay: '0.5s' }}>✨</div>
        <div className="absolute top-1/4 left-1/3 text-xl animate-twinkle opacity-20" style={{ animationDelay: '1.5s' }}>🌟</div>
        
        <div className="text-center space-y-8 animate-slide-up">
          {/* Logo Icon */}
          <div className="mx-auto w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center neon-glow animate-pulse-glow">
            <Rocket className="w-16 h-16 text-primary" />
          </div>
          
          {/* Company Name */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold neon-text tracking-wider">
              HOLDING
            </h1>
            <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
              IWIE
            </h2>
          </div>
          
          {/* Slogan */}
          <div className="relative">
            <p className="text-2xl text-muted-foreground italic font-light tracking-widest">
              "Creatividad Colaborativa"
            </p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          
          {/* Tagline */}
          <p className="text-sm text-muted-foreground/70 max-w-sm mt-8">
            Innovación en Drones • Inteligencia Artificial • Energía Sustentable • Agroindustria
          </p>
        </div>
        
        {/* Floating planets decoration */}
        <div className="absolute bottom-10 left-10 w-20 h-20 rounded-full bg-gradient-to-br from-neon-purple/30 to-neon-blue/30 blur-sm animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/4 right-10 w-12 h-12 rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 blur-sm animate-float" style={{ animationDelay: '3s' }} />
      </div>
      
      {/* Vertical Divider */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
      
      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        {/* Mobile Branding (shown only on small screens) */}
        <div className="lg:hidden text-center mb-8 animate-slide-up">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center neon-glow mb-4">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold neon-text">HOLDING IWIE</h1>
          <p className="text-sm text-muted-foreground italic">"Creatividad Colaborativa"</p>
        </div>
        
        <Card className="w-full max-w-md glass-effect gradient-border animate-slide-up">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center neon-glow-blue">
              <Shield className="w-7 h-7 text-secondary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {step === 'credentials' ? 'Acceso Seguro' : 'Verificación Facial'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 'credentials' 
                ? 'Ingresa tus credenciales para acceder al sistema'
                : 'Verificación de identidad requerida'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Security Notice */}
            {step === 'credentials' && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3 animate-slide-up">
                <div className="flex items-center gap-2 text-secondary">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-semibold">Aviso de Seguridad</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para garantizar la seguridad de la plataforma, pasarás por un proceso de validación que incluye reconocimiento facial obligatorio.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>Tu ubicación será registrada</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 text-accent" />
                    <span>Fecha y hora del acceso quedará guardada</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Fingerprint className="w-3 h-3 text-accent" />
                    <span>Reconocimiento facial requerido</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/70 pt-1">
                  Esta información se almacena para trazabilidad y auditoría de la plataforma.
                </p>
              </div>
            )}
            
            {step === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@iwie.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-input border-border focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">
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
                      className="pl-10 pr-10 bg-input border-border focus:border-primary"
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
                  className="w-full neon-glow bg-primary hover:bg-primary/80 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Sparkles className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Rocket className="w-5 h-5 mr-2" />
                  )}
                  {isLoading ? 'Verificando...' : 'Continuar'}
                </Button>
                
                <div className="text-center text-sm text-muted-foreground space-y-2 pt-2">
                  <p className="text-xs">Usuarios de demostración:</p>
                  <p className="text-[10px] leading-relaxed">
                    CEO: mauricio@iwie.com / admin123<br />
                    Manager: manager@iwie.com / demo123<br />
                    Empleado: employee@iwie.com / demo123
                  </p>
                </div>
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
        <p className="text-xs text-muted-foreground/50 mt-6 text-center">
          © 2024 IWIE Holding. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
