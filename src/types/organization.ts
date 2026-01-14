// Organizational structure types

export interface Gerencia {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  order_index: number;
  created_at?: string;
}

export interface SubGerencia {
  id: string;
  gerencia_id: string;
  name: string;
  description?: string;
  order_index: number;
  created_at?: string;
}

export interface Area {
  id: string;
  gerencia_id: string;
  name: string;
  description?: string;
  order_index: number;
  created_at?: string;
}

export interface Position {
  id: string;
  gerencia_id: string;
  area_id?: string;
  name: string;
  description?: string;
  level: 'gerencial' | 'sub_gerencial' | 'operacional';
  order_index: number;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  type: 'document' | 'meeting' | 'ticket' | 'approval' | 'info';
  title: string;
  message: string;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  is_read: boolean;
  document_id?: string;
  meeting_id?: string;
  ticket_id?: string;
  action_url?: string;
  created_at: string;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  user_id: string;
  shared_by: string;
  created_at: string;
}

export interface DocumentApproval {
  id: string;
  document_id: string;
  approver_id: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  comments?: string;
  approved_at?: string;
  created_at: string;
}

export interface Chatbot {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  knowledge_base: KnowledgeEntry[];
  system_prompt?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeEntry {
  id: string;
  type: 'text' | 'url' | 'pdf';
  title: string;
  content: string;
  added_at: string;
}

export interface ChatMessage {
  id: string;
  chatbot_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Meeting {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
  meeting_url?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  attendees: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  company_id: string;
  created_by: string;
  assigned_to?: string;
  title: string;
  description?: string;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  points: number;
  due_date?: string;
  resolved_at?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

// Priority colors
export const PRIORITY_COLORS = {
  baja: 'bg-slate-500/20 text-slate-400 border-slate-500',
  media: 'bg-blue-500/20 text-blue-400 border-blue-500',
  alta: 'bg-orange-500/20 text-orange-400 border-orange-500',
  urgente: 'bg-red-500/20 text-red-400 border-red-500',
} as const;

export const PRIORITY_LABELS = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
} as const;

export const TICKET_STATUS_LABELS = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
} as const;

export const MEETING_STATUS_LABELS = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
} as const;
