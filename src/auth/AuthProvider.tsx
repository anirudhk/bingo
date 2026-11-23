import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase/client';
import { AuthContext } from './authContext';
import {
  readSupabaseAuthErrorFromLocation,
  stripSupabaseAuthParamsFromUrl,
} from './authRedirectUrl';
import { mergeCloudProgressOnLogin, pushLocalProgressToCloud } from '../services/cloudProgress';
import { logger } from '../utils/logger';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [authRedirectError, setAuthRedirectError] = useState<string | null>(null);

  const clearAuthRedirectError = useCallback(() => setAuthRedirectError(null), []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    void sb.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error) logger.warn('getSession', error.message);

      setSession(data.session ?? null);
      setLoading(false);

      if (data.session?.user) {
        void mergeCloudProgressOnLogin(sb, data.session.user.id);
        stripSupabaseAuthParamsFromUrl();
      } else {
        const redirectErr = readSupabaseAuthErrorFromLocation();
        if (redirectErr) {
          setAuthRedirectError(redirectErr);
          stripSupabaseAuthParamsFromUrl();
        }
      }
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_IN' && next?.user) {
        try {
          sessionStorage.setItem('gg:authWelcome', '1');
        } catch {
          // ignore (private mode, etc.)
        }
        void mergeCloudProgressOnLogin(sb, next.user.id);
        void pushLocalProgressToCloud(sb, next.user.id);
        stripSupabaseAuthParamsFromUrl();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      authRedirectError,
      clearAuthRedirectError,
      signOut: async () => {
        const sb = getSupabase();
        if (sb) await sb.auth.signOut();
        setSession(null);
        setAuthRedirectError(null);
      },
    }),
    [session, loading, authRedirectError, clearAuthRedirectError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
