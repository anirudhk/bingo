import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { useAuthOptional } from '../../auth/authContext';
import { logger } from '../../utils/logger';

/** Resolves the signed-in user to `/u/:handle`. */
export const MeRedirectPage: React.FC = () => {
  const auth = useAuthOptional();
  const navigate = useNavigate();
  const sb = getSupabase();

  useEffect(() => {
    if (!isSupabaseConfigured() || !sb || !auth?.user) {
      navigate('/learn', { replace: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const uid = auth.user?.id;
        if (!uid) {
          navigate('/learn', { replace: true });
          return;
        }
        const { data, error } = await sb
          .from('profiles')
          .select('handle')
          .eq('id', uid)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data?.handle) {
          navigate('/learn', { replace: true });
          return;
        }
        navigate(`/u/${encodeURIComponent(data.handle)}`, { replace: true });
      } catch (e) {
        logger.warn('me redirect failed', String(e));
        if (!cancelled) navigate('/learn', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth?.user, navigate, sb]);

  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-500">
      Opening your profile…
    </div>
  );
};
