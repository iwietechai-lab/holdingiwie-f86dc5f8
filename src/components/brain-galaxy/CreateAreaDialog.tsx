import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Palette } from 'lucide-react';

const AREA_ICONS = ['📚', '💼', '💰', '⚙️', '⚖️', '🏢', '🌾', '🚁', '🤖', '📊', '🔬', '🎨', '📈', '🏗️', '💡'];
const AREA_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16'
];

interface CreateAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateArea: (area: { name: string; description: string; icon: string; color: string }) => Promise<boolean>;
}

export function CreateAreaDialog({ open, onOpenChange, onCreateArea }: CreateAreaDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(AREA_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(AREA_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setIsCreating(true);
    const success = await onCreateArea({
      name: name.trim(),
      description: description.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });
    setIsCreating(false);
    
    if (success) {
      setName('');
      setDescription('');
      setSelectedIcon(AREA_ICONS[0]);
      setSelectedColor(AREA_COLORS[0]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nueva Área</DialogTitle>
          <DialogDescription>
            Crea un área de conocimiento personalizada para organizar tu aprendizaje
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="area-name">Nombre del Área</Label>
            <Input
              id="area-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Marketing Digital"
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="area-description">Descripción (opcional)</Label>
            <Textarea
              id="area-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el enfoque de esta área..."
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {AREA_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-10 h-10 flex items-center justify-center text-xl rounded-md border-2 transition-all ${
                    selectedIcon === icon
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent bg-muted hover:bg-muted/80'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {AREA_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${selectedColor}20` }}
            >
              {selectedIcon}
            </div>
            <div>
              <p className="font-medium">{name || 'Nombre del área'}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {description || 'Sin descripción'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Área'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
