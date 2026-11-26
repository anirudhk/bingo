import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BUDDIES } from '../../constants/buddies';
import { useProgressStore } from '../../store/progressStore';
import { Buddy } from './Buddy';

/** The Number Buddies collection: earned ones in colour, the rest as goals. */
export const BuddiesPage: React.FC = () => {
  const buddies = useProgressStore((s) => s.buddies);
  const syncBuddies = useProgressStore((s) => s.syncBuddies);
  // Catch up on anything earned before buddies existed.
  useEffect(() => {
    syncBuddies();
  }, [syncBuddies]);

  const owned = BUDDIES.filter((b) => buddies[b.id]).length;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link to="/learn" className="text-sm font-bold text-green-700 dark:text-lime-400">
          ← Back
        </Link>
        <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">Number Buddies</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {owned} of {BUDDIES.length} collected. Every buddy is earned by playing — complete the
          goal to unlock it.
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            style={{ width: `${(owned / BUDDIES.length) * 100}%` }}
          />
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BUDDIES.map((b) => {
            const unlockedAt = buddies[b.id];
            const locked = !unlockedAt;
            return (
              <li
                key={b.id}
                className={`flex flex-col items-center rounded-2xl p-3 text-center ring-1 ${
                  locked
                    ? 'bg-slate-50 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'
                    : 'bg-white shadow-sm ring-amber-200 dark:bg-slate-900 dark:ring-amber-900'
                }`}
                aria-label={
                  locked ? `Locked buddy: ${b.secret ? 'secret' : b.goal}` : `${b.name}, unlocked`
                }
              >
                <Buddy buddy={b} locked={locked} size={72} />
                <span
                  className={`mt-1 text-sm font-black ${locked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}
                >
                  {locked && b.secret ? '???' : b.name}
                </span>
                <span className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                  {locked
                    ? b.secret
                      ? 'A secret buddy'
                      : b.goal
                    : `Unlocked ${unlockedAt.slice(0, 10)}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
