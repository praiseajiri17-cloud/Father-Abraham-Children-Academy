-- ============================================================================
-- 0011_phase4_admissions_extensions.sql
-- Phase 4: Online Admissions Management System Extensions
-- Extends existing Phase 3 tables without duplicating structures.
-- ============================================================================

-- 1. Sequence & Helper for Unique Official Application References
CREATE SEQUENCE IF NOT EXISTS public.admission_reference_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_admission_reference(p_session_year TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
BEGIN
  v_year := COALESCE(
    NULLIF(substring(COALESCE(p_session_year, '') FROM '\d{4}'), ''),
    to_char(timezone('utc', now()), 'YYYY')
  );
  v_seq := nextval('public.admission_reference_seq');
  RETURN 'FACA-ADM-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- 2. Extend public.admission_applications for Complete Multi-Step Form & Physical Tracking
ALTER TABLE public.admission_applications
  DROP CONSTRAINT IF EXISTS admission_applications_application_status_check;

ALTER TABLE public.admission_applications
  ADD CONSTRAINT admission_applications_application_status_check CHECK (
    application_status IN (
      'draft',
      'submitted',
      'pending',
      'under_review',
      'correction_requested',
      'approved',
      'rejected'
    )
  );

ALTER TABLE public.admission_applications
  ALTER COLUMN application_status SET DEFAULT 'draft';

ALTER TABLE public.admission_applications
  ADD COLUMN IF NOT EXISTS child_nationality TEXT DEFAULT 'Nigerian',
  ADD COLUMN IF NOT EXISTS child_state_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS child_lga TEXT,
  ADD COLUMN IF NOT EXISTS passport_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS parent_full_name TEXT,
  ADD COLUMN IF NOT EXISTS parent_relationship TEXT,
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS parent_alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS residential_address TEXT,
  ADD COLUMN IF NOT EXISTS parent_occupation TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
  ADD COLUMN IF NOT EXISTS previous_school_name TEXT,
  ADD COLUMN IF NOT EXISTS previous_class TEXT,
  ADD COLUMN IF NOT EXISTS previous_school_address TEXT,
  ADD COLUMN IF NOT EXISTS is_first_time_schooling BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS additional_details TEXT,
  ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS declaration_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declaration_signer_name TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS application_fee_kobo BIGINT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS physical_documents_status TEXT NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS physical_documents_received_by_name TEXT,
  ADD COLUMN IF NOT EXISTS physical_documents_received_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS physical_documents_missing_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS physical_documents_verified_at TIMESTAMPTZ;

ALTER TABLE public.admission_applications
  DROP CONSTRAINT IF EXISTS admission_applications_physical_documents_status_check;

ALTER TABLE public.admission_applications
  ADD CONSTRAINT admission_applications_physical_documents_status_check CHECK (
    physical_documents_status IN (
      'not_submitted',
      'received',
      'under_review',
      'complete',
      'incomplete'
    )
  );

-- 3. Restricted Medical & Learning Needs Details for Admission Applications
-- Separated from general admission_applications rows for stricter medical privacy.
CREATE TABLE IF NOT EXISTS public.admission_medical_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  blood_group TEXT,
  genotype TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  dietary_requirements TEXT,
  special_learning_needs TEXT,
  emergency_medical_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_admission_medical_details_updated_at
  BEFORE UPDATE ON public.admission_medical_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admission_medical_details ENABLE ROW LEVEL SECURITY;

-- 4. Application Status & Review History
CREATE TABLE IF NOT EXISTS public.admission_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'created',
      'submitted',
      'resubmitted',
      'payment_verified',
      'under_review',
      'correction_requested',
      'physical_docs_updated',
      'approved',
      'rejected',
      'reopened',
      'decision_overridden',
      'note_added'
    )
  ),
  from_status TEXT,
  to_status TEXT,
  physical_documents_status TEXT,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  notes TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admission_history_app
  ON public.admission_status_history (application_id, created_at DESC);

ALTER TABLE public.admission_status_history ENABLE ROW LEVEL SECURITY;

