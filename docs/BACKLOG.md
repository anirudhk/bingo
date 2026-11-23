# Backlog

The active to-do list. Tick checkboxes as work is completed; link the PR or commit. Add new tasks at the bottom of the relevant epic. When an epic is fully done, mark its header `[x]` and move it to "Completed epics" at the bottom.

> Status tokens: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled
> Priority: `P0` blocker · `P1` next release · `P2` nice-to-have · `P3` future
> Estimate: `XS` <½d · `S` ½–1d · `M` 1–3d · `L` 3–7d · `XL` >1w

---

# Phase 0 — Production-readiness

## EPIC-01 — Build pipeline & lint config restored — `[x]`

**Why:** `npm run build` and `npm run lint` both fail today.

- [x] EPIC-01.01 `P0` `XS` Fix `App.tsx:124` — coerce `selectedOperatorCount` to `number | undefined`.
- [x] EPIC-01.02 `P0` `XS` Fix `ButtonGameBoard.tsx:22` — rename `operatorCount` to `_operatorCount` (kept in API surface; comment references EPIC-06).
- [x] EPIC-01.03 `P0` `S` Add `.eslintrc.cjs` (legacy config; ESLint 8 in repo). Includes `@typescript-eslint/recommended`, `react-hooks/recommended`, `react-refresh`, plus `no-console`, `consistent-type-imports`, and `no-unused-vars` with `^_` ignore pattern.
- [x] EPIC-01.04 `P0` `XS` `npm run lint` exits 0 with `--max-warnings 0` on a clean tree. Also added `vite/client` to `tsconfig.types` so `import.meta.env` typechecks.
- [x] EPIC-01.05 `P1` `XS` Prettier 3 + `.editorconfig` + `eslint-config-prettier`. `npm run format` and `npm run format:check` scripts. Codebase reformatted; format check is now part of the gate. `.prettierrc.json`, `.prettierignore`, `.editorconfig` checked in.
- [x] EPIC-01.06 `P1` `S` `husky@9` + `lint-staged@15` pre-commit hook: runs `eslint --fix --max-warnings 0` + `prettier --write` on staged `*.{ts,tsx}` and `prettier --write` on `*.{json,css,md}`. Hook lives in `.husky/pre-commit`; auto-installed via `prepare` script on `npm install`.

## EPIC-02 — Routing + PWA manifest aligned with `/bingo/` base — `[x]`

**Why:** GitHub Pages serves under `/bingo/`. Router has no `basename`; PWA scope is `/`. Direct URL loads 404 in prod.

- [x] EPIC-02.01 `P0` `XS` Pass `basename={import.meta.env.BASE_URL.replace(/\/$/, '')}` to `BrowserRouter`. Trailing slash stripped because React Router 6 disallows it.
- [x] EPIC-02.02 `P0` `XS` Set PWA `start_url` and `scope` to `/bingo/` in `vite.config.ts`. Verified in built `dist/manifest.webmanifest`.
- [x] EPIC-02.03 `P0` `S` Add `public/404.html` using rafgraph/spa-github-pages MIT-licensed snippet (`pathSegmentsToKeep = 1`); paired with restore script in `index.html`.
- [x] EPIC-02.04 `P0` `XS` Switched icon hrefs to relative (`./favicon.svg`, etc.) so they resolve under `/bingo/`. Also added `<link rel="mask-icon">`.
- [x] EPIC-02.05 `P1` `XS` Decision: **product name is "Grid Genius"** (everywhere user-visible: manifest, headers, copy, package name). **Repo stays `bingo`** to preserve the live URL `anirudhk.github.io/bingo/` and the PWA scope/`start_url`; renaming would break installed PWAs and bookmarks. Documented in this entry; no code changes needed (`package.json#name` is already `grid-genius`, `homepage` is already `https://anirudhk.github.io/bingo`).
- [x] EPIC-02.06 `P1` `XS` Added Open Graph (`og:title|description|type|url|image|locale`) and Twitter Card meta tags + `viewport-fit=cover` for iOS safe-areas.

## EPIC-03 — Dead code & swipe-era leftovers removed — `[x]`

- [x] EPIC-03.01 `P1` `XS` Deleted `src/components/GameBoard/Grid.tsx` (orphan swipe prototype, ~210 lines).
- [x] EPIC-03.02 `P1` `XS` Removed `SwipeState`, `TouchPosition`, `TOUCH_THRESHOLD`, `updateSwipeState`. Cleaned every `swipeState: { ...initialSwipeState }` reset call site in `gameStore`. Reformatted `types/game.ts` while there (indent was inconsistent).
- [x] EPIC-03.03 `P1` `XS` Removed `getOperatorsBetweenTiles` from `calculator.ts`.
- [x] EPIC-03.04 `P1` `XS` Removed the commented-out "Selection Status Display" block from `ButtonGameBoard`.
- [x] EPIC-03.05 `P1` `XS` Replaced the misleading "Prevent text selection during swipes" comment in `index.css`.
- [x] EPIC-03.06 `P2` `XS` Verified `dist/` is **not** tracked in git (already gitignored, working-dir copy is fine).

## EPIC-04 — Logger + console hygiene — `[x]`

- [x] EPIC-04.01 `P1` `XS` Added `src/utils/logger.ts`. `debug`/`info`/`log` no-op in production via `import.meta.env.DEV`; `warn`/`error` always pass through so genuine problems surface.
- [x] EPIC-04.02 `P1` `S` Replaced all `console.*` call sites in `src/` (calculator, gridGenerator, gameStore, ButtonGameBoard, OperatorIcon, PWAInstallPrompt) with `logger`. Also dropped the `any` type on `BeforeInstallPromptEvent`.
- [x] EPIC-04.03 `P2` `XS` ESLint `no-console` rule enabled (`warn` severity) — catches new violations, allows `console.warn`/`console.error` for parity with `logger`. The logger file itself uses `// eslint-disable-next-line` headers.

