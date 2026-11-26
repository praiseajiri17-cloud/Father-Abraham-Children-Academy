-- ============================================================================
-- phase4_admissions_rls_tests.sql
-- Father Abraham Children Academy — Phase 4 Online Admissions RLS Security Tests
--
-- Run inside a transaction (BEGIN; ... ROLLBACK;) in Supabase SQL Editor or psql
-- AFTER applying migrations 0001 through 0011.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_admin_profile_id UUID;
  v_officer_profile_id UUID;
  v_teacher_profile_id UUID;
  v_parent_a_profile_id UUID;
  v_parent_b_profile_id UUID;

  v_staff_admin_id UUID;
  v_staff_officer_id UUID;
  v_staff_teacher_id UUID;

  v_role_admin_id UUID;
  v_role_officer_id UUID;
  v_role_teacher_id UUID;

  v_section_primary_id UUID;
  v_level_pri1_id UUID;
  v_session_id UUID;

  v_app_a_id UUID;
  v_app_b_id UUID;
BEGIN
  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_p4_admin', 'p4admin@test.local', 'General', 'Admin')
  RETURNING id INTO v_admin_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_p4_officer', 'p4officer@test.local', 'Admissions', 'Officer')
  RETURNING id INTO v_officer_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_p4_teacher', 'p4teacher@test.local', 'Class', 'Teacher')
  RETURNING id INTO v_teacher_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_p4_parent_a', 'p4parenta@test.local', 'Parent', 'Alpha')
  RETURNING id INTO v_parent_a_profile_id;

  INSERT INTO public.profiles (clerk_user_id, email, first_name, last_name)
  VALUES ('user_p4_parent_b', 'p4parentb@test.local', 'Parent', 'Beta')
  RETURNING id INTO v_parent_b_profile_id;

  SELECT id INTO v_role_admin_id FROM public.roles WHERE code = 'general_admin';
  SELECT id INTO v_role_officer_id FROM public.roles WHERE code = 'admission_officer';
  SELECT id INTO v_role_teacher_id FROM public.roles WHERE code = 'teacher';

  INSERT INTO public.staff (profile_id, staff_number, can_access_medical_records)
  VALUES (v_admin_profile_id, 'P4-STF-001', TRUE) RETURNING id INTO v_staff_admin_id;
  INSERT INTO public.staff_roles (staff_id, role_id) VALUES (v_staff_admin_id, v_role_admin_id);

  INSERT INTO public.staff (profile_id, staff_number, can_access_medical_records)
  VALUES (v_officer_profile_id, 'P4-STF-002', FALSE) RETURNING id INTO v_staff_officer_id;
  INSERT INTO public.staff_roles (staff_id, role_id) VALUES (v_staff_officer_id, v_role_officer_id);

  INSERT INTO public.staff (profile_id, staff_number, can_access_medical_records)
  VALUES (v_teacher_profile_id, 'P4-STF-003', FALSE) RETURNING id INTO v_staff_teacher_id;
  INSERT INTO public.staff_roles (staff_id, role_id) VALUES (v_staff_teacher_id, v_role_teacher_id);

  SELECT id INTO v_section_primary_id FROM public.school_sections WHERE code = 'primary';
  SELECT id INTO v_level_pri1_id FROM public.class_levels WHERE code = 'PRI_1';

  INSERT INTO public.academic_sessions (name, start_date, end_date, is_current)
  VALUES ('P4-TEST-2026/2027', '2026-09-01', '2027-07-31', FALSE)
  RETURNING id INTO v_session_id;

  INSERT INTO public.admission_applications (
    application_reference, applicant_profile_id,
    child_first_name, child_last_name, child_date_of_birth, child_gender,
    intended_section_id, intended_class_level_id, intended_session_id,
    application_status, parent_email
  ) VALUES (
    'FACA-ADM-TEST-A1', v_parent_a_profile_id,
    'Ada', 'Alpha', '2019-06-15', 'female',
    v_section_primary_id, v_level_pri1_id, v_session_id,
    'draft', 'p4parenta@test.local'
  ) RETURNING id INTO v_app_a_id;

  INSERT INTO public.admission_applications (
    application_reference, applicant_profile_id,
    child_first_name, child_last_name, child_date_of_birth, child_gender,
    intended_section_id, intended_class_level_id, intended_session_id,
    application_status, parent_email
  ) VALUES (
    'FACA-ADM-TEST-B1', v_parent_b_profile_id,
    'Bola', 'Beta', '2018-04-20', 'male',
    v_section_primary_id, v_level_pri1_id, v_session_id,
    'submitted', 'p4parentb@test.local'
  ) RETURNING id INTO v_app_b_id;

  INSERT INTO public.admission_medical_details (
    application_id, blood_group, allergies
  ) VALUES (
    v_app_b_id, 'AA', 'Penicillin'
  );

  PERFORM set_config('test.p4_app_a_id', v_app_a_id::TEXT, TRUE);
  PERFORM set_config('test.p4_app_b_id', v_app_b_id::TEXT, TRUE);
