-- ============================================================================
-- rls_security_tests.sql
-- Father Abraham Children Academy — Database RLS & Privilege Security Tests
--
-- IMPORTANT:
-- Run inside a transaction (BEGIN; ... ROLLBACK;) in Supabase SQL Editor or psql
-- AFTER applying migrations 0001 through 0010.
-- Every assertion switches to `SET LOCAL ROLE authenticated` with simulated
-- Clerk JWT claims (request.jwt.claims -> sub), NEVER testing only as service_role.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Seed Isolated Test Fixtures (executed under migration/admin context)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_admin_profile_id UUID;
  v_parent_a_profile_id UUID;
  v_parent_b_profile_id UUID;
  v_teacher_profile_id UUID;
  v_admission_officer_profile_id UUID;
  v_finance_officer_profile_id UUID;
  v_ordinary_profile_id UUID;

  v_parent_a_id UUID;
  v_parent_b_id UUID;

  v_staff_admin_id UUID;
  v_staff_teacher_id UUID;
  v_staff_admission_id UUID;
  v_staff_finance_id UUID;

  v_role_admin_id UUID;
  v_role_teacher_id UUID;
  v_role_admission_id UUID;
  v_role_finance_id UUID;

  v_section_primary_id UUID;
  v_level_pri1_id UUID;
  v_level_pri2_id UUID;
  v_arm_a_id UUID;
  v_session_id UUID;
  v_term_id UUID;
  v_class_assigned_id UUID;
  v_class_unassigned_id UUID;
  v_subject_math_id UUID;
  v_assessment_id UUID;

  v_student_a_id UUID;
  v_student_b_id UUID;
  v_result_a_id UUID;
  v_app_b_id UUID;
  v_audit_id UUID;
