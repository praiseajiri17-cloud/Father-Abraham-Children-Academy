import { SupabaseClient } from '@supabase/supabase-js';
import {
  AdmissionApplicationExpanded,
  AdmissionFilters,
  AdmissionFormInput,
  AdmissionMedicalDetails,
  AdmissionNotification,
  AdmissionReferenceLookups,
  AdmissionSettingsConfig,
  AdmissionStatusHistoryItem,
  AdmissionSummaryMetrics,
  ApplicationPaymentWithChild,
  ParentWorkspaceProfile,
} from '../types/admissions';
import {
  AdmissionDocumentType,
  ApplicationStatus,
  DbAdmissionDocument,
  DbAnnouncement,
  DbAuditLog,
  PhysicalDocumentsStatus,
} from '../types/database';

export function formatNairaFromKobo(amountKobo: number | null | undefined): string | null {
  if (typeof amountKobo !== 'number' || !Number.isFinite(amountKobo) || amountKobo <= 0) {
    return null;
  }
  const naira = amountKobo / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(naira);
}

export async function fetchAdmissionLookups(
  supabase: SupabaseClient
): Promise<AdmissionReferenceLookups> {
  const [sectionsRes, levelsRes, sessionsRes, settingsRes] = await Promise.all([
    supabase.from('school_sections').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('class_levels')
      .select('*')
      .eq('is_active', true)
      .order('sequence_order', { ascending: true }),
    supabase
      .from('academic_sessions')
      .select('*')
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false }),
    supabase
      .from('school_settings')
      .select('setting_value')
      .eq('setting_key', 'admission_settings')
      .maybeSingle(),
  ]);

  if (sectionsRes.error) throw new Error(sectionsRes.error.message);
  if (levelsRes.error) throw new Error(levelsRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);

  const rawSettings = settingsRes.data?.setting_value as Partial<AdmissionSettingsConfig> | undefined;
  const admissionSettings: AdmissionSettingsConfig | null = rawSettings
    ? {
        admissions_open: rawSettings.admissions_open ?? true,
        current_session_label: rawSettings.current_session_label ?? '2026/2027',
        application_fee_configured: Boolean(
          rawSettings.application_fee_configured &&
            typeof rawSettings.application_fee_kobo === 'number' &&
            rawSettings.application_fee_kobo > 0
        ),
        application_fee_kobo:
          typeof rawSettings.application_fee_kobo === 'number' &&
          rawSettings.application_fee_kobo > 0
            ? rawSettings.application_fee_kobo
            : null,
        currency: 'NGN',
        physical_submission_instructions: rawSettings.physical_submission_instructions,
      }
    : null;

  return {
    sections: sectionsRes.data ?? [],
    classLevels: levelsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    admissionSettings,
  };
}

