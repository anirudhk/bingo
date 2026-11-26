import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerSW } from 'virtual:pwa-register';
import { logger } from '../../utils/logger';

/**
 * Shows a small toast when `vite-plugin-pwa` reports a new service worker is
 * waiting. Tapping "Refresh" applies the update by calling the function the
 * plugin handed us; we do *not* force-reload here — `updateSW(true)` triggers
 * the controlling page to swap, which leaves any unsaved store state intact
 * for the next paint.
 *
 * No-op when the SW isn't registered (e.g. in dev / tests).
 */
export const UpdateToast: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // Some test environments (jsdom) won't have navigator.serviceWorker.
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const update = registerSW({
        immediate: true,
        onNeedRefresh() {
          logger.debug('SW: new version available, prompting user');
          setNeedRefresh(true);
        },
        // The browser only looks for a new version when the page loads, so a
        // tab left open would keep the old game forever. Check every half
        // hour and whenever the player comes back to the tab.
        onRegisteredSW(_url, registration) {
          if (!registration) return;
          const check = () => {
            if (navigator.onLine) void registration.update().catch(() => undefined);
          };
          setInterval(check, 30 * 60 * 1000);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') check();
          });
        },
        onOfflineReady() {
          logger.debug('SW: offline ready');
        },
      });
      setUpdateSW(() => update);
    } catch (err) {
      logger.warn('SW register failed (non-fatal):', err);
    }
  }, []);

  const onRefresh = () => {
    if (!updateSW) return;
    void updateSW(true);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 bg-gray-900 text-white rounded-full shadow-xl px-4 py-2 flex items-center gap-3 text-sm safe-pad"
        >
          <span>New version available.</span>
          <button
            onClick={onRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            aria-label="Dismiss update toast"
            className="text-gray-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
