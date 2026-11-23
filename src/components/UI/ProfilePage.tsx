import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuthOptional } from '../../auth/authContext';
import { validateHandle } from '../../utils/handleValidation';
import { logger } from '../../utils/logger';

interface ProfileRow {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  country_code: string | null;
  is_public: boolean;
}

interface RatingRow {
  mode: string;
  rating: number;
  rd: number;
}

interface HistoryRow {
  mode: string;
  rating: number;
  rd: number;
  recorded_at: string;
}

export const ProfilePage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const auth = useAuthOptional();
  const sb = useSupabase();

  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [handleEdit, setHandleEdit] = useState('');
  const [handleErr, setHandleErr] = useState<string | null>(null);
  const [pubSaving, setPubSaving] = useState(false);

  const isOwn = Boolean(auth?.user?.id && profile && auth.user.id === profile.id) || false;

  useEffect(() => {
    if (!handle || !sb || !isSupabaseConfigured()) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { data: p, error: pe } = await sb
          .from('profiles')
          .select('id,handle,display_name,avatar_url,country_code,is_public')
          .eq('handle', handle)
          .maybeSingle();

        if (cancelled) return;
        if (pe || !p) {
          setProfile(null);
          return;
        }

        setProfile(p as ProfileRow);
        setHandleEdit((p as ProfileRow).handle);

        const uid = (p as ProfileRow).id;

        const { data: r } = await sb
          .from('user_ratings')
          .select('mode,rating,rd')
          .eq('user_id', uid);

        const { data: h } = await sb
          .from('rating_history')
          .select('mode,rating,rd,recorded_at')
          .eq('user_id', uid)
          .eq('mode', 'daily')
          .order('recorded_at', { ascending: false })
          .limit(24);

        if (!cancelled) {
          setRatings((r ?? []) as RatingRow[]);
          setHistory((h ?? []) as HistoryRow[]);
        }
      } catch (e) {
        logger.warn('profile load failed', String(e));
        if (!cancelled) setProfile(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handle, sb]);

  if (!isSupabaseConfigured() || !sb) {
    return (
      <div className="h-full overflow-auto p-4 text-sm text-slate-600 dark:text-slate-300">
        <BackToLearn />
        <p>Profiles need a configured Supabase project.</p>
      </div>
    );
  }

  if (profile === undefined) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading…</div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full overflow-auto p-4 text-center text-sm text-slate-600 dark:text-slate-300">
        <BackToLearn />
        <p className="mt-4">No public profile for @{handle}.</p>
      </div>
    );
  }

  const saveHandle = async () => {
    if (!isOwn || !auth?.user) return;
    setHandleErr(null);
    const v = validateHandle(handleEdit);
    if (!v.ok) {
      setHandleErr(v.error ?? 'Invalid');
      return;
    }
    const { error } = await sb
      .from('profiles')
      .update({ handle: handleEdit.trim().toLowerCase() })
      .eq('id', auth.user.id);
    if (error) {
      setHandleErr(error.message);
      return;
    }
    void navigate(`/u/${encodeURIComponent(handleEdit.trim().toLowerCase())}`, { replace: true });
  };

  const togglePublic = async (next: boolean) => {
    if (!isOwn || !auth?.user) return;
    setPubSaving(true);
    try {
      await sb.from('profiles').update({ is_public: next }).eq('id', auth.user.id);
      setProfile((p) => (p ? { ...p, is_public: next } : p));
    } finally {
      setPubSaving(false);
    }
  };

  const dailyHistory = history.filter((h) => h.mode === 'daily').slice(0, 20);
  const hMax = Math.max(...dailyHistory.map((h) => h.rating), 1500);
  const hMin = Math.min(...dailyHistory.map((h) => h.rating), 1500);

  return (
    <div className="h-full overflow-auto safe-pad">
      <div className="mx-auto max-w-lg px-4 py-6">
        <BackToLearn />
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-100 text-2xl font-black text-lime-800 dark:bg-lime-950 dark:text-lime-200"
              aria-hidden
            >
              {(profile.display_name || profile.handle).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                @{profile.handle}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{profile.display_name}</p>
              {profile.country_code && (
                <p className="mt-1 text-xs text-slate-400">Region: {profile.country_code}</p>
              )}
            </div>
          </div>

          {isOwn && (
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-500" htmlFor="phandle">
                  Handle
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="phandle"
                    value={handleEdit}
                    onChange={(e) => setHandleEdit(e.target.value.toLowerCase())}
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => void saveHandle()}
                    className="rounded-lg bg-lime-500 px-3 py-1.5 text-sm font-bold text-white"
                  >
                    Save
                  </button>
                </div>
                {handleErr && <p className="mt-1 text-xs text-red-600">{handleErr}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={profile.is_public}
                  disabled={pubSaving}
                  onChange={(e) => void togglePublic(e.target.checked)}
                />
                Public profile
              </label>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
              Ratings (Glicko-2 scale)
            </h2>
            {ratings.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                No rated modes yet. Play the daily while signed in.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {ratings.map((r) => (
                  <li key={r.mode} className="flex justify-between gap-2">
                    <span className="text-slate-600 dark:text-slate-300">{r.mode}</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">
                      {Math.round(r.rating)} ±{Math.round(r.rd)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {dailyHistory.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
                Daily rating history
              </h2>
              <div
                className="mt-2 flex h-24 items-end gap-0.5"
                role="img"
                aria-label="Recent daily Glicko rating trend"
              >
                {dailyHistory
                  .slice()
                  .reverse()
                  .map((h) => {
                    const t = hMax === hMin ? 0.5 : (h.rating - hMin) / (hMax - hMin);
                    const pct = 20 + t * 80;
                    return (
                      <div
                        key={h.recorded_at}
                        className="min-w-[6px] flex-1 rounded-t bg-lime-500/80 dark:bg-lime-400/80"
                        style={{ height: `${pct}%` }}
                        title={`${Math.round(h.rating)} @ ${h.recorded_at}`}
                      />
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BackToLearn: React.FC = () => (
  <Link to="/learn" className="text-sm font-bold text-lime-700 hover:underline dark:text-lime-400">
    ← Back to Learn
  </Link>
);
