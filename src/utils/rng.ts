/**
 * Tiny, dependency-free seeded RNG.
 *
 *   const rng = makeRng('puzzle-2026-05-10');
 *   rng();          // 0..1, deterministic
 *   rng.int(10);    // 0..9
 *   rng.pick(arr);  // a stable element
 *
 * Composition:
 *   - `xmur3(seed)` hashes a string into a 32-bit integer state.
 *   - `mulberry32(state)` is a 32-bit chaotic generator with a > 2^32 period —
 *     plenty for puzzle generation. It's *not* cryptographic; do not use it
 *     for anything security-sensitive.
 *
 * Why not `Math.random()`? We need every device to compute the same daily
 * puzzle from the same date, and we want puzzle authors to be able to lock a
 * puzzle in place by saving its seed.
 */

/** xmur3 string hash → 32-bit unsigned integer. Public-domain. */
const xmur3 = (str: string): number => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};

/** mulberry32 PRNG. Returns a function producing values in [0, 1). */
const mulberry32 = (a: number): (() => number) => {
  let state = a >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export interface SeededRng {
  /** Next float in [0, 1). */
  (): number;
  /** Next integer in [0, max). */
  int: (max: number) => number;
  /** Next integer in [min, max] inclusive. */
  intBetween: (min: number, max: number) => number;
  /** Pick a uniformly random element. */
  pick: <T>(arr: readonly T[]) => T;
  /** Fisher–Yates shuffle (returns a new array; does not mutate input). */
  shuffle: <T>(arr: readonly T[]) => T[];
}

/** Build a deterministic RNG from any string seed. */
/** Fisher–Yates shuffle using `Math.random()` (non-seeded). Use for runtime grids/targets. */
export const shuffleUniform = <T>(arr: readonly T[]): T[] => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const makeRng = (seed: string): SeededRng => {
  const state = xmur3(seed);
  const next = mulberry32(state);
  const rng = (() => next()) as SeededRng;
  rng.int = (max) => Math.floor(next() * max);
  rng.intBetween = (min, max) => min + Math.floor(next() * (max - min + 1));
  rng.pick = (arr) => {
    if (arr.length === 0) throw new Error('makeRng().pick called on empty array');
    return arr[Math.floor(next() * arr.length)];
  };
  rng.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return rng;
};
