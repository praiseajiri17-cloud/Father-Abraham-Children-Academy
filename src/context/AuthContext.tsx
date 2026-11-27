import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClerkProvider, useAuth, useUser, useClerk } from '@clerk/react';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  AppAuthContextValue,
  AuthenticatedUserProfile,
  AuthorizationState,
  SystemRole,
} from '../types/auth';
import { ClerkErrorBoundary } from '../components/auth/ClerkErrorBoundary';
import {
  createClerkSupabaseClient,
  createPublicSupabaseClient,
  isSupabaseConfigured,
} from '../lib/supabase';

const DEFAULT_AUTHORIZATION_STATE: AuthorizationState = {
  isVerified: false,
  isChecking: false,
  profileId: null,
  verifiedRole: null,
  allRoles: [],
  permissions: [],
  verificationSource: isSupabaseConfigured() ? 'supabase_unconfigured' : 'unconnected_phase_2',
  verificationError: null,
  diagnosticError: null,
};

interface InternalAuthBridgeValue extends AppAuthContextValue {
  supabaseClient: SupabaseClient | null;
  getClerkToken: () => Promise<string | null>;
}

const AppAuthContext = createContext<InternalAuthBridgeValue>({
  isConfigured: false,
  isLoaded: true,
  isSignedIn: false,
  user: null,
  authError: null,
  authorization: DEFAULT_AUTHORIZATION_STATE,
  refreshAuthorization: async () => {},
  signOut: async () => {},
  supabaseClient: null,
  getClerkToken: async () => null,
});

const ROLE_PRECEDENCE: SystemRole[] = [
  'general_admin',
  'principal',
  'admission_officer',
  'finance_officer',
  'secretary',
  'teacher',
  'parent',
];

/**
 * Shared Clerk UI appearance matching Father Abraham Children Academy branding.
 */
export const academyClerkAppearance = {
  variables: {
    colorPrimary: '#102B46',
    colorText: '#091C30',
    colorTextSecondary: '#64748B',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#091C30',
    colorDanger: '#DC2626',
    colorSuccess: '#15803D',
    borderRadius: '0.75rem',
    fontFamily: "'Inter', sans-serif",
  },
  elements: {
    card: 'shadow-none border border-slate-200 rounded-2xl',
    headerTitle: "font-['Manrope',sans-serif] text-[#102B46] font-extrabold",
    headerSubtitle: 'text-slate-600 text-sm',
    formButtonPrimary:
      'bg-[#102B46] hover:bg-[#091C30] text-white font-bold rounded-xl shadow-sm transition-colors',
    footerActionLink: 'text-[#102B46] hover:text-[#D9B76A] font-bold',
    formFieldInput:
      'rounded-xl border-slate-300 focus:border-[#102B46] focus:ring-[#102B46]',
    identityPreviewEditButton: 'text-[#102B46] hover:text-[#D9B76A]',
  },
};

function isValidPublishableKey(key: string | undefined): key is string {
  if (!key) return false;
  const trimmed = key.trim();
  return /^pk_(test|live)_[A-Za-z0-9_-]{10,}$/.test(trimmed);
}

function formatDiagnosticError(rawMsg: string): string {
  const lower = rawMsg.toLowerCase();
  if (lower.includes('no suitable key') || lower.includes('wrong key type') || lower.includes('pgrst301')) {
    return 'Supabase rejected the Clerk session JWT ("No suitable key or wrong key type"). Enable Clerk as a Third-Party Auth provider in Supabase Dashboard -> Authentication -> Third-Party Auth using your Clerk domain, and activate the Supabase integration in Clerk Dashboard.';
  }
  if (lower.includes('permission denied') || lower.includes('ensure_parent_onboarding') || lower.includes('pgrst205')) {
    return `Database privileges or schema objects are pending initialization (${rawMsg}).`;
  }
  return rawMsg;
}

const ClerkStateBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken, signOut: clerkSignOut } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const supabaseConfigured = isSupabaseConfigured();

  const normalizedUser: AuthenticatedUserProfile | null = useMemo(() => {
    if (!isSignedIn || !user) return null;
    return {
      id: user.id,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      primaryEmail: user.primaryEmailAddress?.emailAddress ?? null,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt ?? null,
    };
  }, [isSignedIn, user]);

  const supabaseClient = useMemo(() => {
    if (!supabaseConfigured) return null;
    if (!isSignedIn) return createPublicSupabaseClient();
    return createClerkSupabaseClient(() => getToken());
  }, [supabaseConfigured, isSignedIn, getToken]);

  const [authorization, setAuthorization] = useState<AuthorizationState>(DEFAULT_AUTHORIZATION_STATE);

  const resolveAuthorization = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn || !normalizedUser) {
      setAuthorization({
        ...DEFAULT_AUTHORIZATION_STATE,
        verificationSource: supabaseConfigured ? 'supabase_verified' : 'supabase_unconfigured',
      });
      return;
    }

    if (!supabaseConfigured || !supabaseClient) {
      setAuthorization({
        isVerified: false,
        isChecking: false,
        profileId: null,
        verifiedRole: null,
        allRoles: [],
        permissions: [],
        verificationSource: 'supabase_unconfigured',
        verificationError: 'Portal access verification is currently unavailable.',
        diagnosticError: 'Supabase public client configuration is missing.',
      });
      return;
    }

    setAuthorization((prev) => ({
      ...prev,
      isChecking: true,
      verificationError: null,
      diagnosticError: null,
    }));

    try {
      // Ensure Clerk session token is actually issued before hitting Supabase PostgREST
      const activeToken = await getToken();
      if (!activeToken) {
        setAuthorization({
          isVerified: false,
          isChecking: false,
          profileId: null,
          verifiedRole: null,
          allRoles: [],
          permissions: [],
          verificationSource: 'supabase_verified',
          verificationError: 'Your session is still initializing. Please try refreshing.',
          diagnosticError: 'Clerk getToken() returned null for an active session.',
        });
        return;
      }

      // 1. Lookup authoritative profile in Supabase (matching Clerk user ID)
      let { data: profile, error: profileErr } = await supabaseClient
        .from('profiles')
        .select('id, account_status')
        .eq('clerk_user_id', normalizedUser.id)
        .maybeSingle();

      if (profileErr) {
        throw new Error(profileErr.message);
      }

      // 2. If profile does not exist yet, initialize safe parent onboarding via RPC
      //    (ensure_parent_onboarding NEVER grants staff or admin roles)
      if (!profile) {
        const { data: onboarded, error: rpcErr } = await supabaseClient.rpc(
          'ensure_parent_onboarding',
          {
            p_email: normalizedUser.primaryEmail,
            p_first_name: normalizedUser.firstName ?? '',
            p_last_name: normalizedUser.lastName ?? '',
            p_phone: null,
          }
        );

        if (rpcErr) {
          // Graceful fallback: try direct self-insert permitted by profiles_insert_self + parents_insert_self
          const { data: insertedProfile, error: insertProfErr } = await supabaseClient
            .from('profiles')
            .insert({
              clerk_user_id: normalizedUser.id,
              email: normalizedUser.primaryEmail,
              first_name: normalizedUser.firstName || 'Parent',
              last_name: normalizedUser.lastName || 'Guardian',
              avatar_url: normalizedUser.imageUrl,
            })
            .select('id, account_status')
            .single();

          if (insertProfErr) {
            throw new Error(rpcErr.message || insertProfErr.message);
          }
          profile = insertedProfile;
          await supabaseClient.from('parents').insert({ profile_id: insertedProfile.id });
        } else if (Array.isArray(onboarded) && onboarded[0]?.profile_id) {
          profile = { id: onboarded[0].profile_id, account_status: 'active' };
        }
      }

      if (!profile || profile.account_status !== 'active') {
        setAuthorization({
          isVerified: false,
          isChecking: false,
          profileId: profile?.id ?? null,
          verifiedRole: null,
          allRoles: [],
          permissions: [],
          verificationSource: 'supabase_verified',
          verificationError:
            profile?.account_status && profile.account_status !== 'active'
              ? 'Your school portal account is currently inactive. Please contact school administration.'
              : 'Your account verification is pending.',
          diagnosticError: profile?.account_status
            ? `Profile status: ${profile.account_status}`
            : 'Profile row could not be resolved.',
        });
        return;
      }

      // 3. Check authoritative staff roles
      const { data: staffRow, error: staffErr } = await supabaseClient
        .from('staff')
        .select('id, employment_status')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (staffErr) {
        throw new Error(staffErr.message);
      }

      const rolesSet = new Set<SystemRole>();
      const permsSet = new Set<string>();

      if (staffRow && staffRow.employment_status === 'active') {
        const { data: staffRoles, error: srErr } = await supabaseClient
          .from('staff_roles')
          .select(`
            is_active,
            roles!inner (
              code,
              role_permissions (
                permissions ( code )
              )
            )
          `)
          .eq('staff_id', staffRow.id)
          .eq('is_active', true);

        if (srErr) {
          throw new Error(srErr.message);
        }

        if (Array.isArray(staffRoles)) {
          for (const item of staffRoles) {
            const roleObj = item.roles as unknown as {
              code?: SystemRole;
              role_permissions?: Array<{ permissions?: { code?: string } | null }>;
            } | null;
            if (roleObj?.code) {
              rolesSet.add(roleObj.code);
            }
            if (Array.isArray(roleObj?.role_permissions)) {
              for (const rp of roleObj.role_permissions) {
                if (rp.permissions?.code) {
                  permsSet.add(rp.permissions.code);
                }
              }
            }
          }
        }
      }

      // 4. Check parent record
      const { data: parentRow } = await supabaseClient
        .from('parents')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (parentRow) {
        rolesSet.add('parent');
      }

      const allRoles = ROLE_PRECEDENCE.filter((r) => rolesSet.has(r));
      const primaryRole = allRoles[0] ?? null;

      setAuthorization({
        isVerified: allRoles.length > 0,
        isChecking: false,
        profileId: profile.id,
        verifiedRole: primaryRole,
        allRoles,
        permissions: Array.from(permsSet),
        verificationSource: 'supabase_verified',
        verificationError:
          allRoles.length === 0 ? 'No active institutional role is assigned to this account yet.' : null,
        diagnosticError: null,
      });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Authorization lookup failed.';
      const diagnostic = formatDiagnosticError(rawMsg);

      if (import.meta.env.DEV) {
        console.warn('[Portal Authorization Diagnostic]:', diagnostic);
      }

      setAuthorization({
        isVerified: false,
        isChecking: false,
        profileId: null,
        verifiedRole: null,
        allRoles: [],
        permissions: [],
        verificationSource: 'supabase_verified',
        verificationError:
          'Your account sign-in succeeded, and portal access verification is currently pending.',
        diagnosticError: diagnostic,
      });
    }
  }, [isLoaded, isSignedIn, normalizedUser, supabaseConfigured, supabaseClient, getToken]);

  useEffect(() => {
    void resolveAuthorization();
  }, [resolveAuthorization]);

  const handleSignOut = useCallback(async () => {
    if (clerkSignOut) {
      await clerkSignOut({ redirectUrl: '/portal' });
    } else if (clerk) {
      await clerk.signOut({ redirectUrl: '/portal' });
    }
  }, [clerkSignOut, clerk]);

  const getClerkToken = useCallback(async () => {
    try {
      return (await getToken()) ?? null;
    } catch {
      return null;
    }
  }, [getToken]);

  const value = useMemo<InternalAuthBridgeValue>(
    () => ({
      isConfigured: true,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      user: normalizedUser,
      authError: null,
      authorization,
      refreshAuthorization: resolveAuthorization,
      signOut: handleSignOut,
      supabaseClient,
      getClerkToken,
    }),
    [
      isLoaded,
      isSignedIn,
      normalizedUser,
      authorization,
      resolveAuthorization,
      handleSignOut,
      supabaseClient,
      getClerkToken,
    ]
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
};