-- 5. Parent Admission Notifications (linked with email_notification_logs when queued)
CREATE TABLE IF NOT EXISTS public.admission_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'in_app_only' CHECK (
    delivery_status IN ('in_app_only', 'email_queued_pending_provider', 'email_sent', 'email_failed')
  ),
  email_log_id UUID REFERENCES public.email_notification_logs(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admission_notifications_recipient
  ON public.admission_notifications (recipient_profile_id, created_at DESC);

ALTER TABLE public.admission_notifications ENABLE ROW LEVEL SECURITY;

-- 6. Safe Parent Onboarding Helper (never creates staff or elevates privileges)
CREATE OR REPLACE FUNCTION public.ensure_parent_onboarding(
  p_email TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  profile_id UUID,
  parent_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clerk_id TEXT;
  v_profile_id UUID;
  v_parent_id UUID;
BEGIN
  v_clerk_id := public.current_clerk_user_id();
  IF v_clerk_id IS NULL OR length(trim(v_clerk_id)) = 0 THEN
    RAISE EXCEPTION 'Authenticated Clerk session required';
  END IF;

  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE clerk_user_id = v_clerk_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name, phone)
    VALUES (
      v_clerk_id,
      NULLIF(trim(COALESCE(p_email, '')), ''),
      COALESCE(NULLIF(trim(p_first_name), ''), 'Parent'),
      COALESCE(NULLIF(trim(p_last_name), ''), 'Guardian'),
      NULLIF(trim(COALESCE(p_phone, '')), '')
    )
    RETURNING id INTO v_profile_id;
  END IF;

  -- Only attach a parent record if not already existing; never touch staff/roles
  SELECT id INTO v_parent_id
  FROM public.parents
  WHERE parents.profile_id = v_profile_id
  LIMIT 1;

  IF v_parent_id IS NULL THEN
    INSERT INTO public.parents (profile_id)
    VALUES (v_profile_id)
    RETURNING id INTO v_parent_id;
  END IF;

  RETURN QUERY SELECT v_profile_id, v_parent_id;
END;
$$;

-- 7. Update RLS Policies for Phase 4 Admission Workflows
DROP POLICY IF EXISTS admission_apps_insert_applicant ON public.admission_applications;
CREATE POLICY admission_apps_insert_applicant ON public.admission_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    applicant_profile_id = public.current_profile_id()
    AND application_status IN ('draft', 'submitted', 'pending')
    AND payment_status = 'unpaid'
    AND paid_at IS NULL
    AND payment_reference IS NULL
    AND physical_documents_submitted = FALSE
    AND physical_documents_status = 'not_submitted'
    AND enrolled_student_id IS NULL
  );

DROP POLICY IF EXISTS admission_apps_update_applicant_or_officer ON public.admission_applications;
CREATE POLICY admission_apps_update_applicant_or_officer ON public.admission_applications
  FOR UPDATE TO authenticated
  USING (
    (
      applicant_profile_id = public.current_profile_id()
      AND application_status IN ('draft', 'submitted', 'pending', 'correction_requested')
    )
    OR public.has_permission('admissions.review')
    OR public.has_permission('admissions.override')
    OR public.is_general_admin()
  )
  WITH CHECK (
    (
      applicant_profile_id = public.current_profile_id()
      AND application_status IN ('draft', 'submitted', 'pending', 'correction_requested')
    )
    OR public.has_permission('admissions.review')
    OR public.has_permission('admissions.override')
    OR public.is_general_admin()
  );

-- Policies for admission_medical_details
CREATE POLICY admission_medical_select_authorized ON public.admission_medical_details
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.id = admission_medical_details.application_id
        AND aa.applicant_profile_id = public.current_profile_id()
    )
    OR public.is_general_admin()
    OR public.is_authorized_medical_staff()
    OR public.has_permission('admissions.review')
  );

CREATE POLICY admission_medical_insert_applicant_or_officer ON public.admission_medical_details
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.id = admission_medical_details.application_id
        AND (
          (aa.applicant_profile_id = public.current_profile_id()
           AND aa.application_status IN ('draft', 'submitted', 'pending', 'correction_requested'))
          OR public.has_permission('admissions.review')
          OR public.is_general_admin()
        )
    )
  );

