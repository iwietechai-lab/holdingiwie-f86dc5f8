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

import earthImage from '@/assets/tierra_desde_espacio.jpg';
import { isMobileDevice, isRunningAsApp } from '@/utils/deviceDetection';
type LoginStep = 'credentials' | 'register' | 'profile-setup' | 'face-recognition' | 'forgot-password' | 'reset-password';

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
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Check for password recovery flow from URL hash or query params
  useEffect(() => {
    const checkPasswordRecovery = async () => {
      // Check URL hash for recovery tokens (Supabase redirects with hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // Also check query params (some flows use query params)
      const queryParams = new URLSearchParams(window.location.search);
      const queryType = queryParams.get('type');
      const error = queryParams.get('error');
      const errorDescription = queryParams.get('error_description');
      
      // Handle error cases (expired link, etc.)
      if (error) {
        console.log('Auth error:', error, errorDescription);
        toast({
          title: 'Error',
          description: errorDescription || 'El enlace ha expirado o es inválido. Solicita uno nuevo.',
          variant: 'destructive',
        });
        setStep('forgot-password');
        // Clean URL
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      
      if ((type === 'recovery' && accessToken) || queryType === 'recovery') {
        console.log('Password recovery detected from URL');
        setIsPasswordRecovery(true);
        setStep('reset-password');
        return;
      }

      // Listen for PASSWORD_RECOVERY event from Supabase
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change:', event);
        if (event === 'PASSWORD_RECOVERY') {
          console.log('PASSWORD_RECOVERY event detected');
          setIsPasswordRecovery(true);
          setStep('reset-password');
        }
      });

      return () => subscription.unsubscribe();
    };

    checkPasswordRecovery();
  }, [toast]);

  // Redirect if already authenticated and has profile (but NOT during password recovery)
  useEffect(() => {
    if (isAuthenticated && !authLoading && profile && !isPasswordRecovery && step !== 'reset-password') {
      // If on mobile and not running as app, redirect to IwieChat
      if (isMobileDevice() && !isRunningAsApp()) {
        navigate('/iwiechat');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, authLoading, profile, navigate, isPasswordRecovery, step]);

  // Check if user needs profile setup after login (but NOT during password recovery)
  useEffect(() => {
    const checkProfileExists = async () => {
      if (isAuthenticated && user && step === 'credentials' && !pendingProfileCheck && !isPasswordRecovery) {
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
            // If profile check fails, go to profile setup
            setStep('profile-setup');
            setPendingProfileCheck(false);
            return;
          }

          // Check profile completeness

          if (!existingProfile) {
            // New user - needs profile setup
            setStep('profile-setup');
          } else if (existingProfile.full_name && existingProfile.full_name.trim() !== '') {
            // Existing user with complete profile - proceed to face recognition
            setStep('face-recognition');
          } else {
            // Existing user but incomplete profile - needs setup
            setStep('profile-setup');
          }
        } catch (err) {
          console.error('Profile check error:', err);
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
    
    // If on mobile and not running as app, redirect to IwieChat
    if (isMobileDevice() && !isRunningAsApp()) {
      navigate('/iwiechat');
    } else {
      navigate('/dashboard');
    }
  };

  const handleFaceRecognitionCancel = () => {
    setStep('credentials');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Error',
        description: 'Por favor, ingresa tu correo electrónico',
        variant: 'destructive',
      });
      return;
    }

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
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: '¡Correo enviado!',
        description: 'Revisa tu bandeja de entrada para restablecer tu contraseña',
      });
    }
    
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Por favor, completa todos los campos',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Contraseña actualizada!',
        description: 'Tu contraseña ha sido cambiada exitosamente',
      });
      // Clear recovery state and go to credentials
      setIsPasswordRecovery(false);
      setNewPassword('');
      setConfirmPassword('');
      setStep('credentials');
      // Clear URL hash
      window.history.replaceState(null, '', window.location.pathname);
    }
    
    setIsLoading(false);
  };

  if (authLoading && !isPasswordRecovery) {
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
              {step === 'forgot-password' && 'Recuperar Contraseña'}
              {step === 'reset-password' && 'Nueva Contraseña'}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {step === 'credentials' && 'Ingresa tus credenciales para acceder al sistema'}
              {step === 'register' && 'Crea tu cuenta con un correo autorizado'}
              {step === 'face-recognition' && 'Verificación de identidad requerida para continuar'}
              {step === 'forgot-password' && 'Te enviaremos un enlace para restablecer tu contraseña'}
              {step === 'reset-password' && 'Ingresa tu nueva contraseña'}
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

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setResetEmailSent(false); setStep('forgot-password'); }}
                      className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
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
            ) : step === 'forgot-password' ? (
              <div className="space-y-5">
                {resetEmailSent ? (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">¡Correo enviado!</h3>
                    <p className="text-sm text-muted-foreground">
                      Revisa tu bandeja de entrada en <span className="font-medium text-foreground">{email}</span> para restablecer tu contraseña.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 mt-4"
                      onClick={() => { setResetEmailSent(false); setStep('credentials'); }}
                    >
                      Volver al inicio de sesión
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-foreground text-sm">
                        Correo Electrónico
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="tu.email@iwie.space"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-input border-border focus:border-primary h-11"
                          autoComplete="email"
                        />
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
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5 mr-2" />
                          Enviar enlace de recuperación
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setStep('credentials')}
                    >
                      Volver al inicio de sesión
                    </Button>
                  </form>
                )}
              </div>
            ) : step === 'reset-password' ? (
              <div className="space-y-5">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-semibold">Restablecer Contraseña</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ingresa y confirma tu nueva contraseña. Debe tener al menos 6 caracteres.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-foreground text-sm">
                      Nueva Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-10 bg-input border-border focus:border-primary h-11"
                        autoComplete="new-password"
                        minLength={6}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-foreground text-sm">
                      Confirmar Contraseña
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 bg-input border-border focus:border-primary h-11"
                        autoComplete="new-password"
                        minLength={6}
                      />
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
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Actualizar Contraseña
                      </>
                    )}
                  </Button>
                </form>
              </div>
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
