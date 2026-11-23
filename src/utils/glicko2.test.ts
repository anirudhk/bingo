import { describe, expect, it } from 'vitest';
import { dailyOutcome, updateAfterMatch } from './glicko2';

describe('glicko2 wrapper', () => {
  it('updates player upward after a win vs weaker opponent', () => {
    const next = updateAfterMatch(
      { rating: 1500, rd: 350, vol: 0.06 },
      { rating: 1400, rd: 350, vol: 0.06 },
      1
    );
    expect(next.rating).toBeGreaterThan(1500);
    expect(next.rd).toBeLessThan(350);
  });

  it('maps daily wrong attempts to outcomes', () => {
    expect(dailyOutcome(0)).toBe(1);
    expect(dailyOutcome(1)).toBe(0.5);
    expect(dailyOutcome(3)).toBe(0);
  });
});
