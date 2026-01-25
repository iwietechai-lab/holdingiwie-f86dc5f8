import { useState, useCallback } from 'react';
import { Play, Pause, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { NotificationSound, SOUND_CATEGORIES, CATEGORY_ICONS, SoundCategory } from '@/types/notification-sounds';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface SoundLibraryPickerProps {
  sounds: NotificationSound[];
  selectedSoundId: string | null;
  onSelectSound: (soundId: string) => void;
}

export function SoundLibraryPicker({
  sounds,
  selectedSoundId,
  onSelectSound,
}: SoundLibraryPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const { previewSound, stopPreview } = useNotificationSound();

  const filteredSounds = sounds.filter((sound) =>
    sound.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sound.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const soundsByCategory = SOUND_CATEGORIES.reduce((acc, category) => {
    acc[category] = filteredSounds.filter((s) => s.category === category);
    return acc;
  }, {} as Record<SoundCategory, NotificationSound[]>);

  const handlePlaySound = useCallback(
    (sound: NotificationSound) => {
      if (playingSoundId === sound.id) {
        stopPreview();
        setPlayingSoundId(null);
      } else {
        stopPreview();
        previewSound(sound.file_path);
        setPlayingSoundId(sound.id);
        // Auto-stop after a few seconds
        setTimeout(() => {
          setPlayingSoundId((current) => (current === sound.id ? null : current));
        }, 3000);
      }
    },
    [playingSoundId, previewSound, stopPreview]
  );

  const handleSelectSound = useCallback(
    (soundId: string) => {
      onSelectSound(soundId);
    },
    [onSelectSound]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar sonidos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <Accordion type="multiple" defaultValue={SOUND_CATEGORIES as unknown as string[]} className="w-full">
          {SOUND_CATEGORIES.map((category) => {
            const categorySounds = soundsByCategory[category];
            if (categorySounds.length === 0) return null;

            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[category]}</span>
                    <span className="font-medium">{category}</span>
                    <span className="text-xs text-muted-foreground">
                      ({categorySounds.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-1 py-1">
                    {categorySounds.map((sound) => (
                      <div
                        key={sound.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2 transition-colors',
                          selectedSoundId === sound.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <button
                          onClick={() => handleSelectSound(sound.id)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          {selectedSoundId === sound.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                          <span
                            className={cn(
                              'text-sm',
                              selectedSoundId === sound.id
                                ? 'font-medium text-primary'
                                : 'text-foreground'
                            )}
                          >
                            {sound.display_name}
                          </span>
                          {sound.is_default && (
                            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                              Por defecto
                            </span>
                          )}
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePlaySound(sound)}
                        >
                          {playingSoundId === sound.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