## EPIC-05 — Timer / `setTimeout` leak fixes; lifecycle correctness — `[x]`

(EPIC-05.06 — the `roundTime` rename — was explicitly deferred and is fine to defer further; closing the epic.)

- [x] EPIC-05.01 `P0` `S` Time-Attack interval handle now lives in module scope; cleared on `resetGame`, `pauseGame`, `cleanup`, init re-entry, and natural timeout-to-zero. Also clears on mode change implicitly via the leading clear in `initializeGame`.
- [x] EPIC-05.02 `P0` `S` Auto-advance `setTimeout` in `submitSolution` now tracked module-side; cleared on `cleanup`, `resetGame`, init re-entry, and game completion. `ButtonGameBoard` calls `cleanup()` on unmount.
- [x] EPIC-05.03 `P1` `S` `initializeGame` capped at `MAX_INIT_RETRIES = 5`; on exhaustion the store enters `initError` state instead of recursing, and `ButtonGameBoard` renders a "Couldn't start the game" fallback with a "Back to menu" button.
- [x] EPIC-05.04 `P1` `S` `ButtonGameBoard` init effect now guarded by a `lastInitKeyRef` keyed on `(levelId | difficulty::gameMode)`. StrictMode's double-invoke no longer regenerates the grid twice on first mount; real prop changes still re-init via the ref reset in cleanup. Tests still green (all 83 pass).
- [x] EPIC-05.05 `P1` `S` `totalTime` and a new `roundsTimeMs` accumulator now track wall-clock time across all rounds. `nextRound` and `stopRoundTimer` accumulate per-round elapsed; `updateTimer` reports `roundsTimeMs + (now - roundStartTime)`.
- [ ] EPIC-05.06 `P2` `XS` Rename `roundTime` → `elapsedSinceRoundStart` to match what it stores. _(Deferred — name now accurate per JSDoc; rename can wait for a wider API pass.)_

## EPIC-06 — Quick-Game operator-count + `÷` consistency — `[x]`

**Resolved per ADR-002 Option 2 — division removed from UI, Quick Game picker dropped.**

- [x] EPIC-06.01 `P0` `XS` Decided: Option 2 (remove division and operator-count picker entirely). ADR-002 marked `Accepted`.
- [-] EPIC-06.02 `P1` `M` (cancelled) Add `'/'` to `OPERATORS`/`calculator`/target generation. Not needed under Option 2.
- [-] EPIC-06.03 `P1` `S` (cancelled) Dynamic `DifficultyConfig` from `quickGameOperatorCount`. Not needed.
- [-] EPIC-06.04 `P1` `S` (cancelled) Wire `operatorCount` through `ButtonGameBoard`. Not needed.
- [x] EPIC-06.05 `P1` `XS` `DifficultySelector` title fallthrough fixed — explicit case for `puzzle`, generic "Choose Difficulty" default.
- [x] EPIC-06.06 `P1` `XS` `handleBackToLobby` returns to `/` for Quick Game (no difficulty picker exists), `/difficulty` otherwise.
- [x] EPIC-06.07 `P0` `S` Deleted `OperatorSelector.tsx`, removed `/operators` route, and dropped `quickGameOperatorCount` field + `setQuickGameOperators` action + `operatorCount` prop. Quick Game now navigates straight to `/game` via `GameModeSelector`.
- [x] EPIC-06.08 `P1` `XS` Quick Game switched from `medium` to `easy` config (3×3, 2 tiles + 1 operator) — true pick-up-and-play feel. `App.QUICK_GAME_DIFFICULTY` and `gameStore.initializeGame` updated; ADR-002 consequences refreshed.

## EPIC-07 — Test harness — `[x]`