export async function fetchParentApplications(
  supabase: SupabaseClient,
  profileId: string
): Promise<AdmissionApplicationExpanded[]> {
  const { data, error } = await supabase
    .from('admission_applications')
    .select(`
      *,
      school_sections ( id, code, name ),
      class_levels ( id, code, name ),
      academic_sessions ( id, name, is_current )
    `)
    .eq('applicant_profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const apps = (data ?? []) as AdmissionApplicationExpanded[];

  if (apps.length === 0) return [];

  const appIds = apps.map((a) => a.id);
  const { data: medRows } = await supabase
    .from('admission_medical_details')
    .select('*')
    .in('application_id', appIds);

  const medMap = new Map<string, AdmissionMedicalDetails>();
  for (const row of (medRows ?? []) as AdmissionMedicalDetails[]) {
    medMap.set(row.application_id, row);
  }

  return apps.map((app) => ({
    ...app,
    medical_details: medMap.get(app.id) ?? null,
  }));
}

export async function fetchParentNotifications(
  supabase: SupabaseClient,
  profileId: string
): Promise<AdmissionNotification[]> {
  const { data, error } = await supabase
    .from('admission_notifications')
    .select('*')
    .eq('recipient_profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) throw new Error(error.message);
  return (data ?? []) as AdmissionNotification[];
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from('admission_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw new Error(error.message);
}

export async function fetchApplicationHistory(
  supabase: SupabaseClient,
  applicationId: string
): Promise<AdmissionStatusHistoryItem[]> {
  const { data, error } = await supabase
    .from('admission_status_history')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdmissionStatusHistoryItem[];
}

export async function saveOrSubmitParentApplication(
  supabase: SupabaseClient,
  params: {
    profileId: string;
    parentId?: string | null;
    input: AdmissionFormInput;
    mode: 'draft' | 'submit';
    sessionYearLabel?: string;
    existingStatus?: ApplicationStatus;
    configuredFeeKobo?: number | null;
  }
): Promise<AdmissionApplicationExpanded> {
  const { profileId, parentId, input, mode, sessionYearLabel, existingStatus, configuredFeeKobo } =
    params;

  const targetStatus: ApplicationStatus = mode === 'submit' ? 'submitted' : 'draft';
  const nowIso = new Date().toISOString();

  // Resolve parent record id if not provided
  let resolvedParentId = parentId ?? null;
  if (!resolvedParentId) {
    const { data: parentRow } = await supabase
      .from('parents')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();
    resolvedParentId = parentRow?.id ?? null;
  }

  const basePayload: Record<string, unknown> = {
    child_first_name: input.child_first_name.trim(),
    child_middle_name: input.child_middle_name.trim() || null,
    child_last_name: input.child_last_name.trim(),
    child_date_of_birth: input.child_date_of_birth,
    child_gender: input.child_gender,
    child_nationality: input.child_nationality.trim() || 'Nigerian',
    child_state_of_origin: input.child_state_of_origin.trim() || null,
    child_lga: input.child_lga.trim() || null,
    intended_section_id: input.intended_section_id,
    intended_class_level_id: input.intended_class_level_id,
    intended_session_id: input.intended_session_id,
    ...(input.passport_photo_path ? { passport_photo_path: input.passport_photo_path } : {}),
    parent_full_name: input.parent_full_name.trim(),
    parent_relationship: input.parent_relationship.trim(),
    parent_email: input.parent_email.trim(),
    parent_phone: input.parent_phone.trim(),
    parent_alternate_phone: input.parent_alternate_phone.trim() || null,
    residential_address: input.residential_address.trim(),
    parent_occupation: input.parent_occupation.trim() || null,
    emergency_contact_name: input.emergency_contact_name.trim(),
    emergency_contact_phone: input.emergency_contact_phone.trim(),
    emergency_contact_relationship: input.emergency_contact_relationship.trim(),
    is_first_time_schooling: input.is_first_time_schooling,
    previous_school: input.is_first_time_schooling
      ? null
      : input.previous_school_name.trim() || null,
    previous_school_name: input.is_first_time_schooling
      ? null
      : input.previous_school_name.trim() || null,
    previous_class: input.is_first_time_schooling
      ? null
      : input.previous_class.trim() || null,
    previous_school_address: input.is_first_time_schooling
      ? null
      : input.previous_school_address.trim() || null,
    reason_for_leaving: input.is_first_time_schooling
      ? null
      : input.reason_for_leaving.trim() || null,
    additional_details: input.additional_details.trim() || null,
    declaration_accepted: mode === 'submit' ? input.declaration_accepted : Boolean(input.declaration_accepted),
    declaration_accepted_at:
      mode === 'submit' && input.declaration_accepted ? nowIso : null,
    declaration_signer_name: input.declaration_signer_name.trim() || null,
    application_status:
      mode === 'draft' && existingStatus === 'correction_requested'
        ? 'correction_requested'
        : targetStatus,
    ...(mode === 'submit' ? { submitted_at: nowIso } : {}),
  };

  let resolvedApplicationId: string;

  if (input.id) {
    let { data: updated, error: updateErr } = await supabase
      .from('admission_applications')
      .update(basePayload)
      .eq('id', input.id)
      .eq('applicant_profile_id', profileId)
      .select('id')
      .single();

    if (updateErr && updateErr.message.includes('reason_for_leaving')) {
      const { reason_for_leaving: _omit, ...fallbackPayload } = basePayload;
      const retry = await supabase
        .from('admission_applications')
        .update(fallbackPayload)
        .eq('id', input.id)
        .eq('applicant_profile_id', profileId)
        .select('id')
        .single();
      updated = retry.data;
      updateErr = retry.error;
    }

    if (updateErr || !updated) {
      throw new Error(updateErr?.message || 'Unable to update admission application.');
    }
    resolvedApplicationId = updated.id;
  } else {
    // Generate unique application reference via DB RPC (with deterministic fallback)
    let appRef: string | null = null;
    const { data: rpcRef } = await supabase.rpc('generate_admission_reference', {
      p_session_year: sessionYearLabel ?? null,
    });
    if (typeof rpcRef === 'string' && rpcRef.startsWith('FACA-ADM-')) {
      appRef = rpcRef;
    } else {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      appRef = `FACA-ADM-${year}-${rand}`;
    }

    const insertPayload = {
      ...basePayload,
      application_reference: appRef,
      applicant_profile_id: profileId,
      parent_id: resolvedParentId,
      payment_status: 'unpaid',
      application_fee_kobo:
        typeof configuredFeeKobo === 'number' && configuredFeeKobo > 0 ? configuredFeeKobo : null,
      physical_documents_submitted: false,
      physical_documents_status: 'not_submitted',
    };

    let { data: inserted, error: insertErr } = await supabase
      .from('admission_applications')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertErr && insertErr.message.includes('reason_for_leaving')) {
      const { reason_for_leaving: _omit, ...fallbackInsert } = insertPayload as Record<string, unknown>;
      const retry = await supabase
        .from('admission_applications')
        .insert(fallbackInsert)
        .select('id')
        .single();
      inserted = retry.data;
      insertErr = retry.error;
    }

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message || 'Unable to create admission application.');
    }
    resolvedApplicationId = inserted.id;
  }

  // Upsert restricted medical details separately
  const medPayload = {
    application_id: resolvedApplicationId,
    blood_group: input.blood_group.trim() || null,
    genotype: input.genotype.trim() || null,
    allergies: input.allergies.trim() || null,
    chronic_conditions: input.chronic_conditions.trim() || null,
    dietary_requirements: input.dietary_requirements.trim() || null,
    special_learning_needs: input.special_learning_needs.trim() || null,
    emergency_medical_notes: input.emergency_medical_notes.trim() || null,
  };

  const { error: medErr } = await supabase
    .from('admission_medical_details')
    .upsert(medPayload, { onConflict: 'application_id' });

  if (medErr) {
    throw new Error(medErr.message);
  }

  const { data: fullRow, error: reloadErr } = await supabase
    .from('admission_applications')
    .select(`
      *,
      school_sections ( id, code, name ),
      class_levels ( id, code, name ),
      academic_sessions ( id, name, is_current )
    `)
    .eq('id', resolvedApplicationId)
    .single();

  if (reloadErr || !fullRow) {
    throw new Error(reloadErr?.message || 'Saved application could not be reloaded.');
  }

  return {
    ...(fullRow as AdmissionApplicationExpanded),
    medical_details: medPayload,
  };
}

