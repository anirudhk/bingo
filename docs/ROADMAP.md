# Roadmap

A phased plan inspired by lichess — start with a polished single-player PWA, layer accounts and a curated puzzle library on a managed backend, then add multiplayer and tournaments. Each phase ends with a tagged release.

> **Legend** · `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled
> Detailed tasks live in [`BACKLOG.md`](./BACKLOG.md). This file tracks epics + phase exit criteria only.

---

## Phase 0 — Production-readiness for the current single-player PWA

**Goal:** ship a stable v0.1 of what already exists. No new gameplay features — fix the foundations.
**Target version:** `v0.1.0` — **shipped 2026-05-10**.
**Exit criteria status:**

- ✅ `npm run lint && tsc && vitest run && npm run build` all green.
- ✅ Deployed to GitHub Pages with working PWA + correct routing under `/bingo/` base.
- ⚠️ Lighthouse ≥ 90: not formally measured this cycle (deferred to the EPIC-11.05 a11y audit pass).
- ⚠️ EPIC-08 (CI) and EPIC-09 (repo hygiene) carry small `[~]` deferrals — see `BACKLOG.md` for the per-task notes (deploy workflow, Lighthouse CI, bundle-size, LICENSE).

| Epic    | Title                                                     | Status |
| ------- | --------------------------------------------------------- | ------ |
| EPIC-01 | Build pipeline & lint config restored                     | [x]    |
| EPIC-02 | Routing + PWA manifest aligned with `/bingo/` deploy base | [x]    |
| EPIC-03 | Dead code & swipe-era leftovers removed                   | [x]    |
| EPIC-04 | Logger + console hygiene                                  | [x]    |
| EPIC-05 | Timer / `setTimeout` leak fixes; lifecycle correctness    | [x]    |
| EPIC-06 | Quick-Game operator-count + `÷` consistency (or removal)  | [x]    |
| EPIC-07 | Test harness (Vitest + RTL) + tests for pure logic        | [x]    |
| EPIC-08 | CI on GitHub Actions (lint + tsc + test + build)          | [~]    |
| EPIC-09 | Repo hygiene: README, LICENSE, CHANGELOG, version bump    | [~]    |

---

## Phase 1 — UX polish: the "feels like lichess" pass

**Goal:** make Grid Genius feel as crisp and accessible as lichess.org, even though we're still single-player.
**Target version:** `v0.2.0` — **shipped 2026-05-10**.
**Exit criteria status:**

- ✅ keyboard-only playable (EPIC-10 done; arrows/Enter/Space/Esc/?/Z all work)
- ✅ screen-reader narration in place (EPIC-11.01-03; tile + operator labels, live regions for target + feedback)
- ✅ dark mode (EPIC-12.01)
- ✅ zen mode (EPIC-13.01)
- ✅ mobile viewport audited 320–1280 px (EPIC-14)
- ⚠️ Lighthouse Accessibility = 100: **not formally measured this cycle** — defer to a focused audit pass alongside EPIC-11.05 (WCAG contrast). Visual smoke pass suggests we're close; specific known gaps are listed in EPIC-11.05.
- ⚠️ Sound + haptics: **explicitly deferred** (EPIC-15.02 / 15.03) — no asset budget for SFX yet. Wire when the Settings menu adds the toggles.

| Epic    | Title                                                                                                       | Status |
| ------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| EPIC-25 | Learning Path & Hybrid Lobby (Learn-default home, Play tab, 25-level curriculum, accuracy stars, XP+streak) | [x]    |
| EPIC-10 | Keyboard navigation + focus management                                                                      | [x]    |
| EPIC-11 | Screen reader / ARIA / blind mode                                                                           | [~]    |
| EPIC-12 | Light/Dark/System theme + tile & operator skins ("board themes")                                            | [~]    |
| EPIC-13 | Zen mode (hide chrome) + density settings                                                                   | [~]    |
| EPIC-14 | Mobile viewport hardening (`100dvh`, overflow, landscape)                                                   | [x]    |
| EPIC-15 | Reduced-motion + sound + haptics settings (with global mute)                                                | [~]    |
| EPIC-16 | Settings menu + `zustand/persist` for prefs                                                                 | [~]    |
| EPIC-17 | Error boundary + "new version available" SW update toast                                                    | [x]    |
| EPIC-18 | Kids Mode vs Adult Mode toggle (theme + simplified UI + no chat hooks)                                      | [~]    |

---

## Phase 2 — Puzzles pillar (offline + Daily, no accounts yet)

**Goal:** introduce the puzzle library concept with a curated/seeded daily puzzle, practice themes, and local puzzle modes. Still no backend — ship the puzzle DB as a static JSON.
**Target version:** `v0.3.0` _(in flight; see progress block below)_.
**Exit criteria:** Daily Puzzle works offline ✅; puzzle themes filter the practice mode ⚠️ (EPIC-21.02, not started); Puzzle Storm / Puzzle Streak local modes remain planned.

| Epic    | Title                                                              | Status |
| ------- | ------------------------------------------------------------------ | ------ |
| EPIC-19 | Puzzle data format + static puzzle JSON pipeline                   | [x]    |
| EPIC-20 | Daily Puzzle (seeded by date, identical for all users)             | [~]    |
| EPIC-21 | Themes (addition, subtraction, multiplication, mixed, large-grid…) | [~]    |
| EPIC-54 | Kids-friendly UI refresh (Learn, gameplay context, results)        | [x]    |
| EPIC-22 | Post-game analysis / replay (cancelled)                            | [-]    |
| EPIC-23 | Local progress / streak / personal best (IndexedDB)                | [ ]    |
| EPIC-24 | Puzzle Storm (3-min rush, single player, local high-score)         | [ ]    |
| EPIC-53 | Puzzle Streak (chain solves, single mistake ends run, local)       | [ ]    |

**Phase 2 progress (in flight, targeting `v0.3.0`):**

- EPIC-19 ✅ — schema, seeded RNG, generator, validator, hook, 450-puzzle bundle. CI gate: `npm run puzzles:validate` available (not yet wired into `.github/workflows/ci.yml`).
- EPIC-20 ⚠️ — Daily Puzzle UI + persisted streak shipped. The "share card / OG image" sub-task is deferred until we add an OG-image route or a `canvas`-rendered share flow.
- EPIC-21 ⚠️ — theme registry shipped (pulled in early to power EPIC-19); the picker UI and per-theme stats are still ahead.
- EPIC-54 ✅ — kid-friendly UI refresh shipped across Learn landing, gameplay context, target card, and result screens.

---

## Phase 3 — Accounts, ratings, leaderboards (BaaS)

**Goal:** introduce accounts and a server. Use Supabase (Postgres + Auth + Realtime). Glicko-2 puzzle rating per user; global leaderboards; sync of progress across devices.
**Target version:** `v0.4.0`
**Exit criteria:** sign-in works; puzzle rating updates after each solve; daily puzzle leaderboard live; offline-first sync; GDPR-ready data export & delete.

| Epic    | Title                                                                 | Status |
| ------- | --------------------------------------------------------------------- | ------ |
| EPIC-26 | Choose & provision BaaS (Supabase recommended)                        | [ ]    |
| EPIC-27 | Auth: email + magic link + OAuth (Google, Apple) + guest upgrade flow | [ ]    |
| EPIC-28 | Puzzle DB migrated to server, served by theme/rating                  | [ ]    |
| EPIC-29 | Glicko-2 rating per mode (Easy/Medium/Hard/Storm/Daily)               | [ ]    |
| EPIC-30 | Profiles (handle, avatar, country flag, rating history graph)         | [ ]    |
| EPIC-31 | Daily Puzzle leaderboard + streak tracking server-side                | [ ]    |
| EPIC-32 | Privacy: data export, account delete, COPPA-aware kids accounts       | [ ]    |
| EPIC-33 | Self-hosted analytics (Plausible/Umami) + opt-in telemetry            | [ ]    |

---

## Phase 4 — Multiplayer

**Goal:** real-time head-to-head play with spectating and a TV channel. Requires WebSockets — Supabase Realtime to start; revisit a custom Node service if scaling demands it.
**Target version:** `v0.5.0`
**Exit criteria:** two players matched in < 5s in a populated bracket; < 200 ms input-to-opponent-render p95; spectator delay < 2s; rematch flow works; abuse reporting + moderation queue exist.

| Epic    | Title                                                            | Status |
| ------- | ---------------------------------------------------------------- | ------ |
| EPIC-34 | Realtime transport + reconnection + clock sync                   | [ ]    |
| EPIC-35 | Lobby & matchmaking by rating bracket                            | [ ]    |
| EPIC-36 | Game session lifecycle (offer → match → play → result → rematch) | [ ]    |
| EPIC-37 | Challenge-a-friend share links + private rooms                   | [ ]    |
| EPIC-38 | Spectator mode + Grid Genius TV (top live games)                 | [ ]    |
| EPIC-39 | In-game chat with kid-safe presets + report/block                | [ ]    |
| EPIC-40 | Rating: Glicko-2 multiplayer, separate from puzzle rating        | [ ]    |
| EPIC-41 | Anti-cheat heuristics (input timing, impossible solve speed)     | [ ]    |

---

## Phase 5 — Tournaments

**Goal:** arenas + swiss, on hourly + scheduled cadence, with shields.
**Target version:** `v0.6.0`
**Exit criteria:** an hourly arena can host 100+ concurrent players; final standings persist; shields awarded; tournament history viewable on profile.

| Epic    | Title                                                        | Status |
| ------- | ------------------------------------------------------------ | ------ |
| EPIC-42 | Arena tournament engine (timed window, points, streak bonus) | [ ]    |
| EPIC-43 | Swiss pairing engine                                         | [ ]    |
| EPIC-44 | Tournament lobby, calendar, results pages                    | [ ]    |
| EPIC-45 | Shields & monthly themed series                              | [ ]    |
| EPIC-46 | Teams / clubs (school classrooms, friend groups)             | [ ]    |
| EPIC-47 | Team tournaments                                             | [ ]    |

---

## Phase 6 — Community & growth (continuous)

Runs in parallel from Phase 3 onward.

| Epic    | Title                                                            | Status |
| ------- | ---------------------------------------------------------------- | ------ |
| EPIC-48 | Public roadmap on GitHub Projects, contributor docs              | [ ]    |
| EPIC-49 | i18n (English + 2 locales for v1)                                | [ ]    |
| EPIC-50 | Donations / Patron page (if we adopt that model — see DECISIONS) | [ ]    |
| EPIC-51 | Press kit, OG/Twitter cards, social embeds                       | [ ]    |
| EPIC-52 | Educator portal: assignment links, classroom progress            | [ ]    |

---

## Release calendar (target, not commitment)

| Version | Phase | Theme                | Target     |
| ------- | ----- | -------------------- | ---------- |
| v0.1.0  | 0     | "Stable foundation"  | T+2 weeks  |
| v0.2.0  | 1     | "Feels like lichess" | T+5 weeks  |
| v0.3.0  | 2     | "Daily Puzzle"       | T+9 weeks  |
| v0.4.0  | 3     | "Accounts & ratings" | T+14 weeks |
| v0.5.0  | 4     | "Play a friend"      | T+22 weeks |
| v0.6.0  | 5     | "Tournaments"        | T+30 weeks |
| v1.0.0  | —     | Public launch        | T+34 weeks |

`T` = the day Phase 0 is started.

---

## How phases relate to the lichess pillars

```
Pillar / Phase    P0   P1   P2   P3   P4   P5
─────────────────────────────────────────────
Puzzles                      ●    ●
Multiplayer                            ●
Tournaments                                  ●
UX polish              ●    ●    ●    ●    ●
Foundations       ●    ●
```
