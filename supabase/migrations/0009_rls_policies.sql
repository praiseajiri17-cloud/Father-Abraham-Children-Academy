-- ============================================================================
-- 0009_rls_policies.sql
-- Row Level Security (RLS), Security-Definer Authorization Helpers,
-- and Strict Least-Privilege Policies Across All Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Security-Definer Authorization Helper Functions
-- Always use SET search_path = public, pg_temp and derive identity from
-- current_clerk_user_id() (validated JWT sub claim).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.clerk_user_id = public.current_clerk_user_id()
    AND p.account_status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(p_role_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    JOIN public.staff_roles sr ON sr.staff_id = s.id
    JOIN public.roles r ON r.id = sr.role_id
    WHERE s.profile_id = public.current_profile_id()
      AND s.employment_status = 'active'
      AND sr.is_active = TRUE
      AND r.code = p_role_code
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(p_role_codes TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    JOIN public.staff_roles sr ON sr.staff_id = s.id
    JOIN public.roles r ON r.id = sr.role_id
    WHERE s.profile_id = public.current_profile_id()
      AND s.employment_status = 'active'
      AND sr.is_active = TRUE
      AND r.code = ANY(p_role_codes)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_perm_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    JOIN public.staff_roles sr ON sr.staff_id = s.id
    JOIN public.role_permissions rp ON rp.role_id = sr.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE s.profile_id = public.current_profile_id()
      AND s.employment_status = 'active'
      AND sr.is_active = TRUE
      AND p.code = p_perm_code
  );
$$;

CREATE OR REPLACE FUNCTION public.is_general_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_role('general_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_verified_parent_of(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_students ps
    LEFT JOIN public.parents pr ON pr.id = ps.parent_id
    LEFT JOIN public.guardians g ON g.id = ps.guardian_id
    WHERE ps.student_id = p_student_id
      AND ps.verification_status = 'verified'
      AND (
        pr.profile_id = public.current_profile_id()
        OR g.profile_id = public.current_profile_id()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_teacher_for_class(
  p_class_id UUID,
  p_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_assignments ta
    JOIN public.staff s ON s.id = ta.staff_id
    WHERE s.profile_id = public.current_profile_id()
      AND s.employment_status = 'active'
      AND ta.class_id = p_class_id
      AND ta.is_active = TRUE
      AND (p_session_id IS NULL OR ta.academic_session_id = p_session_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_teacher_for_subject(
  p_class_id UUID,
  p_subject_id UUID,
  p_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_assignments ta
    JOIN public.staff s ON s.id = ta.staff_id
    WHERE s.profile_id = public.current_profile_id()
      AND s.employment_status = 'active'
      AND ta.class_id = p_class_id
      AND (ta.subject_id = p_subject_id OR ta.is_class_teacher = TRUE)
      AND ta.is_active = TRUE
      AND (p_session_id IS NULL OR ta.academic_session_id = p_session_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_enrollments se
    JOIN public.teacher_assignments ta
      ON ta.class_id = se.class_id
     AND ta.academic_session_id = se.academic_session_id
    JOIN public.staff s ON s.id = ta.staff_id
    WHERE se.student_id = p_student_id
      AND se.enrollment_state = 'active'
      AND ta.is_active = TRUE
      AND s.profile_id = public.current_profile_id()
      AND s.employment_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_authorized_medical_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_general_admin()
    OR EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE s.profile_id = public.current_profile_id()
        AND s.employment_status = 'active'
        AND s.can_access_medical_records = TRUE
        AND public.has_permission('students.medical.read')
    );
$$;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS on ALL Tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_provisioning_state ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.school_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_arms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scale_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_promotion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_medical_alerts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_score_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Identity & RBAC Policies
-- ----------------------------------------------------------------------------

-- profiles: users can read/create/update their own profile; general_admin/staff can read
CREATE POLICY profiles_select_self_or_staff ON public.profiles
  FOR SELECT TO authenticated
  USING (
    clerk_user_id = public.current_clerk_user_id()
    OR public.is_general_admin()
    OR public.has_permission('staff.manage')
    OR public.has_permission('students.read')
    OR public.has_permission('admissions.read')
  );

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    clerk_user_id = public.current_clerk_user_id()
    AND account_status = 'active'
  );

CREATE POLICY profiles_update_self_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    clerk_user_id = public.current_clerk_user_id()
    OR public.is_general_admin()
  )
  WITH CHECK (
    clerk_user_id = public.current_clerk_user_id()
    OR public.is_general_admin()
  );

-- roles / permissions / role_permissions: read-only reference for authenticated users, admin writes
CREATE POLICY roles_select_authenticated ON public.roles
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY roles_manage_admin ON public.roles
  FOR ALL TO authenticated
  USING (public.is_general_admin())
  WITH CHECK (public.is_general_admin());

CREATE POLICY permissions_select_authenticated ON public.permissions
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY permissions_manage_admin ON public.permissions
  FOR ALL TO authenticated
  USING (public.is_general_admin())
  WITH CHECK (public.is_general_admin());

CREATE POLICY role_permissions_select_authenticated ON public.role_permissions
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY role_permissions_manage_admin ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_general_admin())
  WITH CHECK (public.is_general_admin());

-- staff & staff_roles: strictly no self-assignment
CREATE POLICY staff_select_self_or_admin ON public.staff
  FOR SELECT TO authenticated
  USING (
    profile_id = public.current_profile_id()
    OR public.is_general_admin()
    OR public.has_permission('staff.manage')
  );

CREATE POLICY staff_manage_admin ON public.staff
  FOR ALL TO authenticated
  USING (public.is_general_admin())
  WITH CHECK (public.is_general_admin());

CREATE POLICY staff_roles_select_self_or_admin ON public.staff_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_roles.staff_id
        AND s.profile_id = public.current_profile_id()
    )
    OR public.is_general_admin()
    OR public.has_permission('staff.manage')
  );

-- Only General Admin can assign or revoke staff roles
CREATE POLICY staff_roles_manage_admin ON public.staff_roles
  FOR ALL TO authenticated
  USING (public.is_general_admin())
  WITH CHECK (public.is_general_admin());

CREATE POLICY owner_provisioning_select_admin ON public.owner_provisioning_state
  FOR SELECT TO authenticated
  USING (public.is_general_admin());

-- ----------------------------------------------------------------------------
-- 4. School Structure Policies
-- ----------------------------------------------------------------------------
CREATE POLICY school_sections_select_all ON public.school_sections
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY school_sections_manage_admin ON public.school_sections
  FOR ALL TO authenticated
  USING (public.is_general_admin())
  WITH CHECK (public.is_general_admin());

CREATE POLICY class_levels_select_all ON public.class_levels
  FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY class_levels_manage_admin ON public.class_levels
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY academic_sessions_select_auth ON public.academic_sessions
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY academic_sessions_manage_admin ON public.academic_sessions
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY terms_select_auth ON public.terms
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY terms_manage_admin ON public.terms
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY class_arms_select_auth ON public.class_arms
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY class_arms_manage_admin ON public.class_arms
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY classes_select_auth ON public.classes
  FOR SELECT TO authenticated
  USING (
    public.has_permission('academics.structure.manage')
    OR public.has_permission('students.read')
    OR public.is_assigned_teacher_for_class(id)
    OR EXISTS (
      SELECT 1 FROM public.student_enrollments se
      WHERE se.class_id = classes.id
        AND public.is_verified_parent_of(se.student_id)
    )
  );

CREATE POLICY classes_manage_admin ON public.classes
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY subjects_select_auth ON public.subjects
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY subjects_manage_admin ON public.subjects
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY class_subjects_select_auth ON public.class_subjects
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY class_subjects_manage_admin ON public.class_subjects
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY teacher_assignments_select_staff ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = teacher_assignments.staff_id
        AND s.profile_id = public.current_profile_id()
    )
    OR public.has_permission('academics.structure.manage')
    OR public.is_general_admin()
  );