BEGIN
  -- Profiles
  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_test_admin', 'admin@test.local', 'Owner', 'Admin')
  RETURNING id INTO v_admin_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_test_parent_a', 'parenta@test.local', 'Parent', 'A')
  RETURNING id INTO v_parent_a_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_test_parent_b', 'parentb@test.local', 'Parent', 'B')
  RETURNING id INTO v_parent_b_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_test_teacher', 'teacher@test.local', 'Teacher', 'One')
  RETURNING id INTO v_teacher_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_test_admission', 'admission@test.local', 'Admission', 'Officer')
  RETURNING id INTO v_admission_officer_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_test_finance', 'finance@test.local', 'Finance', 'Officer')
  RETURNING id INTO v_finance_officer_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_test_ordinary', 'ordinary@test.local', 'Ordinary', 'User')
  RETURNING id INTO v_ordinary_profile_id;

  -- Roles
  SELECT id INTO v_role_admin_id FROM public.roles WHERE code = 'general_admin';
  SELECT id INTO v_role_teacher_id FROM public.roles WHERE code = 'teacher';
  SELECT id INTO v_role_admission_id FROM public.roles WHERE code = 'admission_officer';
  SELECT id INTO v_role_finance_id FROM public.roles WHERE code = 'finance_officer';

  -- Staff & Staff Roles
  INSERT INTO public.staff (profile_id, staff_number, can_access_medical_records)
  VALUES (v_admin_profile_id, 'STF-TEST-001', TRUE)
  RETURNING id INTO v_staff_admin_id;
  INSERT INTO public.staff_roles (staff_id, role_id) VALUES (v_staff_admin_id, v_role_admin_id);

  INSERT INTO public.staff (profile_id, staff_number, can_access_medical_records)
  VALUES (v_teacher_profile_id, 'STF-TEST-002', FALSE)
  RETURNING id INTO v_staff_teacher_id;
  INSERT INTO public.staff_roles (staff_id, role_id) VALUES (v_staff_teacher_id, v_role_teacher_id);

  INSERT INTO public.staff (profile_id, staff_number, can_access_medical_records)
  VALUES (v_admission_officer_profile_id, 'STF-TEST-003', FALSE)
  RETURNING id INTO v_staff_admission_id;
  INSERT INTO public.staff_roles (staff_id, role_id) VALUES (v_staff_admission_id, v_role_admission_id);

  INSERT INTO public.staff (profile_id, staff_number, can_access_medical_records)
  VALUES (v_finance_officer_profile_id, 'STF-TEST-004', FALSE)
  RETURNING id INTO v_staff_finance_id;
  INSERT INTO public.staff_roles (staff_id, role_id) VALUES (v_staff_finance_id, v_role_finance_id);

  -- Parents
  INSERT INTO public.parents (profile_id) VALUES (v_parent_a_profile_id) RETURNING id INTO v_parent_a_id;
  INSERT INTO public.parents (profile_id) VALUES (v_parent_b_profile_id) RETURNING id INTO v_parent_b_id;

  -- School Structure
  SELECT id INTO v_section_primary_id FROM public.school_sections WHERE code = 'primary';
  SELECT id INTO v_level_pri1_id FROM public.class_levels WHERE code = 'PRI_1';
  SELECT id INTO v_level_pri2_id FROM public.class_levels WHERE code = 'PRI_2';
  SELECT id INTO v_arm_a_id FROM public.class_arms WHERE name = 'A';

  INSERT INTO public.academic_sessions (name, start_date, end_date, is_current)
  VALUES ('TEST-2026/2027', '2026-09-01', '2027-07-31', FALSE)
  RETURNING id INTO v_session_id;

  INSERT INTO public.terms (academic_session_id, name, term_order, start_date, end_date, is_current)
  VALUES (v_session_id, 'First Term', 1, '2026-09-01', '2026-12-15', FALSE)
  RETURNING id INTO v_term_id;

  INSERT INTO public.classes (academic_session_id, class_level_id, class_arm_id, display_name)
  VALUES (v_session_id, v_level_pri1_id, v_arm_a_id, 'Primary 1A (Test)')
  RETURNING id INTO v_class_assigned_id;

  INSERT INTO public.classes (academic_session_id, class_level_id, class_arm_id, display_name)
  VALUES (v_session_id, v_level_pri2_id, v_arm_a_id, 'Primary 2A (Test)')
  RETURNING id INTO v_class_unassigned_id;

  INSERT INTO public.subjects (school_section_id, code, name)
  VALUES (v_section_primary_id, 'TEST-MTH', 'Mathematics (Test)')
  RETURNING id INTO v_subject_math_id;

  -- Assign Teacher ONLY to Primary 1A (NOT Primary 2A)
  INSERT INTO public.teacher_assignments (staff_id, class_id, subject_id, academic_session_id, is_class_teacher)
  VALUES (v_staff_teacher_id, v_class_assigned_id, v_subject_math_id, v_session_id, TRUE);

  -- Students & Verified Parent Links
  INSERT INTO public.students (admission_number, first_name, last_name, date_of_birth, gender, school_section_id)
  VALUES ('TEST-ADM-001', 'Child', 'Alpha', '2018-05-10', 'female', v_section_primary_id)
  RETURNING id INTO v_student_a_id;

  INSERT INTO public.students (admission_number, first_name, last_name, date_of_birth, gender, school_section_id)
  VALUES ('TEST-ADM-002', 'Child', 'Beta', '2017-03-14', 'male', v_section_primary_id)
  RETURNING id INTO v_student_b_id;

  INSERT INTO public.parent_students (student_id, parent_id, relationship_type, verification_status)
  VALUES (v_student_a_id, v_parent_a_id, 'mother', 'verified');

  INSERT INTO public.parent_students (student_id, parent_id, relationship_type, verification_status)
  VALUES (v_student_b_id, v_parent_b_id, 'father', 'verified');

  INSERT INTO public.student_enrollments (student_id, academic_session_id, class_id)
  VALUES (v_student_a_id, v_session_id, v_class_assigned_id);

  INSERT INTO public.student_enrollments (student_id, academic_session_id, class_id)
  VALUES (v_student_b_id, v_session_id, v_class_unassigned_id);

  -- Medical Alert for Child Beta
  INSERT INTO public.student_medical_alerts (student_id, blood_group, allergies)
  VALUES (v_student_b_id, 'O+', 'Peanuts');

  -- Assessment & Unpublished Result for Child Alpha
  INSERT INTO public.assessments (academic_session_id, term_id, class_id, subject_id)
  VALUES (v_session_id, v_term_id, v_class_assigned_id, v_subject_math_id)
  RETURNING id INTO v_assessment_id;

  INSERT INTO public.result_publications (academic_session_id, term_id, class_id, is_published)
  VALUES (v_session_id, v_term_id, v_class_assigned_id, FALSE);

  INSERT INTO public.results (
    assessment_id, student_id, academic_session_id, term_id, class_id, subject_id,
    ca_score, exam_score, submission_status
  ) VALUES (
    v_assessment_id, v_student_a_id, v_session_id, v_term_id, v_class_assigned_id, v_subject_math_id,
    35, 50, 'submitted'
  ) RETURNING id INTO v_result_a_id;

  -- Admission application & private document owned by Parent B
  INSERT INTO public.admission_applications (
    application_reference, applicant_profile_id, parent_id,
    child_first_name, child_last_name, child_date_of_birth, child_gender,
    intended_section_id, intended_class_level_id, intended_session_id
  ) VALUES (
    'TEST-APP-B', v_parent_b_profile_id, v_parent_b_id,
    'Future', 'Beta', '2020-01-01', 'male',
    v_section_primary_id, v_level_pri1_id, v_session_id
  ) RETURNING id INTO v_app_b_id;

  -- Seed one audit log record
  INSERT INTO public.audit_logs (action, entity_type, entity_id)
  VALUES ('test.init', 'system', '0')
  RETURNING id INTO v_audit_id;

  -- Store IDs in temp config for subsequent test blocks
  PERFORM set_config('test.student_a_id', v_student_a_id::TEXT, TRUE);
  PERFORM set_config('test.student_b_id', v_student_b_id::TEXT, TRUE);
  PERFORM set_config('test.result_a_id', v_result_a_id::TEXT, TRUE);
  PERFORM set_config('test.class_unassigned_id', v_class_unassigned_id::TEXT, TRUE);
  PERFORM set_config('test.app_b_id', v_app_b_id::TEXT, TRUE);
  PERFORM set_config('test.ordinary_profile_id', v_ordinary_profile_id::TEXT, TRUE);
  PERFORM set_config('test.role_admin_id', v_role_admin_id::TEXT, TRUE);
  PERFORM set_config('test.audit_id', v_audit_id::TEXT, TRUE);
