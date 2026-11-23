/**
 * EPIC-29.03 — widen the pairing bracket when rating deviation (RD / φ) is high.
 * Used client-side for future multiplayer quick-match; puzzle fetch can reuse the same band.
 */
export function ratingDeviationMatchWindow(mu: number, rd: number): { min: number; max: number } {
  const halfWidth = 120 + rd * 0.35;
  return { min: mu - halfWidth, max: mu + halfWidth };
}
