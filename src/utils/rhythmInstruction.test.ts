import { describe, expect, it } from 'vitest';
import { rhythmInstruction } from './rhythmInstruction';
import { LEVELS } from '../constants/levels';

describe('rhythmInstruction', () => {
  it('spells out how many numbers and signs a longer path uses', () => {
    expect(rhythmInstruction(3, ['+'])).toBe(
      'Use three numbers in one row or column: tap number, sign, number, sign, number.'
    );
  });

  it('Easy (one sign per gap) still asks for the sign tap', () => {
    expect(rhythmInstruction(2, ['+', '-', '*'], 1)).toBe(
      'Tap a number, the sign next to it, then the number on the other side.'
    );
  });

  it('keeps the first lessons simple', () => {
    expect(rhythmInstruction(2, ['+'])).toMatch(/^Tap a number, pick one of the signs/);
  });

  it('only explains left-to-right order once × can be in a 3-number path', () => {
    expect(rhythmInstruction(3, ['+', '-'])).not.toMatch(/left to right/i);
    expect(rhythmInstruction(3, ['+', '-', '*'])).toMatch(/left to right/i);
  });

  it('no Learn level before Unit 4 mentions the order rule', () => {
    LEVELS.filter((l) => ['u1', 'u2', 'u3'].includes(l.unitId)).forEach((l) =>
      expect(rhythmInstruction(l.tilesCount, l.availableOperators), l.id).not.toMatch(
        /left to right/i
      )
    );
  });
});