- [x] EPIC-07.01 `P0` `S` Installed `vitest@4`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`.
- [x] EPIC-07.02 `P0` `XS` Added `vitest.config.ts` (jsdom env, globals, coverage v8); `src/test/setup.ts` (jest-dom matchers, `matchMedia`/`PointerEvent` jsdom shims, RTL `cleanup`); `npm test`, `npm run test:watch`, `npm run test:coverage` scripts.
- [x] EPIC-07.03 `P0` `S` `src/utils/calculator.test.ts` — covers `calculateResult` left-to-right precedence, mixed-op combos, throw on invalid op; `calculatePathResult` mismatched lengths, 2-tile/3-tile paths, unsupported lengths; `isValidPath` rejects diagonal/gaps/L-shapes; `getTilesBetween` horizontal/vertical/diagonal; `formatCalculation` formatting. **17 tests.**
- [x] EPIC-07.04 `P0` `M` `src/utils/gridGenerator.test.ts` — `generateGrid` shape per difficulty, `getAllCombinations` straight-line + range invariants, `generateTargets` count + reachability + empty-set behavior, `generateValidGrid` exercise. **11 tests.**
- [x] EPIC-07.05 `P0` `M` `src/store/gameStore.test.ts` — init clears prior state + starts time-attack interval, no double-interval on re-init, submit correct/wrong + auto-advance scheduling, `cleanup` clears timeouts, `nextRound` end-of-game branch + accumulator advance, time-attack tick → completion via fake timers, retry cap → `initError` via `vi.doMock`. **17 tests.**
- [x] EPIC-07.06 `P1` `M` `src/components/GameBoard/ButtonGameBoard.test.tsx` — header chrome renders, difficulty label appears, init-error fallback renders with "Back to menu", `cleanup` runs on unmount. **4 tests.**
- [x] EPIC-07.07 `P1` `S` `ResultPage.test.tsx` covers all star thresholds (3 / 2 / 1) for Learn mode, the "Next level" CTA presence, the path-finished message on the final level, and Play-mode legacy header — using deterministic store stubbing rather than fragile DOM snapshots. 6 new tests.
- [-] EPIC-07.08 `P2` `M` (cancelled / re-scoped) Playwright e2e deferred — Vitest + RTL coverage is sufficient for v0.2.0; an actual e2e harness is its own epic that needs its own decision (browser matrix, CI runner, fixture story, deterministic RNG seed). Not blocking the release.

**Total tests grow as new code lands; check CHANGELOG `[Unreleased]` for the current count.**

## EPIC-08 — CI on GitHub Actions — `[~]`

- [x] EPIC-08.01 `P0` `S` `.github/workflows/ci.yml`: Node 20, runs `npm ci && format:check && lint && tsc && test && build` on push to `main` and on PRs. Concurrency-cancels stale runs on the same ref. (Matrix Node 20+22 deferred — single Node version keeps CI fast and matches local; can be added if a Node-version regression bites.)
- [ ] EPIC-08.02 `P1` `S` `.github/workflows/deploy.yml`: on tag `v*`, build & publish to `gh-pages`. _(Deferred — manual `npm run deploy` works today; automate when the release cadence picks up.)_
- [ ] EPIC-08.03 `P2` `XS` Lighthouse CI on PR (PWA + perf + a11y budgets). _(Deferred — Phase 1 exit-criteria work.)_
- [ ] EPIC-08.04 `P2` `XS` Bundle-size check via `vite-bundle-visualizer` artifact. _(Deferred — nice-to-have.)_

## EPIC-09 — Repo hygiene — `[~]`

- [x] EPIC-09.01 `P0` `S` Replaced one-line `README.md` with full project README: status badge, play link, quick-start (incl. test scripts), docs map, tech stack, gameplay overview, project layout, contributing pointer.
- [!] EPIC-09.02 `P0` `XS` Add `LICENSE`. **Blocked by ADR-001** — user opted to defer the license decision; repo remains "all rights reserved" for now.
- [x] EPIC-09.03 `P0` `XS` Bumped `package.json.version` from `0.0.0` to `0.1.0`. Tag `v0.1.0` to be created when this is committed.
- [x] EPIC-09.04 `P1` `XS` Added `CONTRIBUTING.md` covering setup, quality bars, conventions, docs-as-part-of-the-change workflow, releases. **`CODE_OF_CONDUCT.md` skipped** per user choice.
- [x] EPIC-09.05 `P1` `XS` Added `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/ISSUE_TEMPLATE/config.yml`.
- [-] EPIC-09.06 `P1` `XS` (cancelled) `SECURITY.md`. User opted to skip — relying on GitHub Security Advisories.

---

# Phase 1 — UX polish

## EPIC-25 — Learning Path & Hybrid Lobby — `[x]`

**Why:** Today's home screen is a mode lobby, which works for advanced players but gives new users no obvious next step. A Duolingo-style **Learn** path becomes the default home; the existing lobby moves to a **Play** tab. Curriculum is data (25 levels in 5 units, `+` → `+ -` → `+ - *` → bigger grids). Stars are accuracy-based; XP + streak are dignified (no manipulative loops).

**Plan:** [plans/EPIC-10-learning-path.md](./plans/EPIC-10-learning-path.md) · **ADR:** ADR-003 in [`DECISIONS.md`](./DECISIONS.md).

- [x] EPIC-25.01 `P1` `M` `src/constants/levels.ts` ships 25 levels in 5 units (Addition → Subtraction → Mixed +/− → Multiplication → Bigger Grids). `gridGenerator` exposes `*FromConfig` variants taking a `DifficultyConfig`; legacy `DifficultyLevel` wrappers retained for back-compat.
- [x] EPIC-25.02 `P1` `M` Added `'learning'` to `GameMode`, `currentLevelId` and `wrongAttempts` to `GameState`. New `initializeLevel(id)` action on `gameStore`. Failed submits in learning mode bump `wrongAttempts`. 9 new store tests (covers unknown-id error path and timer cleanup on level switch).
- [x] EPIC-25.03 `P1` `M` `src/store/progressStore.ts` with `zustand/middleware/persist` (key `gridgenius:progress:v1`): `levels` (best-of stars/score/playCount), `xp`, `streak` (UTC day-rollover). Unlock rule spans units. 11 tests including streak edge cases.
- [x] EPIC-25.04 `P1` `M` `HomeShell` with `Learn | Play` tabs (Learn default, last-tab persisted to `localStorage`) and XP + streak header. Routes wired: `/`, `/learn`, `/play`, `/play/difficulty`, `/game?level=`. All existing Play flows preserved.
- [x] EPIC-25.05 `P1` `M` `LearningPath` + `UnitHeader` + `LevelNode`. Renders 25 nodes from `levels.ts` driven by `progressStore` (locked nodes visible but non-interactive; completed nodes show stars). Tap unlocked node → `/game?level=<id>`.
- [x] EPIC-25.06 `P1` `S` `ResultPage` extended: accuracy-only stars in learning mode (3 = 0 wrong, 2 = ≤1, 1 = completed), animated XP gain, calls `progressStore.completeLevel()`, "Next level" CTA. Non-learning behavior preserved.
- [x] EPIC-25.07 `P1` `S` 4 `LearningPath` tests + 5 `HomeShell` tests + 2 `gridGenerator` parametric tests for restricted operator sets. Lint + tsc + test + build all green. _(For the running test count, see `CHANGELOG.md` `[Unreleased]`.)_
- [x] EPIC-25.08 `P1` `S` ADR-003 written. `VISION.md` describes Learn vs Play. `ARCHITECTURE.md` has a "Progress model" section + per-mode data flows. `ROADMAP.md` (Phase 1 entry) and `CHANGELOG.md` (Unreleased / Added + Changed) updated.

> **EPIC-25 follow-ups** (not part of this epic, tracked separately):
>
> - Cloud sync of progress → Phase 3 (covered by EPIC-26 + EPIC-32).
> - Hearts / streak freezes → explicitly **out of scope** per ADR-003 (vision principle: no manipulative loops).
> - Leaderboards → Phase 3 (EPIC-31).
> - Hint system → already exists in `ButtonGameBoard`; further work would be a new mini-epic.
> - Audio / SFX → EPIC-15.02 (deferred from Phase 1).
> - Per-unit "review boss" levels → re-open as a content epic if telemetry warrants it.
> - Time-based stars → consciously rejected in ADR-003; revisit only if a new ADR supersedes.

## EPIC-10 — Keyboard navigation — `[x]`

- [x] EPIC-10.01 `P1` `M` Tile wrappers now `role="button"` with roving `tabIndex` (only one `0` at a time, others `-1`). Arrow keys (and Home/End) move focus across the grid; the `useEffect` that mirrors `focusedIdx` to DOM only refocuses when the user is _already_ navigating inside the grid, so focus is not stolen on every render.
- [x] EPIC-10.02 `P1` `S` `Enter` / `Space` on a focused tile call `handleTileClick` (pick or unpick). Operator buttons are already standard `<button>`s — they pick up Enter/Space for free.
- [-] EPIC-10.03 `P1` `S` (deferred) Number-key operator shortcuts. Cancelled — collides with the `Z` Zen toggle and a future `1/2/3/4` could shadow OS-level shortcuts; bigger UX win is the keyboard help dialog (EPIC-10.05).
- [x] EPIC-10.04 `P1` `XS` `Escape` clears the current selection (or closes the help dialog if it is open).
- [x] EPIC-10.05 `P1` `XS` `?` (also `Shift+/`) toggles a keyboard-shortcut overlay (`role="dialog"`, `aria-modal`, click-outside-to-close, autofocus the OK button). Lists arrows, Enter/Space, Tab, Escape, Z, ?.
- [x] EPIC-10.06 `P2` `S` Visible `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2` ring on tile wrappers — distinct from selected (green) and hint (yellow pulse) states.

## EPIC-11 — Screen reader / ARIA / blind mode — `[~]`

- [x] EPIC-11.01 `P1` `M` Tiles: `aria-label="Tile value N, row R, column C[, selected]"` (added in EPIC-10). `OperatorIcon` now exposes `role="button"`, `tabIndex`, and a human-readable `aria-label` ("plus between these columns" / "minus between these rows" / "times between these rows"). Both also activate via `Enter` / `Space`.
- [x] EPIC-11.02 `P1` `S` Live regions: `TargetDisplay` is `role="status" aria-live="polite"`, re-announces on round change. `CalculationFeedback` toast is `role="status" aria-live="polite" aria-atomic`, so screen readers read "5 + 3 = 8 Correct!" or "Try Again" each time the user submits.
- [x] EPIC-11.03 `P1` `S` `aria-pressed` reflects the _selected_ state on tiles and operators; `aria-disabled` reflects unavailable operators.
- [-] EPIC-11.04 `P2` `M` (deferred) "Blind mode" / speech narration. Out of scope for v0.2.0 — needs SpeechSynthesis design and a switch in the Settings menu (EPIC-16); track separately.
- [-] EPIC-11.05 `P1` `XS` (deferred) WCAG AA contrast audit. Most chrome already passes; the hint state's yellow-on-yellow needs a darker token, and a couple of `text-gray-500 on bg-white/50` combos are borderline. Better as a focused audit pass with an axe / Lighthouse run; queued for the next pass.

## EPIC-12 — Themes & skins — `[~]`

- [x] EPIC-12.01 `P1` `M` Tailwind `darkMode: 'class'` enabled. New `prefsStore` (Zustand + persist) holds `theme: 'light' | 'dark' | 'system'`; `ThemeApplier` component sits at App root, toggles `<html class="dark">` and re-applies on `prefers-color-scheme` changes when `system` is selected. App shell, HomeShell header/nav/tabs now carry dark variants — enough that the chrome shifts immediately. Settings UI to switch theme lands with EPIC-16; the store + plumbing are ready today.
- [-] EPIC-12.02 `P2` `M` (deferred) Tile colour schemes / operator skins — needs design work; revisit post-v0.2.0.
- [x] EPIC-12.03 `P2` `S` Theme already persisted in `prefsStore` via `zustand/persist` (key `gridgenius:prefs:v1`); skins will reuse the same store when added.
- [-] EPIC-12.04 `P2` `S` (deferred) High-contrast theme — pairs with the EPIC-11 a11y audit; revisit then.

## EPIC-13 — Zen mode + density — `[~]`

- [x] EPIC-13.01 `P1` `S` Zen mode toggle. Stored on `prefsStore.zen` (persisted). Activated via the floating 🧘 button on the game board (always visible, swaps to 👁️ when Zen is on) or the global `Z` keyboard shortcut. Hides the back/menu/title/score/round/difficulty header strip; tiles, target, hint, and clear remain — the game stays playable. Shortcut ignores meta/ctrl/alt and inputs.
- [-] EPIC-13.02 `P2` `S` (deferred) Density toggle. Tile sizing is now viewport-relative (EPIC-14.03) so density variance from screen size is mostly handled; a discrete toggle is nicer-to-have, not blocking.

## EPIC-14 — Mobile viewport hardening — `[x]`

- [x] EPIC-14.01 `P0` `S` Root layout now sized with `100dvh` (with `100vh` fallback for old UAs) on `html`, `body`, and `#root`. Routed screens use `h-full` instead of `h-screen` so iOS Safari's collapsing URL bar no longer truncates content.
- [x] EPIC-14.02 `P1` `S` Hint/Clear floating buttons re-anchored from `top-40` (overlapped grid in landscape) to `bottom-4 right-3` (`sm:bottom-6 sm:right-4`). Position is now header-height-independent; verified on 320, 375, 414, and 768 widths in DevTools.
- [x] EPIC-14.03 `P1` `M` `NumberTile` size pipeline switched from fixed `w-12/14/16` to `min(11vw, 56px)` / `min(13vw, 64px)` / `min(16vw, 72px)`. 5×5 grids now fit a 320 px viewport without horizontal scroll; desktop tiles capped near the previous look.
- [x] EPIC-14.04 `P2` `S` Manifest `orientation` changed from `portrait` to `any` — game board is square-friendly and works in landscape; portrait was a leftover assumption.
- [x] EPIC-14.05 `P1` `XS` `viewport-fit=cover` already on the `<meta viewport>`. Added a `.safe-pad` utility (`padding: env(safe-area-inset-*)`) to the app shell, ResultPage, and Game route — notch and home-indicator no longer clip game content.

