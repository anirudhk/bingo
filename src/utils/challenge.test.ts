import { describe, expect, it } from 'vitest';
import { challengeShareText, decodeChallenge, encodeChallenge, type Challenge } from './challenge';

const c: Challenge = {
  v: 1,
  mode: 'classic',
  difficulty: 'hard',
  seed: 'abc123xyz',
  timeMs: 42_400,
};

describe('challenge links', () => {
  it('round-trips through the link payload', () => {
    expect(decodeChallenge(encodeChallenge(c))).toEqual({ ...c, timeMs: 42_400 });
    const q = { ...c, mode: 'quickGame' as const, difficulty: 'easy' as const };
    expect(decodeChallenge(encodeChallenge(q))).toEqual(q);
  });

  it('keeps links short', () => {
    expect(encodeChallenge(c).length).toBeLessThan(48);
  });

  it('rejects damaged or tampered links', () => {
    expect(decodeChallenge('not-a-link')).toBeNull();
    expect(decodeChallenge(encodeChallenge({ ...c, timeMs: -5 }))).toBeNull();
    expect(decodeChallenge(encodeChallenge({ ...c, seed: '<script>' }))).toBeNull();
    expect(decodeChallenge(btoa(JSON.stringify([2, 'c', 'h', 'abc123', 1000])))).toBeNull();
  });

  it('share text has the time and a working link', () => {
    const text = challengeShareText(c);
    expect(text).toContain('Classic · Hard');
    expect(text).toContain('0:42');
    const payload = text.split('/challenge/')[1].trim();
    expect(decodeChallenge(payload)?.seed).toBe('abc123xyz');
  });
});
