import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

/**
 * Server-authoritative daily puzzle (migration 20261123000000_launch_hardening).
 *
 * The server decides which puzzle is today's, records when the player
 * started, checks every guess, counts wrong tries and computes the solve time
 * itself. The app never sends a time, a score or a rating — it only sends the
 * path the player tapped. Leaderboard, streak and rating are written by the
 * server when the correct answer arrives.
 */

export interface DailyAttempt {
  puzzleId: string;
  startedAt: string;
  solved: boolean;
  wrongAttempts: number;
}

export interface DailyGuessResult {
  correct: boolean;
  alreadySolved?: boolean;
  seconds?: number;
  wrongAttempts: number;
  streak?: number;
  rating?: number;
}

/** Start (or resume) today's attempt. Returns null when offline / not set up. */
export async function startDailyAttempt(sb: SupabaseClient): Promise<DailyAttempt | null> {
  try {
    const { data, error } = await sb.rpc('start_daily_attempt');
    if (error) {
      logger.warn('start_daily_attempt failed', error.message);
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { puzzle_id: string; started_at: string; solved: boolean; wrong_attempts: number }
      | undefined;
    if (!row) return null;
    return {
      puzzleId: row.puzzle_id,
      startedAt: row.started_at,
      solved: row.solved,
      wrongAttempts: row.wrong_attempts,
    };
  } catch (e) {
    logger.warn('start_daily_attempt threw', String(e));
    return null;
  }
}

/** Send one guess for the server to check. */
export async function submitDailyGuess(
  sb: SupabaseClient,
  tileIds: number[],
  operators: string[]
): Promise<DailyGuessResult | null> {
  try {
    const { data, error } = await sb.rpc('submit_daily_guess', {
      p_tile_ids: tileIds,
      p_operators: operators,
    });
    if (error) {
      logger.warn('submit_daily_guess failed', error.message);
      return null;
    }
    const r = data as {
      correct: boolean;
      already_solved?: boolean;
      seconds?: number;
      wrong_attempts: number;
      streak?: number;
      rating?: number;
    };
    return {
      correct: r.correct,
      alreadySolved: r.already_solved,
      seconds: r.seconds,
      wrongAttempts: r.wrong_attempts,
      streak: r.streak,
      rating: r.rating,
    };
  } catch (e) {
    logger.warn('submit_daily_guess threw', String(e));
    return null;
  }
}