## EPIC-15 — Reduced motion / sound / haptics — `[~]`

- [x] EPIC-15.01 `P1` `S` Two layers: (1) `<MotionConfig reducedMotion="user">` at the App root tells Framer Motion to honour the user's OS preference for _every_ `<motion>` component, no per-component changes needed; (2) a global CSS `@media (prefers-reduced-motion: reduce)` rule short-circuits CSS transitions and Tailwind's `animate-pulse` (used by the hint state). `CelebrationParticles` now early-returns and fires `onComplete` instead of rendering confetti when reduced motion is set.
- [-] EPIC-15.02 `P1` `S` (deferred) Sound system. Out of scope for v0.2.0 — needs an audio asset budget, a SFX style decision, and a global mute UI; better as its own epic with the Settings menu.
- [-] EPIC-15.03 `P1` `XS` (deferred) Haptics toggle. Pairs naturally with the Settings menu (EPIC-16); revisit there.
- [x] EPIC-15.04 `P2` `S` `CelebrationParticles` subscribes to `document.visibilitychange` and passes `run={isActive && isVisible}` to `<Confetti>`. Hidden-tab CPU drain eliminated.

## EPIC-16 — Settings menu + persistence — `[~]`

- [x] EPIC-16.01 `P1` `M` `SettingsDrawer` (right-side slide-in, `role="dialog"`, click-backdrop or Esc to close, autofocus the close button). Sections: Theme (Light/Dark/System segmented control), Game audience (Adult/Kids), Zen mode toggle, Motion (text only — defers to OS preference; see EPIC-15), Reset all progress (gated by `window.confirm`). Wired into a `⚙` button in `HomeShell` header. 7 new tests in `SettingsDrawer.test.tsx`.
- [x] EPIC-16.02 `P1` `S` Prefs persisted via `zustand/middleware/persist` in `prefsStore.ts` (key `gridgenius:prefs:v1`). Theme, zen, audience all survive reload.
- [-] EPIC-16.03 `P1` `S` (deferred) Move wizard state (mode/difficulty) into the store. Today the wizard state lives in `App.tsx`; refreshing `/game` already redirects to `/play`, so this is a polish nice-to-have, not a bug. Worth doing alongside the eventual deep-link / shareable-URL work.

