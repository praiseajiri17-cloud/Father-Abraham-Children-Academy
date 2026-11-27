-- ============================================================================
-- 0012_owner_provisioning_and_portal_settings.sql
-- Corrective Update:
-- 1. Trusted Primary Owner Provisioning Function & Owner Role Protection
-- 2. Configurable Public Website Contact Info & Announcement Settings
-- ============================================================================

-- 1. Protect the Primary School Owner's `general_admin` role from accidental
--    revocation or deletion via ordinary staff role management.
CREATE OR REPLACE FUNCTION public.protect_primary_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_profile_id UUID;
  v_role_code TEXT;
  v_staff_profile_id UUID;
BEGIN
  SELECT owner_profile_id INTO v_owner_profile_id
  FROM public.owner_provisioning_state
  WHERE id = TRUE AND is_owner_provisioned = TRUE;

  IF v_owner_profile_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT code INTO v_role_code
  FROM public.roles
  WHERE id = OLD.role_id;

  SELECT profile_id INTO v_staff_profile_id
  FROM public.staff
  WHERE id = OLD.staff_id;

  IF v_staff_profile_id = v_owner_profile_id AND v_role_code = 'general_admin' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Primary school owner general_admin role cannot be deleted.';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.is_active = FALSE THEN
      RAISE EXCEPTION 'Primary school owner general_admin role cannot be revoked.';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_primary_owner_role ON public.staff_roles;
CREATE TRIGGER trg_protect_primary_owner_role
  BEFORE UPDATE OR DELETE ON public.staff_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_primary_owner_role();

