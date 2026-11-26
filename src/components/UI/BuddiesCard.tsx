import { Link } from 'react-router-dom';
import { BUDDIES } from '../../constants/buddies';
import { useProgressStore } from '../../store/progressStore';
import { Buddy } from './Buddy';

/** Learn-screen card: how many Number Buddies you have, linking to the collection. */
export const BuddiesCard: React.FC = () => {
  const buddies = useProgressStore((s) => s.buddies);
  const owned = BUDDIES.filter((b) => buddies[b.id]);
  // Show the newest three you own; fill the rest with the next ones to earn.
  const preview = [
    ...owned.slice(-3),
    ...BUDDIES.filter((b) => !buddies[b.id] && !b.secret).slice(0, Math.max(0, 3 - owned.length)),
  ].slice(0, 3);

  return (
    <Link
      to="/buddies"
      className="group flex w-full items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:ring-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:bg-slate-900 dark:ring-slate-800"
    >
      <span className="flex -space-x-3" aria-hidden>
        {preview.map((b) => (
          <Buddy key={b.id} buddy={b} locked={!buddies[b.id]} size={40} />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Number Buddies
        </span>
        <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">
          {owned.length} of {BUDDIES.length} collected
        </span>
      </span>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        <path
          d="M8 5l5 5-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
};
