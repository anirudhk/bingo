/** Stable hash for anti-cheat heuristics (EPIC-41); not cryptographic proof. */
export async function timingFingerprint(parts: readonly string[]): Promise<string> {
  const enc = new TextEncoder().encode(parts.join('|'));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40);
}
