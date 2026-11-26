import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthOptional } from '../../auth/authContext';
import { MultiplayerGuestGate } from './MultiplayerGuestGate';
import { useSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { logger } from '../../utils/logger';

export const MultiplayerJoinPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const auth = useAuthOptional();
  const navigate = useNavigate();
  const sb = useSupabase();
  const [peek, setPeek] = useState<{ difficulty: string; host_handle: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !sb || !auth?.user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await sb.rpc('mp_peek_invite', { p_token: token });
        if (cancelled) return;
        if (error) {
          setErr(error.message);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (row && typeof row === 'object' && 'difficulty' in row) {
          setPeek(row as { difficulty: string; host_handle: string });
        }
      } catch (e) {
        logger.warn('peek invite failed', String(e));
        if (!cancelled) setErr(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sb, auth?.user]);

  const join = async () => {
    if (!token || !sb) return;
    setErr(null);
    try {
      const { data: sid, error } = await sb.rpc('mp_join_invite', { p_token: token });
      if (error) throw error;
      void navigate(`/play/mp/${sid}`);
    } catch (e) {
      setErr(String(e));
    }
  };

  if (!isSupabaseConfigured() || !sb) {
    return (
      <div className="p-4 text-sm">
        <Link to="/play" className="font-bold text-lime-700">
          ← Back
        </Link>
        <p className="mt-4">Multiplayer not configured.</p>
      </div>
    );
  }

  if (!auth?.user) {
    return (
      <MultiplayerGuestGate reason="You've been invited to a match. Play as a guest to accept." />
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link to="/play/multiplayer" className="text-sm font-bold text-lime-700 dark:text-lime-400">
        ← Lobby
      </Link>
      <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Join game</h1>
      {peek && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          @{peek.host_handle} · <span className="capitalize">{peek.difficulty}</span>
        </p>
      )}
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <button
        type="button"
        onClick={() => void join()}
        className="mt-6 w-full rounded-xl bg-lime-500 py-3 font-black text-white shadow-sm hover:bg-lime-600"
      >
        Join room
      </button>
    </div>
  );
};