// ----------------------------------------------------------------------------
// Staff / Admission Officer / General Admin Services
// ----------------------------------------------------------------------------

export async function fetchAllApplicationsForStaff(
  supabase: SupabaseClient
): Promise<AdmissionApplicationExpanded[]> {
  const { data, error } = await supabase
    .from('admission_applications')
    .select(`
      *,
      school_sections ( id, code, name ),
      class_levels ( id, code, name ),
      academic_sessions ( id, name, is_current )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  const apps = (data ?? []) as AdmissionApplicationExpanded[];
  if (apps.length === 0) return [];

  const { data: medRows } = await supabase
    .from('admission_medical_details')
    .select('*')
    .in(
      'application_id',
      apps.map((a) => a.id)
    );

  const medMap = new Map<string, AdmissionMedicalDetails>();
  for (const row of (medRows ?? []) as AdmissionMedicalDetails[]) {
    medMap.set(row.application_id, row);
  }

  return apps.map((app) => ({
    ...app,
    medical_details: medMap.get(app.id) ?? null,
  }));
}

export function computeAdmissionMetrics(
  applications: AdmissionApplicationExpanded[]
): AdmissionSummaryMetrics {
  return applications.reduce<AdmissionSummaryMetrics>(
    (acc, app) => {
      acc.totalApplications += 1;
      if (app.application_status === 'draft') acc.draftApplications += 1;
      if (app.application_status === 'submitted' || app.application_status === 'pending') {
        acc.newSubmissions += 1;
      }
      if (
        app.application_status === 'submitted' ||
        app.application_status === 'pending' ||
        app.application_status === 'under_review'
      ) {
        acc.awaitingReview += 1;
      }
      if (
        app.application_status !== 'draft' &&
        app.application_status !== 'rejected' &&
        app.physical_documents_status === 'not_submitted'
      ) {
        acc.awaitingPhysicalDocuments += 1;
      }
      if (app.physical_documents_status === 'incomplete') acc.incompleteDocuments += 1;
      if (app.application_status === 'correction_requested') acc.correctionsRequested += 1;
      if (app.application_status === 'approved') acc.approvedApplications += 1;
      if (app.application_status === 'rejected') acc.rejectedApplications += 1;
      return acc;
    },
    {
      totalApplications: 0,
      draftApplications: 0,
      newSubmissions: 0,
      awaitingReview: 0,
      awaitingPhysicalDocuments: 0,
      incompleteDocuments: 0,
      correctionsRequested: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
    }
  );
}

export function filterApplications(
  applications: AdmissionApplicationExpanded[],
  filters: AdmissionFilters
): AdmissionApplicationExpanded[] {
  const q = filters.search.trim().toLowerCase();
  return applications.filter((app) => {
    if (q) {
      const childFull = `${app.child_first_name} ${app.child_middle_name ?? ''} ${app.child_last_name}`.toLowerCase();
      const parentFull = (app.parent_full_name ?? '').toLowerCase();
      const ref = app.application_reference.toLowerCase();
      if (!childFull.includes(q) && !ref.includes(q) && !parentFull.includes(q)) {
        return false;
      }
    }
    if (filters.sectionCode !== 'all' && app.school_sections?.code !== filters.sectionCode) {
      return false;
    }
    if (filters.classLevelId !== 'all' && app.intended_class_level_id !== filters.classLevelId) {
      return false;
    }
    if (filters.sessionId !== 'all' && app.intended_session_id !== filters.sessionId) {
      return false;
    }
    if (
      filters.applicationStatus !== 'all' &&
      app.application_status !== filters.applicationStatus
    ) {
      return false;
    }
    if (filters.paymentStatus !== 'all' && app.payment_status !== filters.paymentStatus) {
      return false;
    }
    if (
      filters.physicalDocumentsStatus !== 'all' &&
      app.physical_documents_status !== filters.physicalDocumentsStatus
    ) {
      return false;
    }
    return true;
  });
}

async function callVerifiedNetlifyEndpoint<T>(
  path: string,
  clerkToken: string | null,
  options?: { method?: 'GET' | 'POST'; body?: Record<string, unknown> }
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  if (!clerkToken) {
    return { ok: false, status: 401, error: 'Missing Clerk session token.' };
  }
  try {
    const res = await fetch(path, {
      method: options?.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clerkToken}`,
      },
      ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return { ok: false, status: res.status, error: 'Netlify Function endpoint unavailable.' };
    }

    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof json.error === 'string' ? json.error : 'Server request failed.',
      };
    }

    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: 'Netlify Function endpoint unreachable.' };
  }
}

