import { useEffect, useMemo, useState } from 'react';
import type { Puzzle, PuzzleBundle } from '../types/game';
import { loadPuzzleBundle, queryPuzzles, type PuzzleQuery } from '../utils/puzzleStore';

interface UsePuzzlesResult {
  loading: boolean;
  error: Error | null;
  bundle: PuzzleBundle | null;
  puzzles: Puzzle[];
}

/**
 * Lazily fetch `public/puzzles.json` (cached after the first call) and
 * filter it by `query`. The hook is safe to call on every page; subsequent
 * calls use the in-memory cache and never re-fetch.
 *
 *   const { puzzles, loading } = usePuzzles({ theme: 'multiplication', difficulty: 'medium' });
 */
export const usePuzzles = (query: PuzzleQuery = {}): UsePuzzlesResult => {
  const [bundle, setBundle] = useState<PuzzleBundle | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadPuzzleBundle()
      .then((b) => {
        if (cancelled) return;
        setBundle(b);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Memoise the filtered list so consumers can use it as a dep array entry.
  // Stringify the query for the dep key — it's small and stable.
  const queryKey = JSON.stringify(query);
  const puzzles = useMemo(() => {
    if (!bundle) return [];
    return queryPuzzles(bundle.puzzles, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, queryKey]);

  return { loading, error, bundle, puzzles };
};
