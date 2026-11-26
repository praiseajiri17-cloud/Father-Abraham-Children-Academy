-- ============================================================================
-- 0002_identity_roles_and_permissions.sql
-- Identity, Normalized RBAC Roles, Permissions & Controlled Staff Assignment
-- ============================================================================

-- 1. User Profiles (linked 1:1 to Clerk identity)
-- Passwords are NEVER stored here; Clerk is the sole identity provider.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'deactivated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON public.profiles (clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. System Roles (controlled reference table)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (
    code IN (
      'general_admin',
      'parent',
      'teacher',
      'admission_officer',
      'principal',
      'finance_officer',
      'secretary'
    )
  ),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_staff_role BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Granular Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Role <-> Permission Mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (role_id, permission_id)
);

-- 5. Staff Directory (only provisioned personnel, never self-registered)
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  staff_number TEXT UNIQUE,
  job_title TEXT,
  department TEXT,
  employment_status TEXT NOT NULL DEFAULT 'active'
    CHECK (employment_status IN ('active', 'on_leave', 'suspended', 'terminated')),
  hired_date DATE,
  can_access_medical_records BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_staff_profile_id ON public.staff (profile_id);

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Staff Roles (supports multiple responsibilities per staff member)
-- Examples: teacher + admission_officer, principal + teacher, finance_officer + secretary
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (staff_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_roles_staff_active ON public.staff_roles (staff_id, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_roles_role_id ON public.staff_roles (role_id);

-- 7. Controlled Initial Owner Provisioning Lock
-- Ensures only a single controlled bootstrap can establish the initial general_admin.
CREATE TABLE IF NOT EXISTS public.owner_provisioning_state (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  is_owner_provisioned BOOLEAN NOT NULL DEFAULT FALSE,
  owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provisioned_at TIMESTAMPTZ
);

INSERT INTO public.owner_provisioning_state (id, is_owner_provisioned)
VALUES (TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Seed Official System Role Definitions & Core Permissions
-- (No invented users, staff, parents, or fee values)
-- ----------------------------------------------------------------------------
INSERT INTO public.roles (code, name, description, is_staff_role) VALUES
  ('general_admin', 'General Administrator', 'School owner / highest institutional authority.', TRUE),
  ('principal', 'Principal', 'Academic and administrative head of school operations.', TRUE),
  ('teacher', 'Teacher', 'Classroom instruction, attendance, and subject score entry.', TRUE),
  ('admission_officer', 'Admission Officer', 'Prospective student application review and document verification.', TRUE),
  ('finance_officer', 'Finance Officer', 'Tuition fee structure, invoicing, and verified payment reconciliation.', TRUE),
  ('secretary', 'Secretary', 'Front-desk communication, circulars, and record coordination.', TRUE),
  ('parent', 'Parent / Guardian', 'Authorized family access to verified children, invoices, and published results.', FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permissions (code, module, description) VALUES
  ('staff.manage', 'identity', 'Create staff records and assign or revoke staff roles'),
  ('settings.manage', 'system', 'Update school settings and public website configuration'),
  ('audit.read', 'audit', 'View immutable system audit logs'),
  ('admissions.read', 'admissions', 'View prospective student admission applications'),
  ('admissions.review', 'admissions', 'Verify physical documents, request corrections, and update application status'),
  ('admissions.override', 'admissions', 'Override admission decisions'),
  ('students.read', 'students', 'View enrolled student profiles and enrollments'),
  ('students.manage', 'students', 'Create and update student records, enrollments, and promotions'),
  ('students.medical.read', 'students', 'View restricted student medical alerts'),
  ('students.medical.manage', 'students', 'Create and update restricted student medical alerts'),
  ('academics.structure.manage', 'academics', 'Configure sections, sessions, terms, classes, subjects, and grading rules'),
  ('results.enter', 'academics', 'Enter and submit scores for assigned classes and subjects'),
  ('results.approve', 'academics', 'Approve submitted academic results'),
  ('results.publish', 'academics', 'Publish approved results so parents can view them'),
  ('attendance.record', 'attendance', 'Record attendance for assigned classes'),
  ('finance.read', 'finance', 'View fee structures, invoices, payments, and receipts'),
  ('finance.manage', 'finance', 'Manage fee structures and issue school fee invoices'),
  ('communication.manage', 'communication', 'Publish announcements and manage contact enquiries')
ON CONFLICT (code) DO NOTHING;

-- Map default permissions to roles
WITH role_perm_map(role_code, perm_code) AS (
  VALUES
    -- General Admin receives all permissions
    ('general_admin', 'staff.manage'),
    ('general_admin', 'settings.manage'),
    ('general_admin', 'audit.read'),
    ('general_admin', 'admissions.read'),
    ('general_admin', 'admissions.review'),
    ('general_admin', 'admissions.override'),
    ('general_admin', 'students.read'),
    ('general_admin', 'students.manage'),
    ('general_admin', 'students.medical.read'),
    ('general_admin', 'students.medical.manage'),
    ('general_admin', 'academics.structure.manage'),
    ('general_admin', 'results.enter'),
    ('general_admin', 'results.approve'),
    ('general_admin', 'results.publish'),
    ('general_admin', 'attendance.record'),
    ('general_admin', 'finance.read'),
    ('general_admin', 'finance.manage'),
    ('general_admin', 'communication.manage'),
    -- Principal
    ('principal', 'admissions.read'),
    ('principal', 'students.read'),
    ('principal', 'students.manage'),
    ('principal', 'students.medical.read'),
    ('principal', 'academics.structure.manage'),
    ('principal', 'results.approve'),
    ('principal', 'results.publish'),
    ('principal', 'attendance.record'),
    ('principal', 'communication.manage'),
    -- Teacher
    ('teacher', 'students.read'),
    ('teacher', 'results.enter'),
    ('teacher', 'attendance.record'),
    -- Admission Officer
    ('admission_officer', 'admissions.read'),
    ('admission_officer', 'admissions.review'),
    ('admission_officer', 'students.read'),
    -- Finance Officer
    ('finance_officer', 'finance.read'),
    ('finance_officer', 'finance.manage'),
    ('finance_officer', 'students.read'),
    -- Secretary
    ('secretary', 'admissions.read'),
    ('secretary', 'students.read'),
    ('secretary', 'communication.manage')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_perm_map m
JOIN public.roles r ON r.code = m.role_code
JOIN public.permissions p ON p.code = m.perm_code
ON CONFLICT DO NOTHING;
