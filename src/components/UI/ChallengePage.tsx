import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ButtonGameBoard } from '../GameBoard/ButtonGameBoard';
import { useGameStore } from '../../store/gameStore';
import { decodeChallenge, formatChallengeTime } from '../../utils/challenge';
import { Mascot } from './Mascot';
import { ResultPage } from './ResultPage';

/** `/challenge/:payload` — replay a friend's game and try to beat their time. */
export const ChallengePage: React.FC = () => {
  const { payload = '' } = useParams<{ payload: string }>();
  const navigate = useNavigate();
  const challenge = useMemo(() => decodeChallenge(payload), [payload]);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const [started, setStarted] = useState(false);
  // A new key replays the same boards from scratch ("Rematch").
  const [attempt, setAttempt] = useState(0);

  if (!challenge) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <p className="text-slate-700 dark:text-slate-200">This challenge link looks broken.</p>
          <Link to="/play" className="mt-2 inline-block font-bold text-green-700 underline">
            Play something else
          </Link>
        </div>
      </div>
    );
  }

  const label =
    challenge.mode === 'quickGame'
      ? 'Quick Game'
      : `Classic · ${challenge.difficulty[0].toUpperCase()}${challenge.difficulty.slice(1)}`;

  if (!started) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <Mascot mood="cheer" size={88} className="mx-auto" />
          <p className="mt-2 text-xs font-black uppercase tracking-wider text-green-700 dark:text-lime-300">
            Challenge · {label}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            A friend did this in {formatChallengeTime(challenge.timeMs)}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Same five puzzles. Can you beat their time?
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-5 min-h-[52px] w-full rounded-2xl bg-green-700 text-base font-black text-white hover:bg-green-800"
          >
            Start
          </button>
          <button
            type="button"
            onClick={() => navigate('/learn')}
            className="mt-2 min-h-[44px] w-full rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === 'completed') {
    return (
      <ResultPage
        challenge={challenge}
        onRematch={() => {
          useGameStore.getState().resetGame();
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  return (
    <div className="h-full" key={attempt}>
      <ButtonGameBoard
        difficulty={challenge.difficulty}
        gameMode={challenge.mode}
        challengeSeed={challenge.seed}
        labelOverride={`Challenge · beat ${formatChallengeTime(challenge.timeMs)}`}
        onBack={() => navigate('/play')}
      />
    </div>
  );
};
