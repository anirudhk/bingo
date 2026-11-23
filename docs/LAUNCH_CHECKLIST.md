# Launch Checklist

What has to be true before Grid Genius is promoted publicly, grouped by area.
Written 2026-11-23 from a review of the working tree (not just `main`).

> **Legend** · **P0** = launch blocker · **P1** = should fix before promoting it · **P2** = soon after launch · `[x]` done · `[-]` no longer applies
> Size: **S** ≤ half a day · **M** 1–3 days · **L** a week or more

---

## Recommendation: launch in three steps

Accounts and multiplayer are where almost all the risk is. The single-player game is close to ready.

| Release                          | What's in it                                                                                                                         | Blocked by                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **v1.0: Guest launch**           | Learn path, Quick / Classic / Time Attack, Daily Puzzle + share, sounds, themes, offline PWA. No sign-in. _This is what's live now._ | §1 decisions, §5 P0s, §7 P0s |
| **v1.1: Accounts + leaderboard** | Sign-in, cloud progress, daily leaderboard, ratings                                                                                  | All of §2 and §4 P0s         |
| **v1.2: Multiplayer**            | Head-to-head matches, matchmaking                                                                                                    | All of §3 P0s                |

---

## 1. Decisions only you can make

- [x] **P0** **Who may create accounts?** Options: (a) adults/parents only, kids play as guests; (b) kids' accounts with verified parent consent (COPPA in the US, the UK Children's Code, GDPR-K in the EU). (a) is far cheaper and lower-risk. Everything in §4 depends on this. **Done 2026-11-23:** general audience, 13+. No kids' accounts; under-13s play as guests (progress stays on their device). Sign-in requires a 13+ confirmation.
- [ ] **P0** **Is multiplayer in v1?** Recommendation: no, it needs the §3 rebuild first.
- [ ] **P0** **License (ADR-001, still "Proposed").** The repo has been public since 2026-11-23 but has no `LICENSE`, which legally means "all rights reserved". That contradicts VISION.md ("Free forever… Open source") and blocks outside contributions (CONTRIBUTING.md). Pick one (e.g. AGPL-3.0 like lichess, or MIT) and add the file, or make the repo private again.
- [ ] **P1** **Supabase plan.** Free projects pause after about a week without traffic, which is what happened to this one. A public app needs the Pro plan (about $25/month) or a keep-alive.
- [ ] **P1** **Domain.** `anirudhk.github.io/bingo` works. A short custom domain is easier to share and lets you move hosts later without breaking links.
- [ ] **P2** **Native apps.** Decide whether you want Play Store / App Store builds (§9) or the installable web app only.

---

## 2. Backend & security (Supabase)

### Blockers found in review

- [x] **P0 · M** **Players can set their own rating to any value.** The `user_ratings_write_own` / `user_ratings_update_own` rules allow direct writes, and `apply_user_rating(p_rating, …)` accepts whatever number the browser sends. The rating maths runs in the browser ([dailyLeaderboardCloud.ts](../src/services/dailyLeaderboardCloud.ts), [glicko2.ts](../src/utils/glicko2.ts)). **Fix:** remove direct write access; compute ratings inside database functions only. **Done 2026-11-23:** direct writes removed; `apply_user_rating` dropped; Glicko-2 now runs inside the database (`internal_glicko2`, matches the npm library to 0.01).
- [x] **P0 · M** **The daily leaderboard can be faked.** The `daily_lb_insert_own` / `daily_lb_update_own` rules allow direct writes, and `submit_daily_leaderboard` trusts the browser's `p_seconds`. **Fix:** remove direct write access. Add `start_daily_attempt()` (the server records the start time) and `finish_daily_attempt(path, operators)` (the server checks the answer against the puzzle and computes the time itself). **Done 2026-11-23:** server picks the puzzle (`daily_schedule`), records the start (`start_daily_attempt`), checks every guess and computes the time (`submit_daily_guess`). Direct writes removed.
- [ ] **P0 · S** **The database is empty.** The project is back up, but no tables exist. Add `DATABASE_URL` to `.env`, then run `npm run db:migrate` and `npm run puzzles:import-db`. **Update 2026-11-23:** migrations and import verified against a local Postgres (`npm run db:test`); still needs `DATABASE_URL` for the real project.
- [ ] **P0 · S** **Leaked-key check.** The browser key is meant to be public, so all protection comes from the database rules. Before launch, test every table as an anonymous user and as a second user, and confirm nobody can read or change another user's data. **Update 2026-11-23:** `npm run db:audit-live` probes the live project with the public key. Run it after the migration; `npm run db:test` covers the same rules locally and in CI. Also found and fixed: every internal function (e.g. `internal_mp_apply_elo`) was callable by anonymous visitors, because Postgres grants EXECUTE to everyone by default.