## EPIC-17 — Error boundary + SW update toast — `[x]`

- [x] EPIC-17.01 `P1` `S` `ErrorBoundary` class component mounted in `main.tsx` between `StrictMode` and `App`. Catches render-time exceptions, logs via `logger.error`, shows a friendly card with a "Reload" button. Dev builds also surface the error message inside a selectable `<pre>`.
- [x] EPIC-17.02 `P1` `S` `UpdateToast` subscribes to `vite-plugin-pwa`'s `registerSW({ onNeedRefresh })`. When a new service worker is waiting, shows a centered bottom toast with "Refresh" (calls `updateSW(true)` to swap controllers) and "✕" (dismiss). Toast is `aria-live=polite`. No-op in non-SW environments (jsdom tests).

## EPIC-18 — Kids Mode vs Adult Mode — `[~]`

- [x] EPIC-18.01 `P1` `M` Audience toggle (Adult / Kids) lives in the Settings drawer, persisted in `prefsStore` (`audience: 'adult' | 'kids'`). Will plug into per-account sync in Phase 3.
- [x] EPIC-18.02 `P1` `S` Kids Mode side-effects: (a) `ButtonGameBoard` hides the score / round / difficulty stats row; (b) `ResultPage` Learn view replaces stars + XP + stat grid with a single "🎉 Great job!" cue (progress is still recorded so the curriculum advances normally). Tile sizes are already responsive (EPIC-14.03), so no separate "bigger tiles" path is needed today.
- [-] EPIC-18.03 `P1` `S` (deferred) Sticker rewards / explicit Adult-mode rating display. Stickers need design assets; rating display lands with the rating system in Phase 3 (EPIC-29).

---

# Phase 2 — Puzzles pillar

## EPIC-19 — Puzzle data format & static pipeline — `[x]`

