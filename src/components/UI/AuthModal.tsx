import { AnimatePresence, motion } from 'framer-motion';
import { AuthPanel } from './AuthPanel';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/50"
          aria-hidden
          onClick={onClose}
        />
        {/* Centre with flex: framer-motion's animated transform would override translate-based centring. */}
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="pointer-events-auto max-h-full w-full max-w-[420px] overflow-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 dark:text-slate-100"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 id="auth-modal-title" className="text-lg font-black">
                  Save my progress
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Sign in to sync across devices and appear on leaderboards.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="text-xl leading-none text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <AuthPanel />
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);
