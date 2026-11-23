import type { SupabaseClient } from '@supabase/supabase-js';

/** Milliseconds to add to `Date.now()` for coarse server alignment (EPIC-34.03). */
export async function fetchServerClockOffsetMs(sb: SupabaseClient): Promise<number> {
  const t0 = Date.now();
  const { data, error } = await sb.rpc('rpc_server_now');
  const t1 = Date.now();
  if (error || data == null) return 0;
  const mid = (t0 + t1) / 2;
  const serverMs = new Date(data as string).getTime();
  if (Number.isNaN(serverMs)) return 0;
  return serverMs - mid;
}