END $$;

-- ============================================================================
-- TEST 1 & 7: Parent A cannot read Parent B's child; unpublished results hidden
-- ============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"user_test_parent_a","role":"authenticated"}';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Test 1: Parent A querying Child Beta must return 0 rows
  SELECT COUNT(*) INTO v_count
  FROM public.students
  WHERE id = current_setting('test.student_b_id')::UUID;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL Test 1: Parent A read Parent B child record!';
  END IF;

  -- Test 7: Parent A querying unpublished result for their OWN child must return 0 rows
  SELECT COUNT(*) INTO v_count
  FROM public.results
  WHERE id = current_setting('test.result_a_id')::UUID;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL Test 7: Parent A read unpublished result!';
  END IF;
END $$;

-- ============================================================================
-- TEST 2: Parent cannot modify their child's results
-- ============================================================================
DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.results
  SET exam_score = 60
  WHERE id = current_setting('test.result_a_id')::UUID;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 0 THEN
    RAISE EXCEPTION 'FAIL Test 2: Parent modified child result!';
  END IF;
END $$;

-- ============================================================================
-- TEST 8 & 9 (as Parent A): Cannot access Parent B's private docs or medical records
-- ============================================================================
DO $$
DECLARE
  v_allowed BOOLEAN;
  v_med_count INTEGER;
