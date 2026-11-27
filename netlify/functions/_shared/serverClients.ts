import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyToken } from '@clerk/backend';

export interface VerifiedCallerContext {
  clerkUserId: string;
  profileId: string;
  email: string | null;
  staffId: string | null;
  roles: string[];
  permissions: string[];
  isGeneralAdmin: boolean;
}

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
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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
 * Verifies a Bearer session token issued by Clerk using @clerk/backend's
 * cryptographic verification. Returns the verified Clerk user ID (`sub`).
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

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: clerkSecretKey,
    });
    if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
      return null;
    }
    return { clerkUserId: payload.sub };
  } catch (err) {
    console.warn('Clerk JWT verification rejected:', err);
    return null;
  }
}

/**
 * Resolves the verified caller's database profile, active staff roles,
 * and effective permissions from Supabase after Clerk JWT verification.
 */
export async function resolveVerifiedCaller(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<VerifiedCallerContext | null> {
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, account_status')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (profileErr || !profile || profile.account_status !== 'active') {
    return null;
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('id, employment_status')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const rolesSet = new Set<string>();
  const permsSet = new Set<string>();

  if (staff && staff.employment_status === 'active') {
    const { data: staffRoles } = await supabase
      .from('staff_roles')
      .select(`
        is_active,
        roles!inner (
          id,
          code,
          role_permissions (
            permissions (
              code
            )
          )
        )
      `)
      .eq('staff_id', staff.id)
      .eq('is_active', true);

    if (Array.isArray(staffRoles)) {
      for (const sr of staffRoles) {
        const roleObj = sr.roles as unknown as {
          code?: string;
          role_permissions?: Array<{ permissions?: { code?: string } | null }>;
        } | null;
        if (roleObj?.code) {
          rolesSet.add(roleObj.code);
        }
        if (Array.isArray(roleObj?.role_permissions)) {
          for (const rp of roleObj.role_permissions) {
            if (rp.permissions?.code) {
              permsSet.add(rp.permissions.code);
            }
          }
        }
      }
    }
  }

  const roles = Array.from(rolesSet);
  return {
    clerkUserId,
    profileId: profile.id,
    email: typeof profile.email === 'string' ? profile.email : null,
    staffId: staff?.id ?? null,
    roles,
    permissions: Array.from(permsSet),
    isGeneralAdmin: roles.includes('general_admin'),
  };
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
