import { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuthBridgeInternal } from '../context/AuthContext';

/**
 * Returns the active Supabase client (authenticated with Clerk session token
 * when signed in, or public-read client otherwise) plus a Clerk token getter
 * for verified Netlify Function API calls.
 */
export function useSupabaseClient(): {
  supabase: SupabaseClient | null;
  isSupabaseReady: boolean;
  getClerkToken: () => Promise<string | null>;
} {
  const { supabaseClient, getClerkToken } = useAuthBridgeInternal();
  const configured = isSupabaseConfigured();

  return {
    supabase: configured ? supabaseClient : null,
    isSupabaseReady: configured && Boolean(supabaseClient),
    getClerkToken,
  };
}
