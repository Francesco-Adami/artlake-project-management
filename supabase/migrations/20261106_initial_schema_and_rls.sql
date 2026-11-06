-- ============================================================================
-- ARTLAKE STUDIO TASK & PROJECT MANAGEMENT WEB APP
-- Migration: 20261106_initial_schema_and_rls.sql
-- Description: Full 10-table schema, circular FK resolution, performance indexes,
--              auto-binding triggers, helper functions, and strict RLS policies.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES (Extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    initials VARCHAR(4) NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    department TEXT NOT NULL DEFAULT 'Core Dev',
    active_task_id UUID, -- Circular FK added via ALTER TABLE below
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 2. PROJECTS (Studio Projects / Workspaces)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 3. PROJECT_MEMBERS (Project Whitelist & Invitations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_project_user_email UNIQUE (project_id, user_email)
);

-- ============================================================================
-- 4. TASKS (Project-Scoped Task Management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'blocked', 'in_review', 'completed')) DEFAULT 'not_started',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    department_tag TEXT NOT NULL DEFAULT '#CoreDev',
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    queue_order INT NOT NULL DEFAULT 0,
    estimated_minutes INT NOT NULL DEFAULT 0,
    logged_minutes INT NOT NULL DEFAULT 0,
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    blocker_reason TEXT,
    blocking_target TEXT,
    review_output_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Circular FK linking profile active hero task to tasks table
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS fk_profile_active_task;

ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profile_active_task 
FOREIGN KEY (active_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. SUBTASKS (Operational Checklist Items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 6. TIME_LOGS (Timer Sessions & Weekly Metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    duration_seconds INT NOT NULL DEFAULT 0,
    is_manual_edit BOOLEAN NOT NULL DEFAULT false,
    year_week VARCHAR(8) NOT NULL, -- e.g. '2026-W45'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 7. TASK_COMMENTS & TASK_ATTACHMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 8. WEEKLY_CHECKS (Weekly Retrospective & Workload Feeling)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    year_week VARCHAR(8) NOT NULL, -- e.g. '2026-W45'
    went_well TEXT NOT NULL,
    obstacles TEXT NOT NULL,
    workload_feeling TEXT NOT NULL, -- '1' to '5'
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_project_weekly_check UNIQUE (user_id, project_id, year_week)
);

-- ============================================================================
-- 9. NOTIFICATIONS (In-App Realtime Alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('assigned', 'comment', 'due_soon', 'review_result', 'unblocked')),
    message TEXT NOT NULL,
    related_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- PERFORMANCE & FILTERING INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_project_members_email ON public.project_members(LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_assignee_queue ON public.tasks(project_id, assignee_id, queue_order);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_position ON public.subtasks(task_id, position);
CREATE INDEX IF NOT EXISTS idx_timelogs_project_user_week ON public.time_logs(project_id, user_id, year_week);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_weekly_checks_user_week ON public.weekly_checks(user_id, project_id, year_week);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read);

-- ============================================================================
-- TRIGGERS & PROCEDURES
-- ============================================================================

-- A. Auto-Binding User Trigger on auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_initials TEXT;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
    v_initials := UPPER(SUBSTRING(v_full_name FROM 1 FOR 1) || COALESCE(SUBSTRING(SPLIT_PART(v_full_name, ' ', 2) FROM 1 FOR 1), ''));
    
    INSERT INTO public.profiles (id, email, full_name, initials, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        COALESCE(NULLIF(v_initials, ''), 'U'),
        NEW.raw_user_meta_data->>'avatar_url',
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url;

    -- Automatically associate any pending project invitations matching the user's email
    UPDATE public.project_members
    SET user_id = NEW.id
    WHERE LOWER(user_email) = LOWER(NEW.email);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Auto-update updated_at on tasks
CREATE OR REPLACE FUNCTION public.handle_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_task_updated ON public.tasks;
CREATE TRIGGER on_task_updated
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_task_updated_at();

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

-- Check if current authenticated user has 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is an authorized member of the project
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p_project_id 
          AND (
            pm.user_id = auth.uid() 
            OR LOWER(pm.user_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
          )
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prevent non-admin role elevation on profiles
CREATE OR REPLACE FUNCTION public.handle_profile_role_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'permission denied: cannot alter role'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_guard ON public.profiles;
CREATE TRIGGER on_profile_role_guard
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_role_guard();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Zero access granted to 'anon'. All policies explicitly target 'authenticated'.
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES
DROP POLICY IF EXISTS "Profiles: Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Profiles: Authenticated users can view profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Profiles: Users can update own profile or admin" ON public.profiles;
CREATE POLICY "Profiles: Users can update own profile or admin" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin());

-- 2. PROJECTS
DROP POLICY IF EXISTS "Projects: Members and Admin can select" ON public.projects;
CREATE POLICY "Projects: Members and Admin can select" ON public.projects
    FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_project_member(id));

DROP POLICY IF EXISTS "Projects: Admin can insert" ON public.projects;
CREATE POLICY "Projects: Admin can insert" ON public.projects
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Projects: Admin can update/delete" ON public.projects;
CREATE POLICY "Projects: Admin can update/delete" ON public.projects
    FOR ALL TO authenticated
    USING (public.is_admin());

-- 3. PROJECT_MEMBERS
DROP POLICY IF EXISTS "ProjectMembers: Members can view team" ON public.project_members;
CREATE POLICY "ProjectMembers: Members can view team" ON public.project_members
    FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "ProjectMembers: Admin full access" ON public.project_members;
CREATE POLICY "ProjectMembers: Admin full access" ON public.project_members
    FOR ALL TO authenticated
    USING (public.is_admin());

-- 4. TASKS
DROP POLICY IF EXISTS "Tasks: Project members can select" ON public.tasks;
CREATE POLICY "Tasks: Project members can select" ON public.tasks
    FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "Tasks: Project members can insert" ON public.tasks;
CREATE POLICY "Tasks: Project members can insert" ON public.tasks
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "Tasks: Project members can update" ON public.tasks;
CREATE POLICY "Tasks: Project members can update" ON public.tasks
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "Tasks: Admin can delete" ON public.tasks;
CREATE POLICY "Tasks: Admin can delete" ON public.tasks
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 5. SUBTASKS
DROP POLICY IF EXISTS "Subtasks: Project members all" ON public.subtasks;
CREATE POLICY "Subtasks: Project members all" ON public.subtasks
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.tasks t 
        WHERE t.id = subtasks.task_id 
          AND (public.is_admin() OR public.is_project_member(t.project_id))
    ));