export async function performOfficerPhysicalDocUpdate(
  supabase: SupabaseClient,
  clerkToken: string | null,
  profileId: string,
  params: {
    applicationId: string;
    physicalDocumentsStatus: PhysicalDocumentsStatus;
    receivedByName: string;
    receivedAt: string;
    receivedList: string[];
    missingList: string[];
    notes: string;
  }
): Promise<void> {
  const fnRes = await callVerifiedNetlifyEndpoint('/.netlify/functions/admissions-admin-action', clerkToken, {
    method: 'POST',
    body: {
      action: 'record_physical_documents',
      applicationId: params.applicationId,
      physicalDocumentsStatus: params.physicalDocumentsStatus,
      physicalDocumentsReceivedByName: params.receivedByName,
      physicalDocumentsReceivedAt: params.receivedAt || new Date().toISOString(),
      physicalDocumentsReceivedList: params.receivedList,
      physicalDocumentsMissingList: params.missingList,
      physicalDocumentsNotes: params.notes,
    },
  });

  if (fnRes.ok) return;
  if (fnRes.status !== 404 && fnRes.status !== 0) {
    throw new Error(fnRes.error);
  }

  // Fallback directly via Clerk-authenticated Supabase RLS (enforced by PostgreSQL RLS & triggers)
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('admission_applications')
    .update({
      physical_documents_status: params.physicalDocumentsStatus,
      physical_documents_submitted: params.physicalDocumentsStatus !== 'not_submitted',
      physical_documents_received_by_name: params.receivedByName.trim() || null,
      physical_documents_received_at:
        params.physicalDocumentsStatus === 'not_submitted'
          ? null
          : params.receivedAt || nowIso,
      physical_documents_verified_by: profileId,
      physical_documents_verified_at:
        params.physicalDocumentsStatus === 'complete' ? nowIso : null,
      physical_documents_received_list: params.receivedList,
      physical_documents_missing_list: params.missingList,
      physical_documents_notes: params.notes.trim() || null,
    })
    .eq('id', params.applicationId);

  if (error) throw new Error(error.message);
}

