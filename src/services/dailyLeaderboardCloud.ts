import type { SupabaseClient } from '@supabase/supabase-js';
import { dailyOutcome, updateAfterMatch } from '../utils/glicko2';
import { logger } from '../utils/logger';

const DEFAULT_OPP = { rating: 1500, rd: 350, vol: 0.06 };

export async function submitDailyPuzzleCloud(args: {
  sb: SupabaseClient;
  userId: string;
  puzzleUtcDate: string;
  puzzleId: string;
  seconds: number;
  wrongAttempts: number;
}): Promise<void> {
  const { sb, puzzleUtcDate, puzzleId, seconds, wrongAttempts } = args;

  try {
    const { error: lbErr } = await sb.rpc('submit_daily_leaderboard', {
      p_puzzle_utc_date: puzzleUtcDate,
      p_puzzle_id: puzzleId,
      p_seconds: seconds,
      p_wrong_attempts: wrongAttempts,
    });
    if (lbErr) {
      logger.warn('submit_daily_leaderboard rpc failed', lbErr.message);
      return;
    }

    const { data: streakN, error: stErr } = await sb.rpc('bump_server_daily_streak', {
      p_utc_date: puzzleUtcDate,
    });
    if (stErr) logger.warn('bump_server_daily_streak failed', stErr.message);
    void streakN;

    let opp = { ...DEFAULT_OPP };
    const { data: puzzleRow } = await sb
      .from('puzzles')
      .select('rating,rating_rd,rating_vol')
      .eq('id', puzzleId)
      .maybeSingle();
    if (puzzleRow) {
      opp = {
        rating: Number(puzzleRow.rating),
        rd: Number(puzzleRow.rating_rd),
        vol: Number(puzzleRow.rating_vol),
      };
    }

    const { data: ratingRow } = await sb
      .from('user_ratings')
      .select('rating,rd,vol')
      .eq('user_id', args.userId)
      .eq('mode', 'daily')
      .maybeSingle();

    const playerBase = ratingRow
      ? {
          rating: Number(ratingRow.rating),
          rd: Number(ratingRow.rd),
          vol: Number(ratingRow.vol),
        }
      : DEFAULT_OPP;

    const outcome = dailyOutcome(wrongAttempts);
    const next = updateAfterMatch(playerBase, opp, outcome);

    const { error: rateErr } = await sb.rpc('apply_user_rating', {
      p_mode: 'daily',
      p_rating: next.rating,
      p_rd: next.rd,
      p_vol: next.vol,
    });
    if (rateErr) logger.warn('apply_user_rating failed', rateErr.message);
  } catch (e) {
    logger.warn('submitDailyPuzzleCloud threw', String(e));
  }
}
