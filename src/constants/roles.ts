import { SystemRole, SystemRoleDefinition } from '../types/auth';

/**
 * Official system roles planned for Father Abraham Children Academy.
 * Only 'parent' supports self-registration via /portal/register.
 * All staff and administrative roles require authorized backend provisioning.
 */
export const SYSTEM_ROLE_DEFINITIONS: Record<SystemRole, SystemRoleDefinition> = {
  general_admin: {
    role: 'general_admin',
    label: 'General Administrator (School Owner)',
    category: 'leadership',
    description:
      'Executive oversight of school operations, staff provisioning, institutional configuration, and system governance.',
    portalPath: '/portal/admin',
    selfRegistrationAllowed: false,
    provisioningMethod: 'Controlled initial owner setup & backend verification',
  },
  principal: {
    role: 'principal',
    label: 'Principal / Head of School',
    category: 'leadership',
    description:
      'Academic supervision, curriculum oversight, staff coordination, and student discipline management.',
    portalPath: '/portal/admin',
    selfRegistrationAllowed: false,
    provisioningMethod: 'Invited & verified by General Administrator',
  },
  admission_officer: {
    role: 'admission_officer',
    label: 'Admission Officer',
    category: 'staff',
    description:
      'Review prospective student applications, schedule entrance assessments, and manage enrollment onboarding.',
    portalPath: '/portal/admin',
    selfRegistrationAllowed: false,
    provisioningMethod: 'Invited & verified by General Administrator',
  },
  finance_officer: {
    role: 'finance_officer',
    label: 'Finance Officer / Bursar',
    category: 'staff',
    description:
      'Tuition invoicing, Nigerian Naira (Paystack) payment reconciliation, and institutional financial reporting.',
    portalPath: '/portal/admin',
    selfRegistrationAllowed: false,
    provisioningMethod: 'Invited & verified by General Administrator',
  },
  secretary: {
    role: 'secretary',
    label: 'School Secretary',
    category: 'staff',
    description:
      'Front-desk communications, official circulars, student documentation, and administrative record keeping.',
    portalPath: '/portal/admin',
    selfRegistrationAllowed: false,
    provisioningMethod: 'Invited & verified by General Administrator',
  },
  teacher: {
    role: 'teacher',
    label: 'Teacher / Caregiver',
    category: 'staff',
    description:
      'Class attendance, continuous assessment scoring, lesson resources, and academic progress updates.',
    portalPath: '/portal/teacher',
    selfRegistrationAllowed: false,
    provisioningMethod: 'Invited & verified by General Administrator',
  },
  parent: {
    role: 'parent',
    label: 'Parent / Guardian',
    category: 'family',
    description:
      'Monitor ward progress, view attendance & fee receipts, and receive official academy announcements.',
    portalPath: '/portal/parent',
    selfRegistrationAllowed: true,
    provisioningMethod: 'Self-registration enabled (linked to ward records in Phase 3)',
  },
};

export const ALL_SYSTEM_ROLES: SystemRoleDefinition[] = Object.values(SYSTEM_ROLE_DEFINITIONS);
