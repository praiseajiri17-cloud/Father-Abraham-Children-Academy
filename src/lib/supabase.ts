import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type ClerkTokenGetter = () => Promise<string | null>;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  '';

/**
 * Checks whether frontend-safe Supabase environment variables are configured.
 * Uses VITE_SUPABASE_PUBLISHABLE_KEY (publishable or anon key — NEVER service_role).
 */
export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return false;
  }
  try {
    const parsed = new URL(SUPABASE_URL);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getSupabaseConfigStatus() {
  return {
    configured: isSupabaseConfigured(),
    hasUrl: Boolean(SUPABASE_URL),
    hasPublishableKey: Boolean(SUPABASE_PUBLISHABLE_KEY),
  };
}

/**
 * Unauthenticated Supabase client for strictly public tables
 * (e.g., public announcements, public school_settings).
 */
export function createPublicSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Authenticated Supabase client using the official Clerk Third-Party Auth
 * integration via Supabase's `accessToken` callback.
 *
 * No deprecated Clerk JWT templates are used; Supabase validates Clerk's
 * standard session token directly when configured as a Third-Party Auth provider.
 */
export function createClerkSupabaseClient(
  getClerkToken: ClerkTokenGetter
): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => {
      try {
        return (await getClerkToken()) ?? null;
      } catch (err) {
        console.error('Failed to retrieve Clerk session token for Supabase:', err);
        return null;
      }
    },
  });
}
