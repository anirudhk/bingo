import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels';

describe('Learn curriculum', () => {
  it('no level accepts a target of 0 (a − a would solve it with any pair)', () => {
    LEVELS.forEach((l) => expect(l.targetRange.min, l.id).toBeGreaterThanOrEqual(1));
  });
});