END $$;

-- ----------------------------------------------------------------------------
-- TEST 1: Parent A isolation & privilege prevention
-- ----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"user_p4_parent_a","role":"authenticated"}';

DO $$
DECLARE
  v_count INTEGER;
  v_blocked BOOLEAN := FALSE;
BEGIN
  -- Cannot view Parent B's application
  SELECT COUNT(*) INTO v_count
  FROM public.admission_applications
  WHERE id = current_setting('test.p4_app_b_id')::UUID;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL P4-1: Parent A accessed Parent B application!';
  END IF;

  -- Cannot view Parent B's medical details
  SELECT COUNT(*) INTO v_count
  FROM public.admission_medical_details
  WHERE application_id = current_setting('test.p4_app_b_id')::UUID;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL P4-2: Parent A accessed Parent B medical details!';
  END IF;

  -- Cannot mark own application payment_status = paid
  BEGIN
    UPDATE public.admission_applications
    SET payment_status = 'paid'
    WHERE id = current_setting('test.p4_app_a_id')::UUID;
  EXCEPTION
    WHEN raise_exception THEN
      v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL P4-3: Parent A forged payment_status = paid!';
  END IF;

  -- Cannot mark own physical documents as complete
  v_blocked := FALSE;
  BEGIN
    UPDATE public.admission_applications
    SET physical_documents_status = 'complete'
    WHERE id = current_setting('test.p4_app_a_id')::UUID;
  EXCEPTION
    WHEN raise_exception THEN
      v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL P4-4: Parent A marked own physical documents complete!';
  END IF;

  -- Cannot approve own application
  v_blocked := FALSE;
  BEGIN
    UPDATE public.admission_applications
    SET application_status = 'approved'
    WHERE id = current_setting('test.p4_app_a_id')::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL P4-5: Parent A self-approved own application!';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 2: Teacher cannot read admission applications or medical details
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claims" = '{"sub":"user_p4_teacher","role":"authenticated"}';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.admission_applications;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL P4-6: Teacher read admission applications!';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.admission_medical_details;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL P4-7: Teacher read admission medical details!';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 3: Admission Officer workflow, audit logging, and override restriction
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claims" = '{"sub":"user_p4_officer","role":"authenticated"}';

DO $$
DECLARE
  v_blocked BOOLEAN := FALSE;
  v_hist_count INTEGER;
BEGIN
  -- Admission officer cannot mark payment_status = paid
  BEGIN
    UPDATE public.admission_applications
    SET payment_status = 'paid'
    WHERE id = current_setting('test.p4_app_b_id')::UUID;
  EXCEPTION
    WHEN raise_exception THEN
      v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL P4-8: Admission Officer forged payment_status!';
  END IF;

  -- Admission officer CAN record physical documents and approve submitted application
  UPDATE public.admission_applications
  SET physical_documents_status = 'complete',
      physical_documents_received_by_name = 'Admissions Officer',
      physical_documents_received_list = '["Printed Form", "Birth Certificate", "2 Passport Photos"]'::jsonb,
      application_status = 'approved',
      reviewed_at = timezone('utc', now())
  WHERE id = current_setting('test.p4_app_b_id')::UUID;

  SELECT COUNT(*) INTO v_hist_count
  FROM public.admission_status_history
  WHERE application_id = current_setting('test.p4_app_b_id')::UUID
    AND event_type IN ('approved', 'physical_docs_updated');
  IF v_hist_count < 2 THEN
    RAISE EXCEPTION 'FAIL P4-9: Missing history rows for officer approval and physical doc update!';
  END IF;

  -- Admission officer CANNOT reopen/override an already approved application
  v_blocked := FALSE;
  BEGIN
    UPDATE public.admission_applications
    SET application_status = 'under_review'
    WHERE id = current_setting('test.p4_app_b_id')::UUID;
  EXCEPTION
    WHEN raise_exception THEN
      v_blocked := TRUE;
  END;
  IF NOT v_blocked THEN
    RAISE EXCEPTION 'FAIL P4-10: Admission Officer overrode finalized decision without admissions.override!';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 4: General Administrator CAN reopen/override finalized decision
-- ----------------------------------------------------------------------------
SET LOCAL "request.jwt.claims" = '{"sub":"user_p4_admin","role":"authenticated"}';

DO $$
DECLARE
  v_status TEXT;
BEGIN
  UPDATE public.admission_applications
  SET application_status = 'under_review',
      decision_overridden_at = timezone('utc', now())
  WHERE id = current_setting('test.p4_app_b_id')::UUID;

  SELECT application_status INTO v_status
  FROM public.admission_applications
  WHERE id = current_setting('test.p4_app_b_id')::UUID;

  IF v_status <> 'under_review' THEN
    RAISE EXCEPTION 'FAIL P4-11: General Admin could not reopen finalized admission decision!';
  END IF;
END $$;

ROLLBACK;