CREATE POLICY teacher_assignments_manage_admin ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY grading_scales_select_auth ON public.grading_scales
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY grading_scales_manage_admin ON public.grading_scales
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY grading_scale_rules_select_auth ON public.grading_scale_rules
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY grading_scale_rules_manage_admin ON public.grading_scale_rules
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

-- ----------------------------------------------------------------------------
-- 5. Parents, Guardians, Students & Medical Alerts Policies
-- ----------------------------------------------------------------------------
CREATE POLICY parents_select_self_or_staff ON public.parents
  FOR SELECT TO authenticated
  USING (
    profile_id = public.current_profile_id()
    OR public.has_permission('students.read')
    OR public.has_permission('admissions.read')
  );

CREATE POLICY parents_insert_self ON public.parents
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id());

CREATE POLICY parents_update_self_or_admin ON public.parents
  FOR UPDATE TO authenticated
  USING (
    profile_id = public.current_profile_id()
    OR public.is_general_admin()
  )
  WITH CHECK (
    profile_id = public.current_profile_id()
    OR public.is_general_admin()
  );

CREATE POLICY guardians_select_self_or_staff ON public.guardians
  FOR SELECT TO authenticated
  USING (
    profile_id = public.current_profile_id()
    OR public.has_permission('students.read')
    OR public.has_permission('students.manage')
  );