CREATE POLICY admission_medical_update_applicant_or_officer ON public.admission_medical_details
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.id = admission_medical_details.application_id
        AND (
          (aa.applicant_profile_id = public.current_profile_id()
           AND aa.application_status IN ('draft', 'submitted', 'pending', 'correction_requested'))
          OR public.has_permission('admissions.review')
          OR public.is_general_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.id = admission_medical_details.application_id
        AND (
          (aa.applicant_profile_id = public.current_profile_id()
           AND aa.application_status IN ('draft', 'submitted', 'pending', 'correction_requested'))
          OR public.has_permission('admissions.review')
          OR public.is_general_admin()
        )
    )
  );

-- Policies for admission_status_history
CREATE POLICY admission_history_select_authorized ON public.admission_status_history
  FOR SELECT TO authenticated
  USING (
    (
      is_internal = FALSE
      AND EXISTS (
        SELECT 1 FROM public.admission_applications aa
        WHERE aa.id = admission_status_history.application_id
          AND aa.applicant_profile_id = public.current_profile_id()
      )
    )
    OR public.has_permission('admissions.read')
    OR public.has_permission('admissions.review')
    OR public.is_general_admin()
  );

CREATE POLICY admission_history_insert_staff ON public.admission_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission('admissions.review')
    OR public.has_permission('admissions.override')
    OR public.is_general_admin()
  );

-- Prevent modification or deletion of history rows
CREATE OR REPLACE FUNCTION public.prevent_admission_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'admission_status_history records are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admission_history_mutation ON public.admission_status_history;
CREATE TRIGGER trg_prevent_admission_history_mutation
  BEFORE UPDATE OR DELETE ON public.admission_status_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admission_history_mutation();

-- Policies for admission_notifications
CREATE POLICY admission_notifications_select_self_or_staff ON public.admission_notifications
  FOR SELECT TO authenticated
  USING (
    recipient_profile_id = public.current_profile_id()
    OR public.has_permission('admissions.read')
    OR public.has_permission('admissions.review')
    OR public.is_general_admin()
  );

CREATE POLICY admission_notifications_update_read_self ON public.admission_notifications
  FOR UPDATE TO authenticated
  USING (recipient_profile_id = public.current_profile_id())
  WITH CHECK (recipient_profile_id = public.current_profile_id());

CREATE POLICY admission_notifications_insert_staff ON public.admission_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_permission('admissions.review')
    OR public.is_general_admin()
  );

-- 8. Strengthened Trigger Guard, Audit Trail, Status History & Notification Queueing
CREATE OR REPLACE FUNCTION public.guard_admission_application_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service BOOLEAN;
  v_is_admin BOOLEAN;
  v_is_officer BOOLEAN;
  v_can_override BOOLEAN;
  v_actor_profile UUID;
  v_actor_clerk TEXT;
  v_event_type TEXT;
  v_notif_title TEXT;
  v_notif_msg TEXT;
  v_email_log_id UUID;
