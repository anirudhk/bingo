import { lazy, Suspense, useState } from 'react';

/** useState mirrored to sessionStorage (per tab; survives reloads, not new tabs). */
function useSessionState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      sessionStorage.setItem(key, JSON.stringify(v));
    } catch {
      // private mode / storage full — state still works for this page view
    }
  };
  return [value, set];
}
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { GameModeSelector } from './components/UI/GameModeSelector';
import { DifficultySelector } from './components/UI/DifficultySelector';
import { ButtonGameBoard } from './components/GameBoard/ButtonGameBoard';
import { ResultPage } from './components/UI/ResultPage';
import { PWAInstallPrompt } from './components/UI/PWAInstallPrompt';
import { UpdateToast } from './components/UI/UpdateToast';
import { ThemeApplier } from './components/UI/ThemeApplier';
import { HomeShell } from './components/UI/HomeShell';
import { LearningPath } from './components/UI/LearningPath';
import { DailyPuzzlePage } from './components/UI/DailyPuzzlePage';
import { PlausibleAnalytics } from './components/analytics/PlausibleAnalytics';
import type { DifficultyLevel, GameMode } from './types/game';
import { useGameStore } from './store/gameStore';
import { getLevel } from './constants/levels';

// Screens most visitors never open load on demand, keeping the first
// download small (multiplayer, profiles, leaderboard, legal pages).
const ProfilePage = lazy(() =>
  import('./components/UI/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const DailyLeaderboardPage = lazy(() =>
  import('./components/UI/DailyLeaderboardPage').then((m) => ({ default: m.DailyLeaderboardPage }))
);
const PrivacyPage = lazy(() =>
  import('./components/UI/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import('./components/UI/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const MeRedirectPage = lazy(() =>
  import('./components/UI/MeRedirectPage').then((m) => ({ default: m.MeRedirectPage }))
);
const MultiplayerLobbyPage = lazy(() =>
  import('./components/UI/MultiplayerLobbyPage').then((m) => ({ default: m.MultiplayerLobbyPage }))
);
const MultiplayerSessionPage = lazy(() =>
  import('./components/UI/MultiplayerSessionPage').then((m) => ({
    default: m.MultiplayerSessionPage,
  }))
);
const MultiplayerJoinPage = lazy(() =>
  import('./components/UI/MultiplayerJoinPage').then((m) => ({ default: m.MultiplayerJoinPage }))
);
const classroom = () => import('./components/UI/ClassroomPages');
const ClassHostSetupPage = lazy(() => classroom().then((m) => ({ default: m.ClassHostSetupPage })));
const ClassHostRoomPage = lazy(() => classroom().then((m) => ({ default: m.ClassHostRoomPage })));
const ClassJoinPage = lazy(() => classroom().then((m) => ({ default: m.ClassJoinPage })));
const ClassPlayPage = lazy(() => classroom().then((m) => ({ default: m.ClassPlayPage })));
const BuddiesPage = lazy(() =>
  import('./components/UI/BuddiesPage').then((m) => ({ default: m.BuddiesPage }))
);

const RouteFallback: React.FC = () => (
  <div className="flex h-full items-center justify-center text-sm text-slate-500" role="status">
    Loading…
  </div>
);

/** GitHub Pages uses `/bingo`; Capacitor uses `./`, which must not be used as Router basename. */
function routerBasename(): string | undefined {
  const trimmed = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (!trimmed || trimmed === '.' || trimmed === '') return undefined;
  return trimmed;
}

/** Quick Game skips the difficulty picker and uses this preset (3×3, 2 tiles + 1 op). */
const QUICK_GAME_DIFFICULTY: DifficultyLevel = 'easy';

function App() {
  // Wizard-style local state used by the Play tab. Learn mode passes the
  // level id through the URL (?level=...) and bypasses this entirely.
  // Kept in sessionStorage so a page refresh mid-game doesn't bounce the player
  // back to the mode picker.
  const [selectedGameMode, setSelectedGameMode] = useSessionState<GameMode | null>(
    'gg:play:mode',
    null
  );
  const [selectedDifficulty, setSelectedDifficulty] = useSessionState<DifficultyLevel | null>(
    'gg:play:difficulty',
    null
  );
  const resetGame = useGameStore((s) => s.resetGame);

  const handleGameModeSelect = (mode: GameMode) => {
    setSelectedGameMode(mode);
    if (mode === 'quickGame') {
      setSelectedDifficulty(QUICK_GAME_DIFFICULTY);
    } else {
      setSelectedDifficulty(null);
    }
  };

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    setSelectedDifficulty(difficulty);
    resetGame();
  };

  return (
    <MotionConfig reducedMotion="user">
      <Router
        basename={routerBasename()}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ThemeApplier />
        <PlausibleAnalytics />
        <div className="h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden safe-pad">
          <PWAInstallPrompt />
          <UpdateToast />
          <div className="container mx-auto h-full">
            <AnimatePresence mode="wait">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Home shell with Learn|Play tabs. "/" redirects to last-used tab inside HomeShell. */}
                  <Route element={<HomeShell />}>
                    <Route path="/" element={<div />} />
                    <Route
                      path="/learn"
                      element={
                        <FadeIn>
                          <LearningPath />
                        </FadeIn>
                      }
                    />
                    <Route
                      path="/play"
                      element={
                        <FadeIn>
                          <GameModeSelector
                            onSelect={handleGameModeSelect}
                            selectedMode={selectedGameMode || undefined}
                          />
                        </FadeIn>
                      }
                    />
                    <Route
                      path="/play/difficulty"
                      element={
                        selectedGameMode &&
                        selectedGameMode !== 'quickGame' &&
                        selectedGameMode !== 'multiplayer' ? (
                          <FadeIn>
                            <DifficultySelector
                              onSelect={handleDifficultySelect}
                              selectedDifficulty={selectedDifficulty || undefined}
                              gameMode={selectedGameMode}
                            />
                          </FadeIn>
                        ) : (
                          <Navigate to="/play" replace />
                        )
                      }
                    />
                  </Route>

                  {/* Game route — outside the HomeShell because gameplay takes the full screen. */}
                  <Route
                    path="/game"
                    element={
                      <GameRoute
                        selectedGameMode={selectedGameMode}
                        selectedDifficulty={selectedDifficulty}
                      />
                    }
                  />

                  {/* Daily puzzle — also full-screen, manages its own loading. */}
                  <Route path="/daily" element={<DailyPuzzlePage />} />

                  <Route path="/play/multiplayer" element={<MultiplayerLobbyPage />} />
                  <Route path="/play/mp/:sessionId" element={<MultiplayerSessionPage />} />
                  <Route path="/play/join/:token" element={<MultiplayerJoinPage />} />

                  <Route path="/buddies" element={<BuddiesPage />} />
                  <Route path="/class" element={<ClassHostSetupPage />} />
                  <Route path="/class/host/:roomId" element={<ClassHostRoomPage />} />
                  <Route path="/class/play/:roomId" element={<ClassPlayPage />} />
                  <Route path="/join" element={<ClassJoinPage />} />
                  <Route path="/join/:code" element={<ClassJoinPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/leaderboard/daily" element={<DailyLeaderboardPage />} />
                  <Route path="/u/:handle" element={<ProfilePage />} />
                  <Route path="/me" element={<MeRedirectPage />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </div>
        </div>
      </Router>
    </MotionConfig>
  );
}

/** Standard fade-in wrapper for tab/lobby content. */
const FadeIn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    // Full height so screens inside can paint their background to the bottom edge.
    className="h-full"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

interface GameRouteProps {
  selectedGameMode: GameMode | null;
  selectedDifficulty: DifficultyLevel | null;
}

/**
 * /game has two entry shapes:
 *  1. Learn:  /game?level=u1-l1   → play a curriculum level (gameMode='learning').
 *  2. Play:   /game (no params)   → play the wizard's selected mode + difficulty.
 *
 * In both cases we render `ResultPage` once the store reports completion.
 */
const GameRoute: React.FC<GameRouteProps> = ({ selectedGameMode, selectedDifficulty }) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const gameStatus = useGameStore((s) => s.gameStatus);
  const levelId = params.get('level') ?? undefined;

  // Learn mode entry — level id provided via query string.
  if (levelId) {
    if (!getLevel(levelId)) {
      // Unknown level → bounce back to the Learn path. The store's initError
      // would also catch this, but bouncing keeps the URL consistent.
      navigate('/learn', { replace: true });
      return null;
    }
    return (
      <FadeIn>
        {gameStatus === 'completed' ? (
          <ResultPage />
        ) : (
          <ButtonGameBoard difficulty="easy" gameMode="learning" levelId={levelId} />
        )}
      </FadeIn>
    );
  }

  // Play mode entry — wizard state must be filled in.
  if (!selectedGameMode || !selectedDifficulty) {
    return <Navigate to="/play" replace />;
  }

  return (
    <FadeIn>
      {gameStatus === 'completed' ? (
        <ResultPage />
      ) : (
        <ButtonGameBoard difficulty={selectedDifficulty} gameMode={selectedGameMode} />
      )}
    </FadeIn>
  );
};

export default App;
