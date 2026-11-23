import { useEffect, useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase SDK is ~40% of the app's JavaScript, and guests never need it,
 * so it is loaded on demand (dynamic import → its own chunk). AuthProvider
 * starts the load at startup when Supabase is configured; screens read the
 * client with `useSupabase()` and re-render once it arrives.
 */

let cached: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | null = null;
const listeners = new Set<() => void>();

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.length > 0 && key.length > 0);
}

/** Load (once) and return the client; null when Supabase isn't configured. */
export function loadSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  if (cached) return Promise.resolve(cached);
  if (!loading) {
    loading = import('@supabase/supabase-js').then(({ createClient }) => {
      cached = createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Required for Google / Apple OAuth and email magic links: the auth server
            // redirects with ?code=… (PKCE). Implicit flow does not store a code verifier,
            // so the callback is ignored and users stay signed out after OAuth.
            flowType: 'pkce',
          },
        }
      );
      listeners.forEach((l) => l());
      return cached;
    });
    // Let a failed download (offline) be retried later.
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

/** The client if it has finished loading, otherwise null. For event handlers. */
export function getSupabase(): SupabaseClient | null {
  return cached;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The client for components: null until loaded, then re-renders with it. */
export function useSupabase(): SupabaseClient | null {
  const sb = useSyncExternalStore(subscribe, getSupabase, getSupabase);
  useEffect(() => {
    if (!sb) void loadSupabase();
  }, [sb]);
  return sb;
}
