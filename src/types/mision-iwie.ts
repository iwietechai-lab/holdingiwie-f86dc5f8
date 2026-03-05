export {
  PRIORITY_CONFIG,
  DECISION_CATEGORY_CONFIG,
  ENERGY_EMOJIS,
  RESULT_TYPE_CONFIG,
} from './shared-tasks';

export type {
  TaskPriority,
  DecisionCategory,
  ResultType,
} from './shared-tasks';

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
  participants?: MissionParticipant[];
  contributions?: MissionContribution[];
}

export interface MissionParticipant {
  id: string;
  mission_id: string;
  user_id: string;
  role: 'creator' | 'contributor' | 'reviewer';
  joined_at?: string;
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
