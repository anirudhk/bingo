import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePuzzles } from './usePuzzles';
import { __resetPuzzleCache, __setPuzzleCache } from '../utils/puzzleStore';
import { buildPuzzle } from '../utils/puzzleBuilder';
import { PUZZLE_THEMES_BY_ID } from '../constants/puzzleThemes';
import type { Puzzle } from '../types/game';

const make = (i: number, overrides: Partial<Puzzle> = {}): Puzzle => {
  const config = PUZZLE_THEMES_BY_ID.get('addition-only')!.variants.easy;
  const p = buildPuzzle({
    seed: `hook-test-${i}`,
    config,
    difficulty: 'easy',
    themes: ['addition-only'],
    id: `p-hook-${i}`,
  })!;
  return { ...p, ...overrides };
};

beforeEach(() => {
  __setPuzzleCache({
    schemaVersion: 1,
    generatedAt: '2026-05-10T00:00:00Z',
    count: 3,
    puzzles: [
      make(1, { themes: ['addition-only'], difficulty: 'easy', rating: 900 }),
      make(2, { themes: ['multiplication'], difficulty: 'medium', rating: 1300 }),
      make(3, { themes: ['multiplication'], difficulty: 'hard', rating: 1800 }),
    ],
  });
});

afterEach(() => __resetPuzzleCache());

describe('usePuzzles', () => {
  it('starts loading then resolves with the seeded bundle', async () => {
    const { result } = renderHook(() => usePuzzles());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bundle?.count).toBe(3);
    expect(result.current.puzzles).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('applies a theme filter', async () => {
    const { result } = renderHook(() => usePuzzles({ theme: 'multiplication' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.puzzles.map((p) => p.id)).toEqual(['p-hook-2', 'p-hook-3']);
  });

  it('combines filters with AND semantics', async () => {
    const { result } = renderHook(() =>
      usePuzzles({ theme: 'multiplication', difficulty: 'medium' })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.puzzles.map((p) => p.id)).toEqual(['p-hook-2']);
  });
});
