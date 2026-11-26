/**
 * Proposed system roles for Father Abraham Children Academy.
 *
 * SECURITY BOUNDARY:
 * These roles are authoritative only when verified server-side via Supabase
 * in Phase 3+. Frontend state, localStorage, URL parameters, or email domain
 * patterns must NEVER be treated as proof of authorization.
 */
export type SystemRole =
  | 'general_admin'
  | 'parent'
  | 'teacher'
  | 'admission_officer'
  | 'principal'
  | 'finance_officer'
  | 'secretary';

export interface SystemRoleDefinition {
  role: SystemRole;
  label: string;
  category: 'leadership' | 'staff' | 'family';
  description: string;
  portalPath: string;
  selfRegistrationAllowed: boolean;
  provisioningMethod: string;
}

export interface AuthenticatedUserProfile {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
}

/**
 * Authentication state answers: "Who has signed in?"
 * Managed exclusively by Clerk.
 */
export interface AuthenticationState {
  isConfigured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthenticatedUserProfile | null;
  authError: string | null;
}

/**
 * Authorization state answers: "What is this person permitted to do?"
 * Kept strictly separate from authentication.
 * In Phase 2, authoritative verification is not yet connected to Supabase,
 * so verifiedRole remains null and isVerified remains false.
 */
export interface AuthorizationState {
  isVerified: boolean;
  verifiedRole: SystemRole | null;
  permissions: string[];
  verificationSource: 'unconnected_phase_2' | 'supabase_verified';
}

export interface AppAuthContextValue extends AuthenticationState {
  authorization: AuthorizationState;
  signOut: () => Promise<void>;
}
