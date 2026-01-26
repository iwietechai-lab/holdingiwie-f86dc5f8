import React, { useState } from 'react';
import { Tarea, TareaArea } from '@/hooks/useAITareas';
import { PRIORITY_CONFIG, TaskPriority } from '@/types/ai-tareas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, CheckSquare, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: TareaArea[];
  defaultPriority: TaskPriority;
  onCreateTask: (task: Partial<Tarea>) => Promise<Tarea | null>;
  onCreateArea: (name: string, color?: string) => Promise<TareaArea | null>;
  remainingTasks: number;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  areas,
  defaultPriority,
  onCreateTask,
  onCreateArea,
  remainingTasks,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [areaId, setAreaId] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [plannedTime, setPlannedTime] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState('#6366f1');
  const [showNewArea, setShowNewArea] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority(defaultPriority);
    setAreaId('');
    setEstimatedHours('');
    setPlannedTime('');
    setNewAreaName('');
    setNewAreaColor('#6366f1');
    setShowNewArea(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    try {
      let finalAreaId = areaId;

      if (showNewArea && newAreaName.trim()) {
        const newArea = await onCreateArea(newAreaName.trim(), newAreaColor);
        if (newArea) {
          finalAreaId = newArea.id;
        }
      }

      await onCreateTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        area_id: finalAreaId || undefined,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        planned_time: plannedTime || undefined,
        date_for: new Date().toISOString().split('T')[0],
      });

      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            Nueva Tarea
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {remainingTasks <= 5 && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              remainingTasks <= 0 
                ? "bg-red-500/20 text-red-500" 
                : "bg-yellow-500/20 text-yellow-700"
            )}>
              {remainingTasks <= 0 
                ? "⚠️ Has alcanzado el límite de 15 tareas nuevas hoy"
                : `✨ Te quedan ${remainingTasks} tareas nuevas para hoy`
              }
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título de la tarea *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué necesitas hacer?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Prioridad</Label>
            <div className="flex gap-2">
              {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => {
                const config = PRIORITY_CONFIG[p];
                return (
                  <Button
                    key={p}
                    type="button"
                    variant={priority === p ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "flex-1",
                      priority === p && config.bgColor
                    )}
                    onClick={() => setPriority(p)}
                  >
                    {config.icon} {config.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Área</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewArea(!showNewArea)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva área
              </Button>
            </div>

            {showNewArea ? (
              <div className="flex gap-2">
                <Input
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Nombre del área"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="color"
                    value={newAreaColor}
                    onChange={(e) => setNewAreaColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                </div>
              </div>
            ) : (
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: area.color }}
                        />
                        {area.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Horas estimadas</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="Ej: 2.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora planificada</Label>
              <Input
                id="time"
                type="time"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || isSubmitting || remainingTasks <= 0}
          >
            ✨ Crear Tarea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
