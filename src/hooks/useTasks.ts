import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  company_id: string;
  title: string;
  area: string;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  execution_time: string | null;
  assigned_to: string[];
  team_members: string[];
  partial_results: string | null;
  final_results: string | null;
  development_notes: string | null;
  problems: string | null;
  new_ideas: string | null;
  improvement_proposals: string | null;
  status: 'pendiente' | 'en_progreso' | 'completada' | 'bloqueada';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  comment_type: 'comment' | 'idea' | 'proposal' | 'challenge';
  created_at: string;
}

export interface CreateTaskInput {
  company_id: string;
  title: string;
  area: string;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  execution_time?: string;
  assigned_to: string[];
  team_members?: string[];
}

export const useTasks = (companyId?: string | null, isSuperadmin?: boolean) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      
      // For holding company or superadmin with no filter, show all
      const isHolding = companyId === 'iwie-holding';
      if (companyId && !isHolding && !isSuperadmin) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const mappedTasks: Task[] = (data || []).map(task => ({
        id: task.id,
        company_id: task.company_id,
        title: task.title,
        area: task.area,
        priority: task.priority as Task['priority'],
        execution_time: task.execution_time ? String(task.execution_time) : null,
        assigned_to: Array.isArray(task.assigned_to) ? (task.assigned_to as string[]) : [],
        team_members: Array.isArray(task.team_members) ? (task.team_members as string[]) : [],
        partial_results: task.partial_results,
        final_results: task.final_results,
        development_notes: task.development_notes,
        problems: task.problems,
        new_ideas: task.new_ideas,
        improvement_proposals: task.improvement_proposals,
        status: task.status as Task['status'],
        created_by: task.created_by,
        created_at: task.created_at,
        updated_at: task.updated_at,
      }));
      
      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (input: CreateTaskInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          assigned_to: input.assigned_to,
          team_members: input.team_members || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notifications for assigned users
      for (const userId of input.assigned_to) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Nueva tarea asignada',
          message: `Se te ha asignado la tarea: ${input.title}`,
          type: 'task',
          priority: input.priority,
          company_id: input.company_id,
        });
      }

      toast({
        title: 'Tarea creada',
        description: 'La tarea se ha creado exitosamente',
      });

      fetchTasks();
      return data;
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la tarea',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Get current task to track changes
      const currentTask = tasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Track changes in history
      if (currentTask) {
        const changedFields = Object.keys(updates) as (keyof Task)[];
        for (const field of changedFields) {
          if (currentTask[field] !== updates[field]) {
            await supabase.from('task_history').insert({
              task_id: taskId,
              user_id: user.id,
              field_changed: field,
              old_value: String(currentTask[field] || ''),
              new_value: String(updates[field] || ''),
            });
          }
        }
      }

      toast({
        title: 'Tarea actualizada',
        description: 'Los cambios se han guardado',
      });

      fetchTasks();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la tarea',
        variant: 'destructive',
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Tarea eliminada',
        description: 'La tarea se ha eliminado exitosamente',
      });

      fetchTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la tarea',
        variant: 'destructive',
      });
    }
  };

  const addComment = async (taskId: string, content: string, type: TaskComment['comment_type'] = 'comment') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content,
          comment_type: type,
        });

      if (error) throw error;

      toast({
        title: type === 'idea' ? 'Idea agregada' : type === 'proposal' ? 'Propuesta agregada' : 'Comentario agregado',
      });

      return true;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const getTaskComments = async (taskId: string): Promise<TaskComment[]> => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        task_id: c.task_id,
        user_id: c.user_id,
        content: c.content,
        comment_type: (c.comment_type || 'comment') as TaskComment['comment_type'],
        created_at: c.created_at,
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchTasks();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, isSuperadmin]);

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    getTaskComments,
    refetch: fetchTasks,
  };
};
