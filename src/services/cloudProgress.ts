import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DailyPuzzleResult,
  LevelProgress,
  PlayModePersonalBests,
  Stars,
  StreakState,
} from '../store/progressStore';
import { useProgressStore } from '../store/progressStore';
import { usePrefsStore } from '../store/prefsStore';
import { logger } from '../utils/logger';

const CLOUD_VERSION = 1 as const;

export interface CloudProgressPayload {
  v: typeof CLOUD_VERSION;
  progress: {
    levels: Record<string, LevelProgress>;
    xp: number;
    streak: StreakState;
    daily: Record<string, DailyPuzzleResult>;
    dailyStreak: StreakState;
    playBests: PlayModePersonalBests;
  };
  prefs: {
    theme: ReturnType<typeof usePrefsStore.getState>['theme'];
    onboardingDone: boolean;
    learnMixedUnitIntroSeen: boolean;
  };
}

function buildPayload(): CloudProgressPayload {
  const p = useProgressStore.getState();
  const pf = usePrefsStore.getState();
  return {
    v: CLOUD_VERSION,
    progress: {
      levels: p.levels,
      xp: p.xp,
      streak: p.streak,
      daily: p.daily,
      dailyStreak: p.dailyStreak,
      playBests: p.playBests,
    },
    prefs: {
      theme: pf.theme,
      onboardingDone: pf.onboardingDone,
      learnMixedUnitIntroSeen: pf.learnMixedUnitIntroSeen,
    },
  };
}

function mergeLevels(
  local: Record<string, LevelProgress>,
  remote: Record<string, LevelProgress>
): Record<string, LevelProgress> {
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, LevelProgress> = {};
  for (const id of ids) {
    const a = local[id];
    const b = remote[id];
    if (!a && b) out[id] = b;
    else if (a && !b) out[id] = a;
    else if (a && b) {
      out[id] = {
        completed: a.completed || b.completed,
        bestStars: Math.max(a.bestStars, b.bestStars) as Stars,
        bestScore: Math.max(a.bestScore, b.bestScore),
        playCount: Math.max(a.playCount, b.playCount),
      };
    }
  }
  return out;
}

function mergeDaily(
  local: Record<string, DailyPuzzleResult>,
  remote: Record<string, DailyPuzzleResult>
): Record<string, DailyPuzzleResult> {
  const days = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, DailyPuzzleResult> = {};
  for (const day of days) {
    const a = local[day];
    const b = remote[day];
    if (!a && b) out[day] = b;
    else if (a && !b) out[day] = a;
    else if (a && b) {
      const pickA =
        a.seconds < b.seconds || (a.seconds === b.seconds && a.wrongAttempts < b.wrongAttempts);
      out[day] = pickA ? a : b;
    }
  }
  return out;
}

function mergeStreak(a: StreakState, b: StreakState): StreakState {
  return a.count >= b.count ? a : b;
}

function mergePlayBests(
  local: PlayModePersonalBests,
  remote: PlayModePersonalBests
): PlayModePersonalBests {
  let quickGameBestTimeMs: number | null = null;
  if (local.quickGameBestTimeMs != null && remote.quickGameBestTimeMs != null) {
    quickGameBestTimeMs = Math.min(local.quickGameBestTimeMs, remote.quickGameBestTimeMs);
  } else {
    quickGameBestTimeMs = local.quickGameBestTimeMs ?? remote.quickGameBestTimeMs ?? null;
  }
  const ta = Math.max(local.timeAttackBestRounds ?? 0, remote.timeAttackBestRounds ?? 0);
  return {
    quickGameBestTimeMs,
    timeAttackBestRounds: ta === 0 ? null : ta,
  };
}

function mergePayload(remote: CloudProgressPayload): void {
  useProgressStore.setState((state) => {
    const r = remote.progress;
    return {
      ...state,
      levels: mergeLevels(state.levels, r.levels),
      xp: Math.max(state.xp, r.xp),
      streak: mergeStreak(state.streak, r.streak),
      daily: mergeDaily(state.daily, r.daily),
      dailyStreak: mergeStreak(state.dailyStreak, r.dailyStreak),
      playBests: mergePlayBests(state.playBests, r.playBests),
    };
  });

  usePrefsStore.setState((pf) => ({
    ...pf,
    onboardingDone: pf.onboardingDone || remote.prefs.onboardingDone,
    learnMixedUnitIntroSeen: pf.learnMixedUnitIntroSeen || remote.prefs.learnMixedUnitIntroSeen,
  }));
}

export async function pushLocalProgressToCloud(sb: SupabaseClient, userId: string): Promise<void> {
  try {
    const payload = buildPayload();
    const { error } = await sb.from('user_progress').upsert(
      {
        user_id: userId,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) logger.warn('cloud progress upsert failed', error.message);
  } catch (e) {
    logger.warn('cloud progress upsert threw', String(e));
  }
}

function parsePayload(raw: unknown): CloudProgressPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const pl = raw as Partial<CloudProgressPayload>;
  if (pl.v !== CLOUD_VERSION || !pl.progress || !pl.prefs) return null;
  return pl as CloudProgressPayload;
}

export async function mergeCloudProgressOnLogin(sb: SupabaseClient, userId: string): Promise<void> {
  try {
    const { data, error } = await sb
      .from('user_progress')
      .select('payload')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data?.payload) return;

    const parsed = parsePayload(data.payload);
    if (!parsed) return;
    mergePayload(parsed);
  } catch (e) {
    logger.warn('merge cloud progress failed', String(e));
  }
}
