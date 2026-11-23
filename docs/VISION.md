# Vision

## What Grid Genius is

**Grid Genius** is a free, open math-puzzle platform. Players tap numbers and operators along straight, adjacent paths on a grid to hit a target number. It is to **mental arithmetic** what lichess is to chess: a clean, fast, ad-free home where casual learners and competitive players can both feel at home.

## Who it's for

| Persona                | Needs                                                               | How we serve them                                                                                     |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Curious Kid** (5–12) | Friendly, low-pressure practice; visible progress; parents trust it | Kids Mode: large tiles, no chat, no rating, sticker-style rewards, parental settings                  |
| **Casual Adult**       | A 2-minute brain break; works offline; no accounts required         | PWA, guest play, Quick Game, Daily Puzzle                                                             |
| **Competitive Player** | Rating, leaderboards, head-to-head, tournaments, spectating         | Glicko rating per mode, arenas, leaderboards, spectating                                              |
| **Educator / Parent**  | Curated drill sets, class assignments, progress reports             | Puzzle themes (addition, subtraction, multiplication tables), shareable links, classroom mode (later) |

A single account can fluidly switch between **Kids Mode** and **Adult Mode** — they are first-class siblings, not a watered-down version of one another.

## Two doors into the game: Learn and Play

The home screen has **two tabs** (see ADR-003):

- **Learn** — a Duolingo-style guided path of small, themed levels (`+` only → `+ -` → `+ - *` → bigger grids). Designed for the _Curious Kid_, _Casual Adult_, and _Educator/Parent_ personas: one obvious next step, accuracy-based stars, dignified XP and streak (no freezes, no notifications, no manipulative loops). Default tab on first visit.
- **Play** — the lichess-style lobby of free-play modes (Quick Game, Classic, Time Attack, eventually Endless and Puzzle). Designed for the _Competitive Player_: pick a mode, pick a difficulty, go. No imposed progression.

The two tabs share the same engine (`gameStore` / `ButtonGameBoard`); only the entry point and the post-game screen differ. Future Phase-2+ work (Puzzles, Multiplayer, Tournaments) lives under **Play** (and as standalone routes like `/daily`); new structured curricula live under **Learn**.

## Guiding principles (the lichess north stars)

1. **Free forever, no ads, no dark patterns.** Optional donations only.
2. **Open source.** Public roadmap, public repo, public issues. Community PRs welcome.
3. **Fast.** Sub-second TTI on mobile; instant moves; sub-100 ms server roundtrips when we have a server.
4. **Accessible by default.** Keyboard-first, screen-reader-friendly, color-blind safe, respects `prefers-reduced-motion`.
5. **Works offline.** Single-player and Daily Puzzle never need the network.
6. **Privacy-respecting.** No third-party trackers. Self-hosted analytics only, opt-in.
7. **Honest difficulty.** No artificial loss-streaks to drive engagement. Rating reflects true skill.
8. **Spectating is a feature, not an afterthought.** Every public game is watchable.

## The four lichess-inspired pillars

We organize the product (and the roadmap) around four pillars. Each pillar maps to lichess concepts and to a phase in `ROADMAP.md`.

### Pillar 1 — Puzzles (lichess `/training`)

A growing library of curated and procedurally generated puzzles, organized by **themes** (addition only, mixed ops, multiplication tables, parity, primes, large grids…) and **difficulty rating** (Glicko per puzzle). Players have their own **puzzle rating** that adjusts as they solve. Includes:

- **Daily Puzzle** — one shared puzzle per day, same for everyone (seeded grid).
- **Puzzle Streak** — chain of correct solves; one mistake ends the run.
- **Puzzle Storm** — solve as many as possible in 3 minutes; harder = more points.
- **Puzzle Racer** — head-to-head against bots or friends on the same puzzle set.
- **Puzzle Dashboard** — per-theme strengths and weaknesses, history graph.

### Pillar 2 — Multiplayer (lichess play)

Real-time head-to-head where two players race the same grid against the same target sequence.

- **Lobby + matchmaking** by rating bracket.
- **Challenge a friend** by share link.
- **Spectator mode** for any public live game.
- **Watch top players** TV-style channel.
- **Rematch** with one click.
- **In-game chat** (kids mode: emote-only / disabled).

### Pillar 3 — Tournaments (lichess arenas + swiss)

- **Arena** — fixed window (e.g. 1h), keep playing back-to-back games, points + streak bonuses, leaderboard.
- **Swiss** — fixed number of rounds, paired by score, single-elimination optional.
- **Hourly opens** for each game mode.
- **Shields** — monthly themed tournaments with persistent badges.
- **Team tournaments** (later) — clubs/classrooms compete.

### Pillar 4 — UX polish (the "feels like lichess" layer)

This pillar runs through every phase, not after them.

- **Zen mode** — hide chrome, just the grid.
- **Board themes & piece sets** equivalent — tile/operator skins.
- **Light, Dark, System themes**.
- **Keyboard play** — arrow keys to focus, Enter to select, number keys to pick operator.
- **Blind/low-vision mode** — full screen-reader narration of grid state and selections.
- **Mobile-first** — installable PWA, haptics opt-in, gestures considered (taps remain canonical).
- **Sound effects** with global mute, respecting OS volume.

## Non-goals

- Not a calculator. Not a worksheet generator.
- Not a social network. No follows-as-feed, no posts, no DMs (forums later, maybe).
- Not crypto / NFT / Web3 anything.
- Not training data for third-party AI; user data stays with the user.

## Success metrics (12-month, post-launch)

- **Engagement**: ≥ 3 puzzles solved per active session; ≥ 30% D7 retention for signed-in users.
- **Reach**: 10k MAU, 50k puzzles solved/day.
- **Quality**: Lighthouse PWA + Performance + Accessibility ≥ 95 on mobile.
- **Reliability**: 99.9% uptime once Phase 2 ships; zero P0 outages > 30 min.
- **Trust**: < 1% spam/abuse reports per session in multiplayer; moderation SLA < 24h.

## Out of scope for v1

- Native iOS/Android apps (PWA covers this).
- Marketplace / cosmetics economy.
- Live coaching marketplace.
- Video lessons.