CREATE POLICY guardians_manage_staff ON public.guardians
  FOR ALL TO authenticated
  USING (public.has_permission('students.manage'))
  WITH CHECK (public.has_permission('students.manage'));

-- parent_students: Parents can only read their own link records; ONLY authorized staff can insert/verify
CREATE POLICY parent_students_select_self_or_staff ON public.parent_students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parents pr
      WHERE pr.id = parent_students.parent_id
        AND pr.profile_id = public.current_profile_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.guardians g
      WHERE g.id = parent_students.guardian_id
        AND g.profile_id = public.current_profile_id()
    )
    OR public.has_permission('students.read')
  );

CREATE POLICY parent_students_manage_staff ON public.parent_students
  FOR ALL TO authenticated
  USING (public.has_permission('students.manage'))
  WITH CHECK (public.has_permission('students.manage'));

-- students: verified parents, assigned teachers (enrolled classes only), or authorized staff
CREATE POLICY students_select_authorized ON public.students
  FOR SELECT TO authenticated
  USING (
    public.is_verified_parent_of(id)
    OR public.is_teacher_of_student(id)
    OR public.has_any_role(ARRAY['general_admin', 'principal', 'admission_officer', 'finance_officer', 'secretary'])
  );

CREATE POLICY students_manage_staff ON public.students
  FOR ALL TO authenticated
  USING (public.has_permission('students.manage'))
  WITH CHECK (public.has_permission('students.manage'));

CREATE POLICY student_enrollments_select_authorized ON public.student_enrollments
  FOR SELECT TO authenticated
  USING (
    public.is_verified_parent_of(student_id)
    OR public.is_assigned_teacher_for_class(class_id, academic_session_id)
    OR public.has_any_role(ARRAY['general_admin', 'principal', 'finance_officer', 'secretary'])
  );

CREATE POLICY student_enrollments_manage_staff ON public.student_enrollments
  FOR ALL TO authenticated
  USING (public.has_permission('students.manage'))
  WITH CHECK (public.has_permission('students.manage'));

CREATE POLICY student_promotion_history_select_authorized ON public.student_promotion_history
  FOR SELECT TO authenticated
  USING (
    public.is_verified_parent_of(student_id)
    OR public.has_any_role(ARRAY['general_admin', 'principal', 'secretary'])
  );

CREATE POLICY student_promotion_history_manage_staff ON public.student_promotion_history
  FOR ALL TO authenticated
  USING (public.has_permission('students.manage'))
  WITH CHECK (public.has_permission('students.manage'));

-- student_medical_alerts: strictly restricted to authorized medical staff / principal / general_admin
CREATE POLICY medical_alerts_select_restricted ON public.student_medical_alerts
  FOR SELECT TO authenticated
  USING (public.is_authorized_medical_staff());