-- 6. TIME_LOGS
DROP POLICY IF EXISTS "TimeLogs: Project members select" ON public.time_logs;
CREATE POLICY "TimeLogs: Project members select" ON public.time_logs
    FOR SELECT TO authenticated
    USING (public.is_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS "TimeLogs: User can insert own logs" ON public.time_logs;
CREATE POLICY "TimeLogs: User can insert own logs" ON public.time_logs
    FOR INSERT TO authenticated
    WITH CHECK ((user_id = auth.uid() AND public.is_project_member(project_id)) OR public.is_admin());

DROP POLICY IF EXISTS "TimeLogs: User can update own logs" ON public.time_logs;
CREATE POLICY "TimeLogs: User can update own logs" ON public.time_logs
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "TimeLogs: User can delete own logs" ON public.time_logs;
CREATE POLICY "TimeLogs: User can delete own logs" ON public.time_logs
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- 7. TASK_COMMENTS & TASK_ATTACHMENTS
DROP POLICY IF EXISTS "Comments: Project members can select" ON public.task_comments;
CREATE POLICY "Comments: Project members can select" ON public.task_comments
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_comments.task_id
          AND (public.is_admin() OR public.is_project_member(t.project_id))
    ));

DROP POLICY IF EXISTS "Comments: Author can insert" ON public.task_comments;
CREATE POLICY "Comments: Author can insert" ON public.task_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_comments.task_id
              AND (public.is_admin() OR public.is_project_member(t.project_id))
        )
    );

DROP POLICY IF EXISTS "Comments: Author or Admin can delete" ON public.task_comments;
CREATE POLICY "Comments: Author or Admin can delete" ON public.task_comments
    FOR DELETE TO authenticated
    USING (author_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Attachments: Project members can select" ON public.task_attachments;
CREATE POLICY "Attachments: Project members can select" ON public.task_attachments
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_attachments.task_id
          AND (public.is_admin() OR public.is_project_member(t.project_id))
    ));

DROP POLICY IF EXISTS "Attachments: Uploader can insert" ON public.task_attachments;
CREATE POLICY "Attachments: Uploader can insert" ON public.task_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
        uploader_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_attachments.task_id
              AND (public.is_admin() OR public.is_project_member(t.project_id))
        )
    );

DROP POLICY IF EXISTS "Attachments: Uploader or Admin can delete" ON public.task_attachments;
CREATE POLICY "Attachments: Uploader or Admin can delete" ON public.task_attachments
    FOR DELETE TO authenticated
    USING (uploader_id = auth.uid() OR public.is_admin());

-- 8. WEEKLY_CHECKS
DROP POLICY IF EXISTS "WeeklyChecks: Members select own or admin all" ON public.weekly_checks;
CREATE POLICY "WeeklyChecks: Members select own or admin all" ON public.weekly_checks
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "WeeklyChecks: User insert own" ON public.weekly_checks;
CREATE POLICY "WeeklyChecks: User insert own" ON public.weekly_checks
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND public.is_project_member(project_id));

DROP POLICY IF EXISTS "WeeklyChecks: User update own" ON public.weekly_checks;
CREATE POLICY "WeeklyChecks: User update own" ON public.weekly_checks
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- 9. NOTIFICATIONS
DROP POLICY IF EXISTS "Notifications: Recipient only select" ON public.notifications;
CREATE POLICY "Notifications: Recipient only select" ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Notifications: Authenticated insert" ON public.notifications;
CREATE POLICY "Notifications: Authenticated insert" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications: Recipient update" ON public.notifications;
CREATE POLICY "Notifications: Recipient update" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Notifications: Recipient delete" ON public.notifications;
CREATE POLICY "Notifications: Recipient delete" ON public.notifications
    FOR DELETE TO authenticated
    USING (recipient_id = auth.uid());

-- ============================================================================
-- SUPABASE REALTIME REPLICATION CONFIGURATION
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
