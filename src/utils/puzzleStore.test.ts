import { afterEach, describe, expect, it } from 'vitest';
import {
  __resetPuzzleCache,
  __setPuzzleCache,
  pickDailyPuzzle,
  queryPuzzles,
  utcDateKey,
} from './puzzleStore';
import { buildPuzzle } from './puzzleBuilder';
import { PUZZLE_THEMES_BY_ID } from '../constants/puzzleThemes';
import type { Puzzle } from '../types/game';

afterEach(() => __resetPuzzleCache());

const samplePuzzle = (i: number, overrides: Partial<Puzzle> = {}): Puzzle => {
  const theme = PUZZLE_THEMES_BY_ID.get('addition-only')!;
  const config = theme.variants.easy;
  const p = buildPuzzle({
    seed: `test-${i}`,
    config,
    difficulty: 'easy',
    themes: ['addition-only'],
    id: `p-test-${i}`,
  });
  if (!p) throw new Error('failed to build sample puzzle');
  return { ...p, ...overrides };
};

describe('queryPuzzles', () => {
  const corpus: Puzzle[] = [
    samplePuzzle(1, {
      themes: ['addition-only'],
      difficulty: 'easy',
      rating: 900,
    }),
    samplePuzzle(2, {
      themes: ['multiplication'],
      difficulty: 'medium',
      rating: 1300,
    }),
    samplePuzzle(3, {
      themes: ['mixed-all'],
      difficulty: 'hard',
      rating: 1900,
    }),
    samplePuzzle(4, {
      themes: ['addition-only', 'mixed-all'],
      difficulty: 'easy',
      rating: 1100,
    }),
  ];

  it('returns the full list when no filter is applied', () => {
    expect(queryPuzzles(corpus)).toHaveLength(4);
  });

  it('filters by theme (membership, not equality)', () => {
    const out = queryPuzzles(corpus, { theme: 'addition-only' });
    expect(out.map((p) => p.id)).toEqual(['p-test-1', 'p-test-4']);
  });

  it('filters by difficulty', () => {
    expect(queryPuzzles(corpus, { difficulty: 'hard' })).toHaveLength(1);
  });

  it('filters by rating range (inclusive)', () => {
    const out = queryPuzzles(corpus, { minRating: 1000, maxRating: 1500 });
    expect(out.map((p) => p.id)).toEqual(['p-test-2', 'p-test-4']);
  });

  it('combines filters with AND semantics', () => {
    const out = queryPuzzles(corpus, { theme: 'addition-only', difficulty: 'easy' });
    expect(out).toHaveLength(2);
  });
});

describe('utcDateKey', () => {
  it('formats as YYYY-MM-DD in UTC', () => {
    expect(utcDateKey(new Date(Date.UTC(2026, 4, 10)))).toBe('2026-05-10');
    expect(utcDateKey(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01');
  });
});

describe('pickDailyPuzzle', () => {
  const corpus = Array.from({ length: 50 }, (_, i) =>
    samplePuzzle(100 + i, {
      themes: ['addition-only'],
      difficulty: 'easy',
      rating: 900 + i * 10,
    })
  );

  it('returns the same puzzle for the same date across calls', () => {
    const date = new Date(Date.UTC(2026, 4, 10));
    const a = pickDailyPuzzle(corpus, date);
    const b = pickDailyPuzzle(corpus, date);
    expect(a?.id).toBe(b?.id);
  });

  it('returns a different puzzle on a different date (high probability)', () => {
    let differs = false;
    const a = pickDailyPuzzle(corpus, new Date(Date.UTC(2026, 4, 10)))!;
    for (let i = 1; i <= 5; i++) {
      const other = pickDailyPuzzle(corpus, new Date(Date.UTC(2026, 4, 10 + i)))!;
      if (other.id !== a.id) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it('respects the difficulty filter', () => {
    const onlyMedium = corpus.map((p) => ({ ...p, difficulty: 'medium' as const }));
    const picked = pickDailyPuzzle(onlyMedium, new Date(), { difficulty: 'medium' });
    expect(picked?.difficulty).toBe('medium');
  });

  it('returns null when no candidates match the filter', () => {
    expect(pickDailyPuzzle([], new Date())).toBeNull();
    expect(pickDailyPuzzle(corpus, new Date(), { theme: 'multiplication' })).toBeNull();
  });
});

describe('puzzle bundle cache (test-only helpers)', () => {
  it('__setPuzzleCache lets a test seed the cache without fetching', async () => {
    const { loadPuzzleBundle } = await import('./puzzleStore');
    __setPuzzleCache({
      schemaVersion: 1,
      generatedAt: '2026-05-10T00:00:00Z',
      count: 1,
      puzzles: [samplePuzzle(1)],
    });
    const bundle = await loadPuzzleBundle();
    expect(bundle.count).toBe(1);
    expect(bundle.puzzles[0].id).toBe('p-test-1');
  });
});
