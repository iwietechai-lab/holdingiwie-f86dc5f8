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
          timestampt: string | null
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
          timestampt?: string | null
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
          timestampt?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      chat_messages: {
        Row: {
          chatbot_id: string | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          chatbot_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          user_id: string
        }
        Update: {
          chatbot_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
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
          tipo: string
          updated_at: string | null
          user_id: string | null
          version: number | null
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
          tipo: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
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
          tipo?: string
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
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
          area: string
          assigned_to: Json
          company_id: string
          created_at: string | null
          created_by: string
          development_notes: string | null
          execution_time: unknown
          final_results: string | null
          id: string
          improvement_proposals: string | null
          new_ideas: string | null
          partial_results: string | null
          priority: Database["public"]["Enums"]["approval_priority"]
          problems: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          team_members: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          area: string
          assigned_to?: Json
          company_id: string
          created_at?: string | null
          created_by: string
          development_notes?: string | null
          execution_time?: unknown
          final_results?: string | null
          id?: string
          improvement_proposals?: string | null
          new_ideas?: string | null
          partial_results?: string | null
          priority?: Database["public"]["Enums"]["approval_priority"]
          problems?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          team_members?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          area?: string
          assigned_to?: Json
          company_id?: string
          created_at?: string | null
          created_by?: string
          development_notes?: string | null
          execution_time?: unknown
          final_results?: string | null
          id?: string
          improvement_proposals?: string | null
          new_ideas?: string | null
          partial_results?: string | null
          priority?: Database["public"]["Enums"]["approval_priority"]
          problems?: string | null
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
          company_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
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
          company_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
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
          company_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
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
      [_ in never]: never
    }
    Functions: {
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
      ],
      meeting_status: ["scheduled", "confirmed", "cancelled", "completed"],
      task_status: ["pendiente", "en_progreso", "completada", "bloqueada"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
