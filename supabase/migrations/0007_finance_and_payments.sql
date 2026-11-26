-- ============================================================================
-- 0007_finance_and_payments.sql
-- Fee Structures, Full-Payment School Invoices, Payments, Idempotent Webhook
-- Events, and Official Receipts (Prepared for Phase 4+ Paystack NGN checkout)
-- ============================================================================

-- 1. Fee Structures (Vary by section, class level, session, term, category)
-- No invented fee amounts are seeded.
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_section_id UUID NOT NULL REFERENCES public.school_sections(id) ON DELETE RESTRICT,
  class_level_id UUID REFERENCES public.class_levels(id) ON DELETE RESTRICT,
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  fee_category TEXT NOT NULL CHECK (
    fee_category IN (
      'tuition',
      'development_levy',
      'uniform',
      'books',
      'ict_lab',
      'transport',
      'examination',
      'other'
    )
  ),
  title TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0), -- Nigerian Naira in kobo
  is_compulsory BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_lookup
  ON public.fee_structures (school_section_id, class_level_id, academic_session_id, term_id);

CREATE TRIGGER trg_fee_structures_updated_at
  BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. School Fee Invoices
-- School fees MUST be paid in full; instalment/partial payment statuses are excluded.
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE, -- e.g. 'FACA-INV-2026-0001'
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE RESTRICT,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  total_amount_kobo BIGINT NOT NULL CHECK (total_amount_kobo > 0),
  status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'pending_verification', 'paid', 'cancelled', 'void')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  issued_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (student_id, academic_session_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_student_status ON public.invoices (student_id, status);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Invoice Line Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  fee_category TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items (invoice_id);

-- 4. School Fee Payments (Full payment verification only)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  payer_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_reference TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'paystack',
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  status TEXT NOT NULL DEFAULT 'initialized'
    CHECK (status IN ('initialized', 'verified', 'failed', 'reversed')),
  payment_channel TEXT,
  gateway_response JSONB,
  verified_at TIMESTAMPTZ,
  verified_by_server BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Prevent duplicate verified payments for the same invoice
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_verified_payment_per_invoice
  ON public.payments (invoice_id)
  WHERE status = 'verified';

CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments (payment_reference);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Payment Webhook Events (Idempotent Paystack webhook deduplication)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payment_reference TEXT,
  payload JSONB NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_reference ON public.payment_webhook_events (payment_reference);

-- 6. Official Payment Receipts (Issued only for verified full payments)
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  invoice_id UUID NOT NULL UNIQUE REFERENCES public.invoices(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
