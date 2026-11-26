-- ============================================================================
-- 0010_storage_and_security_functions.sql
-- Private Storage Buckets, Storage RLS Policies, Score Audit Triggers,
-- Profile / Admission / Audit-Log Protection Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create Private Storage Buckets (public = FALSE by default)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'admission-documents',
    'admission-documents',
    FALSE,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'student-documents',
    'student-documents',
    FALSE,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'student-passport-photos',
    'student-passport-photos',
    FALSE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'generated-admission-forms',
    'generated-admission-forms',
    FALSE,
    10485760,
    ARRAY['application/pdf']
  ),
  (
    'generated-report-cards',
    'generated-report-cards',
    FALSE,
    10485760,
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO UPDATE
SET public = FALSE;

-- ----------------------------------------------------------------------------
-- 2. Storage Path Ownership Helpers
-- Expected object path conventions:
--   admission-documents/{application_uuid}/{filename}
--   generated-admission-forms/{application_uuid}/{filename}
--   student-documents/{student_uuid}/{subpath...} (medical files under .../medical/...)
--   student-passport-photos/{student_uuid}/{filename}
--   generated-report-cards/{student_uuid}/{term_uuid}/{filename}
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.storage_object_folder_uuid(p_object_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_first_segment TEXT;
BEGIN
  v_first_segment := split_part(p_object_name, '/', 1);
  RETURN v_first_segment::UUID;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_admission_storage(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_general_admin()
    OR public.has_permission('admissions.read')
    OR public.has_permission('admissions.review')
    OR EXISTS (
      SELECT 1
      FROM public.admission_applications aa
      WHERE aa.id = public.storage_object_folder_uuid(p_object_name)
        AND aa.applicant_profile_id = public.current_profile_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_student_document_storage(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    -- Medical documents under student-documents/{student_id}/medical/... are strictly restricted
    WHEN split_part(p_object_name, '/', 2) = 'medical' THEN
      public.is_authorized_medical_staff()
    ELSE
      public.is_general_admin()
      OR public.has_any_role(ARRAY['principal', 'secretary'])
      OR public.is_verified_parent_of(public.storage_object_folder_uuid(p_object_name))
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_report_card_storage(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_general_admin()
    OR public.has_any_role(ARRAY['principal'])
    OR EXISTS (
      SELECT 1
      FROM public.report_cards rc
      WHERE rc.storage_path = p_object_name
        AND rc.is_published = TRUE
        AND public.is_verified_parent_of(rc.student_id)
    );
$$;

-- ----------------------------------------------------------------------------
-- 3. Storage RLS Policies on storage.objects
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS storage_admission_docs_select ON storage.objects;
CREATE POLICY storage_admission_docs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'admission-documents'
    AND public.can_access_admission_storage(name)
  );

DROP POLICY IF EXISTS storage_admission_docs_insert ON storage.objects;
CREATE POLICY storage_admission_docs_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'admission-documents'
    AND public.can_access_admission_storage(name)
  );

DROP POLICY IF EXISTS storage_admission_forms_select ON storage.objects;
CREATE POLICY storage_admission_forms_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-admission-forms'
    AND public.can_access_admission_storage(name)
  );

DROP POLICY IF EXISTS storage_student_docs_select ON storage.objects;
CREATE POLICY storage_student_docs_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.can_access_student_document_storage(name)
  );

DROP POLICY IF EXISTS storage_student_docs_manage ON storage.objects;
CREATE POLICY storage_student_docs_manage ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND (
      (split_part(name, '/', 2) = 'medical' AND (public.is_general_admin() OR public.has_permission('students.medical.manage')))
      OR (split_part(name, '/', 2) <> 'medical' AND public.has_permission('students.manage'))
    )
  );

DROP POLICY IF EXISTS storage_passport_photos_select ON storage.objects;
CREATE POLICY storage_passport_photos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-passport-photos'
    AND (
      public.is_general_admin()
      OR public.has_any_role(ARRAY['principal', 'secretary', 'admission_officer'])
      OR public.is_verified_parent_of(public.storage_object_folder_uuid(name))
      OR public.is_teacher_of_student(public.storage_object_folder_uuid(name))
    )
  );

DROP POLICY IF EXISTS storage_passport_photos_manage ON storage.objects;
CREATE POLICY storage_passport_photos_manage ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-passport-photos'
    AND public.has_permission('students.manage')
  );

DROP POLICY IF EXISTS storage_report_cards_select ON storage.objects;
CREATE POLICY storage_report_cards_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'generated-report-cards'
    AND public.can_access_report_card_storage(name)
  );

-- ----------------------------------------------------------------------------
-- 4. Security & Integrity Database Triggers
-- ----------------------------------------------------------------------------

