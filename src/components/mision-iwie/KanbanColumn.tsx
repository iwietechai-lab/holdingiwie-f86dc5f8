import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { PRIORITY_CONFIG, TaskPriority } from '@/types/mision-iwie';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  priority: TaskPriority;
  tasks: { id: string }[];
  status: 'ok' | 'warning' | 'danger';
  onAddTask: () => void;
  children: React.ReactNode;
}

export function KanbanColumn({ priority, tasks, status, onAddTask, children }: KanbanColumnProps) {
  const config = PRIORITY_CONFIG[priority];
  
  const { setNodeRef, isOver } = useDroppable({
    id: priority,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border-2 transition-all duration-200 min-h-[400px]",
        config.bgColor,
        isOver && "ring-2 ring-primary ring-offset-2",
        status === 'danger' && "animate-pulse border-red-500",
        status === 'warning' && "border-yellow-500",
        status === 'ok' && config.borderColor
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        config.borderColor
      )}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <h3 className={cn("font-bold", config.textColor)}>
            {config.label}
          </h3>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-bold",
            status === 'danger' && "bg-red-500 text-white",
            status === 'warning' && "bg-yellow-500 text-black",
            status === 'ok' && "bg-muted text-muted-foreground"
          )}>
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onAddTask}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {children}
        
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <span className="text-3xl mb-2">🚀</span>
            <p className="text-sm">Sin tareas {config.label.toLowerCase()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
