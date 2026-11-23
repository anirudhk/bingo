import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Signed in anonymously (Supabase anonymous sign-in): multiplayer only, unrated. */
  isGuest: boolean;
  /** Start a guest session for multiplayer. Resolves to an error message, or null on success. */
  signInAsGuest: () => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Magic-link/OAuth redirect returned an error in the URL (e.g. expired link). */
  authRedirectError: string | null;
  clearAuthRedirectError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** Safe for optional cloud features when AuthProvider is absent (tests). */
export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}
