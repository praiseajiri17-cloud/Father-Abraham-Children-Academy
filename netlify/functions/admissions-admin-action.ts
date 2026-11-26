import {
  createServiceRoleSupabaseClient,
  jsonResponse,
  resolveVerifiedCaller,
  verifyClerkBearerToken,
} from './_shared/serverClients';

type AdmissionAdminActionType =
  | 'record_physical_documents'
  | 'update_review_status'
  | 'override_or_reopen';

interface AdmissionAdminActionPayload {
  action: AdmissionAdminActionType;
  applicationId: string;
  applicationStatus?: 'under_review' | 'correction_requested' | 'approved' | 'rejected' | 'submitted';
  reviewerNotes?: string;
  correctionNotes?: string;
  overrideReason?: string;
  physicalDocumentsStatus?: 'not_submitted' | 'received' | 'under_review' | 'complete' | 'incomplete';
  physicalDocumentsReceivedByName?: string;
  physicalDocumentsReceivedAt?: string;
  physicalDocumentsReceivedList?: string[];
  physicalDocumentsMissingList?: string[];
  physicalDocumentsNotes?: string;
}

/**
 * Trusted Server-Side Admission Review, Physical Document Verification,
 * and General Administrator Decision Override Endpoint.
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
      return jsonResponse({ error: 'Forbidden: Active staff profile required.' }, 403);
    }

    const canReview = caller.isGeneralAdmin || caller.permissions.includes('admissions.review');
    const canOverride = caller.isGeneralAdmin || caller.permissions.includes('admissions.override');
    const canReadAudit = caller.isGeneralAdmin || caller.permissions.includes('audit.read');

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const applicationId = url.searchParams.get('applicationId');
      if (!canReview && !canReadAudit) {
        return jsonResponse({ error: 'Forbidden: Admissions review or audit access required.' }, 403);
      }

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'admission_applications')
        .order('created_at', { ascending: false })
        .limit(50);

      if (applicationId) {
        query = query.eq('entity_id', applicationId);
      }

      const { data, error } = await query;
      if (error) {
        return jsonResponse({ error: error.message }, 400);
      }

      return jsonResponse({ auditLogs: data ?? [] });
    }

    const payload = (await req.json()) as AdmissionAdminActionPayload;
    if (!payload?.applicationId || !payload?.action) {
      return jsonResponse({ error: 'applicationId and action are required.' }, 400);
    }

    const { data: existingApp, error: fetchErr } = await supabase
      .from('admission_applications')
      .select('*')
      .eq('id', payload.applicationId)
      .single();

    if (fetchErr || !existingApp) {
      return jsonResponse({ error: 'Admission application not found.' }, 404);
    }

    const nowIso = new Date().toISOString();

    if (payload.action === 'record_physical_documents') {
      if (!canReview) {
        return jsonResponse({ error: 'Forbidden: Admission Officer or General Admin permission required.' }, 403);
      }

      const nextDocStatus = payload.physicalDocumentsStatus;
      if (
        !nextDocStatus ||
        !['not_submitted', 'received', 'under_review', 'complete', 'incomplete'].includes(nextDocStatus)
      ) {
        return jsonResponse({ error: 'Invalid physical_documents_status.' }, 400);
      }

      const receivedList = Array.isArray(payload.physicalDocumentsReceivedList)
        ? payload.physicalDocumentsReceivedList.filter((i) => typeof i === 'string' && i.trim().length > 0)
        : [];
      const missingList = Array.isArray(payload.physicalDocumentsMissingList)
        ? payload.physicalDocumentsMissingList.filter((i) => typeof i === 'string' && i.trim().length > 0)
        : [];

      const { data: updated, error: updateErr } = await supabase
        .from('admission_applications')
        .update({
          physical_documents_status: nextDocStatus,
          physical_documents_submitted: nextDocStatus !== 'not_submitted',
          physical_documents_received_by_name: payload.physicalDocumentsReceivedByName?.trim() || null,
          physical_documents_received_at:
            nextDocStatus === 'not_submitted'
              ? null
              : payload.physicalDocumentsReceivedAt || existingApp.physical_documents_received_at || nowIso,
          physical_documents_verified_by: caller.profileId,
          physical_documents_verified_at: nextDocStatus === 'complete' ? nowIso : null,
          physical_documents_received_list: receivedList,
          physical_documents_missing_list: missingList,
          physical_documents_notes: payload.physicalDocumentsNotes?.trim() || null,
        })
        .eq('id', existingApp.id)
        .select('*')
        .single();

      if (updateErr) {
        return jsonResponse({ error: updateErr.message }, 400);
      }

      return jsonResponse({ status: 'ok', application: updated });
    }

    if (payload.action === 'update_review_status') {
      if (!canReview) {
        return jsonResponse({ error: 'Forbidden: Admission Officer or General Admin permission required.' }, 403);
      }

      const nextStatus = payload.applicationStatus;
      if (
        !nextStatus ||
        !['under_review', 'correction_requested', 'approved', 'rejected'].includes(nextStatus)
      ) {
        return jsonResponse({ error: 'Invalid review status.' }, 400);
      }

      if (
        ['approved', 'rejected'].includes(existingApp.application_status) &&
        nextStatus !== existingApp.application_status &&
        !canOverride
      ) {
        return jsonResponse(
          {
            error:
              'Finalized admission decisions can only be reopened or overridden by the General Administrator.',
          },
          403
        );
      }

      if (nextStatus === 'correction_requested' && !payload.correctionNotes?.trim()) {
        return jsonResponse(
          { error: 'Please specify what corrections the parent needs to make.' },
          400
        );
      }

      const { data: updated, error: updateErr } = await supabase
        .from('admission_applications')
        .update({
          application_status: nextStatus,
          reviewer_notes:
            payload.reviewerNotes !== undefined
              ? payload.reviewerNotes.trim() || null
              : existingApp.reviewer_notes,
          correction_notes:
            nextStatus === 'correction_requested'
              ? payload.correctionNotes?.trim() || null
              : payload.correctionNotes !== undefined
                ? payload.correctionNotes.trim() || null
                : existingApp.correction_notes,
          reviewed_by_profile_id: caller.profileId,
          reviewed_at: nowIso,
        })
        .eq('id', existingApp.id)
        .select('*')
        .single();

      if (updateErr) {
        return jsonResponse({ error: updateErr.message }, 400);
      }

      if (payload.reviewerNotes?.trim()) {
        await supabase.from('admission_status_history').insert({
          application_id: existingApp.id,
          event_type: 'note_added',
          from_status: existingApp.application_status,
          to_status: nextStatus,
          physical_documents_status: existingApp.physical_documents_status,
          actor_profile_id: caller.profileId,
          actor_role: caller.isGeneralAdmin ? 'general_admin' : 'admission_officer',
          notes: payload.reviewerNotes.trim(),
          is_internal: true,
        });
      }

      return jsonResponse({ status: 'ok', application: updated });
    }

    if (payload.action === 'override_or_reopen') {
      if (!canOverride) {
        return jsonResponse(
          { error: 'Forbidden: Only General Administrator may override or reopen decisions.' },
          403
        );
      }

      const nextStatus = payload.applicationStatus;
      if (
        !nextStatus ||
        !['submitted', 'under_review', 'correction_requested', 'approved', 'rejected'].includes(nextStatus)
      ) {
        return jsonResponse({ error: 'Invalid target status for override/reopen.' }, 400);
      }

      if (!payload.overrideReason?.trim()) {
        return jsonResponse({ error: 'An override/reopen reason is required for audit logging.' }, 400);
      }

      const { data: updated, error: updateErr } = await supabase
        .from('admission_applications')
        .update({
          application_status: nextStatus,
          reviewer_notes: payload.reviewerNotes?.trim() || existingApp.reviewer_notes,
          correction_notes:
            nextStatus === 'correction_requested'
              ? payload.correctionNotes?.trim() || payload.overrideReason.trim()
              : existingApp.correction_notes,
          decision_overridden_by_profile_id: caller.profileId,
          decision_overridden_at: nowIso,
        })
        .eq('id', existingApp.id)
        .select('*')
        .single();

      if (updateErr) {
        return jsonResponse({ error: updateErr.message }, 400);
      }

      await supabase.from('audit_logs').insert({
        actor_profile_id: caller.profileId,
        actor_clerk_user_id: caller.clerkUserId,
        action: 'admission.admin_override',
        entity_type: 'admission_applications',
        entity_id: existingApp.id,
        old_values: { application_status: existingApp.application_status },
        new_values: {
          application_status: nextStatus,
          override_reason: payload.overrideReason.trim(),
        },
      });

      await supabase.from('admission_status_history').insert({
        application_id: existingApp.id,
        event_type: nextStatus === 'under_review' || nextStatus === 'submitted' ? 'reopened' : 'decision_overridden',
        from_status: existingApp.application_status,
        to_status: nextStatus,
        physical_documents_status: existingApp.physical_documents_status,
        actor_profile_id: caller.profileId,
        actor_role: 'general_admin',
        notes: payload.overrideReason.trim(),
        is_internal: false,
      });

      return jsonResponse({ status: 'ok', application: updated });
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400);
  } catch (err) {
    console.error('Admissions admin action error:', err);
    return jsonResponse({ error: 'Server error processing admission workflow action.' }, 500);
  }
}
