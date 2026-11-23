/** Parse Supabase auth redirect errors from hash or query (magic link / OAuth failures). */
export function readSupabaseAuthErrorFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (hash.length > 0) {
      const fromHash = new URLSearchParams(hash);
      const msg = fromHash.get('error_description') || fromHash.get('error');
      if (msg) return decodeURIComponent(msg.replace(/\+/g, ' '));
    }
    const q = new URLSearchParams(window.location.search);
    const msgQ = q.get('error_description') || q.get('error');
    if (msgQ) return decodeURIComponent(msgQ.replace(/\+/g, ' '));
  } catch {
    return null;
  }
  return null;
}

/** Remove auth tokens / error params from the address bar after Supabase redirect handling. */
export function stripSupabaseAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.hash = '';
  for (const k of ['code', 'error', 'error_description', 'error_code']) {
    url.searchParams.delete(k);
  }
  const qs = url.searchParams.toString();
  const next = url.pathname + (qs ? `?${qs}` : '');
  window.history.replaceState(window.history.state, '', next);
}
