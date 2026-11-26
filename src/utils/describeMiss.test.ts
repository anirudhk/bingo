import { describe, expect, it } from 'vitest';
import { describeMiss } from './describeMiss';

describe('describeMiss', () => {
  it('says how many more are needed when the answer is too small', () => {
    expect(describeMiss(5, 9)).toBe('You need 4 more to make 9.');
  });
  it('says how many too many when the answer is too big', () => {
    expect(describeMiss(13, 9)).toBe("That's 4 too many — the target is 9.");
  });
  it('never shows a minus sign', () => {
    expect(describeMiss(-3, 2)).not.toMatch(/-\d/);
    expect(describeMiss(20, 2)).not.toMatch(/-\d/);
  });
});
