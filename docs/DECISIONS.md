# Architecture Decision Records

Numbered, append-only. Every decision with non-obvious trade-offs gets an ADR. Format adapted from [Michael Nygard's template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md).

> **Status values**: `Proposed` · `Accepted` · `Deprecated` · `Superseded by ADR-NNN`

---

## ADR-001 — Open-source license & monetization model

**Status:** Proposed (decision deferred — user marked "undecided" during planning).

**Context.** Grid Genius is inspired by lichess, which is AGPL-3.0 and donation-funded. We need to choose:

- **License**: AGPL-3.0 (strong copyleft, lichess parity), MIT (permissive, lowest friction), Apache-2.0 (permissive + patent grant), or closed source.
- **Monetization**: donations only, freemium cosmetics, ads (rejected by Vision principles), or none.

**Options.**

1. **AGPL-3.0 + donations**, mirrors lichess. Pros: aligns with stated principles, prevents proprietary forks; Cons: scares some contributors.
2. **MIT + donations**. Pros: maximum reuse, more contributors; Cons: anyone can ship a paid clone.
3. **Closed source, free**. Pros: full control; Cons: contradicts the open-source pillar in `VISION.md`.
4. **Freemium (cosmetics only)**. Pros: sustainable revenue; Cons: complicates trust narrative.

**Decision.** _Pending._ Until decided, the repo ships **without** a `LICENSE` file (which legally means "all rights reserved" and blocks contribution). `EPIC-09.02` is blocked on this ADR.

**Consequences.** No external PRs accepted until resolved.

**Action items.**

- [ ] Pick license + monetization story.
- [ ] If AGPL/MIT, add `LICENSE`, add license header policy, update `README.md`.
- [ ] If donations: pick platform (GitHub Sponsors, Open Collective, Stripe Checkout) — `EPIC-50`.

---

## ADR-002 — `÷` (division) and Quick Game operator count

**Status:** Accepted — Option 2.

**Context.**

- `OperatorSelector` UI advertised 2 or 3 operators including `÷`.
- `OPERATORS` constant only had `+ - *`.
- `calculator.ts` did not handle `/`.
- `DIFFICULTY_CONFIGS` for `medium` (the difficulty Quick Game is forced to) had 2 operators only.
- `quickGameOperatorCount` was stored but never affected gameplay.

So the UI lied to the user.

**Options considered.**

1. **Implement properly** — add `'/'` to operators with integer-result filtering, dynamic `DifficultyConfig` from chosen operator count, consume `operatorCount` in `ButtonGameBoard`.
2. **Remove the lie** — drop `÷` from UI, remove the operator-count screen, route Quick Game straight to `/game` with the medium config. (**Chosen.**)
3. **"Operator complexity" preset** — keep the screen but rescope it: 2 = `+ −`, 3 = `+ − ×`, 4 = `+ − × ÷`.

**Decision.** **Option 2.** Division is not required and the picker is being removed entirely. Quick Game becomes a single-tap mode that uses the **easy** difficulty config (3×3 grid, 2 tiles, 1 operator) so it lives up to the "pick up and play" promise.

**Consequences (shipped in Phase 0 / EPIC-06).**

- `OperatorSelector.tsx` deleted.
- `/operators` route removed; tapping "Quick Game" now navigates straight to `/game`.
- `quickGameOperatorCount` field, `setQuickGameOperators` action, and the unused `operatorCount` prop on `ButtonGameBoard` all removed.
- `DifficultySelector` title fallthrough fixed (Quick Game can no longer reach the difficulty screen, so the bogus default is gone).
- "Back to lobby" from Quick Game now returns to `/` instead of `/difficulty`.
- **Quick Game uses the `easy` config** (3×3 grid, 2 tiles + 1 operator). Initially shipped using `medium` (4×4, 3 tiles + 2 operators) — switched to `easy` in `v0.2.0-pre` based on user feedback that "Quick" should mean smaller and faster, not just shorter.
- Future: if division is ever wanted again, file a fresh ADR superseding this one.

---

_(ADR-003 was originally drafted here for "Single-store vs sliced Zustand". When the **Hybrid Learn-default home** decision shipped in EPIC-25, it took the ADR-003 slot in the canonical numbering used by `BACKLOG.md`, `ROADMAP.md`, and the EPIC-25 plan. The Zustand-slice decision has been renumbered to **ADR-008** at the bottom of this file. There is no ADR-003 for "single-store vs sliced Zustand" anymore — only ADR-008.)_

---

## ADR-004 — Backend choice (Phase 3+)

**Status:** Proposed.

**Context.** Phase 3 introduces accounts, server-side puzzles, ratings, leaderboards. Phase 4 adds real-time multiplayer.

**Options.**

1. **Supabase** — Postgres + Auth + Realtime + Edge Functions, generous free tier, open-source-friendly, can self-host later.
2. **Firebase** — mature, but vendor lock-in and not open-source-friendly.
3. **Custom Node + Postgres + WebSockets** — most control, most operational burden, slowest to ship.
4. **PocketBase** — single-binary self-hosted, simple, but smaller community, weaker Postgres semantics.

**Decision.** Adopt **Supabase**. Self-host migration path exists (Supabase is open source). Edge Functions cover most server-side compute we need without a bespoke service.

**Consequences.**

- Drizzle ORM in the repo; migrations versioned.
- Realtime starts on Supabase channels; revisit a custom Node service in Phase 5+ only if metrics demand.

---

## ADR-005 — Glicko-2 for ratings

**Status:** Proposed.

**Context.** Lichess uses Glicko-2 because it accounts for rating reliability (RD) and volatility, which matters for sparse data and onboarding.

**Decision.** Use **Glicko-2** with a 7-day rating period for puzzle solves and for multiplayer game results, separate ratings per mode.

**Consequences.**

- Need a small server-side job to apply rating periods (Edge Function on cron).
- Initial RD is high so new players are matched quickly within a wider window.

---

## ADR-006 — PWA-only delivery (no native apps for v1)

**Status:** Accepted.

**Context.** Native iOS/Android multiplies platform work. PWAs cover installable + offline + haptics + push (with caveats on iOS).

**Decision.** Ship as PWA only through v1. Revisit native shells (Capacitor wrap) post-v1 if data shows iOS install friction is hurting reach.

**Consequences.**

- Push notifications limited on iOS (improving in 16.4+).
- App-store presence deferred. Acceptable trade-off.

---

## ADR-007 — Privacy-first analytics

**Status:** Accepted.

**Context.** Vision says "no third-party trackers." We still need basic usage data to inform the roadmap.

**Decision.** Use **Plausible** (or self-hosted Umami). Cookie-less, no PII, GDPR-friendly. Disabled by default for kids accounts.

**Consequences.**

- Less granular than GA4.
- Requires either a paid Plausible plan or self-hosting.

---

## ADR-003 — Hybrid home: Learn-default path with Play lobby as secondary tab

**Status:** Accepted (shipped in EPIC-25, Phase 1)

**Context.** Today's home is a lichess-style mode lobby (`GameModeSelector`). It works for advanced players but gives new users no obvious next step — they see five mode cards (some greyed-out "Coming Soon") and pick somewhat arbitrarily. Retention data isn't available yet, but the friction is visible to anyone watching a first-time play. Meanwhile, the vision doc commits to _both_ a competitive lichess-style audience and a "Curious Kid / Casual Adult" audience that benefits from Duolingo-style guided progression.

**Options.**

- **A. Lobby only** (status quo). Cheap, lichess-aligned, bad for onboarding, no sense of growth.
- **B. Pure path** (Duolingo). Best onboarding, best retention curve. Boxes in the lichess audience and forces a curated curriculum.
- **C1. Hybrid, Learn tab default.** Path is the home; Play (lobby) is one tab away. Best of both. Two tabs is the maximum surface area we want.
- **C2. Hybrid, Play tab default.** Same as C1 but lobby is the front door. Worse onboarding for new users.
- Stars: **accuracy-only** (chosen) vs accuracy + time vs accuracy + streak. Time-based punishes mobile users tapping carefully; streak adds rules without much added signal at this scale.
- Curriculum shape: 15-level flat ladder vs **5 units of 5** (chosen) vs units + per-unit "review boss" levels. Flat undersells progression; review bosses double the authoring cost without changing the engine.

**Decision.** **C1** — hybrid home with Learn tab as the default. Curriculum is **25 levels in 5 units** (`+` only → `+ -` → `+ - *` → bigger grids). Stars are **accuracy-only** (3 = no wrong taps, 2 = ≤1, 1 = completed). XP is `stars × 10`. Streak is consecutive UTC days with at least one completion — _no_ freezes, _no_ notifications (vision doc forbids manipulative loops).

**Consequences (shipped in EPIC-25).**

- New default route `/` resolves to `/learn`; the `/play` lobby remains fully functional with all existing modes.
- Curriculum lives as data in `src/constants/levels.ts`; the engine is configuration-driven (one new code path: `initializeLevel(id)` in `gameStore`).
- New `progressStore` persists `levels`, `xp`, `streak` to `localStorage` via `zustand/middleware/persist` (key: `gridgenius:progress:v1`).
- `gridGenerator` now exposes `*FromConfig` variants that take a `DifficultyConfig` directly. The `DifficultyLevel`-keyed wrappers are kept for back-compat so Play-mode flows are untouched.
- Quick Game still works exactly as today (3×3 easy preset) from the Play tab.
- Out of scope (logged as Phase 2 placeholders): cloud sync of progress, hearts/streak freezes, leaderboards, hint system, audio/SFX, per-unit "review boss" levels, time-based stars.
- If the lichess audience grows large enough to dominate, this ADR can be revisited and superseded.

**Plan reference.** Full implementation walk-through in [`plans/EPIC-10-learning-path.md`](./plans/EPIC-10-learning-path.md).

---

## ADR-008 — Sliced Zustand stores (one slice per concern)

**Status:** Accepted (originally proposed as ADR-003; renumbered when the Hybrid Home ADR took the 003 slot).

**Context.** The original `gameStore` was one large slice mixing session state (grid, target, timers), UI ephemerals (the now-removed `swipeState`), and user prefs (difficulty). Consumers used the bare `useGameStore()` and re-rendered on every change.

**Decision.** Multiple Zustand slices, one per concern, all consumed via selectors:

- `gameStore` — current play session only (grid, target, score, status, timers).
- `progressStore` — long-lived player progress, persisted via `zustand/middleware/persist` (key `gridgenius:progress:v2`). Levels, XP, streak, daily-puzzle history, daily streak.
- `prefsStore` — user preferences, persisted (key `gridgenius:prefs:v1`). Theme, audience, zen.
- `puzzleStore` (note: a **utility module**, not a Zustand store — see ADR-009 if/when this changes) — module-local cache + pure query helpers for the static puzzle bundle.
- Future: `authStore` (Phase 3), `multiplayerStore` (Phase 4), `puzzleHistoryStore` over IndexedDB (EPIC-23).

All consumers use selector form: `useGameStore(s => s.score)`.

**Consequences (shipped through v0.2.0 / `[Unreleased]`).**

- Smaller re-render blast radius.
- Persistence is opt-in per slice (session state is intentionally _not_ persisted; prefs and progress are).
- Wizard state (mode/difficulty selection) still lives in `App.tsx` `useState`. Moving it into a store remains an open follow-up (`EPIC-16.03`, deferred).

---

## How to add a new ADR

1. Pick the next number.
2. Copy this template:

```
## ADR-NNN — <short title>

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX

**Context.** What forces are at play? What problem are we solving?

**Options.** Bullet the realistic choices with one-line trade-offs.

**Decision.** What we chose, and why.

**Consequences.** What changes as a result. What new work or risk does this create?

**Action items.** Optional checkbox list.
```

3. Open a PR. ADRs are immutable once `Accepted` — to change a decision, write a new ADR that supersedes the old one and update the old one's status.
