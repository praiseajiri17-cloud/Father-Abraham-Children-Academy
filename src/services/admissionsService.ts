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
} from '../types/admissions';
import {
  ApplicationStatus,
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

  const basePayload = {
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
    const { data: updated, error: updateErr } = await supabase
      .from('admission_applications')
      .update(basePayload)
      .eq('id', input.id)
      .eq('applicant_profile_id', profileId)
      .select('id')
      .single();

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

    const { data: inserted, error: insertErr } = await supabase
      .from('admission_applications')
      .insert({
        ...basePayload,
        application_reference: appRef,
        applicant_profile_id: profileId,
        parent_id: resolvedParentId,
        payment_status: 'unpaid',
        application_fee_kobo:
          typeof configuredFeeKobo === 'number' && configuredFeeKobo > 0 ? configuredFeeKobo : null,
        physical_documents_submitted: false,
        physical_documents_status: 'not_submitted',
      })
      .select('id')
      .single();

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
  clerkToken: string | null,
  params: {
    action: 'assign_role' | 'revoke_role';
    targetEmail: string;
    roleCode: string;
    jobTitle?: string;
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
      notes: params.notes,
    },
  });

  if (!fnRes.ok) {
    throw new Error(fnRes.error);
  }
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