### Should fix

- [x] **P1 · S** The "trusted submit" Edge Function referenced in `.env.example` isn't in the repo. Add it or remove the reference. **Done 2026-11-23:** not needed; checking now happens inside the database. Reference removed from `.env.example`.
- [ ] **P1 · S** Turn on database backups (Pro plan) and do one test restore.
- [ ] **P1 · S** Add rate limits on sign-in emails and on the leaderboard, matchmaking and invite functions.
- [ ] **P1 · S** Run migrations automatically from CI so production never drifts from the repo again.
- [x] **P2 · M** Delete-account requests need a job that actually deletes the data after 30 days (`request_account_deletion` only marks the account). **Done 2026-11-23:** `purge_deleted_accounts()` removes accounts 30 days after the request (daily via pg_cron where available) and error reports after 90 days.
- [ ] **P2 · S** Move the 450 puzzles out of a 600 KB file the browser downloads, or split it into chunks. **Update 2026-11-23:** now 610 puzzles (~840 KB) after adding 160 unique-solution hard puzzles.

---

## 3. Multiplayer

The current design ([MultiplayerSessionPage.tsx](../src/components/UI/MultiplayerSessionPage.tsx), `20260512000001_phase4_multiplayer.sql`) is a working prototype, not production-ready.

- [x] **P0 · M** **Rounds are decided by times the players report themselves.** `mp_submit_round(p_solve_ms, p_wrong)` doesn't check the answer, and the only anti-cheat is a flag for solves under 400 ms. **Fix:** submit the actual path; the server checks it and computes the time from its own round-start timestamp. **Done 2026-11-23:** players submit the grid and their path; the server checks the answer, requires both grids to match (mismatch voids the match) and times the round from its own start time.
- [x] **P0 · S** **A round can be resubmitted.** `on conflict … do update` lets a player overwrite their own submission with a faster time. **Fix:** one submission per player per round. **Done 2026-11-23:** one submission per player per round.
- [x] **P0 · M** **No forfeit when someone disconnects.** There are heartbeats, but nothing ends a match when a player leaves (backlog EPIC-36.02). **Fix:** a scheduled job that forfeits sessions with no heartbeat for N seconds. **Done 2026-11-23:** `mp_claim_forfeit` lets the remaining player claim the win after 45 s of silence; a "Claim win" button appears in the match.
- [ ] **P1 · S** **Matchmaking polls** (`setInterval` + `mp_poll_matchmaking`). In-game session updates already use a Realtime channel; move matchmaking onto Realtime too, so a busy queue doesn't flood the database with requests.
- [ ] **P1 · S** Matchmaking needs a time-out and a "no opponent found, play the bot / daily instead" fallback, so an empty queue isn't a dead end.
- [ ] **P1 · M** **No tests** cover the multiplayer screens or database functions. Add tests for the database functions (create, join, ready, submit, forfeit). **Update 2026-11-23:** database functions now covered by `npm run db:test` (53 checks, runs in CI). Multiplayer screens still untested.
- [-] **P1 · S** **Safety for kids:** keep no chat (good), random opponent names, no public profile links from matches. Invite-only for kids' accounts. **No longer applies:** multiplayer needs an account, and accounts are 13+.
- [ ] **P2 · M** Someone needs to review cheat flags: the moderator queue table exists but there's no screen to work it (EPIC-41.02).

