-- ============================================================================
-- 0004_parents_and_students.sql
-- Parents, Guardians, Verified Parent-Student Links, Students, Enrolments,
-- Promotion History, and Restricted Medical Alerts
-- ============================================================================

-- 1. Parents (1:1 with profiles for parent portal users)
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  occupation TEXT,
  residential_address TEXT,
  alternate_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_parents_profile_id ON public.parents (profile_id);

CREATE TRIGGER trg_parents_updated_at
  BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Guardians (Supports multiple authorized guardians & separate login accounts)
CREATE TABLE IF NOT EXISTS public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  relationship_to_family TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  residential_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_guardians_profile_id ON public.guardians (profile_id);

CREATE TRIGGER trg_guardians_updated_at
  BEFORE UPDATE ON public.guardians
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Officially Enrolled Students
-- Kept strictly separate from prospective admission_applications.
-- No student passwords or student portal login required in initial version.
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  school_section_id UUID NOT NULL REFERENCES public.school_sections(id) ON DELETE RESTRICT,
  current_class_level_id UUID REFERENCES public.class_levels(id) ON DELETE RESTRICT,
  passport_photo_path TEXT,
  enrollment_status TEXT NOT NULL DEFAULT 'active'
    CHECK (enrollment_status IN ('active', 'graduated', 'transferred', 'withdrawn', 'suspended')),
  admitted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  academic_portal_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_students_admission_number ON public.students (admission_number);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students (school_section_id);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent Creche records from automatically enabling academic portal access
CREATE OR REPLACE FUNCTION public.enforce_creche_student_portal_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_section_code TEXT;
BEGIN
  SELECT code INTO v_section_code
  FROM public.school_sections
  WHERE id = NEW.school_section_id;

  IF v_section_code = 'creche' THEN
    NEW.academic_portal_eligible := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_students_creche_portal_guard
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.enforce_creche_student_portal_flag();

-- 4. Verified Parent / Guardian <-> Student Links
-- Parents NEVER gain access simply by supplying an admission number;
-- verification_status MUST be 'verified' by authorized school staff.
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('mother', 'father', 'guardian', 'sponsor')),
  is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_academics BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_finance BOOLEAN NOT NULL DEFAULT TRUE,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'revoked')),
  verified_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_parent_or_guardian_present
    CHECK ((parent_id IS NOT NULL) OR (guardian_id IS NOT NULL)),
  UNIQUE (student_id, parent_id),
  UNIQUE (student_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent_verified
  ON public.parent_students (parent_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_parent_students_guardian_verified
  ON public.parent_students (guardian_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_parent_students_student
  ON public.parent_students (student_id);

CREATE TRIGGER trg_parent_students_updated_at
  BEFORE UPDATE ON public.parent_students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Session-Specific Student Enrolments
CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  enrollment_state TEXT NOT NULL DEFAULT 'active'
    CHECK (enrollment_state IN ('active', 'promoted', 'repeated', 'graduated', 'transferred', 'withdrawn')),
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  enrolled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (student_id, academic_session_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_session
  ON public.student_enrollments (class_id, academic_session_id);

CREATE TRIGGER trg_student_enrollments_updated_at
  BEFORE UPDATE ON public.student_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Student Promotion History (Supports Primary -> Secondary progression)
CREATE TABLE IF NOT EXISTS public.student_promotion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  from_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  to_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  from_class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  to_class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  from_section_id UUID NOT NULL REFERENCES public.school_sections(id) ON DELETE RESTRICT,
  to_section_id UUID NOT NULL REFERENCES public.school_sections(id) ON DELETE RESTRICT,
  promotion_status TEXT NOT NULL
    CHECK (promotion_status IN ('promoted', 'section_transition', 'repeated', 'graduated')),
  remarks TEXT,
  promoted_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_promotion_history_student ON public.student_promotion_history (student_id);

-- 7. Restricted Student Medical Alerts
-- Strictly separated from general student profiles so access is tightly controlled.
CREATE TABLE IF NOT EXISTS public.student_medical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  blood_group TEXT,
  genotype TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  emergency_protocol TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_document_path TEXT,
  updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_student_medical_alerts_updated_at
  BEFORE UPDATE ON public.student_medical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
