import { LEVELS, UNITS } from './levels';
import type { ProgressState } from '../store/progressStore';

/**
 * Number Buddies — collectible characters earned by playing. Every buddy has
 * a clear, fair goal: no random drops, nothing to buy. Unlocks are derived
 * from saved progress (see `earnedBuddyIds`), so they survive refreshes and
 * are easy to test.
 */
export type BuddyTopper =
  | 'leaf'
  | 'ears'
  | 'round-ears'
  | 'horns'
  | 'flame'
  | 'crown'
  | 'star'
  | 'none';

export interface BuddyDef {
  id: string;
  name: string;
  /** Body colour and outline colour. */
  color: string;
  outline: string;
  /** Symbol on the buddy's antenna ball. */
  emblem: string;
  topper: BuddyTopper;
  /** How to earn it, shown on locked buddies. */
  goal: string;
  /** Hidden until earned ("???" instead of the goal). */
  secret?: boolean;
}

export const BUDDIES: BuddyDef[] = [
  {
    id: 'sprout',
    name: 'Sprout',
    color: '#86efac',
    outline: '#15803d',
    emblem: '1',
    topper: 'leaf',
    goal: 'Finish your first Learn level',
  },
  {
    id: 'star-kit',
    name: 'Star Kit',
    color: '#fde047',
    outline: '#a16207',
    emblem: '★',
    topper: 'star',
    goal: 'Get 3 stars on 3 levels',
  },
  {
    id: 'plus-pup',
    name: 'Plus Pup',
    color: '#6ee7b7',
    outline: '#047857',
    emblem: '+',
    topper: 'ears',
    goal: 'Complete Unit 1: Addition',
  },
  {
    id: 'minus-mouse',
    name: 'Minus Mouse',
    color: '#fca5a5',
    outline: '#b91c1c',
    emblem: '−',
    topper: 'round-ears',
    goal: 'Complete Unit 2: Subtraction',
  },
  {
    id: 'mix-fox',
    name: 'Mix Fox',
    color: '#fdba74',
    outline: '#c2410c',
    emblem: '±',
    topper: 'ears',
    goal: 'Complete Unit 3: Mixed +/−',
  },
  {
    id: 'times-dragon',
    name: 'Times Dragon',
    color: '#c4b5fd',
    outline: '#6d28d9',
    emblem: '×',
    topper: 'horns',
    goal: 'Complete Unit 4: Multiplication',
  },
  {
    id: 'grid-owl',
    name: 'Grid Owl',
    color: '#93c5fd',
    outline: '#1d4ed8',
    emblem: '#',
    topper: 'ears',
    goal: 'Complete Unit 5: Bigger Grids',
  },
  {
    id: 'blaze',
    name: 'Blaze',
    color: '#fb923c',
    outline: '#9a3412',
    emblem: '10',
    topper: 'flame',
    goal: 'Get 10 correct answers in a row',
  },
  {
    id: 'sunny',
    name: 'Sunny',
    color: '#fcd34d',
    outline: '#b45309',
    emblem: '☀',
    topper: 'none',
    goal: 'Solve a daily puzzle',
  },
  {
    id: 'bullseye',
    name: 'Bullseye',
    color: '#f9a8d4',
    outline: '#be185d',
    emblem: '◎',
    topper: 'round-ears',
    goal: 'Solve a daily puzzle on the first try',
  },
  {
    id: 'calendar-cat',
    name: 'Calendar Cat',
    color: '#a5b4fc',
    outline: '#4338ca',
    emblem: '3',
    topper: 'ears',
    goal: 'Solve the daily puzzle 3 days in a row',
  },
  {
    id: 'speedy',
    name: 'Speedy',
    color: '#67e8f9',
    outline: '#0e7490',
    emblem: '⚡',
    topper: 'none',
    goal: 'Solve 10 in one Time Attack',
  },
  {
    id: 'golden-seven',
    name: 'Golden 7',
    color: '#facc15',
    outline: '#854d0e',
    emblem: '7',
    topper: 'crown',
    goal: '3 stars on every Learn level',
    secret: true,
  },
];

export const getBuddy = (id: string): BuddyDef | undefined => BUDDIES.find((b) => b.id === id);

type BuddyProgress = Pick<ProgressState, 'levels' | 'daily' | 'dailyStreak' | 'playBests'> & {
  bestCombo?: number;
};

const unitComplete = (unitId: string, levels: BuddyProgress['levels']) =>
  LEVELS.filter((l) => l.unitId === unitId).every((l) => levels[l.id]?.completed);

/** Which buddies the player has earned, from saved progress alone. */
export const earnedBuddyIds = (p: BuddyProgress): string[] => {
  const levelValues = Object.values(p.levels);
  const dailyResults = Object.values(p.daily);
  const rules: Record<string, boolean> = {
    sprout: levelValues.some((l) => l.completed),
    'star-kit': levelValues.filter((l) => l.bestStars === 3).length >= 3,
    'plus-pup': unitComplete(UNITS[0].id, p.levels),
    'minus-mouse': unitComplete(UNITS[1].id, p.levels),
    'mix-fox': unitComplete(UNITS[2].id, p.levels),
    'times-dragon': unitComplete(UNITS[3].id, p.levels),
    'grid-owl': unitComplete(UNITS[4].id, p.levels),
    blaze: (p.bestCombo ?? 0) >= 10,
    sunny: dailyResults.length > 0,
    bullseye: dailyResults.some((d) => d.wrongAttempts === 0),
    'calendar-cat': p.dailyStreak.count >= 3,
    speedy: (p.playBests.timeAttackBestRounds ?? 0) >= 10,
    'golden-seven': LEVELS.every((l) => p.levels[l.id]?.bestStars === 3),
  };
  return BUDDIES.filter((b) => rules[b.id]).map((b) => b.id);
};
