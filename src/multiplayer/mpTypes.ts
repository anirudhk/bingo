import type { DifficultyLevel } from '../types/game';

export interface MpSessionRow {
  id: string;
  invite_token: string;
  host_id: string;
  guest_id: string | null;
  state: 'pending' | 'active' | 'finished' | 'archived';
  difficulty: DifficultyLevel;
  total_rounds: number;
  time_control_sec: number | null;
  current_round: number;
  round_seed: string | null;
  host_round_wins: number;
  guest_round_wins: number;
  host_ready: boolean;
  guest_ready: boolean;
  winner_user_id: string | null;
  rematch_of: string | null;
  rating_bracket_mu: number | null;
  rating_bracket_half: number | null;
  round_started_at: string | null;
  finished_at: string | null;
  host_last_seen: string | null;
  guest_last_seen: string | null;
}