- [x] EPIC-19.01 `P1` `M` Define `Puzzle` schema (id, gridSeed, target, themes[], difficulty, optimalSolution, rating). — Added `Puzzle`, `PuzzleSolution`, `PuzzleBundle`, `PuzzleThemeId` to `src/types/game.ts`. Self-contained: each puzzle ships its concrete `tiles` so the runtime never re-runs the generator.
- [x] EPIC-19.02 `P1` `M` `scripts/generate-puzzles.ts` — generate N puzzles per theme/difficulty, seeded RNG, dedupe. — Done. Seeded by `r1|<theme>|<difficulty>|<index>`. Dedupe by (grid values, target). `npm run puzzles:generate`.
- [x] EPIC-19.03 `P1` `S` Bundle as `public/puzzles.json` (or per-theme chunks) with version stamp. — Single `public/puzzles.json` with `schemaVersion`, `generatedAt`, `count`. Per-theme chunking deferred (see Notes below).
- [x] EPIC-19.04 `P1` `S` `usePuzzles()` hook to query by theme/difficulty/rating. — `src/hooks/usePuzzles.ts` + pure `queryPuzzles` / `pickDailyPuzzle` helpers in `src/utils/puzzleStore.ts`. Module-local cache so the bundle fetches once.
- [x] EPIC-19.05 `P2` `S` `npm run puzzles:validate` lint script. — `scripts/validate-puzzles.ts`. Verifies every puzzle's `optimalSolution` evaluates to its target, plus tile id integrity and rating range.

> **EPIC-19 notes**
>
> - 450 puzzles ship at v0.3 (6 themes × 3 difficulties × 25). Bundle is ~617 KiB raw / ~140 KiB gzip.
> - `subtraction-only/medium`+`hard` were narrowed to 2-tile chains and `large-grid/hard` to 3-tile chains because the original 3- / 4-tile shapes had near-zero solvable density inside the published target ranges.
> - `puzzles.json` is currently inside the SW precache (PWA precache size jumped to 397 KiB). Follow-up: exclude from precache and lazy-fetch on `/daily` mount.

## EPIC-20 — Daily Puzzle — `[~]`

- [x] EPIC-20.01 `P1` `M` Seeded daily puzzle from date (UTC). Shown as a banner on home. — `pickDailyPuzzle(puzzles, date)` selects deterministically from `${utcDateKey}|<difficulty>|<theme>`. `DailyPuzzleBanner` lives at the top of the Learn path; full-screen play at `/daily` (`DailyPuzzlePage`). `gameStore` got a new `initializePuzzle(puzzle)` action and a `dailyPuzzle` `GameMode`.
- [ ] EPIC-20.02 `P1` `S` "I solved today's puzzle in N seconds" share card / OG image. — Deferred to a follow-up; needs an OG-image route or `canvas`-rendered share image. Result page already shows the time/streak in-app.
- [x] EPIC-20.03 `P2` `S` Local streak counter (consecutive days). — `progressStore.dailyStreak` (separate from learning streak). Schema bumped `v1 → v2` with a `migrate` step so existing players keep their progress.

## EPIC-21 — Themes — `[~]`

- [x] EPIC-21.01 `P1` `S` Theme registry: addition-only, subtraction-only, multiplication-tables, mixed, large-grid, primes-only-targets, parity, … — Pulled in early to power the EPIC-19 generator. Currently ships: `addition-only`, `subtraction-only`, `mixed-add-sub`, `multiplication`, `mixed-all`, `large-grid`. `primes-only` and `parity` deferred to a later content pass (cheap to add; just need `targetFilter` predicates wired into `getAllCombinationsFromConfig`).
- [ ] EPIC-21.02 `P1` `M` Theme picker UI on Practice screen.
- [ ] EPIC-21.03 `P2` `S` Per-theme local stats (attempts, accuracy, average time).

## EPIC-54 — Kids-friendly UI refresh — `[x]`

- [x] EPIC-54.01 `P1` `M` Learn landing redesigned with a Duolingo-inspired desktop shell, left navigation rail, central section path, right progress rail, friendly Daily Puzzle card, unit cards, and a staggered level path.
- [x] EPIC-54.02 `P1` `S` Level nodes and unit headers restyled with kid-friendly completed/current/locked states, raised circular lesson buttons, progress bars, connectors, and dark-mode-safe contrast.
- [x] EPIC-54.03 `P1` `S` Gameplay screen now shows Learn/Daily context: unit/mode label, level title/date, level number, round progress, and score pills.
- [x] EPIC-54.04 `P1` `S` Target display restyled as a clear “Make this number” challenge card with round progress.
- [x] EPIC-54.05 `P1` `M` Learn/Daily/Play result screens redesigned as celebratory reward cards with stronger primary actions.
- [x] EPIC-54.06 `P1` `S` Focused tests updated; full lint/type/test/build gates green.

## EPIC-22 — Post-game analysis / replay — `[-]`

- [-] EPIC-22.01 `P1` `M` Record player's selection sequence per round. — Cancelled per product decision: replay is not required.
- [-] EPIC-22.02 `P1` `M` Replay component: step through your attempt, then show optimal solution side-by-side. — Cancelled.
- [-] EPIC-22.03 `P2` `S` "Best line" suggestion if your answer was correct but slower than optimal. — Cancelled with replay.

## EPIC-23 — Local progress (IndexedDB) — `[ ]`

- [ ] EPIC-23.01 `P1` `M` `idb-keyval` wrapper for puzzle history, streaks, PBs.
- [ ] EPIC-23.02 `P1` `S` Personal-best display per mode/theme.
- [ ] EPIC-23.03 `P2` `S` Export/import progress JSON (so we can migrate to server in Phase 3).

## EPIC-24 — Puzzle Storm — `[ ]`

- [ ] EPIC-24.01 `P1` `M` 3-min rush: solve as many as possible; harder puzzles award more points.
- [ ] EPIC-24.02 `P1` `S` "Skip" button costs time penalty.
- [ ] EPIC-24.03 `P1` `S` Local high-score, share card.

## EPIC-53 — Puzzle Streak — `[ ]`