-- 2. Trusted Server/Admin Owner Provisioning Function
--    Enforces the designated primary owner email (`praiseajiri17@gmail.com`)
--    and single-owner lock in public.owner_provisioning_state.
--    Strictly revoked from anon and authenticated client roles.
CREATE OR REPLACE FUNCTION public.provision_primary_owner(
  p_clerk_user_id TEXT,
  p_email TEXT,
  p_first_name TEXT DEFAULT 'Praise',
  p_last_name TEXT DEFAULT 'Ajiri'
)
RETURNS TABLE (
  profile_id UUID,
  staff_id UUID,
  role_code TEXT,
  already_provisioned BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  v_normalized_email TEXT;
  v_clerk_id TEXT;
  v_state public.owner_provisioning_state%ROWTYPE;
  v_profile_id UUID;
  v_staff_id UUID;
  v_admin_role_id UUID;
  v_already BOOLEAN := FALSE;
BEGIN
  v_clerk_id := trim(COALESCE(p_clerk_user_id, ''));
  v_normalized_email := lower(trim(COALESCE(p_email, '')));

  IF v_clerk_id = '' THEN
    RAISE EXCEPTION 'Verified Clerk user ID is required for owner provisioning.';
  END IF;

  IF v_normalized_email <> 'praiseajiri17@gmail.com' THEN
    RAISE EXCEPTION 'Only the verified designated school owner email may be provisioned as primary general_admin.';
  END IF;

  SELECT * INTO v_state
  FROM public.owner_provisioning_state
  WHERE id = TRUE
  FOR UPDATE;

  -- Upsert or locate the profile matching the verified Clerk user ID
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE clerk_user_id = v_clerk_id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    -- Also check if an unlinked placeholder profile with the owner email exists
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE lower(email) = v_normalized_email
    LIMIT 1;

    IF v_profile_id IS NOT NULL THEN
      UPDATE public.profiles
      SET clerk_user_id = v_clerk_id,
          email = v_normalized_email,
          account_status = 'active'
      WHERE id = v_profile_id;
    ELSE
      INSERT INTO public.profiles (
        clerk_user_id,
        email,
        first_name,
        last_name,
        account_status
      ) VALUES (
        v_clerk_id,
        v_normalized_email,
        COALESCE(NULLIF(trim(p_first_name), ''), 'Praise'),
        COALESCE(NULLIF(trim(p_last_name), ''), 'Ajiri'),
        'active'
      )
      RETURNING id INTO v_profile_id;
    END IF;
  ELSE
    UPDATE public.profiles
    SET email = v_normalized_email,
        account_status = 'active'
    WHERE id = v_profile_id;
  END IF;

  IF v_state.is_owner_provisioned AND v_state.owner_profile_id IS DISTINCT FROM v_profile_id THEN
    RAISE EXCEPTION 'Primary owner is already locked to another verified profile.';
  END IF;

  v_already := COALESCE(v_state.is_owner_provisioned, FALSE);

  -- Ensure staff record exists and is active
  SELECT id INTO v_staff_id
  FROM public.staff
  WHERE public.staff.profile_id = v_profile_id
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    INSERT INTO public.staff (
      profile_id,
      job_title,
      department,
      employment_status,
      can_access_medical_records,
      created_by_profile_id
    ) VALUES (
      v_profile_id,
      'General Administrator (School Owner)',
      'Executive Governance',
      'active',
      TRUE,
      v_profile_id
    )
    RETURNING id INTO v_staff_id;
  ELSE
    UPDATE public.staff
    SET employment_status = 'active',
        can_access_medical_records = TRUE
    WHERE id = v_staff_id;
  END IF;

  SELECT id INTO v_admin_role_id
  FROM public.roles
  WHERE code = 'general_admin'
  LIMIT 1;

  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'general_admin role definition is missing from public.roles.';
  END IF;

  INSERT INTO public.staff_roles (
    staff_id,
    role_id,
    is_active,
    assigned_by_profile_id,
    assigned_at,
    revoked_at,
    notes
  ) VALUES (
    v_staff_id,
    v_admin_role_id,
    TRUE,
    v_profile_id,
    timezone('utc', now()),
    NULL,
    'Designated primary school owner provisioned as General Administrator.'
  )
  ON CONFLICT (staff_id, role_id) DO UPDATE
  SET is_active = TRUE,
      revoked_at = NULL,
      notes = EXCLUDED.notes;

  UPDATE public.owner_provisioning_state
  SET is_owner_provisioned = TRUE,
      owner_profile_id = v_profile_id,
      provisioned_at = COALESCE(provisioned_at, timezone('utc', now()))
  WHERE id = TRUE;

  INSERT INTO public.audit_logs (
    actor_profile_id,
    actor_clerk_user_id,
    action,
    entity_type,
    entity_id,
    new_values,
    metadata
  ) VALUES (
    v_profile_id,
    v_clerk_id,
    'owner.general_admin_provisioned',
    'owner_provisioning_state',
    v_profile_id::TEXT,
    jsonb_build_object(
      'email', v_normalized_email,
      'role', 'general_admin',
      'staff_id', v_staff_id
    ),
    jsonb_build_object('already_provisioned', v_already)
  );

  RETURN QUERY SELECT v_profile_id, v_staff_id, 'general_admin'::TEXT, v_already;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_primary_owner(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_primary_owner(TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_primary_owner(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 3. Seed Editable Public Website Settings (unconfigured until owner saves real values)
INSERT INTO public.school_settings (setting_key, setting_value, is_public, description)
VALUES
  (
    'public_contact_info',
    jsonb_build_object(
      'configured', FALSE,
      'address', NULL,
      'phone', NULL,
      'email', NULL,
      'hours', NULL,
      'whatsapp_url', NULL
    ),
    TRUE,
    'Verified campus contact information managed by General Administrator.'
  ),
  (
    'public_announcement',
    jsonb_build_object(
      'is_active', FALSE,
      'badge', 'Notice',
      'message', '',
      'cta_label', 'Apply Now',
      'cta_path', '/apply'
    ),
    TRUE,
    'Configurable top announcement bar displayed on the public website only when active.'
  )
ON CONFLICT (setting_key) DO NOTHING;

-- Ensure public & authenticated grants exist for school_settings
GRANT SELECT ON public.school_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.school_settings TO authenticated;
