/**
 * Thin typed wrapper around the `glicko2` package (EPIC-29).
 * Uses library scale: rating ~1500, RD ~350, vol ~0.06 by default.
 */
import Glicko2Export from 'glicko2';

type Glicko2Ctor = new (opts?: { tau?: number; rating?: number; rd?: number; vol?: number }) => {
  addMatch: (
    a: { rating: number; rd: number; vol: number; id: string },
    b: { rating: number; rd: number; vol: number; id: string },
    outcome: number
  ) => { pl1: PlayerLike; pl2: PlayerLike };
  calculatePlayersRatings: () => void;
};

type PlayerLike = {
  getRating: () => number;
  getRd: () => number;
  getVol: () => number;
};

const Glicko2 =
  (Glicko2Export as unknown as { Glicko2?: Glicko2Ctor } & Glicko2Ctor).Glicko2 ??
  (Glicko2Export as unknown as Glicko2Ctor);

export interface GlickoPlayer {
  rating: number;
  rd: number;
  vol: number;
}

/** Outcome from player-a perspective: win = 1, draw = 0.5, loss = 0. */
export function updateAfterMatch(
  player: GlickoPlayer,
  opponent: GlickoPlayer,
  outcome: 0 | 0.5 | 1
): GlickoPlayer {
  const ranking = new Glicko2();
  const { pl1 } = ranking.addMatch(
    { rating: player.rating, rd: player.rd, vol: player.vol, id: 'me' },
    { rating: opponent.rating, rd: opponent.rd, vol: opponent.vol, id: 'opp' },
    outcome
  );
  ranking.calculatePlayersRatings();
  return {
    rating: pl1.getRating(),
    rd: pl1.getRd(),
    vol: pl1.getVol(),
  };
}

/** Map daily solve quality to a score vs the puzzle “opponent”. */
export function dailyOutcome(wrongAttempts: number): 0 | 0.5 | 1 {
  if (wrongAttempts === 0) return 1;
  if (wrongAttempts <= 2) return 0.5;
  return 0;
}