export async function performOfficerReviewDecision(
  supabase: SupabaseClient,
  clerkToken: string | null,
  profileId: string,
  params: {
    applicationId: string;
    applicationStatus: 'under_review' | 'correction_requested' | 'approved' | 'rejected';
    reviewerNotes: string;
    correctionNotes: string;
  }
): Promise<void> {
  const fnRes = await callVerifiedNetlifyEndpoint('/.netlify/functions/admissions-admin-action', clerkToken, {
    method: 'POST',
    body: {
      action: 'update_review_status',
      applicationId: params.applicationId,
      applicationStatus: params.applicationStatus,
      reviewerNotes: params.reviewerNotes,
      correctionNotes: params.correctionNotes,
    },
  });

  if (fnRes.ok) return;
  if (fnRes.status !== 404 && fnRes.status !== 0) {
    throw new Error(fnRes.error);
  }

  const { error } = await supabase
    .from('admission_applications')
    .update({
      application_status: params.applicationStatus,
      reviewer_notes: params.reviewerNotes.trim() || null,
      correction_notes:
        params.applicationStatus === 'correction_requested'
          ? params.correctionNotes.trim() || null
          : params.correctionNotes.trim() || null,
      reviewed_by_profile_id: profileId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', params.applicationId);

  if (error) throw new Error(error.message);
}

export async function performAdminDecisionOverride(
  supabase: SupabaseClient,
  clerkToken: string | null,
  profileId: string,
  params: {
    applicationId: string;
    applicationStatus: 'submitted' | 'under_review' | 'correction_requested' | 'approved' | 'rejected';
    overrideReason: string;
    reviewerNotes?: string;
  }
): Promise<void> {
  const fnRes = await callVerifiedNetlifyEndpoint('/.netlify/functions/admissions-admin-action', clerkToken, {
    method: 'POST',
    body: {
      action: 'override_or_reopen',
      applicationId: params.applicationId,
      applicationStatus: params.applicationStatus,
      overrideReason: params.overrideReason,
      reviewerNotes: params.reviewerNotes,
    },
  });

  if (fnRes.ok) return;
  if (fnRes.status !== 404 && fnRes.status !== 0) {
    throw new Error(fnRes.error);
  }

  const { error } = await supabase
    .from('admission_applications')
    .update({
      application_status: params.applicationStatus,
      reviewer_notes: params.reviewerNotes?.trim() || undefined,
      correction_notes:
        params.applicationStatus === 'correction_requested'
          ? params.overrideReason.trim()
          : undefined,
      decision_overridden_by_profile_id: profileId,
      decision_overridden_at: new Date().toISOString(),
    })
    .eq('id', params.applicationId);

  if (error) throw new Error(error.message);
}

export async function fetchAdmissionAuditLogs(
  supabase: SupabaseClient,
  clerkToken: string | null,
  applicationId?: string
): Promise<DbAuditLog[]> {
  const qs = applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : '';
  const fnRes = await callVerifiedNetlifyEndpoint<{ auditLogs: DbAuditLog[] }>(
    `/.netlify/functions/admissions-admin-action${qs}`,
    clerkToken,
    { method: 'GET' }
  );

  if (fnRes.ok) {
    return fnRes.data.auditLogs ?? [];
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
  if (error) throw new Error(error.message);
  return (data ?? []) as DbAuditLog[];
}

export async function fetchAdminStaffDirectory(
  supabase: SupabaseClient,
  clerkToken: string | null
): Promise<{
  staff: Array<Record<string, unknown>>;
  auditLogs: DbAuditLog[];
}> {
  const fnRes = await callVerifiedNetlifyEndpoint<{
    staff: Array<Record<string, unknown>>;
    auditLogs: DbAuditLog[];
  }>('/.netlify/functions/admin-staff-roles', clerkToken, { method: 'GET' });

  if (fnRes.ok) {
    return {
      staff: fnRes.data.staff ?? [],
      auditLogs: fnRes.data.auditLogs ?? [],
    };
  }

  const [staffRes, auditRes] = await Promise.all([
    supabase
      .from('staff')
      .select(`
        id,
        staff_number,
        job_title,
        department,
        employment_status,
        can_access_medical_records,
        profiles!staff_profile_id_fkey ( id, email, first_name, last_name ),
        staff_roles ( id, is_active, assigned_at, notes, roles ( code, name ) )
      `)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  if (staffRes.error) throw new Error(staffRes.error.message);
  return {
    staff: (staffRes.data ?? []) as Array<Record<string, unknown>>,
    auditLogs: (auditRes.data ?? []) as DbAuditLog[],
  };
}

export async function assignOrRevokeStaffRole(
  supabase: SupabaseClient,
  clerkToken: string | null,
  callerProfileId: string | null,
  params: {
    action: 'assign_role' | 'revoke_role';
    targetEmail: string;
    roleCode: string;
    jobTitle?: string;
    department?: string;
    notes?: string;
  }
): Promise<void> {
  const fnRes = await callVerifiedNetlifyEndpoint('/.netlify/functions/admin-staff-roles', clerkToken, {
    method: 'POST',
    body: {
      action: params.action,
      targetEmail: params.targetEmail,
      roleCode: params.roleCode,
      jobTitle: params.jobTitle,
      department: params.department,
      notes: params.notes,
    },
  });

  if (fnRes.ok) return;
  if (fnRes.status !== 404 && fnRes.status !== 0) {
    throw new Error(fnRes.error);
  }

  // Fallback directly via General Administrator RLS when Netlify Functions aren't mounted (e.g. Vite dev)
  const cleanEmail = params.targetEmail.trim();
  const { data: matchedProfile, error: profErr } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (profErr) throw new Error(profErr.message);
  if (!matchedProfile) {
    throw new Error(
      'No portal profile matches that email yet. The staff member must sign into the School Portal at least once first.'
    );
  }

  const { data: roleRow, error: roleErr } = await supabase
    .from('roles')
    .select('id, code, name')
    .eq('code', params.roleCode)
    .single();

  if (roleErr || !roleRow) {
    throw new Error('Selected institutional role was not found.');
  }

  let { data: staffRow, error: staffLookupErr } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', matchedProfile.id)
    .maybeSingle();

  if (staffLookupErr) throw new Error(staffLookupErr.message);

  if (!staffRow) {
    if (params.action === 'revoke_role') {
      throw new Error('This user does not have an active staff record.');
    }
    const { data: createdStaff, error: createErr } = await supabase
      .from('staff')
      .insert({
        profile_id: matchedProfile.id,
        job_title: params.jobTitle?.trim() || roleRow.name,
        department: params.department?.trim() || 'Administration',
        employment_status: 'active',
        created_by_profile_id: callerProfileId,
      })
      .select('id')
      .single();
    if (createErr || !createdStaff) {
      throw new Error(createErr?.message || 'Unable to create staff record.');
    }
    staffRow = createdStaff;
  }

  if (params.action === 'revoke_role') {
    if (params.roleCode === 'general_admin' && matchedProfile.id === callerProfileId) {
      throw new Error('You cannot revoke your own General Administrator authority.');
    }
    const { error: revokeErr } = await supabase
      .from('staff_roles')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        notes: params.notes?.trim() || 'Revoked by General Administrator',
      })
      .eq('staff_id', staffRow.id)
      .eq('role_id', roleRow.id);
    if (revokeErr) throw new Error(revokeErr.message);
    return;
  }

  const { error: assignErr } = await supabase.from('staff_roles').upsert(
    {
      staff_id: staffRow.id,
      role_id: roleRow.id,
      is_active: true,
      assigned_by_profile_id: callerProfileId,
      assigned_at: new Date().toISOString(),
      revoked_at: null,
      notes: params.notes?.trim() || 'Assigned by General Administrator',
    },
    { onConflict: 'staff_id,role_id' }
  );
  if (assignErr) throw new Error(assignErr.message);
}

export async function updateAdmissionSettingsConfig(
  supabase: SupabaseClient,
  clerkToken: string | null,
  profileId: string,
  settings: AdmissionSettingsConfig
): Promise<void> {
  const fnRes = await callVerifiedNetlifyEndpoint('/.netlify/functions/admin-staff-roles', clerkToken, {
    method: 'POST',
    body: {
      action: 'update_admission_settings',
      admissionSettings: settings as unknown as Record<string, unknown>,
    },
  });

  if (fnRes.ok) return;
  if (fnRes.status !== 404 && fnRes.status !== 0) {
    throw new Error(fnRes.error);
  }

  const { error } = await supabase.from('school_settings').upsert({
    setting_key: 'admission_settings',
    setting_value: settings,
    is_public: true,
    updated_by_profile_id: profileId,
  });

  if (error) throw new Error(error.message);
}

export async function updatePublicContactInfoConfig(
  supabase: SupabaseClient,
  clerkToken: string | null,
  profileId: string,
  contactInfo: {
    address: string;
    phone: string;
    email: string;
    hours: string;
    whatsapp_url?: string;
  }
): Promise<void> {
  const normalized = {
    configured: Boolean(
      contactInfo.address.trim() ||
        contactInfo.phone.trim() ||
        contactInfo.email.trim() ||
        contactInfo.hours.trim()
    ),
    address: contactInfo.address.trim() || null,
    phone: contactInfo.phone.trim() || null,
    email: contactInfo.email.trim() || null,
    hours: contactInfo.hours.trim() || null,
    whatsapp_url: contactInfo.whatsapp_url?.trim() || null,
  };

  const fnRes = await callVerifiedNetlifyEndpoint('/.netlify/functions/admin-staff-roles', clerkToken, {
    method: 'POST',
    body: {
      action: 'update_public_contact_info',
      publicContactInfo: normalized,
    },
  });

  if (fnRes.ok) return;
  if (fnRes.status !== 404 && fnRes.status !== 0) {
    throw new Error(fnRes.error);
  }

  const { error } = await supabase.from('school_settings').upsert({
    setting_key: 'public_contact_info',
    setting_value: normalized,
    is_public: true,
    updated_by_profile_id: profileId,
  });

  if (error) throw new Error(error.message);
}

export async function updatePublicAnnouncementConfig(
  supabase: SupabaseClient,
  clerkToken: string | null,
  profileId: string,
  announcement: {
    is_active: boolean;
    badge: string;
    message: string;
    cta_label: string;
    cta_path: string;
  }
): Promise<void> {
  const cleanMessage = announcement.message.trim();
  const safePath =
    announcement.cta_path.trim().startsWith('/') && !announcement.cta_path.trim().startsWith('//')
      ? announcement.cta_path.trim()
      : '/apply';

  const normalized = {
    is_active: Boolean(announcement.is_active && cleanMessage),
    badge: announcement.badge.trim() || 'Notice',
    message: cleanMessage,
    cta_label: announcement.cta_label.trim() || 'Apply Now',
    cta_path: safePath,
  };

  const fnRes = await callVerifiedNetlifyEndpoint('/.netlify/functions/admin-staff-roles', clerkToken, {
    method: 'POST',
    body: {
      action: 'update_public_announcement',
      publicAnnouncement: normalized,
    },
  });

  if (fnRes.ok) return;
  if (fnRes.status !== 404 && fnRes.status !== 0) {
    throw new Error(fnRes.error);
  }

  const { error } = await supabase.from('school_settings').upsert({
    setting_key: 'public_announcement',
    setting_value: normalized,
    is_public: true,
    updated_by_profile_id: profileId,
  });

  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// Phase 4: Private Admission Documents, Parent Family Profile, Payments & Notices
// ----------------------------------------------------------------------------

const ALLOWED_PASSPORT_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_DOCUMENT_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export async function fetchApplicationDocuments(
  supabase: SupabaseClient,
  applicationId: string
): Promise<DbAdmissionDocument[]> {
  const { data, error } = await supabase
    .from('admission_documents')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbAdmissionDocument[];
}

export async function createAdmissionDocumentSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from('admission-documents')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadAdmissionDocument(
  supabase: SupabaseClient,
  params: {
    applicationId: string;
    profileId: string;
    documentType: AdmissionDocumentType;
    file: File;
  }
): Promise<DbAdmissionDocument> {
  const { applicationId, profileId, documentType, file } = params;

  const isPassport = documentType === 'passport_photo';
  const maxBytes = isPassport ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  const allowedMimes = isPassport ? ALLOWED_PASSPORT_MIME : ALLOWED_DOCUMENT_MIME;

  if (!allowedMimes.has(file.type)) {
    throw new Error(
      isPassport
        ? 'Passport photograph must be a JPG, PNG, or WebP image.'
        : 'Documents must be PDF, JPG, PNG, or WebP files.'
    );
  }

  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(
      isPassport
        ? 'Passport photograph must be under 5 MB.'
        : 'Supporting document must be under 10 MB.'
    );
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 90);
  const uniquePrefix = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(Date.now());
  const storagePath = `${applicationId}/${documentType}_${uniquePrefix}_${sanitizedName}`;

  const { error: uploadErr } = await supabase.storage
    .from('admission-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(uploadErr.message || 'Unable to upload file to private storage.');
  }

  const { data: docRow, error: insertErr } = await supabase
    .from('admission_documents')
    .insert({
      application_id: applicationId,
      document_type: documentType,
      storage_bucket: 'admission-documents',
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      uploaded_by_profile_id: profileId,
    })
    .select('*')
    .single();

  if (insertErr || !docRow) {
    // Clean up orphaned file if DB row insert fails
    await supabase.storage.from('admission-documents').remove([storagePath]);
    throw new Error(insertErr?.message || 'Unable to record uploaded document metadata.');
  }

  if (isPassport) {
    await supabase
      .from('admission_applications')
      .update({ passport_photo_path: storagePath })
      .eq('id', applicationId);
  }

  return docRow as DbAdmissionDocument;
}

export async function deleteAdmissionDocument(
  supabase: SupabaseClient,
  doc: Pick<DbAdmissionDocument, 'id' | 'application_id' | 'document_type' | 'storage_path'>
): Promise<void> {
  const { error } = await supabase.from('admission_documents').delete().eq('id', doc.id);
  if (error) throw new Error(error.message);

  await supabase.storage.from('admission-documents').remove([doc.storage_path]);

  if (doc.document_type === 'passport_photo') {
    await supabase
      .from('admission_applications')
      .update({ passport_photo_path: null })
      .eq('id', doc.application_id)
      .eq('passport_photo_path', doc.storage_path);
  }
}

export async function checkPotentialDuplicateApplication(
  supabase: SupabaseClient,
  params: {
    profileId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sessionId: string;
    excludeApplicationId?: string;
  }
): Promise<{ isDuplicate: boolean; existingReference?: string }> {
  const { profileId, firstName, lastName, dateOfBirth, sessionId, excludeApplicationId } = params;
  const { data } = await supabase
    .from('admission_applications')
    .select('id, application_reference, application_status')
    .eq('applicant_profile_id', profileId)
    .eq('intended_session_id', sessionId)
    .eq('child_date_of_birth', dateOfBirth)
    .ilike('child_first_name', firstName.trim())
    .ilike('child_last_name', lastName.trim())
    .neq('application_status', 'rejected');

  const match = (data ?? []).find((row) => row.id !== excludeApplicationId);
  if (match) {
    return { isDuplicate: true, existingReference: match.application_reference };
  }
  return { isDuplicate: false };
}

export async function fetchParentWorkspaceProfile(
  supabase: SupabaseClient,
  profileId: string
): Promise<ParentWorkspaceProfile | null> {
  const [{ data: profileRow, error: profErr }, { data: parentRow }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', profileId).maybeSingle(),
    supabase.from('parents').select('*').eq('profile_id', profileId).maybeSingle(),
  ]);

  if (profErr) throw new Error(profErr.message);
  if (!profileRow) return null;

  return {
    profileId: profileRow.id,
    parentId: parentRow?.id ?? null,
    first_name: profileRow.first_name || '',
    last_name: profileRow.last_name || '',
    email: profileRow.email || '',
    phone: profileRow.phone || '',
    alternate_phone: parentRow?.alternate_phone || '',
    occupation: parentRow?.occupation || '',
    residential_address: parentRow?.residential_address || '',
  };
}

export async function updateParentWorkspaceProfile(
  supabase: SupabaseClient,
  profileId: string,
  input: {
    first_name: string;
    last_name: string;
    phone: string;
    alternate_phone: string;
    occupation: string;
    residential_address: string;
  }
): Promise<void> {
  const { error: profErr } = await supabase
    .from('profiles')
    .update({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      phone: input.phone.trim() || null,
    })
    .eq('id', profileId);

  if (profErr) throw new Error(profErr.message);

  const { data: existingParent } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (existingParent) {
    const { error: parErr } = await supabase
      .from('parents')
      .update({
        alternate_phone: input.alternate_phone.trim() || null,
        occupation: input.occupation.trim() || null,
        residential_address: input.residential_address.trim() || null,
      })
      .eq('profile_id', profileId);
    if (parErr) throw new Error(parErr.message);
  } else {
    const { error: insErr } = await supabase.from('parents').insert({
      profile_id: profileId,
      alternate_phone: input.alternate_phone.trim() || null,
      occupation: input.occupation.trim() || null,
      residential_address: input.residential_address.trim() || null,
    });
    if (insErr) throw new Error(insErr.message);
  }
}

export async function fetchParentApplicationPayments(
  supabase: SupabaseClient,
  profileId: string
): Promise<ApplicationPaymentWithChild[]> {
  const { data, error } = await supabase
    .from('application_payments')
    .select(`
      *,
      admission_applications (
        id,
        application_reference,
        child_first_name,
        child_last_name
      )
    `)
    .eq('payer_profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApplicationPaymentWithChild[];
}

export async function fetchParentAnnouncements(
  supabase: SupabaseClient
): Promise<DbAnnouncement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .in('audience', ['public', 'all', 'parents'])
    .order('published_at', { ascending: false })
    .limit(10);

  if (error) return [];
  return (data ?? []) as DbAnnouncement[];
}

export async function initializeApplicationFeeCheckout(
  clerkToken: string | null,
  applicationId: string,
  callbackUrl?: string
): Promise<
  | { ready: true; authorizationUrl: string; reference: string }
  | { ready: false; reason: string }
> {
  const res = await callVerifiedNetlifyEndpoint<{
    status?: string;
    authorizationUrl?: string;
    reference?: string;
  }>('/.netlify/functions/paystack-initialize', clerkToken, {
    method: 'POST',
    body: {
      applicationId,
      ...(callbackUrl ? { callbackUrl } : {}),
    },
  });

  if (res.ok && res.data.authorizationUrl && res.data.reference) {
    return {
      ready: true,
      authorizationUrl: res.data.authorizationUrl,
      reference: res.data.reference,
    };
  }

  if (!res.ok) {
    return {
      ready: false,
      reason:
        res.status === 404 || res.status === 0 || res.status === 503
          ? 'Online Paystack checkout is prepared and will go live in Phase 5 once the school connects its Paystack keys.'
          : res.error,
    };
  }

  return {
    ready: false,
    reason: 'Paystack checkout initialization is not yet active.',
  };
}


