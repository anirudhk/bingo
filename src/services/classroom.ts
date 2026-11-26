import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DifficultyLevel, GapOperators } from '../types/game';

/** Classroom live mode — thin wrappers over the class_* database functions. */

export interface ClassRoom {
  id: string;
  code: string;
  host_id: string;
  difficulty: DifficultyLevel;
  duration_sec: number;
  state: 'lobby' | 'live' | 'finished';
  seed: string;
  started_at: string | null;
  ends_at: string | null;
}

export interface ClassPlayer {
  room_id: string;
  user_id: string;
  nickname: string;
  score: number;
  solved: number;
  last_solved_at: string | null;
}

export const CLASS_DURATIONS = [180, 300, 600] as const;

/** Highest score first; ties go to whoever reached it first. */
export const rankPlayers = (players: ClassPlayer[]): ClassPlayer[] =>
  [...players].sort(
    (a, b) =>
      b.score - a.score ||
      b.solved - a.solved ||
      (a.last_solved_at ?? '').localeCompare(b.last_solved_at ?? '') ||
      a.nickname.localeCompare(b.nickname)
  );

/** Seed for the n-th board of a room (every player gets the same sequence). */
export const boardSeed = (room: ClassRoom, index: number) => `${room.seed}|${index}`;

const message = (e: { message?: string } | null | undefined) =>
  e?.message?.replace(/^.*?:\s*/, '') ?? 'Something went wrong';

export async function createRoom(
  sb: SupabaseClient,
  difficulty: DifficultyLevel,
  durationSec: number
): Promise<{ roomId: string; code: string } | { error: string }> {
  const { data, error } = await sb.rpc('class_create_room', {
    p_difficulty: difficulty,
    p_duration_sec: durationSec,
  });
  if (error) return { error: message(error) };
  const row = (Array.isArray(data) ? data[0] : data) as { room_id: string; code: string };
  return { roomId: row.room_id, code: row.code };
}

export async function joinRoom(
  sb: SupabaseClient,
  code: string,
  nickname: string
): Promise<{ roomId: string } | { error: string }> {
  const { data, error } = await sb.rpc('class_join', { p_code: code, p_nickname: nickname });
  if (error) return { error: error.message };
  return { roomId: data as string };
}

export const startRoom = (sb: SupabaseClient, roomId: string) =>
  sb.rpc('class_start', { p_room: roomId });

export const endRoom = (sb: SupabaseClient, roomId: string) =>
  sb.rpc('class_end', { p_room: roomId });

export async function submitClassAnswer(
  sb: SupabaseClient,
  args: {
    roomId: string;
    index: number;
    grid: number[];
    target: number;
    gaps: GapOperators | null;
    tileIds: number[];
    operators: string[];
  }
): Promise<{ solved: number; score: number } | { error: string }> {
  const { data, error } = await sb.rpc('class_submit', {
    p_room: args.roomId,
    p_index: args.index,
    p_grid: args.grid,
    p_target: args.target,
    p_gaps: args.gaps,
    p_tile_ids: args.tileIds,
    p_operators: args.operators,
  });
  if (error) return { error: error.message };
  return data as { solved: number; score: number };
}

/** Room + players, kept live with Supabase Realtime (refetch on any change). */
export function useClassRoom(sb: SupabaseClient | null, roomId: string | undefined) {
  const [room, setRoom] = useState<ClassRoom | null | undefined>(undefined);
  const [players, setPlayers] = useState<ClassPlayer[]>([]);

  const refresh = useCallback(async () => {
    if (!sb || !roomId) return;
    const [{ data: r }, { data: p }] = await Promise.all([
      sb.from('class_rooms').select('*').eq('id', roomId).maybeSingle(),
      sb.from('class_players').select('*').eq('room_id', roomId),
    ]);
    setRoom((r as ClassRoom | null) ?? null);
    setPlayers((p as ClassPlayer[] | null) ?? []);
  }, [sb, roomId]);

  useEffect(() => {
    if (!sb || !roomId) return;
    void refresh();
    const channel = sb
      .channel(`class:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_rooms', filter: `id=eq.${roomId}` },
        () => void refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_players', filter: `room_id=eq.${roomId}` },
        () => void refresh()
      )
      .subscribe();
    // Safety net if a realtime event is missed (e.g. a flaky school network).
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => {
      window.clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [sb, roomId, refresh]);

  return { room, players, refresh };
}
