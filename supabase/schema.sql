-- ============================================================================
-- UPF Language Center Platform - Supabase PostgreSQL Schema & RLS Policies
-- ============================================================================
-- Safe to run in Supabase SQL Editor. Uses idempotent blocks where supported.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. CUSTOM ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'dept_head', 'professor', 'pending');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_subject') THEN
    CREATE TYPE public.language_subject AS ENUM ('english', 'french');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'justified', 'late');
  END IF;
END
$$;

-- 3. CORE TABLES

-- 3.1 Departments (Modular: Admin can add, rename, recolor, or archive)
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  description_en TEXT,
  description_fr TEXT,
  color_accent TEXT NOT NULL DEFAULT '#1d4ed8',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Semesters
CREATE TABLE IF NOT EXISTS public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  academic_year TEXT NOT NULL,
  term_number INTEGER NOT NULL CHECK (term_number IN (1, 2)),
  label_en TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guarantee only one semester is flagged as current at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_semesters_single_current
  ON public.semesters (is_current)
  WHERE is_current = TRUE;

-- 3.3 User Profiles (Synced with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role NOT NULL DEFAULT 'pending',
  preferred_locale TEXT NOT NULL DEFAULT 'en' CHECK (preferred_locale IN ('en', 'fr')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Department Head Assignments (A Dept Head can oversee 1+ departments)
CREATE TABLE IF NOT EXISTS public.department_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, department_id)
);

-- 3.5 Parent Language Modules (Per Department & Semester)
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  cohort_level TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, semester_id, code)
);

-- 3.6 Semi-Modules (French or English tracks inside a Module, with Group & Professor)
CREATE TABLE IF NOT EXISTS public.semi_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  subject public.language_subject NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'G1',
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  professor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_absences_allowed INTEGER NOT NULL DEFAULT 3 CHECK (max_absences_allowed >= 0),
  schedule_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_id, subject, group_name)
);

-- 3.7 Students (Single source of truth per student across semesters)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  home_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  cohort_level TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 Enrollments (Student assigned to a Semi-Module; supports transfers cleanly)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semi_module_id UUID NOT NULL REFERENCES public.semi_modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'dropped')),
  transferred_from_semi_module_id UUID REFERENCES public.semi_modules(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, semi_module_id)
);

-- 3.9 Attendance Sessions (Individual class meetings for a Semi-Module)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semi_module_id UUID NOT NULL REFERENCES public.semi_modules(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  topic TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (semi_module_id, session_date)
);

-- 3.10 Attendance Records (Per-student status for a Session)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  note TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, enrollment_id)
);

