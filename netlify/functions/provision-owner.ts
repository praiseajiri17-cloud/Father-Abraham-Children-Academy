import crypto from 'node:crypto';
import { createClerkClient } from '@clerk/backend';
import {
  createServiceRoleSupabaseClient,
  jsonResponse,
  verifyClerkBearerToken,
} from './_shared/serverClients';

const DESIGNATED_OWNER_EMAIL = 'praiseajiri17@gmail.com';

/**
 * Trusted Primary School Owner (`general_admin`) Provisioning Endpoint.
 *
 * Security Rules:
 * - Never trusts client-supplied email strings, localStorage, or URL parameters.
 * - Requires either:
 *   (a) Valid Clerk Bearer token of the authenticated owner, OR
 *   (b) Valid `x-owner-bootstrap-secret` matching server `OWNER_BOOTSTRAP_SECRET` (`timingSafeEqual`).
 * - Always queries Clerk Backend API (`CLERK_SECRET_KEY`) directly to verify:
 *   1. The Clerk identity owns `praiseajiri17@gmail.com` (case-insensitive)
 *   2. That email address has `verification.status === 'verified'` in Clerk
 * - Enforces single-owner lock via `public.owner_provisioning_state`.
 * - Records an immutable audit entry in `public.audit_logs`.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!clerkSecretKey) {
    return jsonResponse({ error: 'Server Clerk configuration is missing.' }, 500);
  }

  let authorizedBySecret = false;
  const configuredSecret = process.env.OWNER_BOOTSTRAP_SECRET?.trim();
  const providedSecret = req.headers.get('x-owner-bootstrap-secret')?.trim() || '';

  if (configuredSecret && providedSecret) {
    const expectedBuf = Buffer.from(configuredSecret, 'utf8');
    const providedBuf = Buffer.from(providedSecret, 'utf8');
    if (
      expectedBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      authorizedBySecret = true;
    } else {
      return jsonResponse({ error: 'Invalid bootstrap authorization.' }, 403);
    }
  }

  const verifiedToken = await verifyClerkBearerToken(req.headers.get('authorization'));
  if (!authorizedBySecret && !verifiedToken) {
    return jsonResponse(
      { error: 'Unauthorized: Verified Clerk session or bootstrap authorization required.' },
      401
    );
  }

  let payload: { clerkUserId?: string } = {};
  try {
    const text = await req.text();
    if (text) {
      payload = JSON.parse(text) as { clerkUserId?: string };
    }
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  try {
    const clerk = createClerkClient({ secretKey: clerkSecretKey });

    // Determine target Clerk user strictly from verified token or bootstrap-only ID/email lookup
    let clerkUser = null;
    if (verifiedToken?.clerkUserId) {
      clerkUser = await clerk.users.getUser(verifiedToken.clerkUserId);
    } else if (authorizedBySecret && payload.clerkUserId?.trim()) {
      clerkUser = await clerk.users.getUser(payload.clerkUserId.trim());
    } else if (authorizedBySecret) {
      const list = await clerk.users.getUserList({
        emailAddress: [DESIGNATED_OWNER_EMAIL],
        limit: 5,
      });
      clerkUser = list.data[0] ?? null;
    }

    if (!clerkUser) {
      return jsonResponse(
        { error: 'Designated owner Clerk identity could not be located.' },
        404
      );
    }

    // Confirm server-side that praiseajiri17@gmail.com belongs to this Clerk user AND is verified
    const matchingEmail = clerkUser.emailAddresses.find(
      (ea) => ea.emailAddress.trim().toLowerCase() === DESIGNATED_OWNER_EMAIL
    );

    if (!matchingEmail) {
      return jsonResponse(
        { error: 'Forbidden: Authenticated Clerk user does not match designated school owner.' },
        403
      );
    }

    if (matchingEmail.verification?.status !== 'verified') {
      return jsonResponse(
        { error: 'Forbidden: Owner email address must be verified in Clerk before provisioning.' },
        403
      );
    }

    const supabase = createServiceRoleSupabaseClient();

    // Prefer atomic DB function from migration 0012 if installed
    const { data: rpcData, error: rpcError } = await supabase.rpc('provision_primary_owner', {
      p_clerk_user_id: clerkUser.id,
      p_email: DESIGNATED_OWNER_EMAIL,
      p_first_name: clerkUser.firstName || 'Praise',
      p_last_name: clerkUser.lastName || 'Ajiri',
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData[0]) {
      return jsonResponse({
        status: 'provisioned',
        role: 'general_admin',
        clerkUserId: clerkUser.id,
        profileId: rpcData[0].profile_id,
        staffId: rpcData[0].staff_id,
        alreadyProvisioned: Boolean(rpcData[0].already_provisioned),
      });
    }

    // Fallback transactional steps via service_role if 0012 RPC is not yet created
    const { data: lockRow, error: lockError } = await supabase
      .from('owner_provisioning_state')
      .select('is_owner_provisioned, owner_profile_id')
      .eq('id', true)
      .single();

    if (lockError) {
      return jsonResponse({ error: 'Unable to verify owner provisioning state.' }, 500);
    }

    let { data: profile } = await supabase
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', clerkUser.id)
      .maybeSingle();

    if (!profile) {
      const { data: byEmail } = await supabase
        .from('profiles')
        .select('id, clerk_user_id')
        .ilike('email', DESIGNATED_OWNER_EMAIL)
        .maybeSingle();

      if (byEmail) {
        const { data: updatedProf, error: updErr } = await supabase
          .from('profiles')
          .update({
            clerk_user_id: clerkUser.id,
            email: DESIGNATED_OWNER_EMAIL,
            account_status: 'active',
          })
          .eq('id', byEmail.id)
          .select('id, clerk_user_id')
          .single();
        if (updErr) throw new Error(updErr.message);
        profile = updatedProf;
      } else {
        const { data: insertedProf, error: insErr } = await supabase
          .from('profiles')
          .insert({
            clerk_user_id: clerkUser.id,
            email: DESIGNATED_OWNER_EMAIL,
            first_name: clerkUser.firstName || 'Praise',
            last_name: clerkUser.lastName || 'Ajiri',
            account_status: 'active',
          })
          .select('id, clerk_user_id')
          .single();
        if (insErr) throw new Error(insErr.message);
        profile = insertedProf;
      }
    }

    if (
      lockRow?.is_owner_provisioned &&
      lockRow.owner_profile_id &&
      lockRow.owner_profile_id !== profile.id
    ) {
      return jsonResponse(
        { error: 'Primary General Administrator is already locked to another profile.' },
        409
      );
    }

    let { data: staffRow } = await supabase
      .from('staff')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (!staffRow) {
      const { data: createdStaff, error: staffErr } = await supabase
        .from('staff')
        .insert({
          profile_id: profile.id,
          job_title: 'General Administrator (School Owner)',
          department: 'Executive Governance',
          employment_status: 'active',
          can_access_medical_records: true,
          created_by_profile_id: profile.id,
        })
        .select('id')
        .single();
      if (staffErr || !createdStaff) {
        throw new Error(staffErr?.message || 'Failed to create owner staff record.');
      }
      staffRow = createdStaff;
    }

    const { data: adminRole, error: roleErr } = await supabase
      .from('roles')
      .select('id')
      .eq('code', 'general_admin')
      .single();

    if (roleErr || !adminRole) {
      throw new Error('general_admin role definition not found.');
    }

    const { error: srErr } = await supabase.from('staff_roles').upsert(
      {
        staff_id: staffRow.id,
        role_id: adminRole.id,
        is_active: true,
        assigned_by_profile_id: profile.id,
        assigned_at: new Date().toISOString(),
        revoked_at: null,
        notes: 'Designated primary school owner provisioned as General Administrator.',
      },
      { onConflict: 'staff_id,role_id' }
    );

    if (srErr) throw new Error(srErr.message);

    await supabase
      .from('owner_provisioning_state')
      .update({
        is_owner_provisioned: true,
        owner_profile_id: profile.id,
        provisioned_at: new Date().toISOString(),
      })
      .eq('id', true);

    await supabase.from('audit_logs').insert({
      actor_profile_id: profile.id,
      actor_clerk_user_id: clerkUser.id,
      action: 'owner.general_admin_provisioned',
      entity_type: 'owner_provisioning_state',
      entity_id: profile.id,
      new_values: {
        email: DESIGNATED_OWNER_EMAIL,
        role: 'general_admin',
        staff_id: staffRow.id,
      },
    });

    return jsonResponse({
      status: 'provisioned',
      role: 'general_admin',
      clerkUserId: clerkUser.id,
      profileId: profile.id,
      staffId: staffRow.id,
      alreadyProvisioned: Boolean(lockRow?.is_owner_provisioned),
    });
  } catch (err) {
    console.error('Owner provisioning error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Server provisioning error.' },
      500
    );
  }
}
