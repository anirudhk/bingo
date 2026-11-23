import { useEffect } from 'react';
import { usePrefsStore } from '../../store/prefsStore';

const SCRIPT_ATTR = 'data-domain';

/**
 * EPIC-33 — loads Plausible when `VITE_PLAUSIBLE_DOMAIN` is set and the user opted in.
 */
export const PlausibleAnalytics: React.FC = () => {
  const optedIn = usePrefsStore((s) => s.analyticsOptIn);
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();

  useEffect(() => {
    if (!domain || !optedIn) return;
    const existing = document.querySelector(`script[${SCRIPT_ATTR}="${domain}"]`);
    if (existing) return;

    const s = document.createElement('script');
    s.defer = true;
    s.setAttribute(SCRIPT_ATTR, domain);
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);

    return () => {
      s.remove();
    };
  }, [domain, optedIn]);

  return null;
};
