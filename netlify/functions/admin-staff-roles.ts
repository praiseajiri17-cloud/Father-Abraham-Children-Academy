import {
  jsonResponse,
  verifyClerkBearerToken,
} from './_shared/serverClients';

/**
 * Trusted Server-Side Staff Invitation & Role Assignment Endpoint.
 *
 * Security Rules:
 * - Requires verified Clerk Bearer session token.
 * - Verifies caller holds active 'general_admin' role in Supabase before
 *   creating staff records or mutating staff_roles.
 * - Logs all role mutations into public.audit_logs.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const verified = await verifyClerkBearerToken(req.headers.get('authorization'));
    if (!verified) {
      return jsonResponse(
        {
          error:
            'Unauthorized: Verified Clerk session required. Full backend verification activates in Phase 4.',
        },
        401
      );
    }

    return jsonResponse(
      {
        status: 'stub',
        message: 'Staff role assignment endpoint prepared for Phase 4.',
      },
      501
    );
  } catch (err) {
    console.error('Staff role assignment error:', err);
    return jsonResponse({ error: 'Server configuration error.' }, 500);
  }
}
