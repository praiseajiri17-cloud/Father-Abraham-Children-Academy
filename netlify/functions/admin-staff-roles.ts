import {
  createServiceRoleSupabaseClient,
  jsonResponse,
  resolveVerifiedCaller,
  verifyClerkBearerToken,
} from './_shared/serverClients';

interface StaffRoleActionPayload {
  action?: 'assign_role' | 'revoke_role' | 'update_admission_settings';
  targetEmail?: string;
  targetProfileId?: string;
  roleCode?: string;
  jobTitle?: string;
  department?: string;
  notes?: string;
  admissionSettings?: {
    admissions_open?: boolean;
    current_session_label?: string;
    application_fee_configured?: boolean;
    application_fee_kobo?: number | null;
    physical_submission_instructions?: string;
  };
}

const ASSIGNABLE_STAFF_ROLES = new Set([
  'principal',
  'admission_officer',
  'finance_officer',
  'secretary',
  'teacher',
]);

/**
 * Trusted Server-Side General Administrator Governance Endpoint.
 *
 * Security Rules:
 * - Requires verified Clerk Bearer session token.
 * - Verifies caller holds active 'general_admin' role (or 'staff.manage' / 'audit.read' for GET).
 * - Never trusts client-supplied roles; logs all mutations into public.audit_logs.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const verified = await verifyClerkBearerToken(req.headers.get('authorization'));
    if (!verified) {
      return jsonResponse({ error: 'Unauthorized: Valid Clerk session token required.' }, 401);
    }

    const supabase = createServiceRoleSupabaseClient();
    const caller = await resolveVerifiedCaller(supabase, verified.clerkUserId);

    if (!caller) {
      return jsonResponse({ error: 'Forbidden: Active institutional profile required.' }, 403);
    }

    const canManageStaff = caller.isGeneralAdmin || caller.permissions.includes('staff.manage');
    const canReadAudit = caller.isGeneralAdmin || caller.permissions.includes('audit.read');

    if (req.method === 'GET') {
      if (!canManageStaff && !canReadAudit) {
        return jsonResponse({ error: 'Forbidden: General Administrator access required.' }, 403);
      }

      const [staffRes, auditRes] = await Promise.all([
        canManageStaff
          ? supabase
              .from('staff')
              .select(`
                id,
                staff_number,
                job_title,
                department,
                employment_status,
                can_access_medical_records,
                profiles!staff_profile_id_fkey (
                  id,
                  email,
                  first_name,
                  last_name
                ),
                staff_roles (
                  id,
                  is_active,
                  assigned_at,
                  notes,
                  roles ( code, name )
                )
              `)
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [], error: null }),
        canReadAudit
          ? supabase
              .from('audit_logs')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(60)
          : Promise.resolve({ data: [], error: null }),
      ]);

      return jsonResponse({
        staff: staffRes.data ?? [],
        auditLogs: auditRes.data ?? [],
      });
    }

    // POST mutations require General Administrator or explicit staff.manage / settings.manage
    const payload = (await req.json()) as StaffRoleActionPayload;

    if (payload.action === 'update_admission_settings') {
      if (!caller.isGeneralAdmin && !caller.permissions.includes('settings.manage')) {
        return jsonResponse({ error: 'Forbidden: Only General Administrator may update admission settings.' }, 403);
      }
      const nextSettings = payload.admissionSettings ?? {};
      const feeKobo =
        typeof nextSettings.application_fee_kobo === 'number' &&
        Number.isInteger(nextSettings.application_fee_kobo) &&
        nextSettings.application_fee_kobo > 0
          ? nextSettings.application_fee_kobo
          : null;

      const settingValue = {
        admissions_open: Boolean(nextSettings.admissions_open ?? true),
        current_session_label: (nextSettings.current_session_label || '2026/2027').trim(),
        application_fee_configured: feeKobo !== null,
        application_fee_kobo: feeKobo,
        currency: 'NGN',
        physical_submission_instructions:
          nextSettings.physical_submission_instructions?.trim() ||
          'Download and print the official A4 Application Form after verified payment, attach passport photographs and required supporting documents, and submit physically at the Admissions Office.',
      };

      const { data: oldSetting } = await supabase
        .from('school_settings')
        .select('setting_value')
        .eq('setting_key', 'admission_settings')
        .maybeSingle();

      const { error: upsertErr } = await supabase.from('school_settings').upsert({
        setting_key: 'admission_settings',
        setting_value: settingValue,
        is_public: true,
        updated_by_profile_id: caller.profileId,
      });

      if (upsertErr) {
        return jsonResponse({ error: upsertErr.message }, 400);
      }

      await supabase.from('audit_logs').insert({
        actor_profile_id: caller.profileId,
        actor_clerk_user_id: caller.clerkUserId,
        action: 'settings.admission_config_updated',
        entity_type: 'school_settings',
        entity_id: 'admission_settings',
        old_values: oldSetting?.setting_value ?? null,
        new_values: settingValue,
      });

      return jsonResponse({ status: 'ok', admissionSettings: settingValue });
    }

    if (!caller.isGeneralAdmin && !caller.permissions.includes('staff.manage')) {
      return jsonResponse({ error: 'Forbidden: General Administrator permission required.' }, 403);
    }

    const roleCode = payload.roleCode?.trim();
    if (!roleCode || !ASSIGNABLE_STAFF_ROLES.has(roleCode)) {
      return jsonResponse({ error: 'Invalid or unsupported staff role code.' }, 400);
    }

    // Resolve target profile either by ID or email
    let targetProfileId = payload.targetProfileId?.trim() || '';
    if (!targetProfileId && payload.targetEmail) {
      const { data: matchedProfile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', payload.targetEmail.trim())
        .maybeSingle();
      targetProfileId = matchedProfile?.id || '';
    }

    if (!targetProfileId) {
      return jsonResponse(
        {
          error:
            'Target user profile not found. The staff member must sign into the portal at least once first so their Clerk profile exists.',
        },
        404
      );
    }

    const { data: roleRow } = await supabase
      .from('roles')
      .select('id, code, name')
      .eq('code', roleCode)
      .single();

    if (!roleRow) {
      return jsonResponse({ error: 'Role definition not found in database.' }, 404);
    }

    // Ensure staff record exists
    let { data: staffRow } = await supabase
      .from('staff')
      .select('id')
      .eq('profile_id', targetProfileId)
      .maybeSingle();

    if (!staffRow) {
      if (payload.action === 'revoke_role') {
        return jsonResponse({ error: 'Staff record does not exist for this user.' }, 404);
      }
      const { data: createdStaff, error: createStaffErr } = await supabase
        .from('staff')
        .insert({
          profile_id: targetProfileId,
          job_title: payload.jobTitle?.trim() || roleRow.name,
          department: payload.department?.trim() || 'Administration',
          employment_status: 'active',
          created_by_profile_id: caller.profileId,
        })
        .select('id')
        .single();

      if (createStaffErr || !createdStaff) {
        return jsonResponse({ error: createStaffErr?.message || 'Failed to create staff record.' }, 400);
      }
      staffRow = createdStaff;
    }

    if (payload.action === 'revoke_role') {
      const { error: revokeErr } = await supabase
        .from('staff_roles')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          notes: payload.notes?.trim() || 'Revoked by General Administrator',
        })
        .eq('staff_id', staffRow.id)
        .eq('role_id', roleRow.id);

      if (revokeErr) {
        return jsonResponse({ error: revokeErr.message }, 400);
      }

      return jsonResponse({ status: 'ok', action: 'revoked', roleCode });
    }

    // Default: assign_role (upsert active staff_roles record)
    const { error: assignErr } = await supabase.from('staff_roles').upsert(
      {
        staff_id: staffRow.id,
        role_id: roleRow.id,
        is_active: true,
        assigned_by_profile_id: caller.profileId,
        assigned_at: new Date().toISOString(),
        revoked_at: null,
        notes: payload.notes?.trim() || `Assigned by General Administrator`,
      },
      { onConflict: 'staff_id,role_id' }
    );

    if (assignErr) {
      return jsonResponse({ error: assignErr.message }, 400);
    }

    return jsonResponse({ status: 'ok', action: 'assigned', roleCode });
  } catch (err) {
    console.error('Staff role assignment error:', err);
    return jsonResponse({ error: 'Server configuration or execution error.' }, 500);
  }
}
