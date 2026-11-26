import { SystemRole } from './auth';

export type SchoolSectionCode = 'creche' | 'primary' | 'secondary';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'under_review'
  | 'correction_requested'
  | 'approved'
  | 'rejected';

export type PhysicalDocumentsStatus =
  | 'not_submitted'
  | 'received'
  | 'under_review'
  | 'complete'
  | 'incomplete';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type VerificationStatus = 'pending' | 'verified' | 'revoked';

export type ResultSubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'published';

export type InvoiceStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'paid'
  | 'cancelled'
  | 'void';

export interface DbProfile {
  id: string;
  clerk_user_id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  account_status: 'active' | 'suspended' | 'deactivated';
  created_at: string;
  updated_at: string;
}

export interface DbRole {
  id: string;
  code: SystemRole;
  name: string;
  description: string;
  is_staff_role: boolean;
}

export interface DbSchoolSection {
  id: string;
  code: SchoolSectionCode;
  name: string;
  description: string;
  portal_academics_enabled: boolean;
  sort_order: number;
}

export interface DbClassLevel {
  id: string;
  school_section_id: string;
  code: string;
  name: string;
  sequence_order: number;
  is_active: boolean;
}

export interface DbAcademicSession {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface DbStudent {
  id: string;
  admission_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  school_section_id: string;
  current_class_level_id: string | null;
  passport_photo_path: string | null;
  enrollment_status: 'active' | 'graduated' | 'transferred' | 'withdrawn' | 'suspended';
  admitted_at: string;
  academic_portal_eligible: boolean;
}

export interface DbAdmissionApplication {
  id: string;
  application_reference: string;
  applicant_profile_id: string;
  parent_id: string | null;
  child_first_name: string;
  child_middle_name: string | null;
  child_last_name: string;
  child_date_of_birth: string;
  child_gender: 'male' | 'female';
  child_nationality: string | null;
  child_state_of_origin: string | null;
  child_lga: string | null;
  passport_photo_path: string | null;
  previous_school: string | null;
  previous_school_name: string | null;
  previous_class: string | null;
  previous_school_address: string | null;
  is_first_time_schooling: boolean;
  intended_section_id: string;
  intended_class_level_id: string;
  intended_session_id: string;
  parent_full_name: string | null;
  parent_relationship: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  parent_alternate_phone: string | null;
  residential_address: string | null;
  parent_occupation: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  additional_details: string | null;
  declaration_accepted: boolean;
  declaration_accepted_at: string | null;
  declaration_signer_name: string | null;
  submitted_at: string | null;
  application_status: ApplicationStatus;
  payment_status: PaymentStatus;
  application_fee_kobo: number | null;
  paid_at: string | null;
  payment_reference: string | null;
  physical_documents_submitted: boolean;
  physical_documents_status: PhysicalDocumentsStatus;
  physical_documents_received_at: string | null;
  physical_documents_received_by_name: string | null;
  physical_documents_verified_by: string | null;
  physical_documents_verified_at: string | null;
  physical_documents_notes: string | null;
  physical_documents_received_list: string[];
  physical_documents_missing_list: string[];
  reviewer_notes: string | null;
  correction_notes: string | null;
  reviewed_by_profile_id: string | null;
  reviewed_at: string | null;
  decision_overridden_by_profile_id: string | null;
  decision_overridden_at: string | null;
  enrolled_student_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbInvoice {
  id: string;
  invoice_number: string;
  student_id: string;
  academic_session_id: string;
  term_id: string;
  currency: 'NGN';
  total_amount_kobo: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
}

export interface DbAuditLog {
  id: string;
  actor_profile_id: string | null;
  actor_clerk_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}
