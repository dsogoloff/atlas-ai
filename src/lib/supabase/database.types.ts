// Atlas Assessment — Supabase database type definitions.
//
// HAND-WRITTEN to match supabase/migrations/. Regenerate via
//   pnpm exec supabase gen types typescript --local > src/lib/supabase/database.types.ts
// once the supabase CLI is installed and the local stack is running. Until
// then, keep this file in sync with the migrations by hand.
//
// Conventions:
//   * Row = shape SELECTed from Postgres (all columns present).
//   * Insert = shape allowed in INSERT (defaults / generated columns optional).
//   * Update = shape allowed in UPDATE (everything optional).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          display_name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };

      centers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          status: Database["public"]["Enums"]["center_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          status?: Database["public"]["Enums"]["center_status"];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["centers"]["Insert"]>;
        Relationships: [];
      };

      parents: {
        Row: {
          id: string;
          auth_user_id: string;
          tenant_id: string;
          home_center_id: string | null;
          email: string;
          name: string;
          subscription_tier: Database["public"]["Enums"]["subscription_tier"];
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          tenant_id: string;
          home_center_id?: string | null;
          email: string;
          name: string;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["parents"]["Insert"]>;
        Relationships: [];
      };

      children: {
        Row: {
          id: string;
          tenant_id: string;
          parent_id: string;
          home_center_id: string | null;
          prior_center_id: string | null;
          center_changed_at: string | null;
          name: string;
          birth_year: number;
          grade_level: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          parent_id: string;
          home_center_id?: string | null;
          prior_center_id?: string | null;
          center_changed_at?: string | null;
          name: string;
          birth_year: number;
          grade_level?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["children"]["Insert"]>;
        Relationships: [];
      };

      instructors: {
        Row: {
          id: string;
          auth_user_id: string;
          tenant_id: string;
          center_id: string;
          email: string;
          name: string;
          status: Database["public"]["Enums"]["instructor_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          tenant_id: string;
          center_id: string;
          email: string;
          name: string;
          status?: Database["public"]["Enums"]["instructor_status"];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["instructors"]["Insert"]>;
        Relationships: [];
      };

      pedagogical_notes: {
        Row: {
          id: string;
          tenant_id: string;
          child_id: string;
          instructor_id: string;
          authored_at_center_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          child_id: string;
          instructor_id: string;
          authored_at_center_id: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pedagogical_notes"]["Insert"]>;
        Relationships: [];
      };

      misconceptions: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          strand: Database["public"]["Enums"]["strand"];
          label: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code: string;
          strand: Database["public"]["Enums"]["strand"];
          label: string;
          description: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["misconceptions"]["Insert"]>;
        Relationships: [];
      };

      curriculum_recommendations: {
        Row: {
          id: string;
          tenant_id: string;
          strand: Database["public"]["Enums"]["strand"];
          level: Database["public"]["Enums"]["half_grade_level"];
          primary_recommendation: string;
          supplementary: string[];
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          strand: Database["public"]["Enums"]["strand"];
          level: Database["public"]["Enums"]["half_grade_level"];
          primary_recommendation: string;
          supplementary?: string[];
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["curriculum_recommendations"]["Insert"]
        >;
        Relationships: [];
      };

      questions: {
        Row: {
          id: string;
          tenant_id: string;
          external_id: string | null;
          strand: Database["public"]["Enums"]["strand"];
          level: Database["public"]["Enums"]["half_grade_level"];
          difficulty: number;
          format: Database["public"]["Enums"]["question_format"];
          content: Json;
          misconception_tags: string[];
          word_count: number;
          operation_type: Database["public"]["Enums"]["operation_type"];
          num_operations: number;
          representation: Database["public"]["Enums"]["representation_kind"];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          external_id?: string | null;
          strand: Database["public"]["Enums"]["strand"];
          level: Database["public"]["Enums"]["half_grade_level"];
          difficulty: number;
          format: Database["public"]["Enums"]["question_format"];
          content: Json;
          misconception_tags?: string[];
          word_count: number;
          operation_type: Database["public"]["Enums"]["operation_type"];
          num_operations: number;
          representation: Database["public"]["Enums"]["representation_kind"];
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
        Relationships: [];
      };

      assessment_sessions: {
        Row: {
          id: string;
          tenant_id: string;
          child_id: string;
          status: Database["public"]["Enums"]["assessment_status"];
          started_at: string;
          completed_at: string | null;
          current_estimate: Json | null;
          session_time_flag:
            | Database["public"]["Enums"]["session_time_flag"]
            | null;
          time_flag_summary: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          child_id: string;
          status?: Database["public"]["Enums"]["assessment_status"];
          started_at?: string;
          completed_at?: string | null;
          current_estimate?: Json | null;
          session_time_flag?:
            | Database["public"]["Enums"]["session_time_flag"]
            | null;
          time_flag_summary?: Json | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["assessment_sessions"]["Insert"]
        >;
        Relationships: [];
      };

      responses: {
        Row: {
          id: string;
          tenant_id: string;
          session_id: string;
          question_id: string;
          answer_given: string;
          is_correct: boolean;
          time_taken_seconds: number;
          expected_time_sec: number;
          time_ratio: number;
          time_flag: Database["public"]["Enums"]["time_flag"];
          time_flag_config_version: string;
          used_fallback: boolean;
          detected_misconceptions: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          session_id: string;
          question_id: string;
          answer_given: string;
          is_correct: boolean;
          time_taken_seconds: number;
          expected_time_sec: number;
          time_ratio: number;
          time_flag: Database["public"]["Enums"]["time_flag"];
          time_flag_config_version: string;
          used_fallback: boolean;
          detected_misconceptions?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["responses"]["Insert"]>;
        Relationships: [];
      };

      vpc_audit_log: {
        Row: {
          id: string;
          tenant_id: string;
          parent_id: string | null;
          event_type: Database["public"]["Enums"]["vpc_event_type"];
          center_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          parent_id?: string | null;
          event_type: Database["public"]["Enums"]["vpc_event_type"];
          center_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vpc_audit_log"]["Insert"]>;
        Relationships: [];
      };

      question_access_log: {
        Row: {
          id: number;
          tenant_id: string;
          question_id: string;
          session_id: string;
          child_id: string;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: string;
          question_id: string;
          session_id: string;
          child_id: string;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["question_access_log"]["Insert"]
        >;
        Relationships: [];
      };
    };

    Views: { [_ in never]: never };
    Functions: {
      app_current_parent_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      app_current_instructor_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      app_current_tenant_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      app_instructor_can_access_child: {
        Args: {
          p_home_center_id: string | null;
          p_prior_center_id: string | null;
          p_center_changed_at: string | null;
          p_child_tenant_id: string;
        };
        Returns: boolean;
      };
      app_instructor_can_write_for_child: {
        Args: { p_home_center_id: string; p_child_tenant_id: string };
        Returns: boolean;
      };
    };

    Enums: {
      center_status: "ACTIVE" | "INACTIVE";
      instructor_status: "ACTIVE" | "INACTIVE";
      subscription_tier: "PILOT";
      assessment_status: "IN_PROGRESS" | "COMPLETED";
      question_format: "MULTIPLE_CHOICE" | "NUMERIC_ENTRY" | "DRAG_DROP";
      strand:
        | "NUMBER_SENSE"
        | "OPERATIONS"
        | "WORD_PROBLEMS"
        | "FRACTIONS_DECIMALS"
        | "GEOMETRY"
        | "MEASUREMENT_DATA";
      half_grade_level:
        | "KA" | "KB"
        | "1A" | "1B"
        | "2A" | "2B"
        | "3A" | "3B"
        | "4A" | "4B"
        | "5A" | "5B"
        | "6A" | "6B"
        | "7A" | "7B"
        | "8A" | "8B";
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
        | "IDENTIFY";
      representation_kind:
        | "SYMBOLIC"
        | "PICTORIAL"
        | "BAR_MODEL_REQUIRED"
        | "WORD_PROBLEM_SINGLE"
        | "WORD_PROBLEM_MULTI";
      time_flag: "INVALID" | "TOO_FAST" | "TOO_SLOW" | "NORMAL";
      session_time_flag:
        | "unreliable"
        | "rushed"
        | "struggling"
        | "mixed"
        | "normal";
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
        | "center_grace_expired";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience aliases the rest of the codebase imports.
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
