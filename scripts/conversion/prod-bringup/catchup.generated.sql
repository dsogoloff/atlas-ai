-- ============================================================================
-- Atlas Assessment — PROD schema catch-up (GENERATED, additive-only, idempotent)
-- Generated: 2026-06-27T21:19:22.819Z
-- Source (canonical EXPECTED): LOCAL 127.0.0.1:54322 (post-reset full migration set)
-- Target: PROD atlas-assessment / ntfaqzueppqymfkefadm
--
-- APPLY IN PROD STUDIO (founder, attended). NEVER `supabase db push` to prod.
-- Every statement is guarded (IF NOT EXISTS / DO-block pg_policies check) so re-runs
-- converge and nothing fails on existing objects/rows. No DROP, no retype, no
-- NOT NULL tightening of existing columns. Divergences are in catchup.review.md.
--
-- NOTE: prod RLS policies + constraints are NOT readable via PostgREST (no prod DB
-- password). Section 5 therefore emits ALL local policies guarded by a pg_policies
-- check evaluated AT APPLY TIME in prod — already-present policies are skipped.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1 — Missing enum TYPES (DO-guarded CREATE TYPE)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='analytics_event_name') THEN
    CREATE TYPE public."analytics_event_name" AS ENUM ('landing_viewed', 'parent_consent_completed', 'child_profile_created', 'short_test_started', 'short_test_item_answered', 'short_test_completed', 'short_result_viewed', 'parent_report_generated', 'parent_report_viewed', 'center_followup_opted_in', 'parent_satisfaction_submitted', 'comprehensive_test_started', 'comprehensive_item_answered', 'comprehensive_test_completed', 'instructor_report_viewed', 'placement_recommendation_created', 'instructor_usefulness_submitted');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='misconception_classifier_method') THEN
    CREATE TYPE public."misconception_classifier_method" AS ENUM ('none', 'distractor-map', 'haiku', 'failed');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 2 — Missing enum VALUES (ALTER TYPE ... ADD VALUE IF NOT EXISTS)
-- ---------------------------------------------------------------------------
-- (none)

-- ---------------------------------------------------------------------------
-- SECTION 3 — Missing TABLES (CREATE TABLE IF NOT EXISTS + ENABLE RLS)
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public."analytics_events_id_seq";

