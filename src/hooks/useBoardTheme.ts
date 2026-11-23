import { getBoardTheme, isBoardThemeUnlocked, type BoardTheme } from '../constants/boardThemes';
import { usePrefsStore } from '../store/prefsStore';
import { useProgressStore } from '../store/progressStore';

/**
 * The board theme to render. Falls back to Classic if the chosen theme is no
 * longer unlocked (e.g. after "Reset progress").
 */
export const useBoardTheme = (): BoardTheme => {
  const chosen = usePrefsStore((s) => s.boardTheme);
  const xp = useProgressStore((s) => s.xp);
  return getBoardTheme(isBoardThemeUnlocked(chosen, xp) ? chosen : 'classic');
};
