export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          child_id: string | null
          created_at: string
          event_name: Database["public"]["Enums"]["analytics_event_name"]
          id: number
          props: Json
          session_id: string | null
          tenant_id: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          event_name: Database["public"]["Enums"]["analytics_event_name"]
          id?: number
          props?: Json
          session_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string
          event_name?: Database["public"]["Enums"]["analytics_event_name"]
          id?: number
          props?: Json
          session_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          child_id: string
          completed_at: string | null
          created_at: string
          current_estimate: Json | null
          engine_prior_version: string
          id: string
          session_time_flag:
            | Database["public"]["Enums"]["session_time_flag"]
            | null
          started_at: string
          status: Database["public"]["Enums"]["assessment_status"]
          tenant_id: string
          test_type: Database["public"]["Enums"]["assessment_test_type"]
          time_flag_summary: Json | null
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          created_at?: string
          current_estimate?: Json | null
          engine_prior_version?: string
          id?: string
          session_time_flag?:
            | Database["public"]["Enums"]["session_time_flag"]
            | null
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          tenant_id: string
          test_type?: Database["public"]["Enums"]["assessment_test_type"]
          time_flag_summary?: Json | null
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          created_at?: string
          current_estimate?: Json | null
          engine_prior_version?: string
          id?: string
          session_time_flag?:
            | Database["public"]["Enums"]["session_time_flag"]
            | null
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          tenant_id?: string
          test_type?: Database["public"]["Enums"]["assessment_test_type"]
          time_flag_summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["center_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["center_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["center_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_year: number
          center_changed_at: string | null
          created_at: string
          grade_level: string | null
          home_center_id: string | null
          id: string
          name: string
          parent_id: string
          prior_center_id: string | null
          tenant_id: string
        }
        Insert: {
          birth_year: number
          center_changed_at?: string | null
          created_at?: string
          grade_level?: string | null
          home_center_id?: string | null
          id?: string
          name: string
          parent_id: string
          prior_center_id?: string | null
          tenant_id: string
        }
        Update: {
          birth_year?: number
          center_changed_at?: string | null
          created_at?: string
          grade_level?: string | null
          home_center_id?: string | null
          id?: string
          name?: string
          parent_id?: string
          prior_center_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_home_center_id_fkey"
            columns: ["home_center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_prior_center_id_fkey"
            columns: ["prior_center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          child_id: string
          consent_text: string
          consent_text_version: string
          consent_type: string
          created_at: string
          data_uses: Json
          granted_at: string
          id: string
          ip_address: unknown
          parent_id: string
          revoked: boolean
          revoked_at: string | null
          sharing_permissions: Json
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          child_id: string
          consent_text: string
          consent_text_version: string
          consent_type: string
          created_at?: string
          data_uses?: Json
          granted_at?: string
          id?: string
          ip_address?: unknown
          parent_id: string
          revoked?: boolean
          revoked_at?: string | null
          sharing_permissions?: Json
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          child_id?: string
          consent_text?: string
          consent_text_version?: string
          consent_type?: string
          created_at?: string
          data_uses?: Json
          granted_at?: string
          id?: string
          ip_address?: unknown
          parent_id?: string
          revoked?: boolean
          revoked_at?: string | null
          sharing_permissions?: Json
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_recommendations: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["half_grade_level"]
          notes: string | null
          primary_recommendation: string
          strand: Database["public"]["Enums"]["strand"]
          supplementary: string[]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["half_grade_level"]
          notes?: string | null
          primary_recommendation: string
          strand: Database["public"]["Enums"]["strand"]
          supplementary?: string[]
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["half_grade_level"]
          notes?: string | null
          primary_recommendation?: string
          strand?: Database["public"]["Enums"]["strand"]
          supplementary?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          auth_user_id: string
          center_id: string
          created_at: string
          email: string
          id: string
          name: string
          status: Database["public"]["Enums"]["instructor_status"]
          tenant_id: string
        }
        Insert: {
          auth_user_id: string
          center_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["instructor_status"]
          tenant_id: string
        }
        Update: {
          auth_user_id?: string
          center_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["instructor_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructors_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_usefulness: {
        Row: {
          child_id: string
          comment: string | null
          created_at: string
          id: string
          instructor_id: string
          rating: number
          session_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          child_id: string
          comment?: string | null
          created_at?: string
          id?: string
          instructor_id: string
          rating: number
          session_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          instructor_id?: string
          rating?: number
          session_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_usefulness_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_usefulness_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_usefulness_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructor_usefulness_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      misconceptions: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          label: string
          strand: Database["public"]["Enums"]["strand"]
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          label: string
          strand: Database["public"]["Enums"]["strand"]
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          label?: string
          strand?: Database["public"]["Enums"]["strand"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "misconceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_satisfaction: {
        Row: {
          child_id: string
          comment: string | null
          created_at: string
          id: string
          parent_id: string
          rating: number
          session_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          child_id: string
          comment?: string | null
          created_at?: string
          id?: string
          parent_id: string
          rating: number
          session_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          parent_id?: string
          rating?: number
          session_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_satisfaction_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_satisfaction_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_satisfaction_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_satisfaction_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          home_center_id: string | null
          id: string
          name: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          tenant_id: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          home_center_id?: string | null
          id?: string
          name: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tenant_id: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          home_center_id?: string | null
          id?: string
          name?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_home_center_id_fkey"
            columns: ["home_center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pedagogical_notes: {
        Row: {
          authored_at_center_id: string
          body: string
          child_id: string
          created_at: string
          id: string
          instructor_id: string
          tenant_id: string
        }
        Insert: {
          authored_at_center_id: string
          body: string
          child_id: string
          created_at?: string
          id?: string
          instructor_id: string
          tenant_id: string
        }
        Update: {
          authored_at_center_id?: string
          body?: string
          child_id?: string
          created_at?: string
          id?: string
          instructor_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedagogical_notes_authored_at_center_id_fkey"
            columns: ["authored_at_center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedagogical_notes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedagogical_notes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedagogical_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      question_access_log: {
        Row: {
          child_id: string
          created_at: string
          id: number
          ip_address: unknown
          question_id: string
          session_id: string
          tenant_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: number
          ip_address?: unknown
          question_id: string
          session_id: string
          tenant_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: number
          ip_address?: unknown
          question_id?: string
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_access_log_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_access_log_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_access_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_access_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          content: Json
          content_id: string | null
          created_at: string
          difficulty: number
          external_id: string | null
          format: Database["public"]["Enums"]["question_format"]
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["half_grade_level"]
          misconception_tags: string[]
          num_operations: number
          operation_type: Database["public"]["Enums"]["operation_type"]
          representation: Database["public"]["Enums"]["representation_kind"]
          strand: Database["public"]["Enums"]["strand"]
          tenant_id: string
          word_count: number
        }
        Insert: {
          content: Json
          content_id?: string | null
          created_at?: string
          difficulty: number
          external_id?: string | null
          format: Database["public"]["Enums"]["question_format"]
          id?: string
          is_active?: boolean
          level: Database["public"]["Enums"]["half_grade_level"]
          misconception_tags?: string[]
          num_operations: number
          operation_type: Database["public"]["Enums"]["operation_type"]
          representation: Database["public"]["Enums"]["representation_kind"]
          strand: Database["public"]["Enums"]["strand"]
          tenant_id: string
          word_count: number
        }
        Update: {
          content?: Json
          content_id?: string | null
          created_at?: string
          difficulty?: number
          external_id?: string | null
          format?: Database["public"]["Enums"]["question_format"]
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["half_grade_level"]
          misconception_tags?: string[]
          num_operations?: number
          operation_type?: Database["public"]["Enums"]["operation_type"]
          representation?: Database["public"]["Enums"]["representation_kind"]
          strand?: Database["public"]["Enums"]["strand"]
          tenant_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "tax_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_narrations: {
        Row: {
          findings_growth_areas: string[] | null
          findings_strengths: string[] | null
          generated_at: string
          model: string
          placement_line: string | null
          recommendations_lede: string | null
          session_id: string
          status: string
          strand_lede: string | null
          tenant_id: string
        }
        Insert: {
          findings_growth_areas?: string[] | null
          findings_strengths?: string[] | null
          generated_at?: string
          model: string
          placement_line?: string | null
          recommendations_lede?: string | null
          session_id: string
          status: string
          strand_lede?: string | null
          tenant_id: string
        }
        Update: {
          findings_growth_areas?: string[] | null
          findings_strengths?: string[] | null
          generated_at?: string
          model?: string
          placement_line?: string | null
          recommendations_lede?: string | null
          session_id?: string
          status?: string
          strand_lede?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_narrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_narrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          answer_given: string
          created_at: string
          detected_misconceptions: string[]
          expected_time_sec: number
          id: string
          is_correct: boolean
          misconception_classifier_method: Database["public"]["Enums"]["misconception_classifier_method"]
          misconception_classifier_version: string | null
          question_id: string
          session_id: string
          tenant_id: string
          time_flag: Database["public"]["Enums"]["time_flag"]
          time_flag_config_version: string
          time_ratio: number
          time_taken_seconds: number
          used_fallback: boolean
        }
        Insert: {
          answer_given: string
          created_at?: string
          detected_misconceptions?: string[]
          expected_time_sec: number
          id?: string
          is_correct: boolean
          misconception_classifier_method?: Database["public"]["Enums"]["misconception_classifier_method"]
          misconception_classifier_version?: string | null
          question_id: string
          session_id: string
          tenant_id: string
          time_flag: Database["public"]["Enums"]["time_flag"]
          time_flag_config_version: string
          time_ratio: number
          time_taken_seconds: number
          used_fallback: boolean
        }
        Update: {
          answer_given?: string
          created_at?: string
          detected_misconceptions?: string[]
          expected_time_sec?: number
          id?: string
          is_correct?: boolean
          misconception_classifier_method?: Database["public"]["Enums"]["misconception_classifier_method"]
          misconception_classifier_version?: string | null
          question_id?: string
          session_id?: string
          tenant_id?: string
          time_flag?: Database["public"]["Enums"]["time_flag"]
          time_flag_config_version?: string
          time_ratio?: number
          time_taken_seconds?: number
          used_fallback?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_content: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          level_id: string
          mvp: boolean
          name: string
          sub_strand_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order: number
          id?: string
          level_id: string
          mvp: boolean
          name: string
          sub_strand_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          level_id?: string
          mvp?: boolean
          name?: string
          sub_strand_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_content_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "tax_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_content_sub_strand_id_fkey"
            columns: ["sub_strand_id"]
            isOneToOne: false
            referencedRelation: "tax_sub_strands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_content_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_levels: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          mvp: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order: number
          id?: string
          mvp: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          mvp?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_levels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_strands: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order: number
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_strands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_sub_strands: {
        Row: {
          applies_to_level_codes: string[]
          code: string
          created_at: string
          display_order: number
          id: string
          name: string
          strand_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applies_to_level_codes?: string[]
          code: string
          created_at?: string
          display_order: number
          id?: string
          name: string
          strand_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applies_to_level_codes?: string[]
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          strand_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_sub_strands_strand_id_fkey"
            columns: ["strand_id"]
            isOneToOne: false
            referencedRelation: "tax_strands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_sub_strands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          display_name: string
          id: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          slug: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          slug?: string
        }
        Relationships: []
      }
      vpc_audit_log: {
        Row: {
          center_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["vpc_event_type"]
          id: string
          ip_address: unknown
          metadata: Json | null
          parent_id: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["vpc_event_type"]
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          parent_id?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["vpc_event_type"]
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          parent_id?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vpc_audit_log_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vpc_audit_log_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vpc_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_current_instructor_id: { Args: never; Returns: string }
      app_current_parent_id: { Args: never; Returns: string }
      app_current_tenant_id: { Args: never; Returns: string }
      app_instructor_can_access_child: {
        Args: {
          p_center_changed_at: string
          p_child_tenant_id: string
          p_home_center_id: string
          p_prior_center_id: string
        }
        Returns: boolean
      }
      app_instructor_can_write_for_child: {
        Args: { p_child_tenant_id: string; p_home_center_id: string }
        Returns: boolean
      }
    }
    Enums: {
      analytics_event_name:
        | "landing_viewed"
        | "parent_consent_completed"
        | "child_profile_created"
        | "short_test_started"
        | "short_test_item_answered"
        | "short_test_completed"
        | "short_result_viewed"
        | "comprehensive_test_started"
        | "comprehensive_item_answered"
        | "comprehensive_test_completed"
        | "parent_report_generated"
        | "parent_report_viewed"
        | "center_followup_opted_in"
        | "parent_satisfaction_submitted"
        | "instructor_report_viewed"
        | "placement_recommendation_created"
        | "instructor_usefulness_submitted"
      assessment_status: "IN_PROGRESS" | "COMPLETED"
      assessment_test_type: "short" | "comprehensive"
      center_status: "ACTIVE" | "INACTIVE"
      half_grade_level:
        | "KA"
        | "KB"
        | "1A"
        | "1B"
        | "2A"
        | "2B"
        | "3A"
        | "3B"
        | "4A"
        | "4B"
        | "5A"
        | "5B"
        | "6A"
        | "6B"
        | "7A"
        | "7B"
        | "8A"
        | "8B"
      instructor_status: "ACTIVE" | "INACTIVE"
      misconception_classifier_method:
        | "none"
        | "distractor-map"
        | "haiku"
        | "failed"
      operation_type:
        | "ADDITION"
        | "SUBTRACTION"
        | "MULTIPLICATION"
        | "DIVISION"
        | "FRACTION_OP"
        | "DECIMAL_OP"
        | "PERCENT_OP"
        | "GEOMETRY"
        | "MEASUREMENT"
        | "PATTERN"
        | "ALGEBRA"
        | "COUNTING"
        | "IDENTIFY"
      question_format:
        | "MULTIPLE_CHOICE"
        | "NUMERIC_ENTRY"
        | "DRAG_DROP"
        | "TEXT_ENTRY"
      representation_kind:
        | "SYMBOLIC"
        | "PICTORIAL"
        | "BAR_MODEL_REQUIRED"
        | "WORD_PROBLEM_SINGLE"
        | "WORD_PROBLEM_MULTI"
      session_time_flag:
        | "unreliable"
        | "rushed"
        | "struggling"
        | "mixed"
        | "normal"
      strand:
        | "number_sense"
        | "operations_algorithms"
        | "fractions_decimals"
        | "measurement"
        | "geometry"
        | "data_statistics"
      subscription_tier: "PILOT"
      time_flag: "INVALID" | "TOO_FAST" | "TOO_SLOW" | "NORMAL"
      vpc_event_type:
        | "consent_initiated"
        | "verification_sent"
        | "verification_clicked"
        | "verification_succeeded"
        | "verification_failed"
        | "consent_revoked"
        | "center_selected"
        | "center_changed"
        | "center_restored"
        | "center_removed"
        | "center_grace_expired"
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
      assessment_status: ["IN_PROGRESS", "COMPLETED"],
      center_status: ["ACTIVE", "INACTIVE"],
      half_grade_level: [
        "KA",
        "KB",
        "1A",
        "1B",
        "2A",
        "2B",
        "3A",
        "3B",
        "4A",
        "4B",
        "5A",
        "5B",
        "6A",
        "6B",
        "7A",
        "7B",
        "8A",
        "8B",
      ],
      instructor_status: ["ACTIVE", "INACTIVE"],
      misconception_classifier_method: [
        "none",
        "distractor-map",
        "haiku",
        "failed",
      ],
      operation_type: [
        "ADDITION",
        "SUBTRACTION",
        "MULTIPLICATION",
        "DIVISION",
        "FRACTION_OP",
        "DECIMAL_OP",
        "PERCENT_OP",
        "GEOMETRY",
        "MEASUREMENT",
        "PATTERN",
        "ALGEBRA",
        "COUNTING",
        "IDENTIFY",
      ],
      question_format: [
        "MULTIPLE_CHOICE",
        "NUMERIC_ENTRY",
        "DRAG_DROP",
        "TEXT_ENTRY",
      ],
      representation_kind: [
        "SYMBOLIC",
        "PICTORIAL",
        "BAR_MODEL_REQUIRED",
        "WORD_PROBLEM_SINGLE",
        "WORD_PROBLEM_MULTI",
      ],
      session_time_flag: [
        "unreliable",
        "rushed",
        "struggling",
        "mixed",
        "normal",
      ],
      strand: [
        "number_sense",
        "operations_algorithms",
        "fractions_decimals",
        "measurement",
        "geometry",
        "data_statistics",
      ],
      subscription_tier: ["PILOT"],
      time_flag: ["INVALID", "TOO_FAST", "TOO_SLOW", "NORMAL"],
      vpc_event_type: [
        "consent_initiated",
        "verification_sent",
        "verification_clicked",
        "verification_succeeded",
        "verification_failed",
        "consent_revoked",
        "center_selected",
        "center_changed",
        "center_restored",
        "center_removed",
        "center_grace_expired",
      ],
    },
  },
} as const

