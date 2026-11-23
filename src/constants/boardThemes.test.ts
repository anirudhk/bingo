import { describe, expect, it } from 'vitest';
import {
  BOARD_THEMES,
  isBoardThemeUnlocked,
  nextLockedTheme,
  themesUnlockedBetween,
} from './boardThemes';
import { LEVELS } from './levels';

describe('board themes', () => {
  it('classic is always unlocked; the rest need XP', () => {
    expect(isBoardThemeUnlocked('classic', 0)).toBe(true);
    expect(isBoardThemeUnlocked('ocean', 0)).toBe(false);
    expect(isBoardThemeUnlocked('ocean', 30)).toBe(true);
  });

  it('every theme is reachable with the XP the Learn path can award', () => {
    const maxXp = LEVELS.length * 3 * 10;
    BOARD_THEMES.forEach((t) => expect(t.xp).toBeLessThanOrEqual(maxXp));
  });

  it('reports exactly the themes crossed by an XP gain', () => {
    expect(themesUnlockedBetween(20, 30).map((t) => t.id)).toEqual(['ocean']);
    expect(themesUnlockedBetween(30, 30)).toEqual([]);
    expect(themesUnlockedBetween(0, 200).map((t) => t.id)).toEqual(['ocean', 'sunset', 'forest']);
  });

  it('nextLockedTheme points at the next goal', () => {
    expect(nextLockedTheme(0)?.id).toBe('ocean');
    expect(nextLockedTheme(10_000)).toBeUndefined();
  });
});