CREATE TABLE IF NOT EXISTS public."analytics_events" (
  "id" bigint NOT NULL DEFAULT nextval('analytics_events_id_seq'::regclass),
  "tenant_id" uuid,
  "event_name" analytics_event_name NOT NULL,
  "child_id" uuid,
  "session_id" uuid,
  "props" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."analytics_events" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public."follow_up_leads" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "child_id" uuid,
  "session_id" uuid,
  "school_name" text,
  "parent_name" text NOT NULL,
  "parent_email" text NOT NULL,
  "parent_phone" text,
  "best_time_to_reach" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "opted_in" boolean NOT NULL DEFAULT false,
  "zip" text,
  CONSTRAINT "follow_up_leads_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."follow_up_leads" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public."instructor_usefulness" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "instructor_id" uuid NOT NULL,
  "child_id" uuid NOT NULL,
  "session_id" uuid NOT NULL,
  "rating" smallint NOT NULL,
  "comment" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "instructor_usefulness_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."instructor_usefulness" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public."parent_satisfaction" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "parent_id" uuid NOT NULL,
  "child_id" uuid NOT NULL,
  "session_id" uuid NOT NULL,
  "rating" smallint NOT NULL,
  "comment" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "parent_satisfaction_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."parent_satisfaction" ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE public."analytics_events_id_seq" OWNED BY public."analytics_events"."id";

-- ---------------------------------------------------------------------------
-- SECTION 4 — Missing COLUMNS (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
-- ---------------------------------------------------------------------------
ALTER TABLE public."responses" ADD COLUMN IF NOT EXISTS "expected_time_sec" numeric(10,3); -- NOTE: local is NOT NULL w/o default; added NULLABLE (see catchup.review.md)
ALTER TABLE public."responses" ADD COLUMN IF NOT EXISTS "time_ratio" numeric(8,4); -- NOTE: local is NOT NULL w/o default; added NULLABLE (see catchup.review.md)
ALTER TABLE public."responses" ADD COLUMN IF NOT EXISTS "time_flag_config_version" text; -- NOTE: local is NOT NULL w/o default; added NULLABLE (see catchup.review.md)
ALTER TABLE public."responses" ADD COLUMN IF NOT EXISTS "used_fallback" boolean; -- NOTE: local is NOT NULL w/o default; added NULLABLE (see catchup.review.md)
ALTER TABLE public."responses" ADD COLUMN IF NOT EXISTS "misconception_classifier_method" misconception_classifier_method NOT NULL DEFAULT 'none'::misconception_classifier_method;
ALTER TABLE public."responses" ADD COLUMN IF NOT EXISTS "misconception_classifier_version" text;

-- ---------------------------------------------------------------------------
-- SECTION 5 — RLS: ENABLE (idempotent) + guarded CREATE POLICY (all local policies)
-- ---------------------------------------------------------------------------
ALTER TABLE public."admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."analytics_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."assessment_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."centers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."children" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."consent_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."curriculum_recommendations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."follow_up_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."instructor_usefulness" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."instructors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."misconceptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."parent_satisfaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."parents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pedagogical_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."question_access_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."report_narrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tax_content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tax_levels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tax_strands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tax_sub_strands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vpc_audit_log" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admins' AND policyname='admins_self_select') THEN
    CREATE POLICY "admins_self_select" ON public."admins" AS PERMISSIVE FOR SELECT TO public USING ((auth_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assessment_sessions' AND policyname='assessment_sessions_admin_select') THEN
    CREATE POLICY "assessment_sessions_admin_select" ON public."assessment_sessions" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_admin_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assessment_sessions' AND policyname='assessment_sessions_instructor_select') THEN
    CREATE POLICY "assessment_sessions_instructor_select" ON public."assessment_sessions" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM children c
  WHERE ((c.id = assessment_sessions.child_id) AND app_instructor_can_access_child(c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id)))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='assessment_sessions' AND policyname='assessment_sessions_parent_select') THEN
    CREATE POLICY "assessment_sessions_parent_select" ON public."assessment_sessions" AS PERMISSIVE FOR SELECT TO public USING ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = app_current_parent_id()))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='centers' AND policyname='centers_tenant_select') THEN
    CREATE POLICY "centers_tenant_select" ON public."centers" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='children' AND policyname='children_admin_select') THEN
    CREATE POLICY "children_admin_select" ON public."children" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_admin_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='children' AND policyname='children_instructor_select') THEN
    CREATE POLICY "children_instructor_select" ON public."children" AS PERMISSIVE FOR SELECT TO public USING (app_instructor_can_access_child(home_center_id, prior_center_id, center_changed_at, tenant_id));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='children' AND policyname='children_parent_all') THEN
    CREATE POLICY "children_parent_all" ON public."children" AS PERMISSIVE FOR ALL TO public USING ((parent_id = app_current_parent_id())) WITH CHECK ((parent_id = app_current_parent_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='consent_records' AND policyname='consent_records_self_select') THEN
    CREATE POLICY "consent_records_self_select" ON public."consent_records" AS PERMISSIVE FOR SELECT TO public USING ((parent_id = app_current_parent_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='curriculum_recommendations' AND policyname='curriculum_recommendations_tenant_select') THEN
    CREATE POLICY "curriculum_recommendations_tenant_select" ON public."curriculum_recommendations" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='instructor_usefulness' AND policyname='instructor_usefulness_author_update') THEN
    CREATE POLICY "instructor_usefulness_author_update" ON public."instructor_usefulness" AS PERMISSIVE FOR UPDATE TO public USING ((instructor_id = app_current_instructor_id())) WITH CHECK ((instructor_id = app_current_instructor_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='instructor_usefulness' AND policyname='instructor_usefulness_instructor_insert') THEN
    CREATE POLICY "instructor_usefulness_instructor_insert" ON public."instructor_usefulness" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((instructor_id = app_current_instructor_id()) AND (EXISTS ( SELECT 1
   FROM children c
  WHERE ((c.id = instructor_usefulness.child_id) AND app_instructor_can_write_for_child(c.home_center_id, c.tenant_id))))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='instructor_usefulness' AND policyname='instructor_usefulness_instructor_select') THEN
    CREATE POLICY "instructor_usefulness_instructor_select" ON public."instructor_usefulness" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM children c
  WHERE ((c.id = instructor_usefulness.child_id) AND app_instructor_can_access_child(c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id)))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='instructors' AND policyname='instructors_self_select') THEN
    CREATE POLICY "instructors_self_select" ON public."instructors" AS PERMISSIVE FOR SELECT TO public USING ((auth_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='misconceptions' AND policyname='misconceptions_tenant_select') THEN
    CREATE POLICY "misconceptions_tenant_select" ON public."misconceptions" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parent_satisfaction' AND policyname='parent_satisfaction_self_select') THEN
    CREATE POLICY "parent_satisfaction_self_select" ON public."parent_satisfaction" AS PERMISSIVE FOR SELECT TO public USING ((parent_id = app_current_parent_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parents' AND policyname='parents_instructor_select') THEN
    CREATE POLICY "parents_instructor_select" ON public."parents" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM instructors i
  WHERE ((i.auth_user_id = auth.uid()) AND (i.status = 'ACTIVE'::instructor_status) AND (i.tenant_id = parents.tenant_id) AND (i.center_id = parents.home_center_id)))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parents' AND policyname='parents_self_insert') THEN
    CREATE POLICY "parents_self_insert" ON public."parents" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parents' AND policyname='parents_self_select') THEN
    CREATE POLICY "parents_self_select" ON public."parents" AS PERMISSIVE FOR SELECT TO public USING ((auth_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='parents' AND policyname='parents_self_update') THEN
    CREATE POLICY "parents_self_update" ON public."parents" AS PERMISSIVE FOR UPDATE TO public USING ((auth_user_id = auth.uid())) WITH CHECK ((auth_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pedagogical_notes' AND policyname='pedagogical_notes_admin_select') THEN
    CREATE POLICY "pedagogical_notes_admin_select" ON public."pedagogical_notes" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_admin_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pedagogical_notes' AND policyname='pedagogical_notes_author_update') THEN
    CREATE POLICY "pedagogical_notes_author_update" ON public."pedagogical_notes" AS PERMISSIVE FOR UPDATE TO public USING ((instructor_id = app_current_instructor_id())) WITH CHECK ((instructor_id = app_current_instructor_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pedagogical_notes' AND policyname='pedagogical_notes_instructor_insert') THEN
    CREATE POLICY "pedagogical_notes_instructor_insert" ON public."pedagogical_notes" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((instructor_id = app_current_instructor_id()) AND (EXISTS ( SELECT 1
   FROM children c
  WHERE ((c.id = pedagogical_notes.child_id) AND app_instructor_can_write_for_child(c.home_center_id, c.tenant_id))))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pedagogical_notes' AND policyname='pedagogical_notes_instructor_select') THEN
    CREATE POLICY "pedagogical_notes_instructor_select" ON public."pedagogical_notes" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM children c
  WHERE ((c.id = pedagogical_notes.child_id) AND app_instructor_can_access_child(c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id)))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_narrations' AND policyname='report_narrations_instructor_select') THEN
    CREATE POLICY "report_narrations_instructor_select" ON public."report_narrations" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (assessment_sessions s
     JOIN children c ON ((c.id = s.child_id)))
  WHERE ((s.id = report_narrations.session_id) AND app_instructor_can_access_child(c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id)))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='report_narrations' AND policyname='report_narrations_parent_select') THEN
    CREATE POLICY "report_narrations_parent_select" ON public."report_narrations" AS PERMISSIVE FOR SELECT TO public USING ((session_id IN ( SELECT s.id
   FROM (assessment_sessions s
     JOIN children c ON ((c.id = s.child_id)))
  WHERE (c.parent_id = app_current_parent_id()))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='responses' AND policyname='responses_instructor_select') THEN
    CREATE POLICY "responses_instructor_select" ON public."responses" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM (assessment_sessions s
     JOIN children c ON ((c.id = s.child_id)))
  WHERE ((s.id = responses.session_id) AND app_instructor_can_access_child(c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id)))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='responses' AND policyname='responses_parent_select') THEN
    CREATE POLICY "responses_parent_select" ON public."responses" AS PERMISSIVE FOR SELECT TO public USING ((session_id IN ( SELECT s.id
   FROM (assessment_sessions s
     JOIN children c ON ((c.id = s.child_id)))
  WHERE (c.parent_id = app_current_parent_id()))));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tax_content' AND policyname='tax_content_tenant_select') THEN
    CREATE POLICY "tax_content_tenant_select" ON public."tax_content" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tax_levels' AND policyname='tax_levels_tenant_select') THEN
    CREATE POLICY "tax_levels_tenant_select" ON public."tax_levels" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tax_strands' AND policyname='tax_strands_tenant_select') THEN
    CREATE POLICY "tax_strands_tenant_select" ON public."tax_strands" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tax_sub_strands' AND policyname='tax_sub_strands_tenant_select') THEN
    CREATE POLICY "tax_sub_strands_tenant_select" ON public."tax_sub_strands" AS PERMISSIVE FOR SELECT TO public USING ((tenant_id = app_current_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_member_select') THEN
    CREATE POLICY "tenants_member_select" ON public."tenants" AS PERMISSIVE FOR SELECT TO public USING ((id = app_current_tenant_id()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vpc_audit_log' AND policyname='vpc_audit_log_self_select') THEN
    CREATE POLICY "vpc_audit_log_self_select" ON public."vpc_audit_log" AS PERMISSIVE FOR SELECT TO public USING ((parent_id = app_current_parent_id()));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 6 — Best-effort additive constraints & indexes for NEW tables (guarded)
-- (existing-table constraints/indexes are NOT reconciled here — see catchup.review.md)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='analytics_events_child_id_fkey') THEN
    ALTER TABLE public."analytics_events" ADD CONSTRAINT "analytics_events_child_id_fkey" FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='analytics_events_session_id_fkey') THEN
    ALTER TABLE public."analytics_events" ADD CONSTRAINT "analytics_events_session_id_fkey" FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='analytics_events_tenant_id_fkey') THEN
    ALTER TABLE public."analytics_events" ADD CONSTRAINT "analytics_events_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='follow_up_leads_child_id_fkey') THEN
    ALTER TABLE public."follow_up_leads" ADD CONSTRAINT "follow_up_leads_child_id_fkey" FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='follow_up_leads_session_id_fkey') THEN
    ALTER TABLE public."follow_up_leads" ADD CONSTRAINT "follow_up_leads_session_id_fkey" FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='follow_up_leads_tenant_id_fkey') THEN
    ALTER TABLE public."follow_up_leads" ADD CONSTRAINT "follow_up_leads_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='instructor_usefulness_child_id_fkey') THEN
    ALTER TABLE public."instructor_usefulness" ADD CONSTRAINT "instructor_usefulness_child_id_fkey" FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='instructor_usefulness_instructor_id_fkey') THEN
    ALTER TABLE public."instructor_usefulness" ADD CONSTRAINT "instructor_usefulness_instructor_id_fkey" FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='instructor_usefulness_rating_check') THEN
    ALTER TABLE public."instructor_usefulness" ADD CONSTRAINT "instructor_usefulness_rating_check" CHECK (((rating >= 1) AND (rating <= 5)));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='instructor_usefulness_session_id_fkey') THEN
    ALTER TABLE public."instructor_usefulness" ADD CONSTRAINT "instructor_usefulness_session_id_fkey" FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='instructor_usefulness_session_id_instructor_id_key') THEN
    ALTER TABLE public."instructor_usefulness" ADD CONSTRAINT "instructor_usefulness_session_id_instructor_id_key" UNIQUE (session_id, instructor_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='instructor_usefulness_tenant_id_fkey') THEN
    ALTER TABLE public."instructor_usefulness" ADD CONSTRAINT "instructor_usefulness_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='parent_satisfaction_child_id_fkey') THEN
    ALTER TABLE public."parent_satisfaction" ADD CONSTRAINT "parent_satisfaction_child_id_fkey" FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='parent_satisfaction_parent_id_fkey') THEN
    ALTER TABLE public."parent_satisfaction" ADD CONSTRAINT "parent_satisfaction_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='parent_satisfaction_rating_check') THEN
    ALTER TABLE public."parent_satisfaction" ADD CONSTRAINT "parent_satisfaction_rating_check" CHECK (((rating >= 1) AND (rating <= 5)));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='parent_satisfaction_session_id_fkey') THEN
    ALTER TABLE public."parent_satisfaction" ADD CONSTRAINT "parent_satisfaction_session_id_fkey" FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='parent_satisfaction_session_id_key') THEN
    ALTER TABLE public."parent_satisfaction" ADD CONSTRAINT "parent_satisfaction_session_id_key" UNIQUE (session_id);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public' AND con.conname='parent_satisfaction_tenant_id_fkey') THEN
    ALTER TABLE public."parent_satisfaction" ADD CONSTRAINT "parent_satisfaction_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON public.analytics_events USING btree (created_at);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON public.analytics_events USING btree (event_name);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON public.analytics_events USING btree (session_id);
CREATE INDEX IF NOT EXISTS analytics_events_tenant_idx ON public.analytics_events USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS instructor_usefulness_instructor_idx ON public.instructor_usefulness USING btree (instructor_id);
CREATE INDEX IF NOT EXISTS instructor_usefulness_tenant_idx ON public.instructor_usefulness USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS parent_satisfaction_parent_idx ON public.parent_satisfaction USING btree (parent_id);
CREATE INDEX IF NOT EXISTS parent_satisfaction_tenant_idx ON public.parent_satisfaction USING btree (tenant_id);
