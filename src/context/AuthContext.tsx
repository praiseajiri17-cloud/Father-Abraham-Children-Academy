import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClerkProvider, useAuth, useUser, useClerk } from '@clerk/react';
import {
  AppAuthContextValue,
  AuthenticatedUserProfile,
  AuthorizationState,
} from '../types/auth';
import { ClerkErrorBoundary } from '../components/auth/ClerkErrorBoundary';

const DEFAULT_AUTHORIZATION_STATE: AuthorizationState = {
  isVerified: false,
  verifiedRole: null,
  permissions: [],
  verificationSource: 'unconnected_phase_2',
};

const AppAuthContext = createContext<AppAuthContextValue>({
  isConfigured: false,
  isLoaded: true,
  isSignedIn: false,
  user: null,
  authError: null,
  authorization: DEFAULT_AUTHORIZATION_STATE,
  signOut: async () => {},
});

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

const ClerkStateBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, signOut: clerkSignOut } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

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

  const handleSignOut = useCallback(async () => {
    if (clerkSignOut) {
      await clerkSignOut({ redirectUrl: '/portal/login' });
    } else if (clerk) {
      await clerk.signOut({ redirectUrl: '/portal/login' });
    }
  }, [clerkSignOut, clerk]);

  const value = useMemo<AppAuthContextValue>(
    () => ({
      isConfigured: true,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      user: normalizedUser,
      authError: null,
      // Phase 2: Authorization remains strictly unconnected until Supabase verification (Phase 3)
      authorization: DEFAULT_AUTHORIZATION_STATE,
      signOut: handleSignOut,
    }),
    [isLoaded, isSignedIn, normalizedUser, handleSignOut]
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
};

export const AppAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  const hasValidKey = isValidPublishableKey(publishableKey);

  const unconfiguredValue = useMemo<AppAuthContextValue>(
    () => ({
      isConfigured: false,
      isLoaded: true,
      isSignedIn: false,
      user: null,
      authError: publishableKey
        ? 'The configured VITE_CLERK_PUBLISHABLE_KEY does not match the expected Clerk format (pk_test_... or pk_live_...).'
        : null,
      authorization: DEFAULT_AUTHORIZATION_STATE,
      signOut: async () => {},
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
            signOut: async () => {},
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
        afterSignOutUrl="/portal/login"
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
