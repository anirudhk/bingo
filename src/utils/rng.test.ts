import { describe, expect, it } from 'vitest';
import { makeRng } from './rng';

describe('makeRng', () => {
  it('is deterministic for identical seeds', () => {
    const a = makeRng('hello');
    const b = makeRng('hello');
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    const a = makeRng('alpha');
    const b = makeRng('beta');
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('keeps int() within [0, max)', () => {
    const r = makeRng('bounds');
    for (let i = 0; i < 1000; i++) {
      const v = r.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  it('keeps intBetween() within [min, max] inclusive on both ends', () => {
    const r = makeRng('between');
    let sawMin = false;
    let sawMax = false;
    for (let i = 0; i < 5000; i++) {
      const v = r.intBetween(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
      if (v === 3) sawMin = true;
      if (v === 5) sawMax = true;
    }
    expect(sawMin).toBe(true);
    expect(sawMax).toBe(true);
  });

  it('shuffle returns a new array of the same length and same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const out = makeRng('s').shuffle(input);
    expect(out).not.toBe(input);
    expect(out.length).toBe(input.length);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('pick throws on empty array', () => {
    const r = makeRng('p');
    expect(() => r.pick([])).toThrow();
  });

  it('values are in [0, 1)', () => {
    const r = makeRng('range');
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
