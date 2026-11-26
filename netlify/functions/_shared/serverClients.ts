import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase service-role client factory for Netlify Functions.
 *
 * SECURITY BOUNDARY:
 * - Must ONLY be imported inside server-side Netlify Functions.
 * - Reads SUPABASE_SERVICE_ROLE_KEY from server process.env (never VITE_*).
 * - Bypasses RLS intentionally ONLY after the calling function has verified
 *   the caller's Clerk JWT and database permissions.
 */
export function createServiceRoleSupabaseClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing server-side Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Verifies a Bearer token issued by Clerk using Clerk's backend API / JWKS
 * in future Phase 4 implementations. Returns the verified Clerk user ID.
 */
export async function verifyClerkBearerToken(
  authHeader: string | null
): Promise<{ clerkUserId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    throw new Error('Missing server-side CLERK_SECRET_KEY.');
  }

  // Note: Full cryptographic JWT verification via @clerk/backend will be
  // activated when server-side endpoints are enabled in Phase 4.
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  return null;
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
