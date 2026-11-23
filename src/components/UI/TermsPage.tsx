import { Link } from 'react-router-dom';

/** EPIC-32.04 — replace with counsel-reviewed terms before production launch. */
export const TermsPage: React.FC = () => (
  <div className="h-full overflow-auto safe-pad">
    <article className="mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <Link to="/learn" className="font-bold text-lime-700 dark:text-lime-400">
        ← Back
      </Link>
      <h1 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">Terms of Service</h1>
      <p className="mt-4">
        By using Grid Genius you agree to play fairly, not to abuse leaderboards or ratings, and to
        follow applicable laws. Features that sync to our database rely on third-party
        infrastructure (e.g. Supabase); their uptime and security practices also apply.
      </p>
      <p className="mt-3">
        The software is provided as-is. Rankings and puzzles may change as we balance difficulty and
        detect abuse.
      </p>
      <p className="mt-3 text-xs text-slate-500">
        Last updated: 2026-05-11. This stub is not legal advice.
      </p>
    </article>
  </div>
);
