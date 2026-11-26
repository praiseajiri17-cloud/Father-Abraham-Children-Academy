-- ============================================================================
-- 0005_admissions.sql
-- Prospective Admission Applications, Admission Documents & Application Payments
-- (Kept strictly separate from enrolled students and school-fee invoices)
-- ============================================================================

-- 1. Admission Applications
CREATE TABLE IF NOT EXISTS public.admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_reference TEXT NOT NULL UNIQUE, -- e.g. 'FACA-ADM-2026-0001'
  applicant_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,

  -- Prospective child information
  child_first_name TEXT NOT NULL,
  child_middle_name TEXT,
  child_last_name TEXT NOT NULL,
  child_date_of_birth DATE NOT NULL,
  child_gender TEXT NOT NULL CHECK (child_gender IN ('male', 'female')),
  previous_school TEXT,

  -- Intended placement
  intended_section_id UUID NOT NULL REFERENCES public.school_sections(id) ON DELETE RESTRICT,
  intended_class_level_id UUID NOT NULL REFERENCES public.class_levels(id) ON DELETE RESTRICT,
  intended_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,

  -- Admission status is strictly separate from payment_status
  application_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    application_status IN (
      'pending',
      'under_review',
      'correction_requested',
      'approved',
      'rejected'
    )
  ),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')
  ),

  -- Physical document tracking
  physical_documents_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  physical_documents_received_at TIMESTAMPTZ,
  physical_documents_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  physical_documents_notes TEXT,

  -- Decision & review audit metadata
  reviewer_notes TEXT,
  correction_notes TEXT,
  reviewed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decision_overridden_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_overridden_at TIMESTAMPTZ,

  -- Link only after formal enrolment workflow completes
  enrolled_student_id UUID UNIQUE REFERENCES public.students(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admission_apps_applicant ON public.admission_applications (applicant_profile_id);
CREATE INDEX IF NOT EXISTS idx_admission_apps_status ON public.admission_applications (application_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_admission_apps_session ON public.admission_applications (intended_session_id, intended_section_id);

CREATE TRIGGER trg_admission_applications_updated_at
  BEFORE UPDATE ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Admission Documents (Private Storage references)
CREATE TABLE IF NOT EXISTS public.admission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'birth_certificate',
      'passport_photo',
      'previous_report_card',
      'transfer_certificate',
      'medical_report',
      'other'
    )
  ),
  storage_bucket TEXT NOT NULL DEFAULT 'admission-documents',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  uploaded_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_admission_docs_application ON public.admission_documents (application_id);

-- 3. Application Form Payments (Strictly separate from school_fees / invoices)
CREATE TABLE IF NOT EXISTS public.application_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE RESTRICT,
  payer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payment_reference TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'paystack',
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  status TEXT NOT NULL DEFAULT 'initialized'
    CHECK (status IN ('initialized', 'verified', 'failed', 'refunded')),
  gateway_response JSONB,
  verified_at TIMESTAMPTZ,
  verified_via_webhook BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_app_payments_application ON public.application_payments (application_id);
CREATE INDEX IF NOT EXISTS idx_app_payments_reference ON public.application_payments (payment_reference);

CREATE TRIGGER trg_application_payments_updated_at
  BEFORE UPDATE ON public.application_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
