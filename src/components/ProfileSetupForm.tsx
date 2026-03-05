import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { User, Lock, Eye, EyeOff, Sparkles, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface ProfileSetupFormProps {
  userId: string;
  email: string;
  onComplete: () => void;
}

interface EmailConfig {
  allowed: boolean;
  role?: string;
  company_id?: string;
  department?: string;
}

export const ProfileSetupForm = ({ userId, email, onComplete }: ProfileSetupFormProps) => {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [firstLastName, setFirstLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.rpc('check_email_allowed', { p_email: email });
      if (data) setEmailConfig(data as unknown as EmailConfig);
    };
    fetchConfig();
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !firstLastName || !secondLastName) {
      toast({
        title: 'Error',
        description: 'Por favor, completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      toast({
        title: 'Error',
        description: 'Debes establecer una nueva contraseña',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
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

    setIsLoading(true);

    try {
      const fullNameParts = [firstName, secondName, firstLastName, secondLastName].filter(Boolean);
      const fullName = fullNameParts.join(' ');

      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: userId,
        full_name: fullName,
        email: email,
        role: emailConfig?.role || 'Usuario',
        company_id: emailConfig?.company_id || 'iwie-holding',
        department: emailConfig?.department || 'General',
      });

      if (profileError) {
        throw profileError;
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) {
        throw passwordError;
      }

      toast({
        title: '¡Perfil creado!',
        description: 'Tu perfil ha sido configurado correctamente.',
      });

      onComplete();
    } catch (error: any) {
      logger.error('Profile setup error:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el perfil',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg glass-effect gradient-border mx-4">
      <CardHeader className="text-center space-y-2 px-4 sm:px-6">
        <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
          <User className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
        </div>
        <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
          Configuración de Perfil
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs sm:text-sm">
          Completa tu información y establece tu contraseña permanente
        </CardDescription>
        {emailConfig?.allowed && (
          <div className="text-xs text-secondary bg-secondary/10 rounded-lg p-2">
            Rol asignado: <span className="font-semibold">{emailConfig.role}</span> en{' '}
            <span className="font-semibold">{emailConfig.company_id}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-foreground text-sm">
                Primer Nombre *
              </Label>
              <Input
                id="firstName"
                placeholder="Nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-input border-border focus:border-primary h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondName" className="text-foreground text-sm">
                Segundo Nombre
              </Label>
              <Input
                id="secondName"
                placeholder="Opcional"
                value={secondName}
                onChange={(e) => setSecondName(e.target.value)}
                className="bg-input border-border focus:border-primary h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstLastName" className="text-foreground text-sm">
                Primer Apellido *
              </Label>
              <Input
                id="firstLastName"
                placeholder="Apellido"
                value={firstLastName}
                onChange={(e) => setFirstLastName(e.target.value)}
                className="bg-input border-border focus:border-primary h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondLastName" className="text-foreground text-sm">
                Segundo Apellido *
              </Label>
              <Input
                id="secondLastName"
                placeholder="Apellido"
                value={secondLastName}
                onChange={(e) => setSecondLastName(e.target.value)}
                className="bg-input border-border focus:border-primary h-10"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 space-y-3">
            <p className="text-sm text-muted-foreground">
              Establece tu contraseña permanente:
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-foreground text-sm">
                Nueva Contraseña *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 bg-input border-border focus:border-primary h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmNewPassword" className="text-foreground text-sm">
                Confirmar Contraseña *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="pl-10 pr-10 bg-input border-border focus:border-primary h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 neon-glow bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold mt-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Guardar y Continuar
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};