---

## 4. Legal, privacy & children

- [ ] **P0 · S** **Privacy Policy and Terms are placeholders.** [PrivacyPage.tsx](../src/components/UI/PrivacyPage.tsx) says "replace copy with counsel-reviewed text before production launch". Needed even for guest-only, because of analytics and error reports. **Update 2026-11-23:** real drafts written to match what the code does. Before launch: legal review, and set a contact email in `src/constants/legal.ts` (it points to GitHub issues for now).
- [-] **P0 · M** _(only if kids get accounts)_ **Parent verification isn't built.** `set_parent_email` stores an email but never sends or verifies anything. You need a verified parent-consent flow, a parent dashboard to view and delete data, and a block on cloud saves until verified. **No longer applies:** kids' accounts removed (columns, `set_parent_email`, Settings UI).
- [x] **P0 · S** **Age check at sign-up** for option (a): "Are you a parent or over 13?" Under-13s are sent back to guest play. **Done 2026-11-23:** sign-in options stay disabled until the player ticks "I'm 13 or older".
- [ ] **P1 · S** Data export and delete must work from Settings end to end (`export_my_data` exists; check the UI path).
- [x] **P1 · S** Analytics stays opt-in (it is today); list Plausible and the error endpoint as data processors in the privacy policy. **Done 2026-11-23:** listed in the new Privacy Policy.
- [ ] **P2 · S** Accessibility statement page.

---

## 5. Code quality

**Already done:** strict TypeScript; 151 tests across 20 files; lint, format, type-check, tests and build run in CI and are green.

