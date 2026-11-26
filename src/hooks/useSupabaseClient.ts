import { useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createClerkSupabaseClient,
  createPublicSupabaseClient,
  isSupabaseConfigured,
} from '../lib/supabase';
import { useAppAuth } from '../context/AuthContext';

/**
 * Returns a Supabase client authenticated with the active Clerk session
 * when Clerk is configured and signed in, or null if Supabase is not configured.
 *
 * Must be used inside AppAuthProvider.
 */
export function useSupabaseClient(): {
  supabase: SupabaseClient | null;
  isSupabaseReady: boolean;
} {
  const { isConfigured: isClerkConfigured, isSignedIn } = useAppAuth();

  if (!isSupabaseConfigured()) {
    return { supabase: null, isSupabaseReady: false };
  }

  if (!isClerkConfigured || !isSignedIn) {
    // Public fallback client for unauthenticated/public reads only
    const publicClient = createPublicSupabaseClient();
    return { supabase: publicClient, isSupabaseReady: Boolean(publicClient) };
  }

  return { supabase: null, isSupabaseReady: true };
}

/**
 * Hook specifically for components rendered inside an active <ClerkProvider>.
 */
export function useClerkSupabaseClient(): {
  supabase: SupabaseClient | null;
  isSupabaseReady: boolean;
} {
  const { getToken, isSignedIn } = useAuth();
  const configured = isSupabaseConfigured();

  const supabase = useMemo(() => {
    if (!configured) return null;
    if (!isSignedIn) return createPublicSupabaseClient();
    return createClerkSupabaseClient(() => getToken());
  }, [configured, isSignedIn, getToken]);

  return {
    supabase,
    isSupabaseReady: Boolean(supabase),
  };
}