-- 3.11 Transfer & Swap Audit Logs
CREATE TABLE IF NOT EXISTS public.transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'professor')),
  entity_id UUID NOT NULL,
  from_semi_module_id UUID REFERENCES public.semi_modules(id) ON DELETE SET NULL,
  to_semi_module_id UUID REFERENCES public.semi_modules(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_modules_dept_sem ON public.modules(department_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_semi_modules_module ON public.semi_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_semi_modules_prof ON public.semi_modules(professor_id);
CREATE INDEX IF NOT EXISTS idx_students_home_dept ON public.students(home_department_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_semi_module ON public.enrollments(semi_module_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_sm ON public.attendance_sessions(semi_module_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_enrollment ON public.attendance_records(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_department_heads_profile ON public.department_heads(profile_id);

-- 5. TIMESTAMPS & AUTH TRIGGERS

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_modules_updated_at ON public.modules;
CREATE TRIGGER trg_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_semi_modules_updated_at ON public.semi_modules;
CREATE TRIGGER trg_semi_modules_updated_at
  BEFORE UPDATE ON public.semi_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_enrollments_updated_at ON public.enrollments;
CREATE TRIGGER trg_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', SPLIT_PART(NEW.email, '@', 1)),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. SECURITY HELPER FUNCTIONS (SECURITY DEFINER prevents RLS recursion)

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE),
    'pending'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin'::public.user_role;
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN (
    'admin'::public.user_role,
    'dept_head'::public.user_role,
    'professor'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dept_head_of(target_dept_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.department_heads dh
    WHERE dh.profile_id = auth.uid()
      AND dh.department_id = target_dept_id
  ) AND public.current_user_role() = 'dept_head'::public.user_role;
$$;

CREATE OR REPLACE FUNCTION public.is_professor_of_semi_module(target_sm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.semi_modules sm
    WHERE sm.id = target_sm_id
      AND sm.professor_id = auth.uid()
  ) AND public.current_user_role() = 'professor'::public.user_role;
$$;

CREATE OR REPLACE FUNCTION public.can_view_semi_module(target_sm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR public.is_professor_of_semi_module(target_sm_id)
    OR EXISTS (
      SELECT 1
      FROM public.semi_modules sm
      JOIN public.modules m ON m.id = sm.module_id
      WHERE sm.id = target_sm_id
        AND public.is_dept_head_of(m.department_id)
    );
$$;

-- 7. REPORTING VIEWS (security_invoker ensures RLS applies per logged-in user)

CREATE OR REPLACE VIEW public.enrollment_attendance_summary
WITH (security_invoker = true) AS
SELECT
  e.id AS enrollment_id,
  e.student_id,
  e.semi_module_id,
  e.status AS enrollment_status,
  s.student_code,
  s.first_name,
  s.last_name,
  sm.subject,
  sm.group_name,
  sm.max_absences_allowed,
  m.department_id,
  m.semester_id,
  COUNT(ar.id) AS total_sessions_recorded,
  COUNT(ar.id) FILTER (WHERE ar.status = 'present') AS present_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'absent') AS unexcused_absent_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'justified') AS justified_absent_count,
  COUNT(ar.id) FILTER (WHERE ar.status = 'late') AS late_count,
  (COUNT(ar.id) FILTER (WHERE ar.status = 'absent') >= sm.max_absences_allowed) AS exceeds_limit
FROM public.enrollments e
JOIN public.students s ON s.id = e.student_id
JOIN public.semi_modules sm ON sm.id = e.semi_module_id
JOIN public.modules m ON m.id = sm.module_id
LEFT JOIN public.attendance_records ar ON ar.enrollment_id = e.id
GROUP BY
  e.id, e.student_id, e.semi_module_id, e.status,
  s.student_code, s.first_name, s.last_name,
  sm.subject, sm.group_name, sm.max_absences_allowed,
  m.department_id, m.semester_id;

CREATE OR REPLACE VIEW public.department_semester_stats
WITH (security_invoker = true) AS
SELECT
  d.id AS department_id,
  d.code AS department_code,
  d.name_en,
  d.name_fr,
  d.color_accent,
  d.is_active,
  sem.id AS semester_id,
  sem.code AS semester_code,
  COUNT(DISTINCT m.id) AS module_count,
  COUNT(DISTINCT sm.id) AS semi_module_count,
  COUNT(DISTINCT sm.id) FILTER (WHERE sm.subject = 'english') AS english_semi_module_count,
  COUNT(DISTINCT sm.id) FILTER (WHERE sm.subject = 'french') AS french_semi_module_count,
  COUNT(DISTINCT sm.professor_id) FILTER (WHERE sm.professor_id IS NOT NULL) AS professor_count,
  COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'active') AS active_student_count
FROM public.departments d
CROSS JOIN public.semesters sem
LEFT JOIN public.modules m
  ON m.department_id = d.id AND m.semester_id = sem.id AND m.is_active = TRUE
LEFT JOIN public.semi_modules sm
  ON sm.module_id = m.id
LEFT JOIN public.enrollments e
  ON e.semi_module_id = sm.id
GROUP BY
  d.id, d.code, d.name_en, d.name_fr, d.color_accent, d.is_active,
  sem.id, sem.code;

-- 8. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semi_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_logs ENABLE ROW LEVEL SECURITY;

-- 8.1 Departments
DROP POLICY IF EXISTS "departments_select" ON public.departments;
CREATE POLICY "departments_select" ON public.departments
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_dept_head_of(id)
    OR (
      public.current_user_role() = 'professor'::public.user_role
      AND EXISTS (
        SELECT 1
        FROM public.modules m
        JOIN public.semi_modules sm ON sm.module_id = m.id
        WHERE m.department_id = departments.id
          AND sm.professor_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "departments_admin_all" ON public.departments;
CREATE POLICY "departments_admin_all" ON public.departments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.2 Semesters
DROP POLICY IF EXISTS "semesters_select" ON public.semesters;
CREATE POLICY "semesters_select" ON public.semesters
  FOR SELECT TO authenticated
  USING (public.is_active_staff());

DROP POLICY IF EXISTS "semesters_admin_all" ON public.semesters;
CREATE POLICY "semesters_admin_all" ON public.semesters
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.3 Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_active_staff());

-- Users can update their own name/locale, but CANNOT change their role or active flag
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.current_user_role()
  );

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.4 Department Heads
DROP POLICY IF EXISTS "department_heads_select" ON public.department_heads;
CREATE POLICY "department_heads_select" ON public.department_heads
  FOR SELECT TO authenticated
  USING (public.is_admin() OR profile_id = auth.uid());

DROP POLICY IF EXISTS "department_heads_admin_all" ON public.department_heads;
CREATE POLICY "department_heads_admin_all" ON public.department_heads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.5 Modules
DROP POLICY IF EXISTS "modules_select" ON public.modules;
CREATE POLICY "modules_select" ON public.modules
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_dept_head_of(department_id)
    OR (
      public.current_user_role() = 'professor'::public.user_role
      AND EXISTS (
        SELECT 1
        FROM public.semi_modules sm
        WHERE sm.module_id = modules.id
          AND sm.professor_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "modules_admin_all" ON public.modules;
CREATE POLICY "modules_admin_all" ON public.modules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.6 Semi-Modules
DROP POLICY IF EXISTS "semi_modules_select" ON public.semi_modules;
CREATE POLICY "semi_modules_select" ON public.semi_modules
  FOR SELECT TO authenticated
  USING (public.can_view_semi_module(id));

DROP POLICY IF EXISTS "semi_modules_admin_all" ON public.semi_modules;
CREATE POLICY "semi_modules_admin_all" ON public.semi_modules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.7 Students
DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (home_department_id IS NOT NULL AND public.is_dept_head_of(home_department_id))
    OR EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.student_id = students.id
        AND public.can_view_semi_module(e.semi_module_id)
    )
  );

DROP POLICY IF EXISTS "students_admin_all" ON public.students;
CREATE POLICY "students_admin_all" ON public.students
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.8 Enrollments
DROP POLICY IF EXISTS "enrollments_select" ON public.enrollments;
CREATE POLICY "enrollments_select" ON public.enrollments
  FOR SELECT TO authenticated
  USING (public.can_view_semi_module(semi_module_id));

DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;
CREATE POLICY "enrollments_admin_all" ON public.enrollments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.9 Attendance Sessions (Admins + Assigned Professor can manage; Dept Head reads)
DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_select" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (public.can_view_semi_module(semi_module_id));

DROP POLICY IF EXISTS "attendance_sessions_write" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_write" ON public.attendance_sessions
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_professor_of_semi_module(semi_module_id))
  WITH CHECK (public.is_admin() OR public.is_professor_of_semi_module(semi_module_id));

-- 8.10 Attendance Records (Admins + Assigned Professor can manage; Dept Head reads)
DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
CREATE POLICY "attendance_records_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.attendance_sessions s
      WHERE s.id = attendance_records.session_id
        AND public.can_view_semi_module(s.semi_module_id)
    )
  );

DROP POLICY IF EXISTS "attendance_records_write" ON public.attendance_records;
CREATE POLICY "attendance_records_write" ON public.attendance_records
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.attendance_sessions s
      WHERE s.id = attendance_records.session_id
        AND public.is_professor_of_semi_module(s.semi_module_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.attendance_sessions s
      WHERE s.id = attendance_records.session_id
        AND public.is_professor_of_semi_module(s.semi_module_id)
    )
  );