CREATE POLICY medical_alerts_manage_restricted ON public.student_medical_alerts
  FOR ALL TO authenticated
  USING (
    public.is_general_admin()
    OR (
      public.is_authorized_medical_staff()
      AND public.has_permission('students.medical.manage')
    )
  )
  WITH CHECK (
    public.is_general_admin()
    OR (
      public.is_authorized_medical_staff()
      AND public.has_permission('students.medical.manage')
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Admissions Policies
-- ----------------------------------------------------------------------------
CREATE POLICY admission_apps_select_own_or_staff ON public.admission_applications
  FOR SELECT TO authenticated
  USING (
    applicant_profile_id = public.current_profile_id()
    OR public.has_permission('admissions.read')
    OR public.has_permission('admissions.review')
    OR public.is_general_admin()
  );

CREATE POLICY admission_apps_insert_applicant ON public.admission_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    applicant_profile_id = public.current_profile_id()
    AND application_status = 'pending'
    AND payment_status = 'unpaid'
    AND enrolled_student_id IS NULL
  );

CREATE POLICY admission_apps_update_applicant_or_officer ON public.admission_applications
  FOR UPDATE TO authenticated
  USING (
    (
      applicant_profile_id = public.current_profile_id()
      AND application_status IN ('pending', 'correction_requested')
    )
    OR public.has_permission('admissions.review')
    OR public.is_general_admin()
  )
  WITH CHECK (
    (
      applicant_profile_id = public.current_profile_id()
      AND application_status IN ('pending', 'correction_requested')
    )
    OR public.has_permission('admissions.review')
    OR public.is_general_admin()
  );

CREATE POLICY admission_docs_select_own_or_officer ON public.admission_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.id = admission_documents.application_id
        AND aa.applicant_profile_id = public.current_profile_id()
    )
    OR public.has_permission('admissions.read')
    OR public.has_permission('admissions.review')
    OR public.is_general_admin()
  );

CREATE POLICY admission_docs_insert_applicant_or_officer ON public.admission_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by_profile_id = public.current_profile_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.admission_applications aa
        WHERE aa.id = admission_documents.application_id
          AND aa.applicant_profile_id = public.current_profile_id()
      )
      OR public.has_permission('admissions.review')
      OR public.is_general_admin()
    )
  );

CREATE POLICY admission_docs_update_officer ON public.admission_documents
  FOR UPDATE TO authenticated
  USING (
    public.has_permission('admissions.review')
    OR public.is_general_admin()
  )
  WITH CHECK (
    public.has_permission('admissions.review')
    OR public.is_general_admin()
  );

-- application_payments: read-only to applicant / finance / admission read; NO client can verify payments!
CREATE POLICY application_payments_select_own_or_staff ON public.application_payments
  FOR SELECT TO authenticated
  USING (
    payer_profile_id = public.current_profile_id()
    OR public.has_permission('finance.read')
    OR public.has_permission('admissions.read')
    OR public.is_general_admin()
  );

-- ----------------------------------------------------------------------------
-- 7. Academics & Attendance Policies
-- ----------------------------------------------------------------------------
CREATE POLICY assessments_select_auth ON public.assessments
  FOR SELECT TO authenticated
  USING (
    public.has_permission('academics.structure.manage')
    OR public.is_assigned_teacher_for_subject(class_id, subject_id, academic_session_id)
    OR public.has_any_role(ARRAY['general_admin', 'principal'])
  );

CREATE POLICY assessments_manage_admin ON public.assessments
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY assessment_components_select_auth ON public.assessment_components
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_components.assessment_id
        AND (
          public.has_permission('academics.structure.manage')
          OR public.is_assigned_teacher_for_subject(a.class_id, a.subject_id, a.academic_session_id)
          OR public.has_any_role(ARRAY['general_admin', 'principal'])
        )
    )
  );

CREATE POLICY assessment_components_manage_admin ON public.assessment_components
  FOR ALL TO authenticated
  USING (public.has_permission('academics.structure.manage'))
  WITH CHECK (public.has_permission('academics.structure.manage'));

CREATE POLICY result_publications_select_auth ON public.result_publications
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY result_publications_manage_authorized ON public.result_publications
  FOR ALL TO authenticated
  USING (
    public.is_general_admin()
    OR public.has_permission('results.publish')
  )
  WITH CHECK (
    public.is_general_admin()
    OR public.has_permission('results.publish')
  );

-- results:
-- Parents: ONLY verified linked child + submission_status = 'published' + class/term published
-- Teachers: ONLY assigned class & subject (and cannot publish unless results.publish)
-- Principal / General Admin: read/approve/publish
CREATE POLICY results_select_authorized ON public.results
  FOR SELECT TO authenticated
  USING (
    (
      public.is_verified_parent_of(student_id)
      AND submission_status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.result_publications rp
        WHERE rp.academic_session_id = results.academic_session_id
          AND rp.term_id = results.term_id
          AND rp.class_id = results.class_id
          AND rp.is_published = TRUE
      )
    )
    OR public.is_assigned_teacher_for_subject(class_id, subject_id, academic_session_id)
    OR public.has_any_role(ARRAY['general_admin', 'principal'])
  );

