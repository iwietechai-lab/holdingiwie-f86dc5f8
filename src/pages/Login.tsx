import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
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
      // Move to face recognition step
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <SpaceBackground />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 text-4xl animate-float opacity-50">🚀</div>
      <div className="absolute bottom-20 right-20 text-3xl animate-float opacity-40" style={{ animationDelay: '1s' }}>🛸</div>
      <div className="absolute top-1/3 right-1/4 text-2xl animate-twinkle opacity-30">⭐</div>
      <div className="absolute bottom-1/3 left-1/4 text-2xl animate-twinkle opacity-30" style={{ animationDelay: '0.5s' }}>✨</div>
      
      <Card className="w-full max-w-md glass-effect gradient-border animate-slide-up">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center neon-glow">
            <Rocket className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold neon-text">
            IWIE Holding
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === 'credentials' 
              ? 'Ingresa tus credenciales para acceder'
              : 'Verificación de identidad requerida'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6">
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
                {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>Usuarios de demostración:</p>
                <p className="text-xs">
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
    </div>
  );
};

export default Login;
