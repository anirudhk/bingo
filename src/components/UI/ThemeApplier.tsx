import { useEffect } from 'react';
import { usePrefsStore, resolveTheme } from '../../store/prefsStore';

/**
 * Side-effect-only component: keeps `<html class="dark">` in sync with the
 * user's theme choice and the OS preference (when choice is `system`).
 *
 * Lives at App root. Renders nothing.
 */
export const ThemeApplier: React.FC = () => {
  const theme = usePrefsStore((s) => s.theme);

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(theme);
      const root = document.documentElement;
      if (resolved === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    };

    apply();

    // When the user picks `system`, re-apply on OS theme changes.
    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [theme]);

  return null;
};