CREATE POLICY results_insert_teacher_or_admin ON public.results
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_assigned_teacher_for_subject(class_id, subject_id, academic_session_id)
      AND submission_status IN ('draft', 'submitted')
    )
    OR public.is_general_admin()
    OR public.has_permission('results.approve')
  );

CREATE POLICY results_update_teacher_or_admin ON public.results
  FOR UPDATE TO authenticated
  USING (
    (
      public.is_assigned_teacher_for_subject(class_id, subject_id, academic_session_id)
      AND submission_status IN ('draft', 'submitted')
    )
    OR public.is_general_admin()
    OR public.has_permission('results.approve')
    OR public.has_permission('results.publish')
  )
  WITH CHECK (
    (
      public.is_assigned_teacher_for_subject(class_id, subject_id, academic_session_id)
      AND submission_status IN ('draft', 'submitted')
    )
    OR public.is_general_admin()
    OR public.has_permission('results.approve')
    OR public.has_permission('results.publish')
  );

-- result_score_audit: read-only for audit.read / principal / general_admin
CREATE POLICY result_score_audit_select_authorized ON public.result_score_audit
  FOR SELECT TO authenticated
  USING (
    public.is_general_admin()
    OR public.has_permission('audit.read')
    OR public.has_role('principal')
  );

-- report_cards: parents see published only; staff/principal/admin manage
CREATE POLICY report_cards_select_authorized ON public.report_cards
  FOR SELECT TO authenticated
  USING (
    (public.is_verified_parent_of(student_id) AND is_published = TRUE)
    OR public.is_assigned_teacher_for_class(class_id, academic_session_id)
    OR public.has_any_role(ARRAY['general_admin', 'principal'])
  );

CREATE POLICY report_cards_manage_authorized ON public.report_cards
  FOR ALL TO authenticated
  USING (
    public.is_general_admin()
    OR public.has_permission('results.publish')
  )
  WITH CHECK (
    public.is_general_admin()
    OR public.has_permission('results.publish')
  );

-- attendance_records: parents read verified children; teachers read/write assigned classes only
CREATE POLICY attendance_select_authorized ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    public.is_verified_parent_of(student_id)
    OR public.is_assigned_teacher_for_class(class_id, academic_session_id)
    OR public.has_any_role(ARRAY['general_admin', 'principal'])
  );

CREATE POLICY attendance_insert_teacher_or_admin ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_assigned_teacher_for_class(class_id, academic_session_id)
    OR public.is_general_admin()
    OR public.has_role('principal')
  );

CREATE POLICY attendance_update_teacher_or_admin ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (
    public.is_assigned_teacher_for_class(class_id, academic_session_id)
    OR public.is_general_admin()
    OR public.has_role('principal')
  )
  WITH CHECK (
    public.is_assigned_teacher_for_class(class_id, academic_session_id)
    OR public.is_general_admin()
    OR public.has_role('principal')
  );

-- ----------------------------------------------------------------------------
-- 8. Finance & Payments Policies
-- ----------------------------------------------------------------------------
CREATE POLICY fee_structures_select_auth ON public.fee_structures
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY fee_structures_manage_finance ON public.fee_structures
  FOR ALL TO authenticated
  USING (
    public.is_general_admin()
    OR public.has_permission('finance.manage')
  )
  WITH CHECK (
    public.is_general_admin()
    OR public.has_permission('finance.manage')
  );

CREATE POLICY invoices_select_authorized ON public.invoices
  FOR SELECT TO authenticated
  USING (
    public.is_verified_parent_of(student_id)
    OR public.has_permission('finance.read')
    OR public.is_general_admin()
  );

-- Finance officers may issue/cancel invoices, but ONLY server/service_role sets paid_at/paid via verified payment
CREATE POLICY invoices_insert_finance ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_permission('finance.manage') OR public.is_general_admin())
    AND status IN ('unpaid', 'pending_verification')
    AND paid_at IS NULL
  );

