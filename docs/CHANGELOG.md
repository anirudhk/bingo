# Changelog

All notable changes to Grid Genius are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Conventions
>
> - Group changes under: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
> - Reference the epic/task that introduced the change (e.g. `EPIC-01.03`).
> - Link the PR or commit when applicable.

---

## [Unreleased] — targeting `v0.3.0` ("Daily Puzzle")

### Security — launch hardening (2026-11-23, `docs/LAUNCH_CHECKLIST.md`)

- **Every database function was callable by anonymous visitors** (Postgres grants `EXECUTE` to `PUBLIC` by default), including `internal_mp_apply_elo`, which rewrites ratings. All functions are now revoked and only the app's entry points are granted back. Migration `20261123000000_launch_hardening.sql`.
- **Ratings are server-only.** Direct writes to `user_ratings` and the client-supplied `apply_user_rating` are gone; Glicko-2 runs in the database (`internal_glicko2`, verified against the `glicko2` npm package).
- **Daily leaderboard is server-authoritative.** `daily_schedule` fixes today's puzzle; `start_daily_attempt` starts the clock; `submit_daily_guess` checks each path, counts wrong tries and computes the time. Removed `submit_daily_leaderboard` and `bump_server_daily_streak`.
- **Multiplayer rounds are verified and server-timed.** `mp_submit_round` takes the grid and the answer path, requires both players' grids to match (mismatch voids the match), uses the server's round start for timing and allows one submission per round. New `mp_claim_forfeit` for opponents who disappear.
- **Profiles:** players can edit only cosmetic columns (no self-set streaks).

### Changed

- **No kids' accounts.** Accounts are general-audience (13+, confirmed at sign-in); children play as guests. Removed `is_kids_account`, `parent_email`, `parent_verified_at`, `set_parent_email` and the Settings section. See ADR-009.
- **Privacy Policy and Terms** rewritten to match what the app does (still to be reviewed; contact address pending in `src/constants/legal.ts`).
- **Error reports** go to the project's own Supabase by default (`report_client_error`, write-only `client_errors`, not linked to accounts, kept 90 days).
- **Account deletion** now really deletes: `purge_deleted_accounts()` runs daily via pg_cron.
- **Puzzle bundle:** +160 unique-solution hard puzzles for weekend dailies (610 total); existing puzzles unchanged. `puzzles:import-db` now also fills `daily_schedule` two years ahead with the app's own picker.

### Added

- `npm run db:test`: applies all migrations to a scratch Postgres and runs 53 security and behaviour checks; runs in CI. `npm run db:audit-live`: probes the deployed project with the public key.

Phase-2 kickoff: the **Puzzles** pillar lands as a static, deterministic, fully-self-contained content pipeline. Daily Puzzle is playable end-to-end with its own streak. Replay has been removed from scope; EPIC-23 (IndexedDB) is still ahead before the version cuts.

### Added

