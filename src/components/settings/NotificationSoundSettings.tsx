import { useState } from 'react';
import { Bell, MessageSquare, Video, Ticket, FileText, Volume2, Play, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SoundLibraryPicker } from './SoundLibraryPicker';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { NotificationType, NOTIFICATION_TYPE_LABELS } from '@/types/notification-sounds';
import { toast } from 'sonner';

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  message: MessageSquare,
  meeting: Video,
  ticket: Ticket,
  document: FileText,
  general: Bell,
};

const NOTIFICATION_DESCRIPTIONS: Record<NotificationType, string> = {
  message: 'Nuevos mensajes de chat y conversaciones',
  meeting: 'Invitaciones y recordatorios de reuniones',
  ticket: 'Actualizaciones de tickets y asignaciones',
  document: 'Documentos compartidos y solicitudes de acceso',
  general: 'Otras notificaciones del sistema',
};

export function NotificationSoundSettings() {
  const {
    preferences,
    sounds,
    isLoading,
    getPreferenceForType,
    getSoundForType,
    updatePreference,
  } = useNotificationPreferences();
  const { previewSound } = useNotificationSound();
  const [openDialogType, setOpenDialogType] = useState<NotificationType | null>(null);

  const notificationTypes: NotificationType[] = ['message', 'meeting', 'ticket', 'document', 'general'];

  const handleToggleEnabled = async (type: NotificationType, enabled: boolean) => {
    try {
      await updatePreference(type, { is_enabled: enabled });
      toast.success(enabled ? 'Sonido activado' : 'Sonido desactivado');
    } catch {
      toast.error('Error al actualizar preferencia');
    }
  };

  const handleVolumeChange = async (type: NotificationType, volume: number) => {
    try {
      await updatePreference(type, { volume });
    } catch {
      toast.error('Error al actualizar volumen');
    }
  };

  const handleSelectSound = async (type: NotificationType, soundId: string) => {
    try {
      await updatePreference(type, { sound_id: soundId });
      setOpenDialogType(null);
      toast.success('Sonido seleccionado');
    } catch {
      toast.error('Error al seleccionar sonido');
    }
  };

  const handleTestSound = (type: NotificationType) => {
    const sound = getSoundForType(type);
    if (sound) {
      const pref = getPreferenceForType(type);
      const volume = pref?.volume ?? 70;
      const audio = new Audio(sound.file_path);
      audio.volume = volume / 100;
      audio.play().catch(console.error);
    } else {
      toast.info('No hay sonido configurado');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Volume2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Sonidos de Notificación</h2>
      </div>

      <div className="grid gap-4">
        {notificationTypes.map((type) => {
          const Icon = NOTIFICATION_ICONS[type];
          const pref = getPreferenceForType(type);
          const sound = getSoundForType(type);
          const isEnabled = pref?.is_enabled ?? true;
          const volume = pref?.volume ?? 70;

          return (
            <Card key={type} className={!isEnabled ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {NOTIFICATION_TYPE_LABELS[type]}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {NOTIFICATION_DESCRIPTIONS[type]}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleEnabled(type, checked)}
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <div className="flex flex-col gap-4">
                  {/* Sound selector */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Sonido:</Label>
                      <span className="text-sm font-medium">
                        {sound?.display_name ?? 'No seleccionado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestSound(type)}
                        disabled={!isEnabled}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Probar
                      </Button>
                      <Dialog
                        open={openDialogType === type}
                        onOpenChange={(open) => setOpenDialogType(open ? type : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={!isEnabled}>
                            <Settings2 className="h-3 w-3 mr-1" />
                            Cambiar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Seleccionar Sonido</DialogTitle>
                            <DialogDescription>
                              Elige un sonido para las notificaciones de {NOTIFICATION_TYPE_LABELS[type].toLowerCase()}
                            </DialogDescription>
                          </DialogHeader>
                          <SoundLibraryPicker
                            sounds={sounds}
                            selectedSoundId={pref?.sound_id ?? null}
                            onSelectSound={(soundId) => handleSelectSound(type, soundId)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Volume slider */}
                  <div className="flex items-center gap-4">
                    <Label className="text-sm text-muted-foreground min-w-16">
                      Volumen:
                    </Label>
                    <Slider
                      value={[volume]}
                      onValueChange={([v]) => handleVolumeChange(type, v)}
                      max={100}
                      min={0}
                      step={5}
                      disabled={!isEnabled}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {volume}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Biblioteca de Sonidos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tienes acceso a {sounds.length} sonidos organizados en 6 categorías:
                Espacial, Marca Iwie, Especial, Orbital, Ping y Starlight.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