-- 8.11 Transfer Logs (Admin read/write)
DROP POLICY IF EXISTS "transfer_logs_admin_all" ON public.transfer_logs;
CREATE POLICY "transfer_logs_admin_all" ON public.transfer_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. SEED DATA (UPF Departments & 2026-2027 Semesters)

INSERT INTO public.departments (code, name_en, name_fr, color_accent)
VALUES
  ('ESMAB', 'ESMAB - Architecture & Building Trades', 'ESMAB - Métiers de l''Architecture et du Bâtiment', '#0f766e'),
  ('FSI', 'FSI - Faculty of Engineering Sciences', 'FSI - Faculté des Sciences de l''Ingénieur', '#1d4ed8'),
  ('FBS', 'FBS - Fez Business School', 'FBS - Fez Business School', '#b45309'),
  ('HEALTH', 'Health - Faculty of Health Sciences', 'Santé - Faculté des Sciences de la Santé', '#be123c')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.semesters (code, academic_year, term_number, label_en, label_fr, start_date, end_date, is_current)
VALUES
  ('2026-2027-S1', '2026-2027', 1, '2026-2027 - Semester 1', '2026-2027 - Semestre 1', '2026-09-14', '2027-01-31', TRUE),
  ('2026-2027-S2', '2026-2027', 2, '2026-2027 - Semester 2', '2026-2027 - Semestre 2', '2027-02-08', '2027-06-30', FALSE)
ON CONFLICT (code) DO NOTHING;