import { describe, expect, it } from 'vitest';
import { rhythmInstruction } from './rhythmInstruction';
import { LEVELS } from '../constants/levels';

describe('rhythmInstruction', () => {
  it('Easy (one sign per gap) asks for two touching numbers only', () => {
    expect(rhythmInstruction(2, ['+', '-', '*'], 1)).toMatch(/^Tap two numbers that touch/);
  });

  it('keeps the first lessons simple', () => {
    expect(rhythmInstruction(2, ['+'])).toBe('Tap a number, a sign, then a number next to it.');
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