-- A. Prevent non-admins from changing clerk_user_id or account_status on profiles
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('role', TRUE) <> 'service_role' AND NOT public.is_general_admin() THEN
    IF NEW.clerk_user_id IS DISTINCT FROM OLD.clerk_user_id THEN
      RAISE EXCEPTION 'Cannot modify clerk_user_id';
    END IF;
    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Cannot modify account_status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_columns();

-- B. Prevent applicants from altering admission decision or payment status
CREATE OR REPLACE FUNCTION public.guard_admission_application_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('role', TRUE) <> 'service_role'
     AND NOT public.has_permission('admissions.review')
     AND NOT public.is_general_admin() THEN
    IF NEW.application_status IS DISTINCT FROM OLD.application_status
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.enrolled_student_id IS DISTINCT FROM OLD.enrolled_student_id
       OR NEW.physical_documents_submitted IS DISTINCT FROM OLD.physical_documents_submitted
       OR NEW.reviewed_by_profile_id IS DISTINCT FROM OLD.reviewed_by_profile_id
       OR NEW.decision_overridden_by_profile_id IS DISTINCT FROM OLD.decision_overridden_by_profile_id THEN
      RAISE EXCEPTION 'Insufficient permission to modify admission decision or payment status';
    END IF;
  END IF;

  -- Record audit event when admission decision changes
  IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    INSERT INTO public.audit_logs (
      actor_profile_id,
      actor_clerk_user_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values
    ) VALUES (
      public.current_profile_id(),
      public.current_clerk_user_id(),
      'admission.status_changed',
      'admission_applications',
      NEW.id::TEXT,
      jsonb_build_object('application_status', OLD.application_status),
      jsonb_build_object('application_status', NEW.application_status)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_admission_application_updates ON public.admission_applications;
CREATE TRIGGER trg_guard_admission_application_updates
  BEFORE UPDATE ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_admission_application_updates();

-- C. Automatically log every score entry and modification into result_score_audit & audit_logs
CREATE OR REPLACE FUNCTION public.log_result_score_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    INSERT INTO public.result_score_audit (
      result_id, student_id, subject_id, action,
      new_ca_score, new_exam_score, new_component_scores, new_status,
      changed_by_profile_id, changed_by_clerk_user_id
    ) VALUES (
      NEW.id, NEW.student_id, NEW.subject_id, v_action,
      NEW.ca_score, NEW.exam_score, NEW.component_scores, NEW.submission_status,
      public.current_profile_id(), public.current_clerk_user_id()
    );
    RETURN NEW;
  END IF;

  IF NEW.ca_score IS DISTINCT FROM OLD.ca_score
     OR NEW.exam_score IS DISTINCT FROM OLD.exam_score
     OR NEW.component_scores IS DISTINCT FROM OLD.component_scores
     OR NEW.submission_status IS DISTINCT FROM OLD.submission_status THEN
    v_action := CASE
      WHEN NEW.submission_status IS DISTINCT FROM OLD.submission_status
        AND NEW.ca_score = OLD.ca_score
        AND NEW.exam_score = OLD.exam_score THEN 'status_changed'
      ELSE 'updated'
    END;

    INSERT INTO public.result_score_audit (
      result_id, student_id, subject_id, action,
      previous_ca_score, previous_exam_score, previous_component_scores, previous_status,
      new_ca_score, new_exam_score, new_component_scores, new_status,
      changed_by_profile_id, changed_by_clerk_user_id
    ) VALUES (
      NEW.id, NEW.student_id, NEW.subject_id, v_action,
      OLD.ca_score, OLD.exam_score, OLD.component_scores, OLD.submission_status,
      NEW.ca_score, NEW.exam_score, NEW.component_scores, NEW.submission_status,
      public.current_profile_id(), public.current_clerk_user_id()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_result_score_change ON public.results;
CREATE TRIGGER trg_log_result_score_change
  AFTER INSERT OR UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.log_result_score_change();

-- D. Audit staff role assignments and revocations
CREATE OR REPLACE FUNCTION public.log_staff_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_profile_id,
    actor_clerk_user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    public.current_profile_id(),
    public.current_clerk_user_id(),
    'staff_roles.' || lower(TG_OP),
    'staff_roles',
    COALESCE(NEW.id, OLD.id)::TEXT,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_staff_role_change ON public.staff_roles;
CREATE TRIGGER trg_log_staff_role_change
  AFTER INSERT OR UPDATE OR DELETE ON public.staff_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_staff_role_change();

-- E. Make audit_logs strictly immutable (no UPDATE or DELETE even via SQL mistakes)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs records are immutable and cannot be modified or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