> **ID note.** Originally numbered EPIC-25 in an earlier draft of the roadmap. When the **Phase-1 Learning Path** also shipped as EPIC-25 (and shipped first, in v0.2.0), this epic was renumbered to **EPIC-53** to keep IDs unique forever. References elsewhere in the docs already use 53; if you find an old reference to "EPIC-25 — Puzzle Streak", it means this one and should be updated.

- [ ] EPIC-53.01 `P1` `M` Endless puzzles, first wrong answer ends run; difficulty scales with streak.
- [ ] EPIC-53.02 `P2` `S` Local high-streak display.

---

# Phase 3 — Accounts, ratings, leaderboards

## EPIC-26 — BaaS provisioning — `[x]`

- [x] EPIC-26.01 `P1` `S` Supabase recommended — `.env.example` documents `VITE_SUPABASE_*` + `DATABASE_URL`; create the project in the Supabase dashboard (manual step).
- [x] EPIC-26.02 `P1` `S` Drizzle schema in `db/schema.ts`; SQL migrations in `supabase/migrations/` applied via `npm run db:migrate` (tracks `_gg_migrations`).
- [x] EPIC-26.03 `P1` `XS` `@supabase/supabase-js` + `src/lib/supabase/client.ts`.

## EPIC-27 — Auth — `[x]`

- [x] EPIC-27.01 `P1` `M` Email magic link + Google OAuth + Apple OAuth (`AuthPanel`; redirect URLs must be set in Supabase).
- [x] EPIC-27.02 `P1` `S` Guest-first; cloud merge + upsert on `SIGNED_IN` (`cloudProgress.ts`).
- [x] EPIC-27.03 `P1` `S` Auth modal + Settings account section + sign-out.
- [x] EPIC-27.04 `P2` `S` Unique `profiles.handle` + `validateHandle` / `reserved_handles` table (server-side enforcement via DB).

## EPIC-28 — Server-side puzzle DB — `[x]`

- [x] EPIC-28.01 `P1` `M` Postgres tables + `npm run puzzles:import-db` from `public/puzzles.json`.
- [x] EPIC-28.02 `P1` `M` RPC `get_puzzle_by_id`, `get_next_puzzle_by_theme` (SQL in migration).
- [x] EPIC-28.03 `P2` `M` Bulk import / upsert script as operational admin path (no GUI editor).

## EPIC-29 — Glicko-2 rating — `[x]`

- [x] EPIC-29.01 `P1` `M` `glicko2` npm + `src/utils/glicko2.ts` + daily submit path updates ratings via `apply_user_rating` RPC. _(2026-11-23: rating maths moved into the database; the client path was insecure — see LAUNCH_CHECKLIST §2.)_
- [x] EPIC-29.02 `P1` `M` Per-mode row in `user_ratings` (`mode` text); Daily wired; Storm/Streak/Practice submit when those modes exist (Phase 2 epics).
- [x] EPIC-29.03 `P1` `S` `ratingDeviationMatchWindow` in `src/utils/ratingMatchmaking.ts` for future brackets / puzzle fetch.
- [x] EPIC-29.04 `P1` `S` Daily rating sparkline on `/u/:handle`.

## EPIC-30 — Profiles — `[x]`

- [x] EPIC-30.01 `P1` `M` `/u/:handle` + `/me` redirect; ratings + history; handle edit when signed in (avatar/country fields ready in schema).
- [x] EPIC-30.02 `P2` `S` Public/private toggle (kids accounts forced private via RLS + schema).

## EPIC-31 — Daily Puzzle leaderboard — `[x]`

- [x] EPIC-31.01 `P1` `M` `/leaderboard/daily?date=` ranked by time then misses. _(2026-11-23: leaderboard rows now written only by `submit_daily_guess`, server-timed.)_
- [x] EPIC-31.02 `P1` `S` `bump_server_daily_streak` RPC + `profiles.server_daily_streak_*`. _(2026-11-23: `bump_server_daily_streak` removed; the streak updates inside `submit_daily_guess`.)_

## EPIC-32 — Privacy & compliance — `[x]`

