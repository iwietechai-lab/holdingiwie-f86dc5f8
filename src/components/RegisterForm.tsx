import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface RegisterFormProps {
  onBack: () => void;
  onSuccess: (email: string, password: string) => void;
}

export const RegisterForm = ({ onBack, onSuccess }: RegisterFormProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Por favor, completa todos los campos',
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

    // Check if email is allowed via secure RPC
    const { data: checkResult, error: checkError } = await supabase.rpc('check_email_allowed', {
      p_email: email,
    });

    const result = checkResult as unknown as { allowed: boolean; role?: string; company_id?: string };

    if (checkError || !result?.allowed) {
      toast({
        title: 'Correo no autorizado',
        description: 'Correo no autorizado. Contacta al administrador.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            role: result.role,
            company_id: result.company_id,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast({
            title: 'Usuario existente',
            description: 'Este correo ya está registrado. Por favor, inicia sesión.',
            variant: 'destructive',
          });
          onBack();
          return;
        }
        throw signUpError;
      }

      toast({
        title: '¡Registro exitoso!',
        description: 'Ahora procederemos con tu primer inicio de sesión.',
      });

      onSuccess(email, password);
    } catch (error: any) {
      toast({
        title: 'Error de registro',
        description: error.message || 'No se pudo completar el registro',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="reg-email" className="text-foreground text-sm">
          Correo Electrónico
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="reg-email"
            type="email"
            placeholder="tu.email@iwie.space"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 bg-input border-border focus:border-primary h-11"
            autoComplete="email"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Solo correos autorizados pueden registrarse
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password" className="text-foreground text-sm">
          Contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10 bg-input border-border focus:border-primary h-11"
            autoComplete="new-password"
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
        <Label htmlFor="reg-confirm-password" className="text-foreground text-sm">
          Confirmar Contraseña
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="reg-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10 pr-10 bg-input border-border focus:border-primary h-11"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 neon-glow bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin mr-2" />
              Registrando...
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 mr-2" />
              Registrarse
            </>
          )}
        </Button>
      </div>
    </form>
  );
};