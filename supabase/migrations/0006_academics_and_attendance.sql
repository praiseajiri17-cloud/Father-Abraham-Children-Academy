-- ============================================================================
-- 0006_academics_and_attendance.sql
-- Assessments, Configurable Weightings, Results, Score Audit Trail,
-- Publication Gate, Report Cards, and Attendance
-- ============================================================================

-- 1. Assessments (Configurable CA + Exam weighting per class/subject/term)
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  grading_scale_id UUID REFERENCES public.grading_scales(id) ON DELETE SET NULL,
  ca_weight NUMERIC(5,2) NOT NULL DEFAULT 40.00 CHECK (ca_weight >= 0 AND ca_weight <= 100),
  exam_weight NUMERIC(5,2) NOT NULL DEFAULT 60.00 CHECK (exam_weight >= 0 AND exam_weight <= 100),
  max_total_score NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (max_total_score > 0),
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_assessment_weights_sum CHECK (ca_weight + exam_weight = 100.00),
  UNIQUE (academic_session_id, term_id, class_id, subject_id)
);

CREATE TRIGGER trg_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Assessment Components (e.g. CA1 20%, CA2 20%, Exam 60%)
CREATE TABLE IF NOT EXISTS public.assessment_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_type TEXT NOT NULL CHECK (component_type IN ('ca', 'exam', 'practical', 'other')),
  max_score NUMERIC(5,2) NOT NULL CHECK (max_score > 0),
  weight_percentage NUMERIC(5,2) NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
  sort_order SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (assessment_id, name)
);

-- 3. Result Publications (Controls parent visibility per class/session/term)
CREATE TABLE IF NOT EXISTS public.result_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  unpublished_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (academic_session_id, term_id, class_id)
);

CREATE TRIGGER trg_result_publications_updated_at
  BEFORE UPDATE ON public.result_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Student Subject Results
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,

  component_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  ca_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (ca_score >= 0),
  exam_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (exam_score >= 0),
  total_score NUMERIC(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  grade_letter TEXT,
  remark TEXT,
  teacher_comment TEXT,

  submission_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (submission_status IN ('draft', 'submitted', 'approved', 'published')),

  entered_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (student_id, academic_session_id, term_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_results_class_term ON public.results (class_id, academic_session_id, term_id);
CREATE INDEX IF NOT EXISTS idx_results_student_term ON public.results (student_id, academic_session_id, term_id);

CREATE TRIGGER trg_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Result Score Audit Trail (Records who entered or modified any score)
CREATE TABLE IF NOT EXISTS public.result_score_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_changed')),
  previous_ca_score NUMERIC(5,2),
  previous_exam_score NUMERIC(5,2),
  previous_component_scores JSONB,
  previous_status TEXT,
  new_ca_score NUMERIC(5,2),
  new_exam_score NUMERIC(5,2),
  new_component_scores JSONB,
  new_status TEXT,
  changed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_clerk_user_id TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_result_score_audit_result ON public.result_score_audit (result_id, changed_at DESC);

-- 6. Generated Report Cards (Private Storage metadata)
CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  storage_bucket TEXT NOT NULL DEFAULT 'generated-report-cards',
  storage_path TEXT NOT NULL,
  overall_average NUMERIC(5,2),
  principal_comment TEXT,
  class_teacher_comment TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  generated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (student_id, academic_session_id, term_id)
);

-- 7. Attendance Records (Prevents duplicate entries per student + class + date + period)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  attendance_date DATE NOT NULL,
  attendance_session TEXT NOT NULL DEFAULT 'daily'
    CHECK (attendance_session IN ('daily', 'morning', 'afternoon')),
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  remarks TEXT,
  recorded_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (student_id, class_id, attendance_date, attendance_session)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date
  ON public.attendance_records (class_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_term
  ON public.attendance_records (student_id, academic_session_id, term_id);

CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