- [x] **P0 · S** **Commit and push.** About 112 files are uncommitted. GitHub's `main` is still at "added game modes", and the repo is now public, so it shows old code. **Done 2026-11-23:** baseline + fixes committed on branch `launch-blockers`; merge the PR.
- [x] **P0 · S** **Set the error-report endpoint.** [errorReporter.ts](../src/utils/errorReporter.ts) does nothing until `VITE_ERROR_REPORT_URL` is set (or swap it for Sentry). Without it you're blind to crashes on users' devices. **Done 2026-11-23:** reports go to the project's own Supabase (`report_client_error`, write-only table) unless `VITE_ERROR_REPORT_URL` overrides it.
- [ ] **P1 · M** **Split [ButtonGameBoard.tsx](../src/components/GameBoard/ButtonGameBoard.tsx)** (about 1,300 lines) into a selection hook, a shared solver (the hint code copies the generator's search) and smaller components.
- [ ] **P1 · S** **Bundle is 664 KB** (196 KB gzipped) in one file. Lazy-load the multiplayer, auth and Supabase code. Target: under 250 KB for first load.
- [ ] **P1 · S** The game store repeats the same 20-field setup object 5 times; use one `freshRound()` helper.
- [ ] **P1 · S** Add a deploy workflow (on a `v*` tag → build → GitHub Pages) so releases aren't run by hand from a laptop (EPIC-08.02).
- [ ] **P2 · S** `gridGenerator.ts` has a duplicate function for each kind of randomness; pass the random-number source in instead.
- [ ] **P2 · S** Type operators as `'+' | '-' | '*'` instead of plain strings.
- [ ] **P2 · M** Add browser end-to-end tests (Playwright): play a Learn level, the daily puzzle, share, and offline reload.

---

## 6. UI & UX review

**Already done:** Learn screen redesign, dark mode, keyboard play, screen-reader labels, sound and haptics, board themes.

- [ ] **P1 · M** **Restyle the Play tab, mode/difficulty screens, result screens and desktop sidebar.** They still use the old heavy uppercase style and look inconsistent next to the new Learn screen.
- [ ] **P1 · S** **Show the solution after a wrong answer, and on the result screen.** Today you're told you missed, not what the answer was.
- [ ] **P1 · S** **Test on real devices:** a cheap Android phone, an iPhone SE-size screen, an iPad, and a school Chromebook. Check tap targets on the 5×5 board (tiles are about 58 px; the operator chips are smaller).
- [ ] **P1 · S** **Run a Lighthouse audit:** target ≥ 90 for performance, accessibility and best practices, plus a colour-contrast check (EPIC-11.05; never measured).
- [ ] **P1 · S** **The install prompt appears straight away,** covering the top of the screen on first visit (seen in the live screenshots). Show it after the first completed level instead.
- [ ] **P2 · M** A mascot or character for the kids' experience: the biggest gap versus Duolingo / Prodigy / Khan Kids.
- [ ] **P2 · S** Sound check on real devices (volume balance, iOS silent switch) and a quick "turn sound off" option on the game screen.

---

## 7. Game & content

**Already done:** no repeated targets, easy-to-hard ramp within a game, Hard = one solving path per target, fresh Time Attack grids, accurate clock, no double-scoring, a daily that gets harder through the week.

- [x] **P0 · S** **The weekend daily repeats after about 6 weeks.** Only 19 bundled hard puzzles have a unique answer. Regenerate `puzzles.json` with a few hundred unique-solution hard puzzles (`npm run puzzles:generate` plus a solution-count filter). **Done 2026-11-23:** 160 unique-solution hard puzzles added (`p-daily-hard-*`), about a year of weekends; existing puzzles unchanged.
- [ ] **P1 · M** **More content.** 25 levels is about 2 hours of play. Add review levels that drill the player's weakest operator, plus 1–2 more units (4-tile paths, division with whole-number answers).
- [ ] **P1 · S** **Stars ignore hints and time.** A hinted, slow run still earns 3 stars.
- [ ] **P1 · S** **Order of operations.** The game works left to right, while school teaches × before +. Teachers may push back on this. Either add "real precedence" levels or explain the rule clearly in the parent/teacher pitch.
- [ ] **P2 · M** Puzzle Storm and Puzzle Streak modes (backlog EPIC-24 / EPIC-53): cheap to build on the current engine.

Still open from the [2026-05-11 review](./REVIEW_2026-05-11.md), and still true in the code:

- [ ] **P1 · S** **Level `u2-l1` still allows a target of 0** (`targetRange.min: 0`), so "a − a" solves it with any matching pair. The review flagged this.
- [ ] **P1 · S** **Negative intermediate results aren't explained.** For example, (3 − 7) × 2 = −8 on the way to a positive target. Add a line to the tutorial or block negative intermediates on kid levels.
- [ ] **P1 · S** **The path disappears 2 s after a wrong answer,** so the player can't see what they tried. Keep it highlighted until their next tap.
- [ ] **P1 · S** **A Play-mode run is lost on page refresh** (wizard state lives only in `App` state).
- [ ] **P1 · S** **Auto-advance fires while the tab is hidden.** Pause the round timer and auto-advance when the tab isn't visible.
- [x] **P1 · XS** **`npm run puzzles:validate` isn't in CI.** Add it to `.github/workflows/ci.yml` so a broken `puzzles.json` can't ship. **Done 2026-11-23:** added to CI.
- [ ] **P2 · S** **Puzzle "ratings" are mislabelled.** `computeRating` sits at its floor value, and calling it "Glicko" is misleading. Rate puzzles by solution count, which the generator now computes.
- [ ] **P2 · S** **Answers submit on the last tap,** so there's no chance to change your mind. Consider an optional "Check" button for kids' levels.

---

## 8. Growth (needed for "viral")

**Already done:** spoiler-free daily share text.

- [ ] **P1 · S** **Share preview image.** Shared links show the 512 px app icon (`og:image`). Make a proper 1200×630 card image for the daily puzzle.
- [ ] **P1 · M** **"Challenge a friend" links**: send the exact same board to someone. The seeded grids from multiplayer already make this possible without accounts.
- [ ] **P1 · M** **Teacher class link**: one link gives a class the same puzzle set, no sign-in, with a simple results view. Teachers bring 30 kids each; this is the most realistic way to reach students.
- [ ] **P2 · S** Search engine basics: `robots.txt`, `sitemap.xml`, a landing section that explains the game to parents.
- [ ] **P2 · S** Press kit: logo, screenshots, colour palette (EPIC-51.01).
- [ ] **P2 · M** Translations: English plus 2 languages (EPIC-49). Worth doing before outreach to schools outside English-speaking countries.

---

## 9. Native app (APK / iOS), optional

- [ ] **P2 · S** Capacitor is configured (`capacitor.config.ts`), but there's no `android/` or `ios/` folder yet, and no Android SDK is installed on this machine.
- [ ] **P2 · M** Store requirements: signing key (back it up; losing it means you can never update the app), store listing, screenshots, a privacy "data safety" form, and a content rating. Kids' apps face stricter review (Google Play "Families" policy).

---

## 10. Documentation is out of sync

The docs disagree with each other and with the code. Fix these before outside contributors or reviewers rely on them.

- [ ] **P1 · S** **BACKLOG.md marks unsafe or incomplete work as done:**
  - EPIC-29.01 (ratings computed in the browser and writable by the player, see §2);
  - EPIC-31.01 (daily leaderboard trusts browser times);
  - EPIC-32.03 (kids path: no verification email is ever sent);
  - EPIC-32.01 (account deletion: nothing actually deletes data);
  - EPIC-41.01 (anti-cheat: one under-400 ms check).

  Reopen them with a note pointing to this checklist.

- [ ] **P1 · S** **ROADMAP.md lists every Phase 3 and 4 epic as not started (`[ ]`),** while BACKLOG.md marks most of their tasks done. Phase 2 says "targeting v0.3.0", but `package.json` is 0.2.0. Update the phase tables and the release calendar.
- [ ] **P1 · S** **CHANGELOG.md is missing this round of work:** gameplay fixes, Learn redesign, sound and haptics, board themes, daily share, weekly daily difficulty, error reporting, GitHub Pages deploy, repo made public.
- [ ] **P1 · XS** **README.md is out of date:** it says v0.1.0, "49 tests across 4 files", "Medium/Hard 4×4", and still says "License pending".
- [ ] **P2 · XS** **DECISIONS.md:** ADR-004 (Supabase) and ADR-005 (Glicko-2) are still "Proposed" though both shipped; mark them Accepted. Add ADRs for "guest-only v1" and "weekly daily-difficulty schedule".
- [ ] **P2 · XS** **REVIEW_2026-05-11.md:** mark the now-fixed items as fixed (Medium ≈ Hard, no within-game ramp, duplicate targets, Time Attack rebuilding the grid). Otherwise it reads as still open.
- [ ] **P2 · XS** **`bingo-development-prompt.md`** (repo root) is the original build prompt and describes a different project layout. Move it to `docs/archive/` so new readers don't treat it as current.
- [ ] **P2 · XS** **Backlog items that no longer make sense:** EPIC-23 (IndexedDB progress; localStorage works and the app is offline-first already); EPIC-38/39 (spectating, chat: already "cancelled this milestone"). Mark them cancelled or move them post-launch.

---

## 11. Launch day

- [ ] Version bump + CHANGELOG entry; tag the release.
- [ ] Deploy from CI, not from a laptop.
- [ ] Smoke test on the live site: Learn level → result → theme unlock; daily → share; Time Attack; offline reload; install to home screen.
- [ ] Error reports arriving; analytics recording (if opted in).
- [ ] Supabase on a paid plan or keep-alive; backups on.
- [ ] README updated (it still says v0.1.0 / 49 tests).