export const AppAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  const hasValidKey = isValidPublishableKey(publishableKey);

  const unconfiguredValue = useMemo<InternalAuthBridgeValue>(
    () => ({
      isConfigured: false,
      isLoaded: true,
      isSignedIn: false,
      user: null,
      authError: publishableKey
        ? 'Portal authentication configuration is incomplete.'
        : null,
      authorization: DEFAULT_AUTHORIZATION_STATE,
      refreshAuthorization: async () => {},
      signOut: async () => {},
      supabaseClient: createPublicSupabaseClient(),
      getClerkToken: async () => null,
    }),
    [publishableKey]
  );

  if (!hasValidKey) {
    return (
      <AppAuthContext.Provider value={unconfiguredValue}>
        {children}
      </AppAuthContext.Provider>
    );
  }

  return (
    <ClerkErrorBoundary
      fallback={(errorMessage) => (
        <AppAuthContext.Provider
          value={{
            isConfigured: false,
            isLoaded: true,
            isSignedIn: false,
            user: null,
            authError: errorMessage,
            authorization: DEFAULT_AUTHORIZATION_STATE,
            refreshAuthorization: async () => {},
            signOut: async () => {},
            supabaseClient: createPublicSupabaseClient(),
            getClerkToken: async () => null,
          }}
        >
          {children}
        </AppAuthContext.Provider>
      )}
    >
      <ClerkProvider
        publishableKey={publishableKey}
        routerPush={(to) => navigate(to)}
        routerReplace={(to) => navigate(to, { replace: true })}
        signInUrl="/portal/login"
        signUpUrl="/portal/register"
        signInFallbackRedirectUrl="/portal"
        signUpFallbackRedirectUrl="/portal"
        afterSignOutUrl="/portal"
        appearance={academyClerkAppearance}
      >
        <ClerkStateBridge>{children}</ClerkStateBridge>
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
};

export function useAppAuth(): AppAuthContextValue {
  return useContext(AppAuthContext);
}

export function useAuthBridgeInternal(): InternalAuthBridgeValue {
  return useContext(AppAuthContext);
}
