/**
 * Cosmetic board themes unlocked with XP — gives XP a visible purpose.
 *
 * XP comes from Learn-path stars (10 XP per star, 25 levels × 3 stars = 750
 * max), so thresholds are spread across the path: the first unlock lands
 * after ~1 level, the last near the end of Unit 5.
 *
 * Class strings are literal so Tailwind's JIT picks them up.
 */
export type BoardThemeId = 'classic' | 'ocean' | 'sunset' | 'forest' | 'candy' | 'galaxy';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  /** XP needed to unlock. */
  xp: number;
  /** Idle tile classes. */
  idle: string;
  /** Tile classes while part of the selected path. */
  path: string;
  /** Two-colour swatch for the picker (CSS gradient). */
  swatch: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    xp: 0,
    idle: 'bg-gradient-to-br from-white to-gray-50 text-gray-800 border-gray-300 hover:border-blue-400',
    path: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 ring-blue-300',
    swatch: 'linear-gradient(135deg, #ffffff 0%, #e5e7eb 50%, #3b82f6 50%, #2563eb 100%)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    xp: 30,
    idle: 'bg-gradient-to-br from-sky-50 to-cyan-100 text-sky-900 border-sky-300 hover:border-cyan-500',
    path: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-cyan-600 ring-cyan-300',
    swatch: 'linear-gradient(135deg, #f0f9ff 0%, #cffafe 50%, #06b6d4 50%, #2563eb 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    xp: 90,
    idle: 'bg-gradient-to-br from-orange-50 to-rose-100 text-rose-900 border-orange-300 hover:border-rose-400',
    path: 'bg-gradient-to-br from-orange-500 to-rose-500 text-white border-rose-500 ring-orange-300',
    swatch: 'linear-gradient(135deg, #fff7ed 0%, #ffe4e6 50%, #f97316 50%, #f43f5e 100%)',
  },
  {
    id: 'forest',
    name: 'Forest',
    xp: 180,
    idle: 'bg-gradient-to-br from-lime-50 to-emerald-100 text-emerald-900 border-emerald-300 hover:border-emerald-500',
    path: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white border-emerald-600 ring-emerald-300',
    swatch: 'linear-gradient(135deg, #f7fee7 0%, #d1fae5 50%, #10b981 50%, #16a34a 100%)',
  },
  {
    id: 'candy',
    name: 'Candy',
    xp: 300,
    idle: 'bg-gradient-to-br from-pink-50 to-fuchsia-100 text-fuchsia-900 border-pink-300 hover:border-fuchsia-400',
    path: 'bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white border-fuchsia-500 ring-pink-300',
    swatch: 'linear-gradient(135deg, #fdf2f8 0%, #fae8ff 50%, #ec4899 50%, #d946ef 100%)',
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    xp: 450,
    idle: 'bg-gradient-to-br from-indigo-900 to-violet-900 text-indigo-50 border-indigo-500 hover:border-violet-300',
    path: 'bg-gradient-to-br from-amber-300 to-yellow-400 text-indigo-950 border-amber-300 ring-amber-200',
    swatch: 'linear-gradient(135deg, #312e81 0%, #4c1d95 50%, #fcd34d 50%, #facc15 100%)',
  },
];

export const getBoardTheme = (id: BoardThemeId): BoardTheme =>
  BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];

export const isBoardThemeUnlocked = (id: BoardThemeId, xp: number): boolean =>
  getBoardTheme(id).xp <= xp;

/** Themes that became available when XP went from `before` to `after`. */
export const themesUnlockedBetween = (before: number, after: number): BoardTheme[] =>
  BOARD_THEMES.filter((t) => t.xp > before && t.xp <= after);

/** The next theme still locked at this XP, if any. */
export const nextLockedTheme = (xp: number): BoardTheme | undefined =>
  BOARD_THEMES.find((t) => t.xp > xp);