CREATE POLICY invoices_update_finance ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    public.has_permission('finance.manage')
    OR public.is_general_admin()
  )
  WITH CHECK (
    (public.has_permission('finance.manage') OR public.is_general_admin())
    AND status IN ('unpaid', 'pending_verification', 'cancelled', 'void')
  );

CREATE POLICY invoice_items_select_authorized ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (
          public.is_verified_parent_of(inv.student_id)
          OR public.has_permission('finance.read')
          OR public.is_general_admin()
        )
    )
  );

CREATE POLICY invoice_items_manage_finance ON public.invoice_items
  FOR ALL TO authenticated
  USING (
    public.has_permission('finance.manage')
    OR public.is_general_admin()
  )
  WITH CHECK (
    public.has_permission('finance.manage')
    OR public.is_general_admin()
  );

-- payments: read-only to authorized parent/finance/admin; NO client can insert/update verified payment
CREATE POLICY payments_select_authorized ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = payments.invoice_id
        AND (
          public.is_verified_parent_of(inv.student_id)
          OR public.has_permission('finance.read')
          OR public.is_general_admin()
        )
    )
  );

CREATE POLICY webhook_events_select_finance_admin ON public.payment_webhook_events
  FOR SELECT TO authenticated
  USING (
    public.is_general_admin()
    OR public.has_permission('finance.read')
  );

CREATE POLICY receipts_select_authorized ON public.receipts
  FOR SELECT TO authenticated
  USING (
    public.is_verified_parent_of(student_id)
    OR public.has_permission('finance.read')
    OR public.is_general_admin()
  );

-- ----------------------------------------------------------------------------
-- 9. Communication & Audit Log Policies
-- ----------------------------------------------------------------------------
CREATE POLICY announcements_select_public ON public.announcements
  FOR SELECT TO anon
  USING (audience = 'public' AND is_published = TRUE);

CREATE POLICY announcements_select_authenticated ON public.announcements
  FOR SELECT TO authenticated
  USING (
    (is_published = TRUE AND audience IN ('public', 'all'))
    OR (is_published = TRUE AND audience = 'parents' AND EXISTS (
      SELECT 1 FROM public.parents pr WHERE pr.profile_id = public.current_profile_id()
    ))
    OR (is_published = TRUE AND audience = 'staff' AND EXISTS (
      SELECT 1 FROM public.staff s WHERE s.profile_id = public.current_profile_id() AND s.employment_status = 'active'
    ))
    OR public.has_permission('communication.manage')
    OR public.is_general_admin()
  );

CREATE POLICY announcements_manage_staff ON public.announcements
  FOR ALL TO authenticated
  USING (
    public.has_permission('communication.manage')
    OR public.is_general_admin()
  )
  WITH CHECK (
    public.has_permission('communication.manage')
    OR public.is_general_admin()
  );

CREATE POLICY contact_enquiries_insert_public ON public.contact_enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND handled_by_profile_id IS NULL
  );

CREATE POLICY contact_enquiries_manage_staff ON public.contact_enquiries
  FOR SELECT TO authenticated
  USING (
    public.has_permission('communication.manage')
    OR public.is_general_admin()
  );

CREATE POLICY contact_enquiries_update_staff ON public.contact_enquiries
  FOR UPDATE TO authenticated
  USING (
    public.has_permission('communication.manage')
    OR public.is_general_admin()
  )
  WITH CHECK (
    public.has_permission('communication.manage')
    OR public.is_general_admin()
  );

CREATE POLICY school_settings_select_public ON public.school_settings
  FOR SELECT TO anon, authenticated
  USING (
    is_public = TRUE
    OR public.is_general_admin()
    OR public.has_permission('settings.manage')
  );

CREATE POLICY school_settings_manage_admin ON public.school_settings
  FOR ALL TO authenticated
  USING (
    public.is_general_admin()
    OR public.has_permission('settings.manage')
  )
  WITH CHECK (
    public.is_general_admin()
    OR public.has_permission('settings.manage')
  );

CREATE POLICY email_logs_select_admin ON public.email_notification_logs
  FOR SELECT TO authenticated
  USING (public.is_general_admin());

-- audit_logs: strictly read-only for general_admin / audit.read; NEVER editable/deletable
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_general_admin()
    OR public.has_permission('audit.read')
  );
