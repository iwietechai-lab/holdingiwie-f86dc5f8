import { Settings, Volume2, User, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { NotificationSoundSettings } from '@/components/settings/NotificationSoundSettings';

export default function ConfiguracionPage() {
  return (
    <ResponsiveLayout>
      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl py-6 px-4 md:px-6 lg:py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
              <p className="text-muted-foreground text-sm">
                Personaliza tu experiencia en IWIE
              </p>
            </div>
          </div>

          {/* Settings Tabs */}
          <Tabs defaultValue="sounds" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sounds" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="hidden sm:inline">Sonidos</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Seguridad</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sounds" className="space-y-4">
              <NotificationSoundSettings />
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Configuración de Perfil</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Próximamente podrás editar tu información personal aquí.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Configuración de Seguridad</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Próximamente podrás gestionar opciones de seguridad aquí.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
