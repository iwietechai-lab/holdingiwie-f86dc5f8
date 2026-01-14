import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, TaskComment } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Clock, 
  MessageSquare, 
  Lightbulb, 
  Target,
  Edit,
  Trash2,
  Send
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TaskCardProps {
  task: Task;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onAddComment: (taskId: string, content: string, type: TaskComment['comment_type']) => Promise<boolean>;
  getComments: (taskId: string) => Promise<TaskComment[]>;
  canEdit: boolean;
}

const priorityColors = {
  baja: 'bg-green-500/20 text-green-400 border-green-500/30',
  media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  alta: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgente: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusColors = {
  pendiente: 'bg-slate-500/20 text-slate-400',
  en_progreso: 'bg-blue-500/20 text-blue-400',
  completada: 'bg-green-500/20 text-green-400',
  bloqueada: 'bg-red-500/20 text-red-400',
};

const statusLabels = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
  bloqueada: 'Bloqueada',
};

export function TaskCard({ task, onUpdate, onDelete, onAddComment, getComments, canEdit }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<TaskComment['comment_type']>('comment');
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    partial_results: task.partial_results || '',
    development_notes: task.development_notes || '',
    problems: task.problems || '',
    new_ideas: task.new_ideas || '',
  });

  useEffect(() => {
    const fetchNames = async () => {
      const allIds = [...(task.assigned_to || []), ...(task.team_members || [])];
      if (allIds.length === 0) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', allIds);

      if (data) {
        const names: Record<string, string> = {};
        data.forEach(u => {
          names[u.id] = u.full_name || 'Sin nombre';
        });
        setAssigneeNames(names);
      }
    };

    fetchNames();
  }, [task.assigned_to, task.team_members]);

  useEffect(() => {
    if (expanded) {
      loadComments();
    }
  }, [expanded]);

  const loadComments = async () => {
    const data = await getComments(task.id);
    setComments(data);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const success = await onAddComment(task.id, newComment, commentType);
    if (success) {
      setNewComment('');
      loadComments();
    }
  };

  const handleSaveEdits = async () => {
    await onUpdate(task.id, editFields);
    setIsEditing(false);
  };

  const handleStatusChange = async (status: Task['status']) => {
    await onUpdate(task.id, { status });
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={priorityColors[task.priority]}>
                {task.priority.toUpperCase()}
              </Badge>
              <Badge className={statusColors[task.status]}>
                {statusLabels[task.status]}
              </Badge>
              <Badge variant="outline" className="text-slate-400 border-slate-600">
                {task.area}
              </Badge>
            </div>
            <CardTitle className="text-white text-lg">{task.title}</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-white"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white"
            >
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
          {task.execution_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {task.execution_time}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {task.assigned_to?.length || 0} asignados
          </span>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-4 space-y-4">
          {/* Status buttons */}
          <div className="flex gap-2 flex-wrap">
            {(['pendiente', 'en_progreso', 'completada', 'bloqueada'] as const).map(status => (
              <Button
                key={status}
                size="sm"
                variant={task.status === status ? 'default' : 'outline'}
                className={task.status === status ? 'bg-cyan-600' : ''}
                onClick={() => handleStatusChange(status)}
              >
                {statusLabels[status]}
              </Button>
            ))}
          </div>

          {/* Assigned Users */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Users className="h-4 w-4" /> Responsables
            </h4>
            <div className="flex flex-wrap gap-2">
              {task.assigned_to?.map(id => (
                <div key={id} className="flex items-center gap-2 bg-slate-700 rounded-full px-3 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs bg-cyan-600">
                      {(assigneeNames[id] || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white">{assigneeNames[id] || 'Cargando...'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Members */}
          {task.team_members && task.team_members.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Equipo de Solución</h4>
              <div className="flex flex-wrap gap-2">
                {task.team_members.map(id => (
                  <div key={id} className="flex items-center gap-2 bg-slate-700/50 rounded-full px-3 py-1">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs bg-purple-600">
                        {(assigneeNames[id] || '?')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-300">{assigneeNames[id] || 'Cargando...'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable fields */}
          {isEditing ? (
            <div className="space-y-4 bg-slate-900/50 p-4 rounded-lg">
              <div>
                <label className="text-sm text-slate-400">Resultados Parciales</label>
                <Textarea
                  value={editFields.partial_results}
                  onChange={e => setEditFields({ ...editFields, partial_results: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Notas de Desarrollo</label>
                <Textarea
                  value={editFields.development_notes}
                  onChange={e => setEditFields({ ...editFields, development_notes: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Problemáticas</label>
                <Textarea
                  value={editFields.problems}
                  onChange={e => setEditFields({ ...editFields, problems: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Nuevas Ideas</label>
                <Textarea
                  value={editFields.new_ideas}
                  onChange={e => setEditFields({ ...editFields, new_ideas: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdits} className="bg-cyan-600 hover:bg-cyan-700">
                  Guardar Cambios
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {task.partial_results && (
                <div className="bg-slate-900/30 p-3 rounded">
                  <h5 className="text-xs text-slate-500 uppercase mb-1">Resultados Parciales</h5>
                  <p className="text-sm text-slate-300">{task.partial_results}</p>
                </div>
              )}
              {task.development_notes && (
                <div className="bg-slate-900/30 p-3 rounded">
                  <h5 className="text-xs text-slate-500 uppercase mb-1">Notas</h5>
                  <p className="text-sm text-slate-300">{task.development_notes}</p>
                </div>
              )}
              {task.problems && (
                <div className="bg-red-900/20 p-3 rounded border border-red-500/20">
                  <h5 className="text-xs text-red-400 uppercase mb-1">Problemáticas</h5>
                  <p className="text-sm text-red-300">{task.problems}</p>
                </div>
              )}
              {task.new_ideas && (
                <div className="bg-yellow-900/20 p-3 rounded border border-yellow-500/20">
                  <h5 className="text-xs text-yellow-400 uppercase mb-1">Nuevas Ideas</h5>
                  <p className="text-sm text-yellow-300">{task.new_ideas}</p>
                </div>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Colaboración
            </h4>

            {/* Comment type selector */}
            <div className="flex gap-2 mb-3">
              {[
                { type: 'comment', icon: MessageSquare, label: 'Comentario' },
                { type: 'idea', icon: Lightbulb, label: 'Idea' },
                { type: 'proposal', icon: Target, label: 'Propuesta' },
              ].map(({ type, icon: Icon, label }) => (
                <Button
                  key={type}
                  size="sm"
                  variant={commentType === type ? 'default' : 'outline'}
                  className={commentType === type ? 'bg-cyan-600' : ''}
                  onClick={() => setCommentType(type as TaskComment['comment_type'])}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            {/* New comment input */}
            <div className="flex gap-2 mb-4">
              <Textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={`Escribe tu ${commentType === 'idea' ? 'idea' : commentType === 'proposal' ? 'propuesta' : 'comentario'}...`}
                className="bg-slate-800 border-slate-600 text-white flex-1"
                rows={2}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Comments list */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No hay comentarios aún. ¡Sé el primero en colaborar!
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function CommentItem({ comment }: { comment: TaskComment }) {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchName = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', comment.user_id)
        .single();
      setUserName(data?.full_name || 'Usuario');
    };
    fetchName();
  }, [comment.user_id]);

  const typeIcons = {
    comment: <MessageSquare className="h-3 w-3" />,
    idea: <Lightbulb className="h-3 w-3 text-yellow-400" />,
    proposal: <Target className="h-3 w-3 text-green-400" />,
    challenge: <Target className="h-3 w-3 text-red-400" />,
  };

  const typeBg = {
    comment: 'bg-slate-800',
    idea: 'bg-yellow-900/20 border-yellow-500/20',
    proposal: 'bg-green-900/20 border-green-500/20',
    challenge: 'bg-red-900/20 border-red-500/20',
  };

  return (
    <div className={`p-3 rounded border ${typeBg[comment.comment_type]} border-slate-700`}>
      <div className="flex items-center gap-2 mb-1">
        {typeIcons[comment.comment_type]}
        <span className="text-sm font-medium text-white">{userName}</span>
        <span className="text-xs text-slate-500">
          {new Date(comment.created_at).toLocaleString('es-CL')}
        </span>
      </div>
      <p className="text-sm text-slate-300">{comment.content}</p>
    </div>
  );
}
