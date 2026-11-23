import { Link } from 'react-router-dom';

/** EPIC-32.04 — replace copy with counsel-reviewed text before production launch. */
export const PrivacyPage: React.FC = () => (
  <div className="h-full overflow-auto safe-pad">
    <article className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <Link to="/learn" className="font-bold text-lime-700 dark:text-lime-400">
        ← Back
      </Link>
      <h1 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">Privacy Policy</h1>
      <p className="mt-4">
        Grid Genius may process account data (email, profile handle, game progress, puzzle results,
        and analytics events you opt into) when you sign in and use cloud features. Progress can
        stay on-device only until you choose &quot;Save my progress&quot;.
      </p>
      <p className="mt-3">
        Kids-oriented accounts are marked in our database; those profiles are not publicly listed,
        and we do not operate chat. Parent email verification should be completed server-side before
        enabling cloud saves for children.
      </p>
      <p className="mt-3">
        You may request export or scheduled deletion of your account data through the in-app
        settings when Supabase is configured. Hard deletion is intended within 30 days after a
        soft-delete request.
      </p>
      <p className="mt-3 text-xs text-slate-500">
        Last updated: 2026-05-11. This stub is not legal advice.
      </p>
    </article>
  </div>
);