BEGIN
  SELECT public.can_access_admission_storage(current_setting('test.app_b_id') || '/birth_cert.pdf')
  INTO v_allowed;
  IF v_allowed IS TRUE THEN
    RAISE EXCEPTION 'FAIL Test 8: Parent A accessed Parent B private admission document!';
  END IF;

  SELECT COUNT(*) INTO v_med_count FROM public.student_medical_alerts;
  IF v_med_count <> 0 THEN
    RAISE EXCEPTION 'FAIL Test 9: Parent A read restricted medical records!';
  END IF;
END $$;

-- ============================================================================
-- TEST 3, 4, 8 (Teacher): Cannot access unassigned class, publish results, or view admission docs
-- ============================================================================
SET LOCAL "request.jwt.claims" = '{"sub":"user_test_teacher","role":"authenticated"}';

DO $$
DECLARE
  v_count INTEGER;
  v_allowed BOOLEAN;
  v_failed BOOLEAN := FALSE;
BEGIN
  -- Test 3: Teacher cannot see students in unassigned class (Primary 2A / Child Beta)
  SELECT COUNT(*) INTO v_count
  FROM public.student_enrollments
  WHERE class_id = current_setting('test.class_unassigned_id')::UUID;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL Test 3: Teacher accessed unassigned class enrollments!';
  END IF;

  -- Test 4: Teacher cannot publish results without results.publish permission
  BEGIN
    UPDATE public.results
    SET submission_status = 'published'
    WHERE id = current_setting('test.result_a_id')::UUID;
    IF FOUND THEN
      RAISE EXCEPTION 'FAIL Test 4: Teacher published result without permission!';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_failed := TRUE;
  END;

  -- Test 8: Teacher cannot access private admission documents
  SELECT public.can_access_admission_storage(current_setting('test.app_b_id') || '/birth_cert.pdf')
  INTO v_allowed;
  IF v_allowed IS TRUE THEN
    RAISE EXCEPTION 'FAIL Test 8: Teacher accessed private admission document!';
  END IF;
END $$;

-- ============================================================================
-- TEST 5: Admission Officer cannot fabricate a verified payment
-- ============================================================================
SET LOCAL "request.jwt.claims" = '{"sub":"user_test_admission","role":"authenticated"}';

DO $$
DECLARE
  v_blocked BOOLEAN := FALSE;
BEGIN
  BEGIN
    INSERT INTO public.application_payments (
      application_id, payer_profile_id, payment_reference, amount_kobo, status, verified_via_webhook
    ) VALUES (
      current_setting('test.app_b_id')::UUID,
      public.current_profile_id(),
      'FAKE-PAY-REF-001',
      500000,
      'verified',
      TRUE
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_blocked := TRUE;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL Test 5: Admission Officer inserted verified payment!';
  END IF;
END $$;

-- ============================================================================
-- TEST 6 & 10: Ordinary user cannot self-assign admin role or mutate audit logs
-- ============================================================================
SET LOCAL "request.jwt.claims" = '{"sub":"user_test_ordinary","role":"authenticated"}';

DO $$
DECLARE
  v_blocked BOOLEAN := FALSE;
  v_audit_updated INTEGER;
BEGIN
  -- Test 6: Ordinary user attempts to create staff record & assign general_admin
  BEGIN
    INSERT INTO public.staff (profile_id, staff_number)
    VALUES (current_setting('test.ordinary_profile_id')::UUID, 'HACK-001');
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL Test 6: Ordinary user created staff record!';
  END IF;

  -- Test 10: Ordinary user cannot read, update, or delete audit_logs
  UPDATE public.audit_logs
  SET action = 'tampered'
  WHERE id = current_setting('test.audit_id')::UUID;
  GET DIAGNOSTICS v_audit_updated = ROW_COUNT;
  IF v_audit_updated <> 0 THEN
    RAISE EXCEPTION 'FAIL Test 10: Ordinary user modified audit_logs!';
  END IF;

  DELETE FROM public.audit_logs
  WHERE id = current_setting('test.audit_id')::UUID;
  GET DIAGNOSTICS v_audit_updated = ROW_COUNT;
  IF v_audit_updated <> 0 THEN
    RAISE EXCEPTION 'FAIL Test 10: Ordinary user deleted audit_logs!';
  END IF;
END $$;

ROLLBACK;
