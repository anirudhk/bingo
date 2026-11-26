import { describe, expect, it } from 'vitest';
import { BUDDIES, earnedBuddyIds } from './buddies';
import { LEVELS } from './levels';

const empty = {
  levels: {},
  daily: {},
  dailyStreak: { count: 0, lastPlayedDate: null },
  playBests: { quickGameBestTimeMs: null, timeAttackBestRounds: null },
  bestCombo: 0,
};
const done = (stars: 0 | 1 | 2 | 3) => ({
  completed: true,
  bestStars: stars,
  bestScore: 10,
  playCount: 1,
});

describe('Number Buddies', () => {
  it('a new player has none', () => {
    expect(earnedBuddyIds(empty)).toEqual([]);
  });

  it('first level and 3 stars unlock Sprout and Star Kit', () => {
    expect(earnedBuddyIds({ ...empty, levels: { 'u1-l1': done(2) } })).toEqual(['sprout']);
    expect(earnedBuddyIds({ ...empty, levels: { 'u1-l1': done(3) } })).toEqual([
      'sprout',
      'star-kit',
    ]);
  });

  it('finishing every level of Unit 1 unlocks Plus Pup', () => {
    const levels = Object.fromEntries(
      LEVELS.filter((l) => l.unitId === 'u1').map((l) => [l.id, done(1)])
    );
    expect(earnedBuddyIds({ ...empty, levels })).toContain('plus-pup');
    expect(earnedBuddyIds({ ...empty, levels })).not.toContain('minus-mouse');
  });

  it('combo, daily and Time Attack goals', () => {
    const ids = earnedBuddyIds({
      ...empty,
      bestCombo: 5,
      daily: { '2026-11-26': { puzzleId: 'p', wrongAttempts: 0, seconds: 30 } },
      dailyStreak: { count: 3, lastPlayedDate: '2026-11-26' },
      playBests: { quickGameBestTimeMs: null, timeAttackBestRounds: 10 },
    });
    expect(ids).toEqual(
      expect.arrayContaining(['blaze', 'sunny', 'bullseye', 'calendar-cat', 'speedy'])
    );
  });

  it('Golden 7 needs 3 stars on every level', () => {
    const all3 = Object.fromEntries(LEVELS.map((l) => [l.id, done(3)]));
    expect(earnedBuddyIds({ ...empty, levels: all3 })).toContain('golden-seven');
    const oneShort = { ...all3, [LEVELS[0].id]: done(2) };
    expect(earnedBuddyIds({ ...empty, levels: oneShort })).not.toContain('golden-seven');
  });

  it('every buddy has a unique id and a goal', () => {
    expect(new Set(BUDDIES.map((b) => b.id)).size).toBe(BUDDIES.length);
    BUDDIES.forEach((b) => expect(b.goal.length).toBeGreaterThan(5));
  });
});
