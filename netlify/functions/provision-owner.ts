import crypto from 'node:crypto';
import {
  createServiceRoleSupabaseClient,
  jsonResponse,
} from './_shared/serverClients';

/**
 * Controlled Initial Owner (General Administrator) Provisioning Endpoint.
 *
 * Security Rules:
 * - Never triggered automatically on user sign-up or first visit.
 * - Requires a server-side OWNER_BOOTSTRAP_SECRET header verified with timingSafeEqual.
 * - Enforces single-use lock via public.owner_provisioning_state.
 * - Writes an immutable record to public.audit_logs.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const configuredSecret = process.env.OWNER_BOOTSTRAP_SECRET;
  const providedSecret = req.headers.get('x-owner-bootstrap-secret') || '';

  if (!configuredSecret || !providedSecret) {
    return jsonResponse({ error: 'Owner bootstrap secret is not configured or missing.' }, 401);
  }

  const expectedBuf = Buffer.from(configuredSecret, 'utf8');
  const providedBuf = Buffer.from(providedSecret, 'utf8');
  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return jsonResponse({ error: 'Invalid bootstrap authorization.' }, 403);
  }

  let payload: { clerkUserId?: string };
  try {
    payload = (await req.json()) as { clerkUserId?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  const targetClerkUserId = payload.clerkUserId?.trim();
  if (!targetClerkUserId) {
    return jsonResponse({ error: 'clerkUserId is required.' }, 400);
  }

  try {
    const supabase = createServiceRoleSupabaseClient();

    const { data: lockRow, error: lockError } = await supabase
      .from('owner_provisioning_state')
      .select('is_owner_provisioned')
      .eq('id', true)
      .single();

    if (lockError) {
      return jsonResponse({ error: 'Unable to verify owner provisioning state.' }, 500);
    }

    if (lockRow?.is_owner_provisioned) {
      return jsonResponse(
        { error: 'Initial General Administrator has already been provisioned.' },
        409
      );
    }

    return jsonResponse(
      {
        status: 'ready_for_activation',
        message:
          'Phase 3 backend preparation stub verified. Execute full owner bootstrap transaction in Phase 4 once Clerk and Supabase keys are active.',
      },
      501
    );
  } catch (err) {
    console.error('Owner provisioning error:', err);
    return jsonResponse({ error: 'Server configuration error.' }, 500);
  }
}
