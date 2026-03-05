export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          city: string | null
          country: string | null
          device_info: string | null
          id: string
          latitude: number | null
          longitude: number | null
          success: boolean | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          device_info?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          success?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          device_info?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          success?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      allowed_registrations: {
        Row: {
          company_id: string | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          is_active: boolean
          role: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allowed_registrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string | null
          description: string | null
          gerencia_id: string | null
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gerencia_id?: string | null
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gerencia_id?: string | null
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_gerencia_id_fkey"
            columns: ["gerencia_id"]
            isOneToOne: false
            referencedRelation: "gerencias"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_slots: {
        Row: {
          available_date: string
          created_at: string | null
          end_time: string
          id: string
          start_time: string
          user_id: string
        }
        Insert: {
          available_date: string
          created_at?: string | null
          end_time: string
          id?: string
          start_time: string
          user_id: string
        }
        Update: {
          available_date?: string
          created_at?: string | null
          end_time?: string
          id?: string
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      brain_galaxy_areas: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_system_default: boolean | null
          name: string
          order_index: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system_default?: boolean | null
          name: string
          order_index?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system_default?: boolean | null
          name?: string
          order_index?: number | null
        }
        Relationships: []
      }
      brain_galaxy_badges: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string
          description_es: string
          icon: string
          id: string
          name: string
          name_es: string
          points_reward: number | null
          requirements: Json | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description: string
          description_es: string
          icon: string
          id?: string
          name: string
          name_es: string
          points_reward?: number | null
          requirements?: Json | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string
          description_es?: string
          icon?: string
          id?: string
          name?: string
          name_es?: string
          points_reward?: number | null
          requirements?: Json | null
        }
        Relationships: []
      }
      brain_galaxy_chat_sessions: {
        Row: {
          brain_model: string | null
          context_area_id: string | null
          created_at: string | null
          id: string
          messages: Json | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brain_model?: string | null
          context_area_id?: string | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brain_model?: string | null
          context_area_id?: string | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_chat_sessions_context_area_id_fkey"
            columns: ["context_area_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_content: {
        Row: {
          ai_key_points: Json | null
          ai_summary: string | null
          area_id: string | null
          content_text: string | null
          content_type: string
          created_at: string | null
          description: string | null
          external_url: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_processed: boolean | null
          processed_at: string | null
          source_metadata: Json | null
          title: string
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          ai_key_points?: Json | null
          ai_summary?: string | null
          area_id?: string | null
          content_text?: string | null
          content_type: string
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_processed?: boolean | null
          processed_at?: string | null
          source_metadata?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          ai_key_points?: Json | null
          ai_summary?: string | null
          area_id?: string | null
          content_text?: string | null
          content_type?: string
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_processed?: boolean | null
          processed_at?: string | null
          source_metadata?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_content_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_course_modules: {
        Row: {
          content_ids: string[] | null
          course_id: string
          created_at: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          content_ids?: string[] | null
          course_id: string
          created_at?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          order_index: number
          title: string
        }
        Update: {
          content_ids?: string[] | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_courses: {
        Row: {
          area_id: string | null
          average_rating: number | null
          cover_image_url: string | null
          created_at: string | null
          curriculum_structure: Json | null
          description: string | null
          difficulty_level: string | null
          estimated_hours: number | null
          id: string
          is_public: boolean | null
          learning_objectives: Json | null
          status: string | null
          title: string
          total_enrollments: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          area_id?: string | null
          average_rating?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          curriculum_structure?: Json | null
          description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          is_public?: boolean | null
          learning_objectives?: Json | null
          status?: string | null
          title: string
          total_enrollments?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          area_id?: string | null
          average_rating?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          curriculum_structure?: Json | null
          description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          is_public?: boolean | null
          learning_objectives?: Json | null
          status?: string | null
          title?: string
          total_enrollments?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_courses_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_levels: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          level_number: number
          max_points: number | null
          min_points: number
          name: string
          name_es: string
        }
        Insert: {
          color: string
          created_at?: string | null
          icon: string
          id?: string
          level_number: number
          max_points?: number | null
          min_points: number
          name: string
          name_es: string
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          level_number?: number
          max_points?: number | null
          min_points?: number
          name?: string
          name_es?: string
        }
        Relationships: []
      }
      brain_galaxy_mission_artifacts: {
        Row: {
          artifact_type: string
          chat_message_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          is_ai_generated: boolean | null
          is_latest: boolean | null
          metadata: Json | null
          mission_id: string
          parent_artifact_id: string | null
          preview_url: string | null
          status: string | null
          title: string
          version_number: number | null
        }
        Insert: {
          artifact_type: string
          chat_message_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_latest?: boolean | null
          metadata?: Json | null
          mission_id: string
          parent_artifact_id?: string | null
          preview_url?: string | null
          status?: string | null
          title: string
          version_number?: number | null
        }
        Update: {
          artifact_type?: string
          chat_message_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_latest?: boolean | null
          metadata?: Json | null
          mission_id?: string
          parent_artifact_id?: string | null
          preview_url?: string | null
          status?: string | null
          title?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_mission_artifacts_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_mission_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_galaxy_mission_artifacts_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_galaxy_mission_artifacts_parent_artifact_id_fkey"
            columns: ["parent_artifact_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_mission_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_mission_chat: {
        Row: {
          ai_model: string | null
          attachments: Json | null
          content: string
          created_at: string
          detected_context: string | null
          detected_intents: Json | null
          id: string
          is_ai_message: boolean | null
          mission_id: string
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          attachments?: Json | null
          content: string
          created_at?: string
          detected_context?: string | null
          detected_intents?: Json | null
          id?: string
          is_ai_message?: boolean | null
          mission_id: string
          user_id: string
        }
        Update: {
          ai_model?: string | null
          attachments?: Json | null
          content?: string
          created_at?: string
          detected_context?: string | null
          detected_intents?: Json | null
          id?: string
          is_ai_message?: boolean | null
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_mission_chat_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_mission_context_history: {
        Row: {
          active_panels: Json | null
          chat_message_id: string | null
          confidence: number | null
          created_at: string
          detected_context: string
          id: string
          mission_id: string
          panel_data_snapshot: Json | null
          sub_context: string | null
        }
        Insert: {
          active_panels?: Json | null
          chat_message_id?: string | null
          confidence?: number | null
          created_at?: string
          detected_context: string
          id?: string
          mission_id: string
          panel_data_snapshot?: Json | null
          sub_context?: string | null
        }
        Update: {
          active_panels?: Json | null
          chat_message_id?: string | null
          confidence?: number | null
          created_at?: string
          detected_context?: string
          id?: string
          mission_id?: string
          panel_data_snapshot?: Json | null
          sub_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_mission_context_history_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_mission_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_galaxy_mission_context_history_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_mission_contributions: {
        Row: {
          content: string | null
          content_id: string | null
          contribution_type: string
          created_at: string | null
          external_url: string | null
          id: string
          mission_id: string
          points_earned: number | null
          title: string | null
          user_id: string
          votes: number | null
        }
        Insert: {
          content?: string | null
          content_id?: string | null
          contribution_type: string
          created_at?: string | null
          external_url?: string | null
          id?: string
          mission_id: string
          points_earned?: number | null
          title?: string | null
          user_id: string
          votes?: number | null
        }
        Update: {
          content?: string | null
          content_id?: string | null
          contribution_type?: string
          created_at?: string | null
          external_url?: string | null
          id?: string
          mission_id?: string
          points_earned?: number | null
          title?: string | null
          user_id?: string
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_mission_contributions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_galaxy_mission_contributions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_mission_cost_estimates: {
        Row: {
          category: string | null
          confidence_score: number | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_ai_generated: boolean | null
          item_name: string
          mission_id: string
          quantity: number | null
          source: string | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_ai_generated?: boolean | null
          item_name: string
          mission_id: string
          quantity?: number | null
          source?: string | null
          total_price?: number | null
          unit_price: number
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_ai_generated?: boolean | null
          item_name?: string
          mission_id?: string
          quantity?: number | null
          source?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_mission_cost_estimates_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_mission_participants: {
        Row: {
          id: string
          joined_at: string | null
          mission_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          mission_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          mission_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_mission_participants_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_mission_time_estimates: {
        Row: {
          confidence_score: number | null
          created_at: string
          dependencies: Json | null
          description: string | null
          estimated_days: number
          estimated_hours: number | null
          id: string
          is_ai_generated: boolean | null
          mission_id: string
          phase_name: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          estimated_days: number
          estimated_hours?: number | null
          id?: string
          is_ai_generated?: boolean | null
          mission_id: string
          phase_name: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          dependencies?: Json | null
          description?: string | null
          estimated_days?: number
          estimated_hours?: number | null
          id?: string
          is_ai_generated?: boolean | null
          mission_id?: string
          phase_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_mission_time_estimates_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_mission_workspace_state: {
        Row: {
          active_panels: Json | null
          current_context: string | null
          id: string
          mission_id: string
          panel_data: Json | null
          sub_context: string | null
          updated_at: string
        }
        Insert: {
          active_panels?: Json | null
          current_context?: string | null
          id?: string
          mission_id: string
          panel_data?: Json | null
          sub_context?: string | null
          updated_at?: string
        }
        Update: {
          active_panels?: Json | null
          current_context?: string | null
          id?: string
          mission_id?: string
          panel_data?: Json | null
          sub_context?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_mission_workspace_state_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "brain_galaxy_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_missions: {
        Row: {
          actual_budget: number | null
          ai_enabled: boolean | null
          ai_final_analysis: string | null
          ai_intervention_level: string | null
          area_id: string | null
          challenge_text: string
          completed_at: string | null
          created_at: string | null
          creator_id: string
          deadline: string | null
          description: string | null
          estimated_budget: number | null
          id: string
          max_participants: number | null
          min_participants: number | null
          mission_type: string | null
          priority: string | null
          project_code: string | null
          reward_points: number | null
          solution_summary: string | null
          status: string | null
          target_end_date: string | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          actual_budget?: number | null
          ai_enabled?: boolean | null
          ai_final_analysis?: string | null
          ai_intervention_level?: string | null
          area_id?: string | null
          challenge_text: string
          completed_at?: string | null
          created_at?: string | null
          creator_id: string
          deadline?: string | null
          description?: string | null
          estimated_budget?: number | null
          id?: string
          max_participants?: number | null
          min_participants?: number | null
          mission_type?: string | null
          priority?: string | null
          project_code?: string | null
          reward_points?: number | null
          solution_summary?: string | null
          status?: string | null
          target_end_date?: string | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          actual_budget?: number | null
          ai_enabled?: boolean | null
          ai_final_analysis?: string | null
          ai_intervention_level?: string | null
          area_id?: string | null
          challenge_text?: string
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string
          deadline?: string | null
          description?: string | null
          estimated_budget?: number | null
          id?: string
          max_participants?: number | null
          min_participants?: number | null
          mission_type?: string | null
          priority?: string | null
          project_code?: string | null
          reward_points?: number | null
          solution_summary?: string | null
          status?: string | null
          target_end_date?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_missions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_quiz_results: {
        Row: {
          answers: Json | null
          attempt_number: number | null
          completed_at: string | null
          id: string
          passed: boolean
          quiz_id: string
          score: number
          time_taken_minutes: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempt_number?: number | null
          completed_at?: string | null
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          time_taken_minutes?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempt_number?: number | null
          completed_at?: string | null
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          time_taken_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_quizzes: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          max_attempts: number | null
          module_id: string | null
          passing_score: number | null
          questions: Json
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_attempts?: number | null
          module_id?: string | null
          passing_score?: number | null
          questions: Json
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_attempts?: number | null
          module_id?: string | null
          passing_score?: number | null
          questions?: Json
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_galaxy_quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_studio_sessions: {
        Row: {
          course_id: string | null
          course_proposal: Json | null
          created_at: string | null
          id: string
          messages: Json | null
          mode: string
          outputs: Json | null
          sources: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          course_proposal?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          mode?: string
          outputs?: Json | null
          sources?: Json | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          course_proposal?: Json | null
          created_at?: string | null
          id?: string
          messages?: Json | null
          mode?: string
          outputs?: Json | null
          sources?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_studio_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_user_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          module_id: string | null
          score: number | null
          status: string | null
          time_spent_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          module_id?: string | null
          score?: number | null
          status?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          module_id?: string | null
          score?: number | null
          status?: string | null
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_galaxy_user_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_galaxy_user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "brain_galaxy_course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_galaxy_user_stats: {
        Row: {
          content_uploaded: number | null
          courses_completed: number | null
          courses_created: number | null
          created_at: string | null
          current_level: number | null
          id: string
          knowledge_points: number | null
          last_activity_at: string | null
          learning_streak: number | null
          longest_streak: number | null
          missions_completed: number | null
          missions_contributed: number | null
          missions_created: number | null
          modules_completed: number | null
          quizzes_passed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_uploaded?: number | null
          courses_completed?: number | null
          courses_created?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          knowledge_points?: number | null
          last_activity_at?: string | null
          learning_streak?: number | null
          longest_streak?: number | null
          missions_completed?: number | null
          missions_contributed?: number | null
          missions_created?: number | null
          modules_completed?: number | null
          quizzes_passed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_uploaded?: number | null
          courses_completed?: number | null
          courses_created?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          knowledge_points?: number | null
          last_activity_at?: string | null
          learning_streak?: number | null
          longest_streak?: number | null
          missions_completed?: number | null
          missions_contributed?: number | null
          missions_created?: number | null
          modules_completed?: number | null
          quizzes_passed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          category_id: string | null
          checklist_checked: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          part_number: string | null
          price_clp: number | null
          price_rmb: number | null
          quantity: number | null
          stock_status: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          checklist_checked?: boolean | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          part_number?: string | null
          price_clp?: number | null
          price_rmb?: number | null
          quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          checklist_checked?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          part_number?: string | null
          price_clp?: number | null
          price_rmb?: number | null
          quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_quote_items: {
        Row: {
          created_at: string | null
          custom_description: string | null
          custom_name: string | null
          id: string
          item_id: string | null
          quantity: number | null
          quote_id: string
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          custom_description?: string | null
          custom_name?: string | null
          id?: string
          item_id?: string | null
          quantity?: number | null
          quote_id: string
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          custom_description?: string | null
          custom_name?: string | null
          id?: string
          item_id?: string | null
          quantity?: number | null
          quote_id?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_quote_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "budget_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          quote_number: string
          rmb_to_clp_rate: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tax_percentage: number | null
          total: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          quote_number: string
          rmb_to_clp_rate?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_percentage?: number | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          quote_number?: string
          rmb_to_clp_rate?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_percentage?: number | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ceo_chat_sessions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ceo_feedback: {
        Row: {
          attachments: Json | null
          created_at: string | null
          feedback_type: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          submission_id: string | null
          to_user_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          feedback_type?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          submission_id?: string | null
          to_user_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          feedback_type?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          submission_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceo_feedback_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ceo_team_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_internal_chat: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          project_id: string | null
          role: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          project_id?: string | null
          role: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          project_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceo_internal_chat_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ceo_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_internal_reports: {
        Row: {
          action_items: Json | null
          chat_messages_ids: Json | null
          conclusions: string | null
          created_at: string | null
          id: string
          key_decisions: Json | null
          project_id: string | null
          summary: string
          title: string
        }
        Insert: {
          action_items?: Json | null
          chat_messages_ids?: Json | null
          conclusions?: string | null
          created_at?: string | null
          id?: string
          key_decisions?: Json | null
          project_id?: string | null
          summary: string
          title: string
        }
        Update: {
          action_items?: Json | null
          chat_messages_ids?: Json | null
          conclusions?: string | null
          created_at?: string | null
          id?: string
          key_decisions?: Json | null
          project_id?: string | null
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceo_internal_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ceo_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_knowledge: {
        Row: {
          analyzed_summary: string | null
          category: string
          company_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          document_name: string | null
          document_type: string | null
          document_url: string | null
          id: string
          is_confidential: boolean | null
          key_points: Json | null
          project_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          analyzed_summary?: string | null
          category: string
          company_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          document_name?: string | null
          document_type?: string | null
          document_url?: string | null
          id?: string
          is_confidential?: boolean | null
          key_points?: Json | null
          project_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          analyzed_summary?: string | null
          category?: string
          company_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          document_name?: string | null
          document_type?: string | null
          document_url?: string | null
          id?: string
          is_confidential?: boolean | null
          key_points?: Json | null
          project_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_knowledge_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ceo_knowledge_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ceo_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_knowledge_access: {
        Row: {
          access_level: Database["public"]["Enums"]["knowledge_access_level"]
          allowed_categories: string[] | null
          company_id: string
          granted_at: string | null
          granted_by: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["knowledge_access_level"]
          allowed_categories?: string[] | null
          company_id: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["knowledge_access_level"]
          allowed_categories?: string[] | null
          company_id?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceo_knowledge_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_pending_reviews: {
        Row: {
          actioned_at: string | null
          created_at: string | null
          id: string
          is_actioned: boolean | null
          is_read: boolean | null
          priority: string | null
          read_at: string | null
          reference_id: string
          review_type: string
          summary: string | null
          title: string
        }
        Insert: {
          actioned_at?: string | null
          created_at?: string | null
          id?: string
          is_actioned?: boolean | null
          is_read?: boolean | null
          priority?: string | null
          read_at?: string | null
          reference_id: string
          review_type: string
          summary?: string | null
          title: string
        }
        Update: {
          actioned_at?: string | null
          created_at?: string | null
          id?: string
          is_actioned?: boolean | null
          is_read?: boolean | null
          priority?: string | null
          read_at?: string | null
          reference_id?: string
          review_type?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      ceo_projects: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_team_submissions: {
        Row: {
          ai_analysis: string | null
          ai_feedback: string | null
          ai_improvement_suggestions: Json | null
          ai_score: number | null
          ceo_notes: string | null
          ceo_reviewed_at: string | null
          company_id: string | null
          content: string | null
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          notify_ceo: boolean | null
          project_id: string | null
          source_reference_id: string | null
          source_type: string | null
          status: string | null
          submission_type: string | null
          submitted_by: string
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_feedback?: string | null
          ai_improvement_suggestions?: Json | null
          ai_score?: number | null
          ceo_notes?: string | null
          ceo_reviewed_at?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          notify_ceo?: boolean | null
          project_id?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string | null
          submission_type?: string | null
          submitted_by: string
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_feedback?: string | null
          ai_improvement_suggestions?: Json | null
          ai_score?: number | null
          ceo_notes?: string | null
          ceo_reviewed_at?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          notify_ceo?: boolean | null
          project_id?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string | null
          submission_type?: string | null
          submitted_by?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_team_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ceo_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_thoughts: {
        Row: {
          ai_key_points: Json | null
          ai_summary: string | null
          attachments: Json | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_processed: boolean | null
          priority: string | null
          processed_at: string | null
          project_id: string | null
          tags: Json | null
          thought_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_key_points?: Json | null
          ai_summary?: string | null
          attachments?: Json | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_processed?: boolean | null
          priority?: string | null
          processed_at?: string | null
          project_id?: string | null
          tags?: Json | null
          thought_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_key_points?: Json | null
          ai_summary?: string | null
          attachments?: Json | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_processed?: boolean | null
          priority?: string | null
          processed_at?: string | null
          project_id?: string | null
          tags?: Json | null
          thought_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_thoughts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ceo_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chatbot_id: string | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          chatbot_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          chatbot_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ceo_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_summaries: {
        Row: {
          chat_id: string
          generated_at: string | null
          generated_by: string | null
          id: string
          summary: string | null
        }
        Insert: {
          chat_id: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          summary?: string | null
        }
        Update: {
          chat_id?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_summaries_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbots: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          knowledge_base: Json | null
          name: string
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base?: Json | null
          name: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base?: Json | null
          name?: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_message_at: string | null
          title: string
          type: Database["public"]["Enums"]["chat_type"]
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          title: string
          type: Database["public"]["Enums"]["chat_type"]
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["chat_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chats_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_knowledge: {
        Row: {
          analysis_summary: string | null
          analyzed_at: string | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          company_id: string
          content: string
          contributor_id: string
          created_at: string | null
          document_name: string | null
          document_type: string | null
          document_url: string | null
          id: string
          is_analyzed: boolean | null
          is_approved_for_ceo: boolean | null
          key_points: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          analysis_summary?: string | null
          analyzed_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          company_id: string
          content: string
          contributor_id: string
          created_at?: string | null
          document_name?: string | null
          document_type?: string | null
          document_url?: string | null
          id?: string
          is_analyzed?: boolean | null
          is_approved_for_ceo?: boolean | null
          key_points?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          analysis_summary?: string | null
          analyzed_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          company_id?: string
          content?: string
          contributor_id?: string
          created_at?: string | null
          document_name?: string | null
          document_type?: string | null
          document_url?: string | null
          id?: string
          is_analyzed?: boolean | null
          is_approved_for_ceo?: boolean | null
          key_points?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_metrics: {
        Row: {
          active_users: number | null
          company_id: string
          completed_tasks: number | null
          created_at: string | null
          id: string
          metric_date: string
          monthly_revenue: number | null
          pending_tasks: number | null
          total_documents: number | null
          total_meetings: number | null
          total_tasks: number | null
          total_tickets: number | null
        }
        Insert: {
          active_users?: number | null
          company_id: string
          completed_tasks?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          monthly_revenue?: number | null
          pending_tasks?: number | null
          total_documents?: number | null
          total_meetings?: number | null
          total_tasks?: number | null
          total_tickets?: number | null
        }
        Update: {
          active_users?: number | null
          company_id?: string
          completed_tasks?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          monthly_revenue?: number | null
          pending_tasks?: number | null
          total_documents?: number | null
          total_meetings?: number | null
          total_tasks?: number | null
          total_tickets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_sales: {
        Row: {
          amount: number
          category: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          sale_date: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          sale_date: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          sale_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_requests: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          message: string | null
          owner_id: string
          requester_id: string
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          message?: string | null
          owner_id: string
          requester_id: string
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          message?: string | null
          owner_id?: string
          requester_id?: string
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      document_approvals: {
        Row: {
          approved_at: string | null
          approver_id: string
          comments: string | null
          created_at: string | null
          document_id: string
          id: string
          priority: Database["public"]["Enums"]["approval_priority"] | null
          requested_by: string
          status: Database["public"]["Enums"]["approval_status"] | null
        }
        Insert: {
          approved_at?: string | null
          approver_id: string
          comments?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          requested_by: string
          status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Update: {
          approved_at?: string | null
          approver_id?: string
          comments?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          requested_by?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
        }
        Relationships: []
      }
      document_permissions: {
        Row: {
          document_id: string
          granted_at: string | null
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          document_id: string
          granted_at?: string | null
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          document_id?: string
          granted_at?: string | null
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          shared_by: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          shared_by: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          shared_by?: string
          user_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          area_id: string
          created_at: string | null
          empresa_id: string
          file_path: string
          file_size: number
          id: string
          is_development: boolean | null
          mime_type: string
          nombre: string
          shared_areas: Json | null
          shared_companies: Json | null
          tipo: string
          updated_at: string | null
          user_id: string | null
          version: number | null
          visibility_scope: string | null
        }
        Insert: {
          area_id: string
          created_at?: string | null
          empresa_id: string
          file_path: string
          file_size: number
          id?: string
          is_development?: boolean | null
          mime_type: string
          nombre: string
          shared_areas?: Json | null
          shared_companies?: Json | null
          tipo: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
          visibility_scope?: string | null
        }
        Update: {
          area_id?: string
          created_at?: string | null
          empresa_id?: string
          file_path?: string
          file_size?: number
          id?: string
          is_development?: boolean | null
          mime_type?: string
          nombre?: string
          shared_areas?: Json | null
          shared_companies?: Json | null
          tipo?: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
          visibility_scope?: string | null
        }
        Relationships: []
      }
      gerencias: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          order_index: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gerencias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      holding_collective_memory: {
        Row: {
          access_count: number | null
          area_category: string | null
          company_id: string | null
          created_at: string
          embeddings_text: string | null
          id: string
          importance_score: number | null
          is_processed: boolean | null
          key_concepts: Json | null
          original_content: string | null
          processed_at: string | null
          processed_summary: string | null
          source_id: string | null
          source_table: string | null
          source_type: string
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_count?: number | null
          area_category?: string | null
          company_id?: string | null
          created_at?: string
          embeddings_text?: string | null
          id?: string
          importance_score?: number | null
          is_processed?: boolean | null
          key_concepts?: Json | null
          original_content?: string | null
          processed_at?: string | null
          processed_summary?: string | null
          source_id?: string | null
          source_table?: string | null
          source_type: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_count?: number | null
          area_category?: string | null
          company_id?: string | null
          created_at?: string
          embeddings_text?: string | null
          id?: string
          importance_score?: number | null
          is_processed?: boolean | null
          key_concepts?: Json | null
          original_content?: string | null
          processed_at?: string | null
          processed_summary?: string | null
          source_id?: string | null
          source_table?: string | null
          source_type?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      meeting_requests: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          duration_minutes: number
          id: string
          participants: Json
          priority: Database["public"]["Enums"]["approval_priority"] | null
          requested_date: string
          requested_end_time: string
          requested_start_time: string
          room_id: string | null
          status: Database["public"]["Enums"]["meeting_request_status"] | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          duration_minutes?: number
          id?: string
          participants?: Json
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          requested_date: string
          requested_end_time: string
          requested_start_time: string
          room_id?: string | null
          status?: Database["public"]["Enums"]["meeting_request_status"] | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          participants?: Json
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          requested_date?: string
          requested_end_time?: string
          requested_start_time?: string
          room_id?: string | null
          status?: Database["public"]["Enums"]["meeting_request_status"] | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      meeting_summaries: {
        Row: {
          created_at: string
          created_by: string
          duration_seconds: number | null
          ended_at: string | null
          file_url: string | null
          id: string
          participants: Json | null
          room_id: string
          started_at: string | null
          summary: string | null
          title: string
          transcription: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          ended_at?: string | null
          file_url?: string | null
          id?: string
          participants?: Json | null
          room_id: string
          started_at?: string | null
          summary?: string | null
          title: string
          transcription?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          ended_at?: string | null
          file_url?: string | null
          id?: string
          participants?: Json | null
          room_id?: string
          started_at?: string | null
          summary?: string | null
          title?: string
          transcription?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          attendees: Json | null
          company_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          meeting_url: string | null
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["meeting_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attendees?: Json | null
          company_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["meeting_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attendees?: Json | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["meeting_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string
          id: string
          sender_id: string
          sent_at: string | null
        }
        Insert: {
          chat_id: string
          content: string
          id?: string
          sender_id: string
          sent_at?: string | null
        }
        Update: {
          chat_id?: string
          content?: string
          id?: string
          sender_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      mision_iwie_ai_suggestions: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          id: string
          suggestion_type: string
          user_id: string
          was_accepted: boolean | null
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          id?: string
          suggestion_type: string
          user_id: string
          was_accepted?: boolean | null
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          id?: string
          suggestion_type?: string
          user_id?: string
          was_accepted?: boolean | null
        }
        Relationships: []
      }
      mision_iwie_areas: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mision_iwie_badges: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          description_es: string
          icon: string
          id: string
          name: string
          name_es: string
          points_reward: number | null
          requirements: Json | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description: string
          description_es: string
          icon: string
          id?: string
          name: string
          name_es: string
          points_reward?: number | null
          requirements?: Json | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          description_es?: string
          icon?: string
          id?: string
          name?: string
          name_es?: string
          points_reward?: number | null
          requirements?: Json | null
        }
        Relationships: []
      }
      mision_iwie_daily_stats: {
        Row: {
          avg_energy_level: number | null
          created_at: string
          date: string
          decisions_made: number | null
          focus_completed: boolean | null
          id: string
          important_count: number | null
          points_earned: number | null
          tasks_completed: number | null
          tasks_created: number | null
          total_actual_hours: number | null
          total_estimated_hours: number | null
          urgent_count: number | null
          user_id: string
          very_important_count: number | null
        }
        Insert: {
          avg_energy_level?: number | null
          created_at?: string
          date: string
          decisions_made?: number | null
          focus_completed?: boolean | null
          id?: string
          important_count?: number | null
          points_earned?: number | null
          tasks_completed?: number | null
          tasks_created?: number | null
          total_actual_hours?: number | null
          total_estimated_hours?: number | null
          urgent_count?: number | null
          user_id: string
          very_important_count?: number | null
        }
        Update: {
          avg_energy_level?: number | null
          created_at?: string
          date?: string
          decisions_made?: number | null
          focus_completed?: boolean | null
          id?: string
          important_count?: number | null
          points_earned?: number | null
          tasks_completed?: number | null
          tasks_created?: number | null
          total_actual_hours?: number | null
          total_estimated_hours?: number | null
          urgent_count?: number | null
          user_id?: string
          very_important_count?: number | null
        }
        Relationships: []
      }
      mision_iwie_decision_tasks: {
        Row: {
          created_at: string
          decision_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          decision_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          decision_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mision_iwie_decision_tasks_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "mision_iwie_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mision_iwie_decision_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mision_iwie_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mision_iwie_decisions: {
        Row: {
          associated_risks: string | null
          category: string
          completed_at: string | null
          created_at: string
          date_for: string
          description: string | null
          energy_level: number | null
          expected_impact: string | null
          focus_description: string | null
          focus_solution: string | null
          id: string
          is_focus_mission: boolean | null
          points_earned: number | null
          real_result_detail: string | null
          real_result_quantitative: number | null
          real_result_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          associated_risks?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          date_for?: string
          description?: string | null
          energy_level?: number | null
          expected_impact?: string | null
          focus_description?: string | null
          focus_solution?: string | null
          id?: string
          is_focus_mission?: boolean | null
          points_earned?: number | null
          real_result_detail?: string | null
          real_result_quantitative?: number | null
          real_result_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          associated_risks?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          date_for?: string
          description?: string | null
          energy_level?: number | null
          expected_impact?: string | null
          focus_description?: string | null
          focus_solution?: string | null
          id?: string
          is_focus_mission?: boolean | null
          points_earned?: number | null
          real_result_detail?: string | null
          real_result_quantitative?: number | null
          real_result_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mision_iwie_levels: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          level_number: number
          max_points: number | null
          min_points: number
          name: string
          name_es: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          level_number: number
          max_points?: number | null
          min_points: number
          name: string
          name_es: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          level_number?: number
          max_points?: number | null
          min_points?: number
          name?: string
          name_es?: string
        }
        Relationships: []
      }
      mision_iwie_task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          movement_from: string | null
          movement_to: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          movement_from?: string | null
          movement_to?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          movement_from?: string | null
          movement_to?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mision_iwie_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mision_iwie_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mision_iwie_tasks: {
        Row: {
          area_id: string | null
          completed_at: string | null
          created_at: string
          date_for: string
          description: string | null
          energy_level: number | null
          estimated_hours: number | null
          focus_description: string | null
          focus_solution: string | null
          id: string
          is_focus_mission: boolean | null
          original_date: string | null
          planned_time: string | null
          points_earned: number | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          completed_at?: string | null
          created_at?: string
          date_for?: string
          description?: string | null
          energy_level?: number | null
          estimated_hours?: number | null
          focus_description?: string | null
          focus_solution?: string | null
          id?: string
          is_focus_mission?: boolean | null
          original_date?: string | null
          planned_time?: string | null
          points_earned?: number | null
          priority: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          completed_at?: string | null
          created_at?: string
          date_for?: string
          description?: string | null
          energy_level?: number | null
          estimated_hours?: number | null
          focus_description?: string | null
          focus_solution?: string | null
          id?: string
          is_focus_mission?: boolean | null
          original_date?: string | null
          planned_time?: string | null
          points_earned?: number | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mision_iwie_tasks_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "mision_iwie_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      mision_iwie_user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          shared_in_hall_of_fame: boolean | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          shared_in_hall_of_fame?: boolean | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          shared_in_hall_of_fame?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mision_iwie_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "mision_iwie_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      mision_iwie_user_stats: {
        Row: {
          created_at: string
          current_level: number | null
          current_streak: number | null
          decisions_made: number | null
          focus_missions_completed: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          monthly_points: number | null
          tasks_completed: number | null
          total_points: number | null
          updated_at: string
          user_id: string
          weekly_points: number | null
        }
        Insert: {
          created_at?: string
          current_level?: number | null
          current_streak?: number | null
          decisions_made?: number | null
          focus_missions_completed?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          monthly_points?: number | null
          tasks_completed?: number | null
          total_points?: number | null
          updated_at?: string
          user_id: string
          weekly_points?: number | null
        }
        Update: {
          created_at?: string
          current_level?: number | null
          current_streak?: number | null
          decisions_made?: number | null
          focus_missions_completed?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          monthly_points?: number | null
          tasks_completed?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
          weekly_points?: number | null
        }
        Relationships: []
      }
      mision_iwie_weekly_missions: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          current_value: number | null
          id: string
          mission_type: string
          points_reward: number
          target_value: number
          user_id: string
          week_start: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          mission_type: string
          points_reward: number
          target_value: number
          user_id: string
          week_start: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          mission_type?: string
          points_reward?: number
          target_value?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      notification_sounds: {
        Row: {
          category: string
          created_at: string | null
          display_name: string
          file_name: string
          file_path: string
          id: string
          is_default: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          display_name: string
          file_name: string
          file_path: string
          id?: string
          is_default?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          display_name?: string
          file_name?: string
          file_path?: string
          id?: string
          is_default?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          company_id: string | null
          created_at: string | null
          document_id: string | null
          id: string
          is_read: boolean | null
          meeting_id: string | null
          message: string
          priority: Database["public"]["Enums"]["approval_priority"] | null
          ticket_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          company_id?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          is_read?: boolean | null
          meeting_id?: string | null
          message: string
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          ticket_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          company_id?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          is_read?: boolean | null
          meeting_id?: string | null
          message?: string
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          ticket_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          area_id: string | null
          created_at: string | null
          description: string | null
          gerencia_id: string | null
          id: string
          level: string | null
          name: string
          order_index: number | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string | null
          description?: string | null
          gerencia_id?: string | null
          id?: string
          level?: string | null
          name: string
          order_index?: number | null
        }
        Update: {
          area_id?: string | null
          created_at?: string | null
          description?: string | null
          gerencia_id?: string | null
          id?: string
          level?: string | null
          name?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_gerencia_id_fkey"
            columns: ["gerencia_id"]
            isOneToOne: false
            referencedRelation: "gerencias"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_gerencias: {
        Row: {
          created_at: string | null
          description: string | null
          gerencia_id: string | null
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gerencia_id?: string | null
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gerencia_id?: string | null
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_gerencias_gerencia_id_fkey"
            columns: ["gerencia_id"]
            isOneToOne: false
            referencedRelation: "gerencias"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment_type: string | null
          content: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment_type?: string | null
          content: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment_type?: string | null
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          changed_at: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          changed_at?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_end_date: string | null
          alert_status: string | null
          area: string
          assigned_to: Json
          collaborating_companies: Json | null
          company_id: string
          created_at: string | null
          created_by: string
          days_planned: number | null
          description: string | null
          development_notes: string | null
          early_completion_reason: string | null
          eisenhower_priority: string | null
          end_date: string | null
          estimated_hours: number | null
          execution_time: string | null
          extension_reason: string | null
          final_results: string | null
          id: string
          improvement_proposals: string | null
          new_ideas: string | null
          partial_results: string | null
          priority: Database["public"]["Enums"]["approval_priority"]
          problems: string | null
          responsible_name: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          team_members: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          alert_status?: string | null
          area: string
          assigned_to?: Json
          collaborating_companies?: Json | null
          company_id: string
          created_at?: string | null
          created_by: string
          days_planned?: number | null
          description?: string | null
          development_notes?: string | null
          early_completion_reason?: string | null
          eisenhower_priority?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          execution_time?: string | null
          extension_reason?: string | null
          final_results?: string | null
          id?: string
          improvement_proposals?: string | null
          new_ideas?: string | null
          partial_results?: string | null
          priority?: Database["public"]["Enums"]["approval_priority"]
          problems?: string | null
          responsible_name?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          team_members?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          alert_status?: string | null
          area?: string
          assigned_to?: Json
          collaborating_companies?: Json | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          days_planned?: number | null
          description?: string | null
          development_notes?: string | null
          early_completion_reason?: string | null
          eisenhower_priority?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          execution_time?: string | null
          extension_reason?: string | null
          final_results?: string | null
          id?: string
          improvement_proposals?: string | null
          new_ideas?: string | null
          partial_results?: string | null
          priority?: Database["public"]["Enums"]["approval_priority"]
          problems?: string | null
          responsible_name?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          team_members?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          due_date: string | null
          id: string
          is_deleted: boolean | null
          participant_scope: string | null
          participants: Json | null
          points: number | null
          priority: Database["public"]["Enums"]["approval_priority"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean | null
          participant_scope?: string | null
          participants?: Json | null
          points?: number | null
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean | null
          participant_scope?: string | null
          participants?: Json | null
          points?: number | null
          priority?: Database["public"]["Enums"]["approval_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_creation_requests: {
        Row: {
          access_permissions: Json | null
          area_id: string | null
          company_id: string
          created_at: string | null
          department_id: string | null
          email: string
          full_name: string
          gerencia_id: string | null
          id: string
          justification: string | null
          position_id: string | null
          proposed_role: string
          requested_by: string
          responsible_email: string | null
          responsible_name: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          access_permissions?: Json | null
          area_id?: string | null
          company_id: string
          created_at?: string | null
          department_id?: string | null
          email: string
          full_name: string
          gerencia_id?: string | null
          id?: string
          justification?: string | null
          position_id?: string | null
          proposed_role: string
          requested_by: string
          responsible_email?: string | null
          responsible_name?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          access_permissions?: Json | null
          area_id?: string | null
          company_id?: string
          created_at?: string | null
          department_id?: string | null
          email?: string
          full_name?: string
          gerencia_id?: string | null
          id?: string
          justification?: string | null
          position_id?: string | null
          proposed_role?: string
          requested_by?: string
          responsible_email?: string | null
          responsible_name?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_creation_requests_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_creation_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_creation_requests_gerencia_id_fkey"
            columns: ["gerencia_id"]
            isOneToOne: false
            referencedRelation: "gerencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_creation_requests_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          notification_type: string
          sound_id: string | null
          updated_at: string | null
          user_id: string
          volume: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          notification_type: string
          sound_id?: string | null
          updated_at?: string | null
          user_id: string
          volume?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          notification_type?: string
          sound_id?: string | null
          updated_at?: string | null
          user_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "notification_sounds"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          area_id: string | null
          can_upload_documents: boolean | null
          company_id: string | null
          created_at: string | null
          dashboard_visibility: Json | null
          department_id: string | null
          email: string | null
          facial_embedding: Json | null
          full_name: string | null
          gerencia_id: string | null
          id: string
          last_facial_verification: string | null
          position_id: string | null
          role: string | null
          sub_gerencia_id: string | null
          updated_at: string | null
        }
        Insert: {
          area_id?: string | null
          can_upload_documents?: boolean | null
          company_id?: string | null
          created_at?: string | null
          dashboard_visibility?: Json | null
          department_id?: string | null
          email?: string | null
          facial_embedding?: Json | null
          full_name?: string | null
          gerencia_id?: string | null
          id: string
          last_facial_verification?: string | null
          position_id?: string | null
          role?: string | null
          sub_gerencia_id?: string | null
          updated_at?: string | null
        }
        Update: {
          area_id?: string | null
          can_upload_documents?: boolean | null
          company_id?: string | null
          created_at?: string | null
          dashboard_visibility?: Json | null
          department_id?: string | null
          email?: string | null
          facial_embedding?: Json | null
          full_name?: string | null
          gerencia_id?: string | null
          id?: string
          last_facial_verification?: string | null
          position_id?: string | null
          role?: string | null
          sub_gerencia_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_gerencia_id_fkey"
            columns: ["gerencia_id"]
            isOneToOne: false
            referencedRelation: "gerencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_sub_gerencia_id_fkey"
            columns: ["sub_gerencia_id"]
            isOneToOne: false
            referencedRelation: "sub_gerencias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_call_signals: {
        Row: {
          created_at: string | null
          id: string
          room_id: string
          signal_data: Json
          signal_type: string
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          room_id: string
          signal_data: Json
          signal_type: string
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          room_id?: string
          signal_data?: Json
          signal_type?: string
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_profiles_public: {
        Row: {
          company_id: string | null
          full_name: string | null
          id: string | null
          role: string | null
        }
        Insert: {
          company_id?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
        }
        Update: {
          company_id?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_collective_memory: {
        Args: {
          p_area_category?: string
          p_company_id: string
          p_content: string
          p_source_id: string
          p_source_table: string
          p_source_type: string
          p_tags?: string[]
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      can_manage_users: { Args: { _user_id: string }; Returns: boolean }
      check_email_allowed: { Args: { p_email: string }; Returns: Json }
      create_notification: {
        Args: {
          p_action_url?: string
          p_company_id: string
          p_document_id?: string
          p_meeting_id?: string
          p_message: string
          p_priority?: Database["public"]["Enums"]["approval_priority"]
          p_ticket_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_user_company_id: { Args: { user_id: string }; Returns: string }
      get_user_facial_embedding: {
        Args: { target_user_id: string }
        Returns: {
          facial_embedding: Json
          last_facial_verification: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_document_access: {
        Args: { check_user_id: string; doc_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_participant: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
      save_facial_embedding: {
        Args: {
          new_embedding?: Json
          target_user_id: string
          update_timestamp?: boolean
        }
        Returns: undefined
      }
      seed_company_org_structure: {
        Args: { p_company_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "manager" | "employee" | "user"
      approval_priority: "baja" | "media" | "alta" | "urgente"
      approval_status: "pending" | "approved" | "rejected"
      chat_type:
        | "one_to_one"
        | "group_company"
        | "group_multi_company"
        | "global"
      knowledge_access_level:
        | "global_holding"
        | "empresa"
        | "proyecto"
        | "desarrollo"
        | "confidencial"
      meeting_request_status:
        | "pendiente"
        | "aprobada"
        | "rechazada"
        | "completada"
        | "pausada"
      meeting_status: "scheduled" | "confirmed" | "cancelled" | "completed"
      task_status: "pendiente" | "en_progreso" | "completada" | "bloqueada"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["superadmin", "admin", "manager", "employee", "user"],
      approval_priority: ["baja", "media", "alta", "urgente"],
      approval_status: ["pending", "approved", "rejected"],
      chat_type: [
        "one_to_one",
        "group_company",
        "group_multi_company",
        "global",
      ],
      knowledge_access_level: [
        "global_holding",
        "empresa",
        "proyecto",
        "desarrollo",
        "confidencial",
      ],
      meeting_request_status: [
        "pendiente",
        "aprobada",
        "rechazada",
        "completada",
        "pausada",
      ],
      meeting_status: ["scheduled", "confirmed", "cancelled", "completed"],
      task_status: ["pendiente", "en_progreso", "completada", "bloqueada"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
