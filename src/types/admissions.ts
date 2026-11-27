import {
  ApplicationStatus,
  DbAcademicSession,
  DbAdmissionApplication,
  DbAdmissionDocument,
  DbApplicationPayment,
  DbClassLevel,
  DbSchoolSection,
  PaymentStatus,
  PhysicalDocumentsStatus,
  SchoolSectionCode,
} from './database';

export interface AdmissionMedicalDetails {
  id?: string;
  application_id: string;
  blood_group: string | null;
  genotype: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  dietary_requirements: string | null;
  special_learning_needs: string | null;
  emergency_medical_notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdmissionStatusHistoryItem {
  id: string;
  application_id: string;
  event_type:
    | 'created'
    | 'submitted'
    | 'resubmitted'
    | 'payment_verified'
    | 'under_review'
    | 'correction_requested'
    | 'physical_docs_updated'
    | 'approved'
    | 'rejected'
    | 'reopened'
    | 'decision_overridden'
    | 'note_added';
  from_status: string | null;
  to_status: string | null;
  physical_documents_status: string | null;
  actor_profile_id: string | null;
  actor_role: string | null;
  notes: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface AdmissionNotification {
  id: string;
  application_id: string;
  recipient_profile_id: string;
  notification_type: string;
  title: string;
  message: string;
  delivery_status:
    | 'in_app_only'
    | 'email_queued_pending_provider'
    | 'email_sent'
    | 'email_failed';
  email_log_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AdmissionSettingsConfig {
  admissions_open: boolean;
  current_session_label: string;
  application_fee_configured: boolean;
  application_fee_kobo: number | null;
  currency: 'NGN';
  physical_submission_instructions?: string;
}

export interface AdmissionReferenceLookups {
  sections: DbSchoolSection[];
  classLevels: DbClassLevel[];
  sessions: DbAcademicSession[];
  admissionSettings: AdmissionSettingsConfig | null;
}

export interface AdmissionApplicationExpanded extends DbAdmissionApplication {
  school_sections?: Pick<DbSchoolSection, 'id' | 'code' | 'name'> | null;
  class_levels?: Pick<DbClassLevel, 'id' | 'code' | 'name'> | null;
  academic_sessions?: Pick<DbAcademicSession, 'id' | 'name' | 'is_current'> | null;
  medical_details?: AdmissionMedicalDetails | null;
  documents?: DbAdmissionDocument[];
}

export interface ApplicationPaymentWithChild extends DbApplicationPayment {
  admission_applications?: {
    id: string;
    application_reference: string;
    child_first_name: string;
    child_last_name: string;
  } | null;
}

export interface ParentWorkspaceProfile {
  profileId: string;
  parentId: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  alternate_phone: string;
  occupation: string;
  residential_address: string;
}

export interface AdmissionFormInput {
  id?: string;
  // Section A: Child Information
  child_first_name: string;
  child_middle_name: string;
  child_last_name: string;
  child_date_of_birth: string;
  child_gender: 'male' | 'female';
  child_nationality: string;
  child_state_of_origin: string;
  child_lga: string;
  intended_section_id: string;
  intended_class_level_id: string;
  intended_session_id: string;
  passport_photo_path: string;
  // Section B: Parent / Guardian Information
  parent_full_name: string;
  parent_relationship: string;
  parent_email: string;
  parent_phone: string;
  parent_alternate_phone: string;
  residential_address: string;
  parent_occupation: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  // Section C: Previous School Information
  is_first_time_schooling: boolean;
  previous_school_name: string;
  previous_class: string;
  previous_school_address: string;
  reason_for_leaving: string;
  // Section D: Additional & Medical Information
  additional_details: string;
  blood_group: string;
  genotype: string;
  allergies: string;
  chronic_conditions: string;
  dietary_requirements: string;
  special_learning_needs: string;
  emergency_medical_notes: string;
  // Section E: Review & Declaration
  declaration_accepted: boolean;
  declaration_signer_name: string;
}

export interface AdmissionFilters {
  search: string;
  sectionCode: SchoolSectionCode | 'all';
  classLevelId: string;
  sessionId: string;
  applicationStatus: ApplicationStatus | 'all';
  paymentStatus: PaymentStatus | 'all';
  physicalDocumentsStatus: PhysicalDocumentsStatus | 'all';
}

export interface AdmissionSummaryMetrics {
  totalApplications: number;
  draftApplications: number;
  newSubmissions: number;
  awaitingReview: number;
  awaitingPhysicalDocuments: number;
  incompleteDocuments: number;
  correctionsRequested: number;
  approvedApplications: number;
  rejectedApplications: number;
}

export const PHYSICAL_DOCUMENT_CHECKLIST_ITEMS: string[] = [
  'Signed Printed Official A4 Application Form',
  '2 Recent Passport Photographs of Child',
  'Photocopy of Birth Certificate / Age Declaration',
  'Immunization / Health Record (especially Creche & Primary 1)',
  'Last Academic Report Card / Transfer Certificate (if applicable)',
  'Parent / Guardian Valid Means of Identification',
];

export const APPLICATION_STATUS_META: Record<
  ApplicationStatus,
  { label: string; badgeClass: string; description: string }
> = {
  draft: {
    label: 'Draft (Not Submitted)',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Saved in progress. Complete all required sections and submit when ready.',
  },
  submitted: {
    label: 'Submitted',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    description: 'Application submitted online. Check payment status and physical submission steps.',
  },
  pending: {
    label: 'Submitted / Pending Review',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    description: 'Application received and awaiting initial admission desk review.',
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Currently being reviewed by the Admissions Office.',
  },
  correction_requested: {
    label: 'Correction Required',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    description: 'Please inspect the admissions officer note, update details, and resubmit.',
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description: 'Admission application approved. Follow onboarding instructions from the school.',
  },
  rejected: {
    label: 'Not Approved',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
    description: 'Application was not approved for the selected intake.',
  },
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; badgeClass: string }
> = {
  unpaid: {
    label: 'Awaiting Application Payment',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  pending: {
    label: 'Payment Verification Pending',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  paid: {
    label: 'Payment Confirmed',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  failed: {
    label: 'Payment Failed',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
  },
  refunded: {
    label: 'Refunded',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
  },
};

export const PHYSICAL_DOCS_STATUS_META: Record<
  PhysicalDocumentsStatus,
  { label: string; badgeClass: string }
> = {
  not_submitted: {
    label: 'Awaiting Physical Documents',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  received: {
    label: 'Documents Received',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  under_review: {
    label: 'Documents Under Review',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  incomplete: {
    label: 'Incomplete Documents',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  complete: {
    label: 'Complete & Verified',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};
