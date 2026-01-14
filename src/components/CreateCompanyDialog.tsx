import { useState } from 'react';
import { Building2, Plus, Palette } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (company: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    description?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const EMOJI_OPTIONS = ['🏢', '🚀', '🏭', '💼', '🌐', '⚡', '🎯', '🔧', '📊', '🎓', '🌾', '🚗', '🛒', '📱', '🏥'];

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onSave,
}: CreateCompanyDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏢');
  const [color, setColor] = useState('hsl(220, 70%, 55%)');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const generateId = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    const result = await onSave({
      id: generateId(name),
      name: name.trim(),
      icon,
      color,
      description: description.trim() || undefined,
    });

    setIsSaving(false);
    
    if (result.success) {
      // Reset form
      setName('');
      setIcon('🏢');
      setColor('hsl(220, 70%, 55%)');
      setDescription('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Nueva Empresa
          </DialogTitle>
          <DialogDescription>
            Crea una nueva empresa para asignar usuarios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Empresa *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: IWIE Solutions"
            />
          </div>

          <div className="space-y-2">
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                    icon === emoji 
                      ? 'bg-primary/20 ring-2 ring-primary' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Color de la Empresa
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color.startsWith('hsl') ? '#5588dd' : color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 rounded cursor-pointer border-0"
              />
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="hsl(220, 70%, 55%) o #hex"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción de la empresa..."
              rows={3}
            />
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-medium" style={{ color }}>
                  {name || 'Nombre de la Empresa'}
                </p>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              'Creando...'
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Crear Empresa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