- [x] EPIC-32.01 `P1` `M` `request_account_deletion` RPC (soft hide + 30-day schedule fields). _(2026-11-23: hard delete now runs via `purge_deleted_accounts()`.)_
- [x] EPIC-32.02 `P1` `S` `export_my_data` RPC + Settings download.
- [-] EPIC-32.03 `P1` `M` Kids path: `is_kids_account`, `parent_email`, `set_parent_email` RPC; RLS hides kids from public; verification email is operator-owned (send via Supabase hook / Edge). _(Cancelled 2026-11-23: kids' accounts removed, ADR-009.)_
- [x] EPIC-32.04 `P1` `XS` `/privacy` + `/terms` stub pages (replace with counsel-reviewed copy before launch).

## EPIC-33 — Analytics — `[x]`

- [x] EPIC-33.01 `P1` `S` Plausible loader (`PlausibleAnalytics`) when `VITE_PLAUSIBLE_DOMAIN` is set.
- [x] EPIC-33.02 `P2` `XS` Opt-in in Settings (`prefsStore.analyticsOptIn`).

---

# Phase 4 — Multiplayer

**Scope note:** EPIC-38 (spectator / GG TV) and EPIC-39 (in-game chat) are **out of scope** for this milestone.

## EPIC-34 — Realtime transport — `[x]`

- [x] EPIC-34.01 `P1` `M` Supabase Realtime (or socket.io) channel per game session.
- [x] EPIC-34.02 `P1` `M` Reconnect-on-drop with up-to-3s grace; resume same session. _(MVP: resume via `/play/mp/:id`; heartbeats + stale hint on client.)_
- [x] EPIC-34.03 `P1` `M` Server clock authoritative; client extrapolates with smoothing. _(MVP: `rpc_server_now` offset for countdown / staleness.)_

## EPIC-35 — Lobby & matchmaking — `[x]`

- [x] EPIC-35.01 `P1` `M` "Quick match" button — bracket by rating ± window, expand window over 10s.
- [x] EPIC-35.02 `P1` `S` Lobby list of public open challenges.
- [x] EPIC-35.03 `P2` `S` Filter by mode / difficulty / time control.

## EPIC-36 — Game session lifecycle — `[x]` / partial

- [x] EPIC-36.01 `P1` `M` States: pending → active → finished → archived.
- [x] EPIC-36.02 `P1` `S` Disconnection handling (forfeit on timeout). _(Heartbeat only; server-side auto-forfeit not implemented.)_ _(2026-11-23: `mp_claim_forfeit` after 45 s of silence.)_
- [x] EPIC-36.03 `P1` `S` Rematch flow (one-click; preserves rating bracket).

## EPIC-37 — Challenge a friend — `[x]`

- [x] EPIC-37.01 `P1` `M` Generate share link (e.g. `/play/<token>`); private room.
- [x] EPIC-37.02 `P2` `S` Configurable: number of rounds, difficulty, time control.

## EPIC-38 — Spectator mode + GG TV — `[ ]` _(cancelled this milestone)_

- [ ] EPIC-38.01 `P1` `M` `/watch/<gameId>` view that follows live state with < 2s delay.
- [ ] EPIC-38.02 `P1` `M` `/tv` channel: surface highest-rated active games; auto-rotate.
- [ ] EPIC-38.03 `P2` `S` Per-streamer following list.

## EPIC-39 — In-game chat — `[ ]` _(cancelled this milestone)_

- [ ] EPIC-39.01 `P1` `M` Adult mode: free-text chat with profanity filter + per-game mute.
- [ ] EPIC-39.02 `P1` `M` Kids mode: emote-only ("nice!", "good game", "👋", "🎉"). No free text. No DMs.
- [ ] EPIC-39.03 `P1` `S` Report + block flow; messages stored with hash for moderation.

## EPIC-40 — Multiplayer rating — `[x]` / note

- [x] EPIC-40.01 `P1` `M` Glicko-2 multiplayer rating, separate from puzzle rating. _(Shipped: ELO-style update in SQL `internal_mp_apply_elo`; Glicko-2 can replace later.)_
- [x] EPIC-40.02 `P1` `S` Rating displayed on profile per mode.

## EPIC-41 — Anti-cheat — `[x]` / partial

- [x] EPIC-41.01 `P2` `M` Heuristic flags: solve-time impossibly low for difficulty; identical input timing across games. _(Fast-solve flag + timing hash payload.)_ _(2026-11-23: rounds are now verified and server-timed; see `mp_submit_round`.)_
- [ ] EPIC-41.02 `P2` `M` Moderator queue; shadow-ban + appeal flow. _(Queue + flags table; moderator UI / appeals not built.)_

---

# Phase 5 — Tournaments

## EPIC-42 — Arena engine — `[ ]`

- [ ] EPIC-42.01 `P2` `XL` Arena: timed window (15/30/60/90 min), continuous play, points per win, streak bonus, berserk equivalent (skip a round to halve time but double points).
- [ ] EPIC-42.02 `P2` `M` Live standings updated each game completion.

## EPIC-43 — Swiss engine — `[ ]`

- [ ] EPIC-43.01 `P2` `XL` Swiss pairing (Dutch / Monrad), N rounds, no rebematches, color/seat balancing not applicable but seed parity matters.

## EPIC-44 — Tournament UI — `[ ]`

- [ ] EPIC-44.01 `P2` `M` Lobby + calendar (hourly arenas, scheduled events).
- [ ] EPIC-44.02 `P2` `M` Result page with prize list, links to recorded games.

## EPIC-45 — Shields — `[ ]`

- [ ] EPIC-45.01 `P2` `M` Monthly themed series, persistent shield badge on profile.

## EPIC-46 — Teams / clubs — `[ ]`

- [ ] EPIC-46.01 `P3` `L` Team creation, invites, leaderboards within team.
- [ ] EPIC-46.02 `P3` `M` Classroom team variant (educator account, student roster, no public chat).

## EPIC-47 — Team tournaments — `[ ]`

- [ ] EPIC-47.01 `P3` `L` Team-vs-team scoring across an arena.

---

# Phase 6 — Community & growth

## EPIC-48 — Public roadmap & contributor docs — `[ ]`

- [ ] EPIC-48.01 `P1` `S` Mirror this `BACKLOG.md` to GitHub Projects (board view).
- [ ] EPIC-48.02 `P1` `S` `CONTRIBUTING.md` deep dive: architecture, dev setup, PR process.

## EPIC-49 — i18n — `[ ]`

- [ ] EPIC-49.01 `P2` `M` Add `react-i18next`; extract strings.
- [ ] EPIC-49.02 `P2` `M` Ship English + 2 locales.

## EPIC-50 — Donations — `[ ]`

- [ ] EPIC-50.01 `P3` `S` Decision pending (ADR-001).

## EPIC-51 — Marketing surface — `[ ]`

- [ ] EPIC-51.01 `P2` `S` Press kit (logos, screenshots, color palette).
- [ ] EPIC-51.02 `P2` `S` OG image generator per puzzle / per result.

## EPIC-52 — Educator portal — `[ ]`

- [ ] EPIC-52.01 `P3` `XL` Assignment links (preset puzzle sets), classroom progress dashboard.

---

# Completed epics

_Nothing here yet — move epics here once all their tasks are `[x]` and the work has shipped in a tagged release. Include the version it shipped in._
