import { describe, expect, it } from 'vitest';
import { ratingDeviationMatchWindow } from './ratingMatchmaking';

describe('ratingDeviationMatchWindow', () => {
  it('widens when RD increases', () => {
    const narrow = ratingDeviationMatchWindow(1500, 50);
    const wide = ratingDeviationMatchWindow(1500, 350);
    expect(wide.max - wide.min).toBeGreaterThan(narrow.max - narrow.min);
  });

  it('is centered on mu', () => {
    const w = ratingDeviationMatchWindow(1600, 100);
    expect((w.min + w.max) / 2).toBeCloseTo(1600, 5);
  });
});
