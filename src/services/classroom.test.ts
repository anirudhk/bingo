import { describe, expect, it } from 'vitest';
import { boardSeed, rankPlayers, type ClassPlayer, type ClassRoom } from './classroom';

const p = (nickname: string, score: number, solved: number, at: string | null): ClassPlayer => ({
  room_id: 'r',
  user_id: nickname,
  nickname,
  score,
  solved,
  last_solved_at: at,
});

describe('classroom helpers', () => {
  it('ranks by score, then by who got there first', () => {
    const ranked = rankPlayers([
      p('Leo', 20, 2, '2026-11-26T10:00:05Z'),
      p('Maya', 30, 3, '2026-11-26T10:00:09Z'),
      p('Ana', 20, 2, '2026-11-26T10:00:02Z'),
      p('Sam', 0, 0, null),
    ]);
    expect(ranked.map((x) => x.nickname)).toEqual(['Maya', 'Ana', 'Leo', 'Sam']);
  });

  it('every player gets the same board sequence from the room seed', () => {
    const room = { seed: 'abc' } as ClassRoom;
    expect(boardSeed(room, 0)).toBe('abc|0');
    expect(boardSeed(room, 3)).toBe('abc|3');
  });
});
