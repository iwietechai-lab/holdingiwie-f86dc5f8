import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tarea, TareaArea } from '@/hooks/useAITareas';
import { PRIORITY_CONFIG, ENERGY_EMOJIS } from '@/types/ai-tareas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  GripVertical, 
  MoreHorizontal, 
  Target, 
  Trash2, 
  Edit,
  Zap,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Tarea;
  areas: TareaArea[];
  onUpdate: (id: string, updates: Partial<Tarea>) => Promise<Tarea | null>;
  onComplete: (id: string, energyLevel?: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetFocus: (data: { description: string; solution: string }) => Promise<void>;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  areas,
  onUpdate,
  onComplete,
  onDelete,
  onSetFocus,
  isDragging = false,
}: TaskCardProps) {
  const [showEnergyDialog, setShowEnergyDialog] = useState(false);
  const [showFocusDialog, setShowFocusDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEnergy, setSelectedEnergy] = useState<number | undefined>();
  const [focusDescription, setFocusDescription] = useState(task.focus_description || '');
  const [focusSolution, setFocusSolution] = useState(task.focus_solution || '');
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const area = task.area || areas.find(a => a.id === task.area_id);
  const isCarriedOver = task.original_date && task.original_date !== task.date_for;

  const handleComplete = () => {
    setShowEnergyDialog(true);
  };

  const confirmComplete = () => {
    onComplete(task.id, selectedEnergy);
    setShowEnergyDialog(false);
    setSelectedEnergy(undefined);
  };

  const handleSetFocus = () => {
    onSetFocus({ description: focusDescription, solution: focusSolution });
    setShowFocusDialog(false);
  };

  const handleEdit = () => {
    onUpdate(task.id, { title: editTitle, description: editDescription });
    setShowEditDialog(false);
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "cursor-grab active:cursor-grabbing transition-all duration-200",
          isDragging || isSortableDragging ? "opacity-50 scale-105 shadow-xl" : "hover:shadow-md",
          task.is_focus_mission && "ring-2 ring-primary ring-offset-2 bg-primary/5",
          isCarriedOver && "border-l-4 border-l-yellow-500"
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div
              {...attributes}
              {...listeners}
              className="mt-1 text-muted-foreground hover:text-foreground cursor-grab"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={() => handleComplete()}
              className="mt-1"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {task.is_focus_mission && (
                    <Badge variant="default" className="mb-1 gap-1 bg-primary">
                      <Target className="w-3 h-3" />
                      Tarea del Día
                    </Badge>
                  )}
                  <h4 className={cn(
                    "font-medium text-sm leading-tight",
                    task.status === 'completed' && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {!task.is_focus_mission && (
                      <DropdownMenuItem onClick={() => setShowFocusDialog(true)}>
                        <Target className="w-4 h-4 mr-2" />
                        Marcar como Focus
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(task.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {area && (
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: area.color,
                      backgroundColor: `${area.color}20`
                    }}
                  >
                    {area.name}
                  </Badge>
                )}
                
                {task.estimated_hours && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {task.estimated_hours}h
                  </div>
                )}

                {task.planned_time && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {task.planned_time.slice(0, 5)}
                  </div>
                )}

                {task.energy_level && (
                  <span className="text-sm">
                    {ENERGY_EMOJIS[task.energy_level - 1]}
                  </span>
                )}

                {isCarriedOver && (
                  <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-700">
                    Acumulada
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEnergyDialog} onOpenChange={setShowEnergyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              ¿Cómo te sientes?
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-4 py-6">
            {ENERGY_EMOJIS.map((emoji, index) => (
              <button
                key={index}
                onClick={() => setSelectedEnergy(index + 1)}
                className={cn(
                  "text-4xl p-3 rounded-xl transition-all hover:scale-110",
                  selectedEnergy === index + 1 
                    ? "bg-primary/20 ring-2 ring-primary" 
                    : "hover:bg-muted"
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnergyDialog(false)}>
              Omitir
            </Button>
            <Button onClick={confirmComplete}>
              ✨ Completar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFocusDialog} onOpenChange={setShowFocusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Activar Modo Focus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descripción detallada de la tarea</Label>
              <Textarea
                value={focusDescription}
                onChange={(e) => setFocusDescription(e.target.value)}
                placeholder="¿Qué quieres lograr con esta tarea?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>¿Qué solución o idea estás desarrollando? *</Label>
              <Textarea
                value={focusSolution}
                onChange={(e) => setFocusSolution(e.target.value)}
                placeholder="Describe la solución o idea principal..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFocusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetFocus} disabled={!focusSolution.trim()}>
              🎯 Activar Focus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
