export interface BrainGalaxyArea {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_system_default: boolean;
  order_index: number;
  created_at: string;
}

export interface BrainGalaxyLevel {
  id: string;
  level_number: number;
  name: string;
  name_es: string;
  icon: string;
  color: string;
  min_points: number;
  max_points: number | null;
  created_at: string;
}

export interface BrainGalaxyBadge {
  id: string;
  code: string;
  name: string;
  name_es: string;
  description: string;
  description_es: string;
  category: string;
  icon: string;
  requirements: Record<string, any> | null;
  points_reward: number;
  created_at: string;
}

export interface BrainGalaxyContent {
  id: string;
  user_id: string;
  area_id: string | null;
  title: string;
  description: string | null;
  content_type: 'document' | 'video' | 'article' | 'paper' | 'url' | 'audio' | 'image';
  content_text: string | null;
  file_url: string | null;
  external_url: string | null;
  file_type: string | null;
  file_size: number | null;
  ai_summary: string | null;
  ai_key_points: string[] | null;
  source_metadata: Record<string, any> | null;
  visibility: 'private' | 'company' | 'holding';
  is_processed: boolean;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  area?: BrainGalaxyArea;
}

export interface BrainGalaxyCourse {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  area_id: string | null;
  learning_objectives: string[] | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimated_hours: number | null;
  curriculum_structure: Record<string, any> | null;
  cover_image_url: string | null;
  is_public: boolean;
  status: 'draft' | 'published' | 'archived';
  total_enrollments: number;
  average_rating: number | null;
  created_at: string;
  updated_at: string;
  area?: BrainGalaxyArea;
  modules?: BrainGalaxyCourseModule[];
}

export interface BrainGalaxyCourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  content_ids: string[] | null;
  estimated_minutes: number | null;
  created_at: string;
}

export interface BrainGalaxyQuiz {
  id: string;
  course_id: string | null;
  module_id: string | null;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string | number;
  explanation?: string;
  points: number;
}

export interface BrainGalaxyUserProgress {
  id: string;
  user_id: string;
  course_id: string;
  module_id: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  score: number | null;
  time_spent_minutes: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrainGalaxyMission {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  challenge_text: string;
  area_id: string | null;
  status: 'draft' | 'active' | 'in_progress' | 'completed' | 'archived';
  visibility: 'public' | 'company' | 'invite_only';
  deadline: string | null;
  reward_points: number;
  min_participants: number;
  max_participants: number | null;
  solution_summary: string | null;
  ai_final_analysis: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  area?: BrainGalaxyArea;
  participants_count?: number;
  contributions_count?: number;
}

export interface BrainGalaxyMissionParticipant {
  id: string;
  mission_id: string;
  user_id: string;
  role: 'creator' | 'contributor' | 'reviewer';
  joined_at: string;
}

export interface BrainGalaxyMissionContribution {
  id: string;
  mission_id: string;
  user_id: string;
  contribution_type: 'document' | 'link' | 'idea' | 'solution' | 'feedback';
  title: string | null;
  content: string | null;
  content_id: string | null;
  external_url: string | null;
  votes: number;
  points_earned: number;
  created_at: string;
}

export interface BrainGalaxyUserStats {
  id: string;
  user_id: string;
  knowledge_points: number;
  current_level: number;
  courses_created: number;
  courses_completed: number;
  modules_completed: number;
  quizzes_passed: number;
  content_uploaded: number;
  missions_created: number;
  missions_contributed: number;
  missions_completed: number;
  learning_streak: number;
  longest_streak: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  level?: BrainGalaxyLevel;
}

export interface BrainGalaxyChatSession {
  id: string;
  user_id: string;
  title: string | null;
  brain_model: BrainModel;
  context_area_id: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  type: 'file' | 'url';
  name: string;
  url: string;
  content_id?: string;
}

export type BrainModel = 'brain-1' | 'brain-2' | 'brain-3' | 'brain-4';

export interface BrainModelInfo {
  id: BrainModel;
  name: string;
  description: string;
  icon: string;
  color: string;
  specialization: string;
}

export const BRAIN_MODELS: BrainModelInfo[] = [
  {
    id: 'brain-1',
    name: 'Brain 1',
    description: 'Análisis profundo y razonamiento avanzado',
    icon: '🧠',
    color: '#8B5CF6',
    specialization: 'Razonamiento general',
  },
  {
    id: 'brain-2',
    name: 'Brain 2',
    description: 'Creatividad y generación de contenido',
    icon: '💡',
    color: '#10B981',
    specialization: 'Creatividad',
  },
  {
    id: 'brain-3',
    name: 'Brain 3',
    description: 'Análisis técnico y código',
    icon: '⚡',
    color: '#3B82F6',
    specialization: 'Técnico',
  },
  {
    id: 'brain-4',
    name: 'Brain 4',
    description: 'Ingeniería, modelamiento 3D y prototipos',
    icon: '🔧',
    color: '#F59E0B',
    specialization: 'Ingeniería y 3D',
  },
];
