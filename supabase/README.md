# Supabase Database Architecture & Clerk Third-Party Auth Setup

This folder contains the Phase 3 relational PostgreSQL schema, Row Level Security (RLS) policies, private Storage buckets, and security verification tests for **Father Abraham Children Academy**.

> **Execution Safety Notice**: Creating these migration files does **not** automatically deploy them to Supabase. Apply them to your Supabase project using the workflow below before deploying Phase 4 portal features.

---

## 1. Migration Order (`supabase/migrations/`)

Run the SQL migrations sequentially in the **Supabase SQL Editor** (or via `supabase db push` with the Supabase CLI):

1. `0001_extensions_and_utilities.sql` — `pgcrypto`, `set_updated_at()`, `current_clerk_user_id()` (`auth.jwt() ->> 'sub'`).
2. `0002_identity_roles_and_permissions.sql` — `profiles`, `roles`, `permissions`, `role_permissions`, `staff`, `staff_roles`, `owner_provisioning_state`.
3. `0003_school_structure.sql` — `school_sections` (Creche, Primary, Secondary), `academic_sessions`, `terms`, `class_levels` (Creche, Primary 1–6, JSS 1–3, SS 1–3), `class_arms`, `classes`, `subjects`, `class_subjects`, `teacher_assignments`, `grading_scales`, `grading_scale_rules`.
4. `0004_parents_and_students.sql` — `parents`, `guardians`, `students`, `parent_students`, `student_enrollments`, `student_promotion_history`, `student_medical_alerts`.
5. `0005_admissions.sql` — `admission_applications`, `admission_documents`, `application_payments`.
6. `0006_academics_and_attendance.sql` — `assessments`, `assessment_components`, `result_publications`, `results`, `result_score_audit`, `report_cards`, `attendance_records`.
7. `0007_finance_and_payments.sql` — `fee_structures`, `invoices`, `invoice_items`, `payments`, `payment_webhook_events`, `receipts`.
8. `0008_communication_and_audit_logs.sql` — `announcements`, `contact_enquiries`, `school_settings`, `email_notification_logs`, `audit_logs`.
9. `0009_rls_policies.sql` — `SECURITY DEFINER` role/ownership helpers and strict RLS across all tables.
10. `0010_storage_and_security_functions.sql` — 5 private Storage buckets (`public = false`), Storage RLS policies, and audit triggers.

---

## 2. Clerk + Supabase Third-Party Auth Dashboard Configuration

Follow the official **Supabase Third-Party Auth integration for Clerk** (do **not** use deprecated Clerk JWT templates):

1. **In Clerk Dashboard**:
   - Navigate to **Integrations** (or **Connect with Supabase** / **Setup Supabase**).
   - Enable the Supabase third-party integration so Clerk automatically includes `"role": "authenticated"` on session tokens.
   - Copy your **Clerk Domain** (e.g., `your-instance.clerk.accounts.dev`).
2. **In Supabase Dashboard**:
   - Navigate to **Authentication -> Sign In / Providers -> Third-Party Auth**.
   - Click **Add Provider** -> Select **Clerk**.
   - Paste your Clerk Domain and save.
3. **Verify Environment Variables**:
   - Frontend (`VITE_*` safe): `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - Server-side only (Netlify Environment Variables — NEVER prefixed with `VITE_`): `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OWNER_BOOTSTRAP_SECRET`, `PAYSTACK_SECRET_KEY`.

---

## 3. Running the RLS Security Verification Suite

After applying `0001`–`0010` to your Supabase project:

1. Open the **Supabase SQL Editor** (or connect with `psql`).
2. Paste and execute `supabase/tests/rls_security_tests.sql`.
3. The script runs inside `BEGIN; ... ROLLBACK;`, switches to `SET LOCAL ROLE authenticated` with simulated Clerk JWT `sub` claims for each role, asserts all 10 security rules, and rolls back test fixtures cleanly.
