export const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgentes',
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    textColor: 'text-red-500',
    icon: '🔥',
  },
  very_important: {
    label: 'Muy Importantes',
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-500',
    icon: '⚡',
  },
  important: {
    label: 'Importantes',
    color: 'hsl(142, 71%, 45%)',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    textColor: 'text-green-500',
    icon: '✨',
  },
} as const;

export const DECISION_CATEGORY_CONFIG = {
  urgent: {
    label: 'Urgentes',
    color: '#ef4444',
    icon: '🔴',
  },
  very_important: {
    label: 'Muy Importantes',
    color: '#f97316',
    icon: '🟠',
  },
  important: {
    label: 'Importantes',
    color: '#22c55e',
    icon: '🟢',
  },
  strategic: {
    label: 'Estratégicas',
    color: '#3b82f6',
    icon: '🔵',
  },
  contributing: {
    label: 'Que Aportan',
    color: '#8b5cf6',
    icon: '🟣',
  },
  not_convenient: {
    label: 'No Conveniente',
    color: '#6b7280',
    icon: '⚫',
  },
} as const;

export const ENERGY_EMOJIS = ['😴', '😐', '🙂', '😊', '🚀'] as const;

export const RESULT_TYPE_CONFIG = {
  positive: { label: 'Positivo', color: 'text-green-500', icon: '✅' },
  neutral: { label: 'Neutral', color: 'text-yellow-500', icon: '➖' },
  negative: { label: 'Negativo', color: 'text-red-500', icon: '❌' },
} as const;

export type TaskPriority = keyof typeof PRIORITY_CONFIG;
export type DecisionCategory = keyof typeof DECISION_CATEGORY_CONFIG;
export type ResultType = keyof typeof RESULT_TYPE_CONFIG;

// =====================================================
// MISSION TYPES FOR COLLABORATIVE WORKSPACE
// =====================================================

export type MissionType = 
  | 'learning'
  | 'research' 
  | 'prototype'
  | 'engineering'
  | 'satellite'
  | 'commercial'
  | 'general';

export type ConversationContext = 
  | 'engineering'
  | 'commercial'
  | 'financial'
  | 'legal'
  | 'education'
  | 'project'
  | 'drone'
  | 'general';

export type PanelType = 
  | 'engineering'
  | '3d_preview'
  | 'calculations'
  | 'bom'
  | 'proposal'
  | 'budget'
  | 'timeline'
  | 'documentation'
  | 'notes'
  | 'resources'
  | 'curriculum'
  | 'quiz'
  | 'tasks'
  | 'milestones'
  | 'specifications'
  | 'flight_plan'
  | 'contracts'
  | 'compliance'
  | 'cost_analysis'
  | 'projections';

export interface ContextClassification {
  detected_context: ConversationContext;
  sub_context: string | null;
  confidence: number;
  suggested_panels: PanelType[];
  detected_intents: string[];
}

export interface MissionChatMessage {
  id: string;
  mission_id: string;
  user_id: string;
  is_ai_message: boolean;
  ai_model?: string;
  content: string;
  attachments?: any[];
  detected_context?: ConversationContext;
  detected_intents?: string[];
  created_at: string;
}

export interface MissionWorkspaceState {
  id: string;
  mission_id: string;
  current_context: ConversationContext;
  sub_context?: string;
  active_panels: PanelType[];
  panel_data: Record<string, any>;
  updated_at: string;
}

export interface MissionArtifact {
  id: string;
  mission_id: string;
  chat_message_id?: string;
  artifact_type: string;
  title: string;
  content?: string;
  version_number: number;
  is_latest: boolean;
  parent_artifact_id?: string;
  file_url?: string;
  preview_url?: string;
  metadata?: Record<string, any>;
  is_ai_generated: boolean;
  status: 'draft' | 'review' | 'approved' | 'archived';
  created_by?: string;
  created_at: string;
}

export interface MissionCostEstimate {
  id: string;
  mission_id: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  category?: string;
  source?: string;
  confidence_score?: number;
  is_ai_generated: boolean;
  created_at: string;
}

export interface MissionTimeEstimate {
  id: string;
  mission_id: string;
  phase_name: string;
  description?: string;
  estimated_days: number;
  estimated_hours?: number;
  dependencies?: string[];
  confidence_score?: number;
  is_ai_generated: boolean;
  created_at: string;
}

export interface Mission {
  id: string;
  title: string;
  description?: string;
  challenge_text: string;
  mission_type: MissionType;
  project_code?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  creator_id: string;
  ai_enabled: boolean;
  ai_intervention_level: 'passive' | 'reactive' | 'proactive';
  estimated_budget?: number;
  actual_budget?: number;
  target_end_date?: string;
  deadline?: string;
  area_id?: string;
  visibility: 'private' | 'team' | 'company' | 'public';
  min_participants?: number;
  max_participants?: number;
  reward_points?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Relations
  participants?: MissionParticipant[];
  contributions?: MissionContribution[];
}

export interface MissionParticipant {
  id: string;
  mission_id: string;
  user_id: string;
  role: 'owner' | 'collaborator' | 'viewer';
  joined_at: string;
  // Joined data
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface MissionContribution {
  id: string;
  mission_id: string;
  user_id: string;
  content_id?: string;
  contribution_type: string;
  title?: string;
  content?: string;
  external_url?: string;
  votes: number;
  points_earned: number;
  created_at: string;
}

export const CONTEXT_PANELS: Record<ConversationContext, PanelType[]> = {
  engineering: ['engineering', 'calculations', '3d_preview', 'bom', 'specifications'],
  commercial: ['proposal', 'budget', 'timeline', 'documentation'],
  financial: ['budget', 'cost_analysis', 'projections'],
  legal: ['documentation', 'compliance', 'contracts'],
  education: ['curriculum', 'resources', 'quiz'],
  project: ['timeline', 'tasks', 'milestones'],
  drone: ['engineering', 'specifications', 'flight_plan'],
  general: ['notes', 'documentation'],
};

export const MISSION_TYPE_CONFIG: Record<MissionType, { label: string; icon: string; color: string }> = {
  learning: { label: 'Aprendizaje', icon: '📚', color: '#8b5cf6' },
  research: { label: 'Investigación', icon: '🔬', color: '#06b6d4' },
  prototype: { label: 'Prototipo', icon: '🛠️', color: '#f59e0b' },
  engineering: { label: 'Ingeniería', icon: '⚙️', color: '#3b82f6' },
  satellite: { label: 'Satélite', icon: '🛰️', color: '#10b981' },
  commercial: { label: 'Comercial', icon: '💼', color: '#ec4899' },
  general: { label: 'General', icon: '📋', color: '#6b7280' },
};

export const CONTEXT_CONFIG: Record<ConversationContext, { label: string; icon: string; color: string }> = {
  engineering: { label: 'Ingeniería', icon: '🔧', color: '#3b82f6' },
  commercial: { label: 'Comercial', icon: '💼', color: '#ec4899' },
  financial: { label: 'Financiero', icon: '📊', color: '#10b981' },
  legal: { label: 'Legal', icon: '⚖️', color: '#8b5cf6' },
  education: { label: 'Educación', icon: '📚', color: '#f59e0b' },
  project: { label: 'Proyecto', icon: '📋', color: '#06b6d4' },
  drone: { label: 'Drones', icon: '🛸', color: '#ef4444' },
  general: { label: 'General', icon: '💡', color: '#6b7280' },
};
