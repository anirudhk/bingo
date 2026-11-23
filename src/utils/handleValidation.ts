/** Handles that impersonate the product or staff (exact match). Server must re-check. */
const RESERVED_EXACT = new Set([
  'admin',
  'support',
  'official',
  'gridgenius',
  'grid_genius',
  'root',
  'system',
]);

/** Offensive substrings — block anywhere in handle. */
const BLOCKED_SUBSTRINGS = ['fuck', 'shit', 'nazi'];

const HANDLE_RE = /^[a-z][a-z0-9_]{2,31}$/;

export interface HandleValidationResult {
  ok: boolean;
  error?: string;
}

export function validateHandle(raw: string): HandleValidationResult {
  const handle = raw.trim().toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error: 'Use 3–32 chars: lowercase letters, numbers, underscore; start with a letter.',
    };
  }
  if (RESERVED_EXACT.has(handle)) {
    return { ok: false, error: 'This handle is reserved.' };
  }
  for (const bad of BLOCKED_SUBSTRINGS) {
    if (handle.includes(bad)) {
      return { ok: false, error: 'This handle is not allowed.' };
    }
  }
  return { ok: true };
}