- **Puzzle data model** (`Puzzle`, `PuzzleSolution`, `PuzzleBundle`) — every puzzle ships its concrete grid, target, and a known-good `optimalSolution`, so the runtime never re-runs the generator and every device sees identical content. `EPIC-19.01`.
- **Seeded RNG** (`src/utils/rng.ts`, `xmur3` + `mulberry32`). Any string seed → reproducible stream. Backbone of the generator and the daily picker.
- **Theme registry** (`src/constants/puzzleThemes.ts`): `addition-only`, `subtraction-only`, `mixed-add-sub`, `multiplication`, `mixed-all`, `large-grid` — each with per-difficulty geometry recipes. `EPIC-21.01` (pulled in early to power the generator).
- **Puzzle generator** (`scripts/generate-puzzles.ts`, `npm run puzzles:generate`). N puzzles per (theme, difficulty), seeded, deduped by grid+target, with computed Glicko-style rating in `[800, 2200]`. `EPIC-19.02`.
- **Static bundle** at `public/puzzles.json` with `schemaVersion`, `generatedAt`, and `count`. Currently 450 puzzles across 6 themes × 3 difficulties (~617 KiB raw, ~140 KiB gzip). `EPIC-19.03`.
- **`usePuzzles()` hook** (`src/hooks/usePuzzles.ts`) and pure helpers `loadPuzzleBundle`, `queryPuzzles`, `pickDailyPuzzle`, `utcDateKey` (`src/utils/puzzleStore.ts`). Module-local cache so the bundle fetches once per session. `EPIC-19.04`.
- **Validator** (`scripts/validate-puzzles.ts`, `npm run puzzles:validate`). Verifies every puzzle's `optimalSolution` evaluates to its `target`, plus tile id integrity and rating range. Exits non-zero on the first failure so it's CI-ready (not yet wired into `.github/workflows/ci.yml`). `EPIC-19.05`.
- **Daily Puzzle** at `/daily`. Deterministically picks one puzzle per UTC date from the bundle. Reuses the existing `ButtonGameBoard` (now puzzle-aware via `initializePuzzle`). `EPIC-20.01`.
- **`DailyPuzzleBanner`** on the Learn home — shows today's date, solved/unsolved state, "first try!" badge, and current 🔥 streak. Links into `/daily`. `EPIC-20.01`.
- **Daily-puzzle progress slice** in `progressStore` (separate from the learning streak): `daily: Record<dateKey, DailyPuzzleResult>`, `dailyStreak: StreakState`, and `completeDailyPuzzle()` action with same-day idempotence. `progressStore` schema bumped `v1 → v2` with a `migrate` step that grafts the new fields onto existing persisted state. `EPIC-20.03`.
- **`gameStore.initializePuzzle(puzzle)`** action + `currentPuzzleId` state field + `dailyPuzzle` `GameMode`. The board, result page, and back-navigation all branch on this mode.
- **Daily-mode `ResultPage`** branch — shows time, wrong-tap count, current daily streak, and a "first try!" ⭐ vs 🏆.
- **Kids-friendly UI refresh** across the Learn landing, gameplay header, target card, and result screens. Learn now has a Duolingo-inspired desktop shell with left navigation, a central section path, right-side progress cards, a friendlier Daily Puzzle card, stronger level states, and clearer level/round context during gameplay.
- **Dev tool**: `tsx@4` (devDep) so the puzzle scripts run without a separate ts-node setup.

### Changed

- `logger.isDev` now tolerates `import.meta.env` being undefined (Node CLI scripts), so `scripts/*.ts` can import any module that uses the logger.
- Daily-puzzle wrong submissions are tracked in `gameStore.wrongAttempts` (previously Learn-only) so the daily result screen can show "first try!".
- The Learn-mode result page no longer shows a `Replay` button; replay is not required and EPIC-22 is cancelled.
- `TargetDisplay` now presents the current target as a large challenge card with round progress for all multi-round modes.
- `LearningPath.test.tsx` — selector tightened to filter level buttons by `data-level-id` so the new `DailyPuzzleBanner` button doesn't leak into the count.
- ESLint `scripts/**` override: CLI scripts may use `console.*` directly.

### Notes / known limitations

- `public/puzzles.json` is precached by the service worker (PWA precache jumped to 397 KiB). Follow-up: exclude from precache and lazy-fetch on `/daily` mount.
- `subtraction-only/medium`+`hard` recipes were narrowed to 2-tile chains and the `large-grid/hard` recipe to 3-tile chains; the original 3-tile / 4-tile subtraction shapes had near-zero solvable density inside the published target ranges.
- ID note: the Phase-2 "Puzzle Streak" epic is **EPIC-53** (renumbered from a colliding EPIC-25 — that ID was already taken by the Phase-1 Learning Path that shipped first).

### Tests

- **+25 tests** (rng: 7, puzzleStore + `pickDailyPuzzle` + cache: 9, `usePuzzles`: 3, progressStore daily: 6). Total: **110 tests in 12 files** (was 97 at v0.2.0).
- Focused UI tests updated for the kid-friendly Learn landing, gameplay header, and target-card copy.

---

## [0.2.0] — 2026-05-10

