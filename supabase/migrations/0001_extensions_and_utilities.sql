-- ============================================================================
-- 0001_extensions_and_utilities.sql
-- Father Abraham Children Academy - Extensions & Shared Database Utilities
-- ============================================================================

-- Cryptographic & UUID utilities
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- Trigger function: automatically maintain updated_at timestamps
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Clerk Third-Party Auth JWT Helper
-- Clerk user IDs are strings (e.g. 'user_2abc...'), NOT UUIDs.
-- Therefore we read auth.jwt() ->> 'sub' instead of auth.uid().
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NULLIF(COALESCE(auth.jwt() ->> 'sub', ''), '');
$$;

COMMENT ON FUNCTION public.current_clerk_user_id() IS
  'Extracts the verified Clerk user ID (sub claim) from the Supabase-validated JWT.';
