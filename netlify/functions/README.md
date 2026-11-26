# Trusted Server-Side Layer (Netlify Functions)

Privileged operations for **Father Abraham Children Academy** are isolated in `netlify/functions/` and must never execute in browser code or rely on `VITE_*` secrets.

## Planned Server-Side Operations

1. **Initial Owner Provisioning (`provision-owner.ts`)**:
   - Uses `OWNER_BOOTSTRAP_SECRET` and `public.owner_provisioning_state` to securely establish the initial `general_admin` once.
2. **Staff Invitations & Role Assignment (`admin-staff-roles.ts`)**:
   - Verifies the caller's Clerk JWT and active `general_admin` assignment in Supabase before inserting into `staff` / `staff_roles`.
3. **Admission Approval Overrides & Student Enrolment**:
   - Validates `admissions.override` / `students.manage`, promotes approved `admission_applications` to `students` + `student_enrollments`, and records `audit_logs`.
4. **Paystack Verification & Webhook Processing (`paystack-webhook.ts`)**:
   - Validates `x-paystack-signature` with `PAYSTACK_SECRET_KEY` (HMAC SHA-512), writes idempotently to `payment_webhook_events`, verifies full-payment amounts in kobo, updates `payments` / `application_payments` / `invoices`, and issues `receipts`.
5. **Result Publication & Report Card Generation**:
   - Verifies `results.publish`, updates `result_publications` and `results.submission_status = 'published'`, and writes private PDFs to `generated-report-cards`.
