-- ============================================================================
-- 0003_school_structure.sql
-- Sections, Sessions, Terms, Class Levels, Arms, Subjects, Teacher Assignments,
-- and Configurable Grading Rules
-- ============================================================================

-- 1. Educational Sections (Creche kept separate from Primary/Secondary academic portal)
CREATE TABLE IF NOT EXISTS public.school_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('creche', 'primary', 'secondary')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  portal_academics_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_creche_separate_from_academic_portal
    CHECK (code <> 'creche' OR portal_academics_enabled = FALSE)
);

-- Seed only the three required educational sections
INSERT INTO public.school_sections (code, name, description, portal_academics_enabled, sort_order) VALUES
  ('creche', 'Creche', 'Early childhood care and foundational playgroup (kept separate from Primary/Secondary academic portal).', FALSE, 1),
  ('primary', 'Primary School', 'Primary 1 through Primary 6 foundational education.', TRUE, 2),
  ('secondary', 'Secondary School', 'Junior Secondary (JSS 1-3) and Senior Secondary (SS 1-3) education.', TRUE, 3)
ON CONFLICT (code) DO NOTHING;

-- 2. Academic Sessions
CREATE TABLE IF NOT EXISTS public.academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g. '2026/2027'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CHECK (end_date > start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_current_academic_session
  ON public.academic_sessions (is_current)
  WHERE is_current = TRUE;

CREATE TRIGGER trg_academic_sessions_updated_at
  BEFORE UPDATE ON public.academic_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Academic Terms
CREATE TABLE IF NOT EXISTS public.terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'First Term', 'Second Term', 'Third Term'
  term_order SMALLINT NOT NULL CHECK (term_order BETWEEN 1 AND 3),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (academic_session_id, term_order),
  CHECK (end_date > start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_current_term
  ON public.terms (is_current)
  WHERE is_current = TRUE;

CREATE TRIGGER trg_terms_updated_at
  BEFORE UPDATE ON public.terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Class Levels (Creche, Primary 1-6, JSS 1-3, SS 1-3)
CREATE TABLE IF NOT EXISTS public.class_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_section_id UUID NOT NULL REFERENCES public.school_sections(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sequence_order SMALLINT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Seed standard class levels (Primary 1-6, JSS 1-3, SS 1-3, plus Creche baseline)
INSERT INTO public.class_levels (school_section_id, code, name, sequence_order)
SELECT s.id, v.code, v.name, v.seq
FROM (VALUES
  ('creche', 'CRECHE', 'Creche', 1),
  ('primary', 'PRI_1', 'Primary 1', 10),
  ('primary', 'PRI_2', 'Primary 2', 11),
  ('primary', 'PRI_3', 'Primary 3', 12),
  ('primary', 'PRI_4', 'Primary 4', 13),
  ('primary', 'PRI_5', 'Primary 5', 14),
  ('primary', 'PRI_6', 'Primary 6', 15),
  ('secondary', 'JSS_1', 'JSS 1', 20),
  ('secondary', 'JSS_2', 'JSS 2', 21),
  ('secondary', 'JSS_3', 'JSS 3', 22),
  ('secondary', 'SS_1', 'SS 1', 23),
  ('secondary', 'SS_2', 'SS 2', 24),
  ('secondary', 'SS_3', 'SS 3', 25)
) AS v(section_code, code, name, seq)
JOIN public.school_sections s ON s.code = v.section_code
ON CONFLICT (code) DO NOTHING;

-- 5. Configurable Class Arms (e.g., A, B, C)
CREATE TABLE IF NOT EXISTS public.class_arms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.class_arms (name) VALUES ('A'), ('B'), ('C')
ON CONFLICT (name) DO NOTHING;

-- 6. Classes (Level + Arm per Session)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  class_level_id UUID NOT NULL REFERENCES public.class_levels(id) ON DELETE RESTRICT,
  class_arm_id UUID REFERENCES public.class_arms(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL, -- e.g. 'Primary 3A'
  class_teacher_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (academic_session_id, class_level_id, class_arm_id)
);

CREATE INDEX IF NOT EXISTS idx_classes_session ON public.classes (academic_session_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes (class_teacher_staff_id);

CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_section_id UUID REFERENCES public.school_sections(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. Class Subjects (Subjects offered in a specific class)
CREATE TABLE IF NOT EXISTS public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  is_compulsory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (class_id, subject_id)
);

-- 9. Teacher Assignments (Controls which classes/subjects a teacher can access)
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
  is_class_teacher BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_staff ON public.teacher_assignments (staff_id, is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON public.teacher_assignments (class_id, subject_id, is_active);

CREATE TRIGGER trg_teacher_assignments_updated_at
  BEFORE UPDATE ON public.teacher_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Configurable Grading Scales (No hardcoded grading rules in results logic)
CREATE TABLE IF NOT EXISTS public.grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_section_id UUID REFERENCES public.school_sections(id) ON DELETE RESTRICT,
  academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.grading_scale_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_scale_id UUID NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
  grade_letter TEXT NOT NULL,
  min_score NUMERIC(5,2) NOT NULL CHECK (min_score >= 0 AND min_score <= 100),
  max_score NUMERIC(5,2) NOT NULL CHECK (max_score >= min_score AND max_score <= 100),
  remark TEXT NOT NULL,
  grade_point NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (grading_scale_id, grade_letter)
);