Closes Phase 1 (UX polish) and ships the Duolingo-style Learn path that landed mid-cycle. The home is now a tabbed Learn / Play shell; the game board is keyboard-navigable, screen-reader-labelled, themeable (Light / Dark / System), Zen-mode-able, mobile-viewport-hardened, and now has an `ErrorBoundary`, a SW update toast, a Settings drawer, and an Adult / Kids audience toggle. CI runs every push.

### Added

- **Learning Path (Duolingo-style guided curriculum).** New default home is a `Learn | Play` tabbed shell (`HomeShell`). The Learn tab renders 25 hand-authored levels grouped into 5 units (Addition → Subtraction → Mixed +/− → Multiplication → Bigger Grids). Tap an unlocked node to play. Stars are accuracy-based (3 = no wrong taps, 2 = ≤1, 1 = completed). XP and streak shown in the header. Locked nodes are visible but non-interactive. Routes: `/learn`, `/play`, `/play/difficulty`, `/game?level=<id>`. Last-used tab persisted to `localStorage`. `EPIC-25` / ADR-003.
- **`progressStore`** — Zustand store persisted to `localStorage` (`gridgenius:progress:v1`) tracking per-level `bestStars`, `bestScore`, `playCount`, total `xp`, and consecutive-day `streak` (UTC). Repeating a level only credits XP for star _improvements_. `EPIC-25.03`.
- **`prefsStore`** — Zustand store persisted to `localStorage` (`gridgenius:prefs:v1`) holding `theme: 'light' | 'dark' | 'system'`, `zen`, and `audience: 'adult' | 'kids'`. `EPIC-12.01` / `EPIC-13.01` / `EPIC-16.02` / `EPIC-18.01`.
- **`initializeLevel(levelId)` action** on `gameStore` (Learn-mode entry point) plus per-session `wrongAttempts` so `ResultPage` can compute stars without coupling to the game loop. `EPIC-25.02`.
- **`*FromConfig` variants** of `gridGenerator` accept a `DifficultyConfig` directly; legacy `DifficultyLevel`-keyed wrappers are retained for back-compat. `EPIC-25.01`.
- **Themes.** Tailwind `darkMode: 'class'` enabled. New `ThemeApplier` toggles `<html class="dark">` and listens for OS theme changes when `system` is selected. App shell, HomeShell, and game board chrome carry dark variants. `EPIC-12.01`.
- **Zen mode.** Floating 🧘 button on the game board (and `Z` keyboard shortcut) hides the header / score / round / difficulty strip. State lives in `prefsStore`. `EPIC-13.01`.
- **Keyboard navigation.** Tile wrappers are `role="button"` with roving `tabIndex`; ↑↓←→ / Home / End move focus, Enter / Space pick or unpick, Escape clears the selection (or closes the help dialog). Operator buttons activate via Enter / Space too. `?` (Shift+/) opens a keyboard-shortcut help dialog. Visible `focus-visible` ring distinct from selected/hint states. `EPIC-10`.
- **Screen-reader / ARIA.** Tiles expose `aria-label` ("Tile value 5, row 2, column 3, selected") and `aria-pressed`. Operators get `aria-label` ("plus between these columns"), `aria-pressed`, `aria-disabled`. `TargetDisplay` and `CalculationFeedback` are `role="status" aria-live="polite"` so SRs read the target on round change and "5 + 3 = 8 Correct!" on submit. `EPIC-11.01-03`.
- **Mobile viewport hardening.** `html` / `body` / `#root` sized with `100dvh` (with `100vh` fallback). New `.safe-pad` utility applies `env(safe-area-inset-*)` to the app shell, ResultPage, and Game route. `NumberTile` size pipeline switched from fixed `w-12/14/16` to `min(11vw, 56px)` / `min(13vw, 64px)` / `min(16vw, 72px)` so 5×5 grids fit a 320 px viewport without horizontal scroll. Hint/Clear floating buttons re-anchored to bottom-right. PWA `orientation` changed from `portrait` to `any`. `EPIC-14`.
- **Reduced motion.** `<MotionConfig reducedMotion="user">` at the App root tells Framer Motion to honour the OS preference. Global `@media (prefers-reduced-motion: reduce)` short-circuits CSS transitions and `animate-pulse`. `CelebrationParticles` early-returns when reduced motion is set, and pauses on `document.visibilitychange` to stop draining battery in background tabs. `EPIC-15.01` / `15.04`.
- **`ErrorBoundary`** at the app root. Catches render-time exceptions, logs via `logger.error`, shows a friendly card with a "Reload" button. Dev builds also surface the error message in a selectable `<pre>`. `EPIC-17.01`.
- **`UpdateToast`** subscribes to `vite-plugin-pwa`'s `registerSW({ onNeedRefresh })`. When a new service worker is waiting, shows a centred bottom toast with "Refresh" (calls `updateSW(true)`) and a dismiss control. `aria-live="polite"`. No-op in non-SW environments. `EPIC-17.02`.
- **`SettingsDrawer`** (right-side slide-in, `role="dialog"`, click-backdrop or Esc to close): Theme (segmented), Audience (Adult / Kids), Zen toggle, Motion (defers to OS), Reset all progress (gated by `window.confirm`). Wired into a `⚙` button in the home header. `EPIC-16.01`.
- **Kids mode.** Hides the score/round/difficulty stats row in `ButtonGameBoard` and replaces stars + XP + stat grid in the Learn-mode result with "🎉 Great job!" — progress is still recorded so the curriculum advances. `EPIC-18.02`.
- **CI.** `.github/workflows/ci.yml` runs `npm ci` → `format:check` → `lint` → `tsc --noEmit` → `test` → `build` on every push to `main` and on PRs. Concurrency-cancels stale runs on the same ref. Node 20. `EPIC-08.01`.
- **Prettier 3** + `.editorconfig` + `eslint-config-prettier` (so the two tools don't fight). `npm run format` and `npm run format:check`. The whole codebase has been reformatted; `format:check` is part of the CI gate.
- **husky 9 + lint-staged 15** pre-commit hook runs `eslint --fix --max-warnings 0` + `prettier --write` on staged `*.{ts,tsx}` (and `prettier --write` on `*.{json,css,md}`). Auto-installed by `npm install` via the `prepare` script.
- **Tests:** 48 new tests this cycle (15 Learn-mode + progressStore foundations from EPIC-25, then 6 ResultPage star-threshold tests, 7 SettingsDrawer tests, 1 Kids-mode ResultPage test, plus assorted regression coverage). Total: **97 tests in 9 files** (was 49 at v0.1.0).

### Changed

- **Routing reshape.** `/` now renders the tabbed `HomeShell` and redirects to the last-used tab (default `Learn`). The lobby moved from `/` to `/play`; the difficulty picker moved from `/difficulty` to `/play/difficulty`. The `/game` route is unchanged for Play-mode; Learn-mode entries use `/game?level=<id>`. `EPIC-25.04`.
- **Quick Game now uses the `easy` config** (3×3 grid, 2 tiles + 1 operator) instead of `medium`. ADR-002 consequences list updated. `EPIC-06` follow-up.
- **`ButtonGameBoard` init effect** is now guarded by a ref keyed on `(levelId | difficulty::gameMode)` so React 18 StrictMode no longer regenerates the grid twice on first mount. `EPIC-05.04`.
- **`HomeShell`** dark variants applied to header / nav / tabs.

### Fixed

- iOS Safari layout was clipped on first load when the URL bar was visible — replaced `h-screen` with `h-full` on routed screens, with `100dvh` set globally on `html / body / #root`. `EPIC-14.01`.
- Hint/Clear floating buttons could overlap the grid in landscape on short viewports — re-anchored to `bottom-right`, position is now header-height-independent. `EPIC-14.02`.

### Documentation

- ADR-003: Hybrid home (Learn-default path with Play lobby as secondary tab).
- `docs/plans/README.md` and `docs/plans/EPIC-10-learning-path.md`.
- `BACKLOG.md`: every Phase 0 + Phase 1 epic now has fine-grained outcome notes per task (what was done, what was deferred and why).
- `ROADMAP.md`: marked EPIC-25 done and renumbered the duplicate Phase 2 "Puzzle Streak" to **EPIC-53**.

---

## [0.1.0] — 2026-05-10

First production-readiness release. Closes Phase 0 — the codebase now builds, lints, and tests cleanly; the PWA deploys correctly under `/bingo/`; gameplay is preserved; documentation captures vision/roadmap/decisions.

### Added

- `docs/` folder with split living documentation: `VISION.md`, `ROADMAP.md`, `BACKLOG.md`, `CHANGELOG.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `GLOSSARY.md`. Pivots project direction toward the four lichess-inspired pillars (Puzzles, Multiplayer, Tournaments, UX polish) on a phased static → BaaS → real-time roadmap.
- ESLint configuration (`.eslintrc.cjs`) with `@typescript-eslint`, `react-hooks`, `react-refresh`, `no-console`, and `consistent-type-imports`. `EPIC-01.03`.
- `src/utils/logger.ts` — a dev-only logger; `debug`/`info`/`log` are stripped in production builds, `warn`/`error` always pass through. `EPIC-04.01`.
- `public/404.html` SPA fallback (rafgraph/spa-github-pages snippet) + restore script in `index.html` so deep links survive GitHub Pages refreshes. `EPIC-02.03`.
- Open Graph + Twitter Card meta tags on `index.html`; `<link rel="mask-icon">`; `viewport-fit=cover` for iOS safe-areas. `EPIC-02.06`.
- Test harness: Vitest + React Testing Library + jest-dom + jsdom + user-event. New scripts `npm test`, `npm run test:watch`, `npm run test:coverage`. **49 tests across 4 files (calculator, gridGenerator, gameStore, ButtonGameBoard smoke).** `EPIC-07.01–07.06`.
- `gameStore.cleanup()` action and a test-only `__getActiveTimerHandlesForTests()` helper to assert timer hygiene from tests. `EPIC-05.01/02`.
- `roundsTimeMs` accumulator in `GameState` so `totalTime` tracks wall-clock across all completed rounds, not just the most recent. `EPIC-05.05`.
- `initError` field in `GameState` + an inline error-fallback view in `ButtonGameBoard` for when target generation can't find a solvable grid. `EPIC-05.03`.
- ADR-002 `Accepted` status with full Option-2 consequences documented.
- Full project `README.md` replacing the one-line stub: status, quick start (incl. test scripts), docs map, tech stack, gameplay overview, project layout, contributing pointer. `EPIC-09.01`.
- `CONTRIBUTING.md` covering setup, quality bars, conventions, the docs-are-part-of-the-change workflow, and the release process. `EPIC-09.04`.
- `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/ISSUE_TEMPLATE/config.yml`. `EPIC-09.05`.
- `package.json` version bumped from `0.0.0` to `0.1.0`. `EPIC-09.03`.

### Changed

- `BrowserRouter` now uses `basename={import.meta.env.BASE_URL}` so the app works under the `/bingo/` GitHub Pages path. `EPIC-02.01`.
- PWA manifest `start_url` and `scope` set to `/bingo/`, matching the deploy base. `EPIC-02.02`.
- Icon refs in `index.html` switched from absolute `/foo.svg` to relative `./foo.svg` so they resolve correctly under the base path. `EPIC-02.04`.
- All `console.*` calls in `src/` routed through `logger` (calculator, gridGenerator, gameStore, ButtonGameBoard, OperatorIcon, PWAInstallPrompt). `EPIC-04.02`.
- `PWAInstallPrompt` no longer uses `any` for `deferredPrompt`; typed as `BeforeInstallPromptEvent`. `EPIC-04.02`.
- `Timer` simplified — dropped redundant `displayTime` state and converted to selector-form Zustand subscription.
- `tsconfig.json` adds `"types": ["vite/client"]` so `import.meta.env` typechecks.
- `ButtonGameBoard` switched to selector-form Zustand subscriptions; init effect now returns a `cleanup` callback so unmount tears down timers/timeouts. `EPIC-05.01/02`.
- Quick Game flow simplified per ADR-002 Option 2: `GameModeSelector` routes Quick Game directly to `/game`; `App` presets difficulty to `medium`; `DifficultySelector` no longer reachable from Quick Game.
- `DifficultySelector` title fallthrough fixed — explicit `puzzle` case + generic default replaces the buggy "Puzzle Mode" fallback. `EPIC-06.05`.
- "Back to lobby" from Quick Game now returns to `/` (no difficulty picker exists). `EPIC-06.06`.

### Fixed

- TypeScript build error in `App.tsx`: `selectedOperatorCount` (`number | null`) coerced to `number | undefined` before passing to `ButtonGameBoard`. `EPIC-01.01`.
- TypeScript build error in `ButtonGameBoard.tsx`: unused `operatorCount` prop renamed to `_operatorCount` and later removed entirely with EPIC-06. `EPIC-01.02`.
- `npm run build`, `npm run lint` (`--max-warnings 0`), `tsc --noEmit`, and `npm test` (49/49) all exit 0 on a clean tree.
- **Time-Attack interval leak**: handle now lives in module scope; `cleanup()` / `resetGame()` / `pauseGame()` / re-init all clear it. Tests assert no double-interval on consecutive `initializeGame` calls. `EPIC-05.01`.
- **Auto-advance `setTimeout` leak**: `submitSolution`'s 1.5s delay is tracked module-side and cleared on `cleanup()`, mode change, and game completion. `EPIC-05.02`.
- **`initializeGame` infinite recursion**: capped at 5 attempts; on exhaustion enters `initError` state with a user-visible message instead of stack-overflowing. `EPIC-05.03`.
- **`totalTime` overwrite bug**: was set to "elapsed since current round started" instead of "elapsed across all rounds". Fixed via `roundsTimeMs` accumulator updated on each `nextRound`, `stopRoundTimer`, and game completion. `EPIC-05.05`.

### Removed

- Orphan swipe prototype `src/components/GameBoard/Grid.tsx` (~210 lines, never imported). `EPIC-03.01`.
- `SwipeState`, `TouchPosition`, `TOUCH_THRESHOLD`, `updateSwipeState` action, and every `swipeState: { ...initialSwipeState }` reset call in the store. `EPIC-03.02`.
- `getOperatorsBetweenTiles` from `calculator.ts` (returned hardcoded `+`, never called). `EPIC-03.03`.
- Commented-out "Selection Status Display" block in `ButtonGameBoard`. `EPIC-03.04`.
- `OperatorSelector.tsx` — Quick Game operator-count picker (per ADR-002 Option 2). `EPIC-06.07`.
- `/operators` route. `EPIC-06.07`.
- `quickGameOperatorCount` field, `setQuickGameOperators` action, and the `operatorCount` prop on `ButtonGameBoard`. `EPIC-06.07`.
- Reference to division (`÷`) anywhere in the UI. `EPIC-06`.

---

## [0.0.0] — historical baseline

The state of `main` when documentation was introduced. Captured for reference; not a tagged release.

### Existing features

- Tap-based gameplay on a 3×3 (Easy) or 4×4 (Medium/Hard) grid.
- Game modes wired in UI: Quick Game, Time Attack, Classic. (Endless, Puzzle marked "Coming Soon".)
- Difficulty selector with Easy / Medium / Hard.
- Quick Game operator-count selector (UI only — does not affect gameplay; see `EPIC-06`).
- Hint button (brute-force find a valid solution).
- Confetti celebration on correct answers.
- PWA install prompt; manifest with Grid Genius branding.
- Result page with score, time, and difficulty.
- Framer Motion screen transitions.

### Known issues at baseline

- `npm run build` fails (TypeScript errors). `EPIC-01.01`, `EPIC-01.02`.
- `npm run lint` fails (no ESLint config). `EPIC-01.03`.
- PWA scope and router base mismatched with `/bingo/` deploy path. `EPIC-02`.
- Time-Attack interval and submit-solution timeouts can leak across remounts. `EPIC-05`.
- Quick-Game operator count is decorative only. `EPIC-06`.
- Orphan swipe-prototype code (`Grid.tsx`, `SwipeState`). `EPIC-03`.
- Console logs ship to production. `EPIC-04`.
- No tests, no CI, no LICENSE. `EPIC-07/08/09`.
