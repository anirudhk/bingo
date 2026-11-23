import { describe, expect, it } from 'vitest';
import type { Tile } from '../types/game';
import {
  calculateResult,
  calculatePathResult,
  isValidPath,
  getTilesBetween,
  formatCalculation,
  formatCalculationGrouped,
} from './calculator';

const tile = (id: number, row: number, col: number, value: number): Tile => ({
  id,
  value,
  position: { row, col },
});

describe('calculateResult', () => {
  it('evaluates left-to-right with no operator precedence', () => {
    // 2 + 3 * 4 with precedence would be 14; left-to-right gives 20.
    expect(calculateResult(2, '+', 3, '*', 4)).toBe(20);
  });

  it('handles all three operators in mixed combinations', () => {
    expect(calculateResult(10, '-', 4, '+', 1)).toBe(7);
    expect(calculateResult(5, '*', 2, '-', 3)).toBe(7);
    expect(calculateResult(1, '+', 1, '+', 1)).toBe(3);
  });

  it('throws on an unknown first operator', () => {
    expect(() => calculateResult(1, '?', 2, '+', 3)).toThrow(/Invalid operator/);
  });

  it('throws on an unknown second operator', () => {
    expect(() => calculateResult(1, '+', 2, '?', 3)).toThrow(/Invalid operator/);
  });
});

describe('calculatePathResult', () => {
  const a = tile(0, 0, 0, 5);
  const b = tile(1, 0, 1, 3);
  const c = tile(2, 0, 2, 2);

  it('returns null when tile/operator counts mismatch', () => {
    expect(calculatePathResult([a, b], [])).toBeNull();
    expect(calculatePathResult([a], ['+'])).toBeNull();
    expect(calculatePathResult([a, b, c], ['+'])).toBeNull();
  });

  it('computes 2-tile / 1-op paths correctly', () => {
    expect(calculatePathResult([a, b], ['+'])).toBe(8);
    expect(calculatePathResult([a, b], ['-'])).toBe(2);
    expect(calculatePathResult([a, b], ['*'])).toBe(15);
  });

  it('computes 3-tile / 2-op paths left-to-right', () => {
    // 5 + 3 * 2 = 16 (left-to-right), not 11
    expect(calculatePathResult([a, b, c], ['+', '*'])).toBe(16);
    expect(calculatePathResult([a, b, c], ['-', '+'])).toBe(4);
  });

  it('returns null for unknown operator in 2-tile path', () => {
    expect(calculatePathResult([a, b], ['?'])).toBeNull();
  });

  it('returns null for unsupported lengths (>3 tiles)', () => {
    const d = tile(3, 0, 3, 1);
    expect(calculatePathResult([a, b, c, d], ['+', '+', '+'])).toBeNull();
  });
});

describe('isValidPath', () => {
  it('rejects paths shorter than 2 tiles', () => {
    expect(isValidPath([])).toBe(false);
    expect(isValidPath([tile(0, 0, 0, 1)])).toBe(false);
  });

  it('accepts adjacent horizontal pairs', () => {
    expect(isValidPath([tile(0, 0, 0, 1), tile(1, 0, 1, 2)])).toBe(true);
  });

  it('accepts adjacent vertical pairs', () => {
    expect(isValidPath([tile(0, 0, 0, 1), tile(1, 1, 0, 2)])).toBe(true);
  });

  it('rejects diagonal moves', () => {
    expect(isValidPath([tile(0, 0, 0, 1), tile(1, 1, 1, 2)])).toBe(false);
  });

  it('rejects gaps in the path', () => {
    expect(isValidPath([tile(0, 0, 0, 1), tile(1, 0, 2, 2)])).toBe(false);
  });

  it('rejects L-shaped paths even with adjacent pairwise tiles', () => {
    // Each pair is adjacent, but the path bends — not a straight line.
    expect(isValidPath([tile(0, 0, 0, 1), tile(1, 0, 1, 2), tile(2, 1, 1, 3)])).toBe(false);
  });

  it('accepts a contiguous straight horizontal triple', () => {
    expect(isValidPath([tile(0, 0, 0, 1), tile(1, 0, 1, 2), tile(2, 0, 2, 3)])).toBe(true);
  });
});

describe('getTilesBetween', () => {
  // Build a 3x3 grid where value === id.
  const grid: Tile[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      grid.push(tile(r * 3 + c, r, c, r * 3 + c));
    }
  }

  it('returns the tiles spanned by a horizontal range', () => {
    const path = getTilesBetween(grid[0], grid[2], grid);
    expect(path.map((t) => t.id)).toEqual([0, 1, 2]);
  });

  it('returns the tiles spanned by a vertical range', () => {
    const path = getTilesBetween(grid[0], grid[6], grid);
    expect(path.map((t) => t.id)).toEqual([0, 3, 6]);
  });

  it('returns [] for diagonal endpoints', () => {
    expect(getTilesBetween(grid[0], grid[4], grid)).toEqual([]);
  });
});

describe('formatCalculation', () => {
  it('joins tiles and operators with spaces', () => {
    expect(formatCalculation([tile(0, 0, 0, 2), tile(1, 0, 1, 3)], ['+'])).toBe('2 + 3');
    expect(
      formatCalculation([tile(0, 0, 0, 2), tile(1, 0, 1, 3), tile(2, 0, 2, 4)], ['+', '*'])
    ).toBe('2 + 3 × 4');
  });
});

describe('formatCalculationGrouped', () => {
  it('wraps three-value paths to show left-to-right grouping', () => {
    expect(
      formatCalculationGrouped([tile(0, 0, 0, 2), tile(1, 0, 1, 3), tile(2, 0, 2, 4)], ['+', '*'])
    ).toBe('((2 + 3) × 4)');
  });

  it('can use ASCII operators for bidi-safe UI strings', () => {
    expect(
      formatCalculationGrouped([tile(0, 0, 0, 1), tile(1, 0, 1, 2), tile(2, 0, 2, 1)], ['*', '-'], {
        asciiOperators: true,
      })
    ).toBe('((1 * 2) - 1)');
  });
});
