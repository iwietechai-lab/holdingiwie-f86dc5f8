import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Tarea, TareaArea } from '@/hooks/useAITareas';
import { PRIORITY_CONFIG, TaskPriority } from '@/types/ai-tareas';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  tasks: Tarea[];
  areas: TareaArea[];
  onCreateTask: (task: Partial<Tarea>) => Promise<Tarea | null>;
  onUpdateTask: (id: string, updates: Partial<Tarea>) => Promise<Tarea | null>;
  onCompleteTask: (id: string, energyLevel?: number) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onMoveTask: (taskId: string, newPriority: TaskPriority, comment?: string) => Promise<void>;
  onCreateArea: (name: string, color?: string) => Promise<TareaArea | null>;
  onSetFocusMission: (type: 'task', id: string, data: { description: string; solution: string }) => Promise<void>;
  overloadStatus: {
    totalPending: number;
    totalHours: number;
    isOverloaded: boolean;
    isHoursOverloaded: boolean;
    columnStatus: Record<TaskPriority, 'ok' | 'warning' | 'danger'>;
  };
  todayTaskCount: number;
}

export function KanbanBoard({
  tasks,
  areas,
  onCreateTask,
  onUpdateTask,
  onCompleteTask,
  onDeleteTask,
  onMoveTask,
  onCreateArea,
  onSetFocusMission,
  overloadStatus,
  todayTaskCount,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultPriority, setDefaultPriority] = useState<TaskPriority>('important');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const tasksByPriority = useMemo(() => {
    const grouped: Record<TaskPriority, Tarea[]> = {
      urgent: [],
      very_important: [],
      important: [],
    };

    tasks
      .filter(t => t.status !== 'completed' && t.status !== 'archived')
      .forEach(task => {
        grouped[task.priority].push(task);
      });

    return grouped;
  }, [tasks]);

  const activeTask = useMemo(() => 
    tasks.find(t => t.id === activeId),
    [tasks, activeId]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    if (overId in PRIORITY_CONFIG) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.priority !== overId) {
        onMoveTask(taskId, overId as TaskPriority);
      }
    }
  };

  const handleAddTask = (priority: TaskPriority) => {
    setDefaultPriority(priority);
    setCreateDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Overload Warning Banner */}
      {(overloadStatus.isOverloaded || overloadStatus.isHoursOverloaded) && (
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-lg border",
          overloadStatus.isOverloaded ? "bg-red-500/10 border-red-500/50" : "bg-yellow-500/10 border-yellow-500/50"
        )}>
          <AlertTriangle className={cn(
            "w-5 h-5",
            overloadStatus.isOverloaded ? "text-red-500" : "text-yellow-500"
          )} />
          <div className="flex-1">
            <p className="font-medium">
              {overloadStatus.isOverloaded 
                ? `⚠️ Sobrecarga detectada: ${overloadStatus.totalPending} tareas pendientes`
                : `⏰ Carga elevada: ${overloadStatus.totalHours}h estimadas`
              }
            </p>
            <p className="text-sm text-muted-foreground">
              Considera archivar o priorizar algunas tareas para mantener el equilibrio
            </p>
          </div>
          <Button variant="outline" size="sm">
            Revisar
          </Button>
        </div>
      )}

      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Hoy: <span className="font-bold text-foreground">{todayTaskCount}/15</span> tareas nuevas
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Total pendiente: <span className="font-bold text-foreground">{overloadStatus.totalPending}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Horas estimadas: <span className="font-bold text-foreground">{overloadStatus.totalHours.toFixed(1)}h</span>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map(priority => (
            <KanbanColumn
              key={priority}
              priority={priority}
              tasks={tasksByPriority[priority]}
              status={overloadStatus.columnStatus[priority]}
              onAddTask={() => handleAddTask(priority)}
            >
              <SortableContext
                items={tasksByPriority[priority].map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {tasksByPriority[priority].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    areas={areas}
                    onUpdate={onUpdateTask}
                    onComplete={onCompleteTask}
                    onDelete={onDeleteTask}
                    onSetFocus={(data) => onSetFocusMission('task', task.id, data)}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              areas={areas}
              onUpdate={async () => null}
              onComplete={async () => {}}
              onDelete={async () => {}}
              onSetFocus={async () => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        areas={areas}
        defaultPriority={defaultPriority}
        onCreateTask={onCreateTask}
        onCreateArea={onCreateArea}
        remainingTasks={15 - todayTaskCount}
      />
    </div>
  );
}