BEGIN
  v_is_service := (current_setting('role', TRUE) = 'service_role');
  v_is_admin := public.is_general_admin();
  v_is_officer := public.has_permission('admissions.review');
  v_can_override := public.has_permission('admissions.override') OR v_is_admin;
  v_actor_profile := public.current_profile_id();
  v_actor_clerk := public.current_clerk_user_id();

  -- A. Applicant restrictions
  IF NOT v_is_service AND NOT v_is_officer AND NOT v_is_admin THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
       OR NEW.application_fee_kobo IS DISTINCT FROM OLD.application_fee_kobo
       OR NEW.enrolled_student_id IS DISTINCT FROM OLD.enrolled_student_id
       OR NEW.physical_documents_submitted IS DISTINCT FROM OLD.physical_documents_submitted
       OR NEW.physical_documents_status IS DISTINCT FROM OLD.physical_documents_status
       OR NEW.physical_documents_received_at IS DISTINCT FROM OLD.physical_documents_received_at
       OR NEW.physical_documents_received_by_name IS DISTINCT FROM OLD.physical_documents_received_by_name
       OR NEW.physical_documents_verified_by IS DISTINCT FROM OLD.physical_documents_verified_by
       OR NEW.physical_documents_verified_at IS DISTINCT FROM OLD.physical_documents_verified_at
       OR NEW.physical_documents_notes IS DISTINCT FROM OLD.physical_documents_notes
       OR NEW.physical_documents_received_list IS DISTINCT FROM OLD.physical_documents_received_list
       OR NEW.physical_documents_missing_list IS DISTINCT FROM OLD.physical_documents_missing_list
       OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
       OR NEW.reviewed_by_profile_id IS DISTINCT FROM OLD.reviewed_by_profile_id
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
       OR NEW.decision_overridden_by_profile_id IS DISTINCT FROM OLD.decision_overridden_by_profile_id
       OR NEW.decision_overridden_at IS DISTINCT FROM OLD.decision_overridden_at THEN
      RAISE EXCEPTION 'Insufficient permission to modify protected admission review, document verification, or payment columns';
    END IF;

    IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
      IF NOT (
        (OLD.application_status = 'draft' AND NEW.application_status IN ('submitted', 'pending'))
        OR (OLD.application_status = 'correction_requested' AND NEW.application_status IN ('submitted', 'pending'))
      ) THEN
        RAISE EXCEPTION 'Applicants may only submit drafts or resubmit applications when corrections are requested';
      END IF;
    END IF;
  END IF;

  -- B. Admission Officer cannot fabricate verified payment or override finalized decisions without override permission
  IF NOT v_is_service THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference THEN
      RAISE EXCEPTION 'Payment verification status may only be updated by trusted backend payment verification';
    END IF;

    IF OLD.application_status IN ('approved', 'rejected')
       AND NEW.application_status IS DISTINCT FROM OLD.application_status
       AND NOT v_can_override THEN
      RAISE EXCEPTION 'Reopening or overriding an approved/rejected decision requires General Administrator or admissions.override authority';
    END IF;
  END IF;

  -- C. Auto-stamp submission timestamp when transitioning to submitted
  IF NEW.application_status IN ('submitted', 'pending')
     AND OLD.application_status IN ('draft', 'correction_requested')
     AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at := timezone('utc', now());
  END IF;

  -- D. Sync boolean physical_documents_submitted with physical_documents_status
  IF NEW.physical_documents_status IS DISTINCT FROM OLD.physical_documents_status THEN
    NEW.physical_documents_submitted := (NEW.physical_documents_status <> 'not_submitted');
  END IF;

  -- E. Audit + History + Notification on Status Change
  IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    IF OLD.application_status IN ('approved', 'rejected') AND v_can_override THEN
      v_event_type := CASE WHEN NEW.application_status IN ('under_review', 'submitted', 'correction_requested') THEN 'reopened' ELSE 'decision_overridden' END;
    ELSIF OLD.application_status = 'correction_requested' AND NEW.application_status IN ('submitted', 'pending') THEN
      v_event_type := 'resubmitted';
    ELSIF NEW.application_status IN ('submitted', 'pending') THEN
      v_event_type := 'submitted';
    ELSIF NEW.application_status = 'under_review' THEN
      v_event_type := 'under_review';
    ELSIF NEW.application_status = 'correction_requested' THEN
      v_event_type := 'correction_requested';
    ELSIF NEW.application_status = 'approved' THEN
      v_event_type := 'approved';
    ELSIF NEW.application_status = 'rejected' THEN
      v_event_type := 'rejected';
    ELSE
      v_event_type := 'note_added';
    END IF;

    INSERT INTO public.audit_logs (
      actor_profile_id, actor_clerk_user_id, action, entity_type, entity_id, old_values, new_values
    ) VALUES (
      v_actor_profile,
      v_actor_clerk,
      'admission.' || v_event_type,
      'admission_applications',
      NEW.id::TEXT,
      jsonb_build_object('application_status', OLD.application_status, 'correction_notes', OLD.correction_notes),
      jsonb_build_object('application_status', NEW.application_status, 'correction_notes', NEW.correction_notes)
    );

    INSERT INTO public.admission_status_history (
      application_id, event_type, from_status, to_status, physical_documents_status,
      actor_profile_id, actor_role, notes, is_internal
    ) VALUES (
      NEW.id,
      v_event_type,
      OLD.application_status,
      NEW.application_status,
      NEW.physical_documents_status,
      v_actor_profile,
      CASE WHEN v_is_admin THEN 'general_admin' WHEN v_is_officer THEN 'admission_officer' WHEN v_is_service THEN 'system' ELSE 'parent' END,
      CASE WHEN NEW.application_status = 'correction_requested' THEN NEW.correction_notes ELSE NULL END,
      FALSE
    );

    -- Queue notification for key parent-visible transitions
    IF v_event_type IN ('submitted', 'resubmitted', 'under_review', 'correction_requested', 'approved', 'rejected', 'reopened', 'decision_overridden') THEN
      v_notif_title := CASE v_event_type
        WHEN 'submitted' THEN 'Application Submitted (' || NEW.application_reference || ')'
        WHEN 'resubmitted' THEN 'Updated Application Resubmitted (' || NEW.application_reference || ')'
        WHEN 'under_review' THEN 'Application Under Review (' || NEW.application_reference || ')'
        WHEN 'correction_requested' THEN 'Correction Requested (' || NEW.application_reference || ')'
        WHEN 'approved' THEN 'Admission Offer Approved (' || NEW.application_reference || ')'
        WHEN 'rejected' THEN 'Admission Decision Update (' || NEW.application_reference || ')'
        WHEN 'reopened' THEN 'Application Reopened for Review (' || NEW.application_reference || ')'
        ELSE 'Admission Decision Updated (' || NEW.application_reference || ')'
      END;

      v_notif_msg := CASE v_event_type
        WHEN 'submitted' THEN 'Your admission application for ' || NEW.child_first_name || ' ' || NEW.child_last_name || ' has been submitted.'
        WHEN 'resubmitted' THEN 'Your updated admission application for ' || NEW.child_first_name || ' ' || NEW.child_last_name || ' has been resubmitted for review.'
        WHEN 'under_review' THEN 'The Admissions Office is currently reviewing the application for ' || NEW.child_first_name || ' ' || NEW.child_last_name || '.'
        WHEN 'correction_requested' THEN 'Correction requested: ' || COALESCE(NEW.correction_notes, 'Please review and update your application details.')
        WHEN 'approved' THEN 'Congratulations! The admission application for ' || NEW.child_first_name || ' ' || NEW.child_last_name || ' has been approved.'
        WHEN 'rejected' THEN 'The admission application for ' || NEW.child_first_name || ' ' || NEW.child_last_name || ' was not approved at this time.'
        WHEN 'reopened' THEN 'An administrator has reopened the application for ' || NEW.child_first_name || ' ' || NEW.child_last_name || ' for review.'
        ELSE 'An administrator updated the decision status for ' || NEW.child_first_name || ' ' || NEW.child_last_name || '.'
      END;

      v_email_log_id := NULL;
      IF COALESCE(NEW.parent_email, '') <> '' THEN
        INSERT INTO public.email_notification_logs (
          recipient_email, recipient_profile_id, template_key, subject, status
        ) VALUES (
          NEW.parent_email, NEW.applicant_profile_id, 'admission_' || v_event_type, v_notif_title, 'queued'
        )
        RETURNING id INTO v_email_log_id;
      END IF;

      INSERT INTO public.admission_notifications (
        application_id, recipient_profile_id, notification_type, title, message, delivery_status, email_log_id
      ) VALUES (
        NEW.id,
        NEW.applicant_profile_id,
        v_event_type,
        v_notif_title,
        v_notif_msg,
        CASE WHEN v_email_log_id IS NOT NULL THEN 'email_queued_pending_provider' ELSE 'in_app_only' END,
        v_email_log_id
      );
    END IF;
  END IF;

  -- F. Audit + History + Notification on Physical Document Tracking Update
  IF NEW.physical_documents_status IS DISTINCT FROM OLD.physical_documents_status THEN
    INSERT INTO public.audit_logs (
      actor_profile_id, actor_clerk_user_id, action, entity_type, entity_id, old_values, new_values
    ) VALUES (
      v_actor_profile,
      v_actor_clerk,
      'admission.physical_documents_updated',
      'admission_applications',
      NEW.id::TEXT,
      jsonb_build_object(
        'physical_documents_status', OLD.physical_documents_status,
        'received_list', OLD.physical_documents_received_list,
        'missing_list', OLD.physical_documents_missing_list
      ),
      jsonb_build_object(
        'physical_documents_status', NEW.physical_documents_status,
        'received_by_name', NEW.physical_documents_received_by_name,
        'received_list', NEW.physical_documents_received_list,
        'missing_list', NEW.physical_documents_missing_list
      )
    );

    INSERT INTO public.admission_status_history (
      application_id, event_type, from_status, to_status, physical_documents_status,
      actor_profile_id, actor_role, notes, is_internal
    ) VALUES (
      NEW.id,
      'physical_docs_updated',
      OLD.application_status,
      NEW.application_status,
      NEW.physical_documents_status,
      v_actor_profile,
      CASE WHEN v_is_admin THEN 'general_admin' WHEN v_is_officer THEN 'admission_officer' ELSE 'staff' END,
      NEW.physical_documents_notes,
      FALSE
    );

    INSERT INTO public.admission_notifications (
      application_id, recipient_profile_id, notification_type, title, message, delivery_status
    ) VALUES (
      NEW.id,
      NEW.applicant_profile_id,
      'physical_docs_updated',
      'Physical Documents Status: ' || replace(initcap(replace(NEW.physical_documents_status, '_', ' ')), '  ', ' ') || ' (' || NEW.application_reference || ')',
      'Physical admission documents for ' || NEW.child_first_name || ' ' || NEW.child_last_name || ' are now marked as "' || replace(NEW.physical_documents_status, '_', ' ') || '".' ||
      CASE WHEN COALESCE(NEW.physical_documents_notes, '') <> '' THEN ' Note: ' || NEW.physical_documents_notes ELSE '' END,
      'in_app_only'
    );
  END IF;

  -- G. Audit Payment Verification when updated by service_role
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status = 'paid' THEN
    INSERT INTO public.admission_status_history (
      application_id, event_type, from_status, to_status, physical_documents_status,
      actor_profile_id, actor_role, notes, is_internal
    ) VALUES (
      NEW.id, 'payment_verified', OLD.application_status, NEW.application_status, NEW.physical_documents_status,
      v_actor_profile, 'system', 'Application fee verified via backend webhook (' || COALESCE(NEW.payment_reference, 'N/A') || ').', FALSE
    );

    INSERT INTO public.admission_notifications (
      application_id, recipient_profile_id, notification_type, title, message, delivery_status
    ) VALUES (
      NEW.id,
      NEW.applicant_profile_id,
      'payment_verified',
      'Application Fee Verified (' || NEW.application_reference || ')',
      'Your admission application fee has been verified. You may now download and print the official A4 application form for physical submission.',
      'in_app_only'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Log initial application creation in admission_status_history
CREATE OR REPLACE FUNCTION public.log_admission_application_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.admission_status_history (
    application_id, event_type, from_status, to_status, physical_documents_status,
    actor_profile_id, actor_role, notes, is_internal
  ) VALUES (
    NEW.id,
    CASE WHEN NEW.application_status = 'draft' THEN 'created' ELSE 'submitted' END,
    NULL,
    NEW.application_status,
    NEW.physical_documents_status,
    NEW.applicant_profile_id,
    'parent',
    'Application record initialized (' || NEW.application_reference || ').',
    FALSE
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_admission_application_created ON public.admission_applications;
CREATE TRIGGER trg_log_admission_application_created
  AFTER INSERT ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_admission_application_created();

-- 9. Seed Default Public Admission Configuration (NO invented fee amounts)
INSERT INTO public.school_settings (setting_key, setting_value, is_public, description)
VALUES (
  'admission_settings',
  jsonb_build_object(
    'admissions_open', TRUE,
    'current_session_label', '2026/2027',
    'application_fee_configured', FALSE,
    'application_fee_kobo', NULL,
    'currency', 'NGN',
    'physical_submission_instructions', 'Download and print the official A4 Application Form after verified payment, attach passport photographs and required supporting documents, and submit physically at the Admissions Office.'
  ),
  TRUE,
  'Public admission portal configuration and administrator-controlled application fee metadata.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Ensure a baseline upcoming academic session exists if academic_sessions is empty so dropdowns can load
INSERT INTO public.academic_sessions (name, start_date, end_date, is_current)
SELECT '2026/2027', DATE '2026-09-07', DATE '2027-07-23', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.academic_sessions);
