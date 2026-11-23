import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { startDailyAttempt, submitDailyGuess } from './dailyLeaderboardCloud';

const fakeSb = (rpc: ReturnType<typeof vi.fn>) => ({ rpc }) as unknown as SupabaseClient;

describe('daily cloud service', () => {
  it('starts an attempt and maps the server row', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { puzzle_id: 'p-1', started_at: '2026-11-23T10:00:00Z', solved: false, wrong_attempts: 0 },
      ],
      error: null,
    });
    const a = await startDailyAttempt(fakeSb(rpc));
    expect(rpc).toHaveBeenCalledWith('start_daily_attempt');
    expect(a).toEqual({
      puzzleId: 'p-1',
      startedAt: '2026-11-23T10:00:00Z',
      solved: false,
      wrongAttempts: 0,
    });
  });

  it('sends only the tapped path — never a time, score or rating', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { correct: true, seconds: 42, wrong_attempts: 1, streak: 3, rating: 1520 },
      error: null,
    });
    const r = await submitDailyGuess(fakeSb(rpc), [0, 1, 2], ['+', '*']);
    expect(rpc).toHaveBeenCalledWith('submit_daily_guess', {
      p_tile_ids: [0, 1, 2],
      p_operators: ['+', '*'],
    });
    expect(r).toMatchObject({ correct: true, seconds: 42, wrongAttempts: 1, streak: 3 });
  });

  it('returns null instead of throwing when the server refuses', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'not authenticated' } });
    expect(await startDailyAttempt(fakeSb(rpc))).toBeNull();
    expect(await submitDailyGuess(fakeSb(rpc), [0], [])).toBeNull();
  });
});
