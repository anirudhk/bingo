# Grid Genius

A free, open math-puzzle game in the browser. Tap numbers and operators along straight, adjacent paths on a grid to hit a target.

> Inspired by [lichess.org](https://lichess.org) — free, open, no ads, no dark patterns.

[**▶ Play it (GitHub Pages)**](https://anirudhk.github.io/bingo)

## Status

`v0.2.0` — single-player game, Learn path, Daily Puzzle and installable PWA are live as a guest-only build. Accounts, leaderboards and multiplayer are hardened but wait on the database setup. See [`docs/LAUNCH_CHECKLIST.md`](./docs/LAUNCH_CHECKLIST.md) for what's left before launch and [`docs/ROADMAP.md`](./docs/ROADMAP.md) for the longer plan.

## Quick start

```bash
npm install
npm run dev              # starts Vite at http://localhost:3000
npm run build            # type-checks + bundles to dist/
npm run preview          # serves the production build locally
npm run lint             # ESLint with --max-warnings 0
npm test                 # Vitest unit tests
npm run db:test          # Migrations + database security checks on a scratch Postgres
npm run db:audit-live    # Probe the deployed Supabase project with the public key
npm run test:watch       # Vitest in watch mode
npm run test:coverage    # Coverage report (v8)
npm run deploy           # builds + publishes to gh-pages
```

Node 20 or newer is recommended.

## Documentation

Everything lives in [`docs/`](./docs/README.md):

| File                                        | What it's for                                            |
| ------------------------------------------- | -------------------------------------------------------- |
| [`VISION.md`](./docs/VISION.md)             | What Grid Genius is and who it's for                     |
| [`ROADMAP.md`](./docs/ROADMAP.md)           | Phases (P0 → P5), epics, exit criteria, release calendar |
| [`BACKLOG.md`](./docs/BACKLOG.md)           | The active task list (checkboxes)                        |
| [`CHANGELOG.md`](./docs/CHANGELOG.md)       | Keep-a-Changelog history                                 |
| [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Current and target architecture per phase                |
| [`DECISIONS.md`](./docs/DECISIONS.md)       | Architecture Decision Records (ADRs)                     |
| [`GLOSSARY.md`](./docs/GLOSSARY.md)         | Domain terms                                             |

## Tech stack

React 18 · TypeScript (strict) · Vite 4 · Tailwind CSS 3 · Zustand 4 · React Router 6 · Framer Motion 10 · `vite-plugin-pwa` · Vitest 4 + React Testing Library.

Deployed as an installable PWA to GitHub Pages under the `/bingo/` base path.

## How the game works

1. Follow the **Learn** path (25 levels), play the **Daily Puzzle**, or pick a **Play** mode: Quick Game (5 quick easy rounds), Time Attack (60 seconds, a new grid every round) or Classic (5 rounds).
2. The board shows a grid of numbers (3×3 for Easy, 4×4 for Medium/Hard, 5×5 on later Learn levels) with operators between adjacent tiles. On Hard, each target has exactly one solving path.
3. Tap a tile, then an operator, then the next adjacent tile, alternating until you've used the right number of tiles for your difficulty.
4. The expression is evaluated **left-to-right (no operator precedence)** — match the displayed target to score.
5. **Hint** reveals one valid solution (it costs points, and a star on Learn levels). **Clear** resets your selection.

## Project layout

```text
src/
├── App.tsx              Routes & top-level state
├── main.tsx             React mount
├── index.css            Tailwind + globals
├── constants/game.ts    Per-difficulty configs
├── types/game.ts        Domain types
├── store/gameStore.ts   Zustand session store
├── utils/
│   ├── calculator.ts    Pure: path eval, validation, formatting
│   ├── gridGenerator.ts Pure: grid + combinations + targets
│   └── logger.ts        Dev-only logger
├── components/
│   ├── GameBoard/       Active play surface (ButtonGameBoard + tile/operator)
│   └── UI/              Lobby screens, results, feedback, timers, install prompt
└── test/setup.ts        Vitest setup (jsdom shims, jest-dom matchers)
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for dev setup, conventions, and how the docs are kept in sync with the code.

The repo follows the workflow described in [`docs/README.md`](./docs/README.md): when you start work, flip the matching task in [`BACKLOG.md`](./docs/BACKLOG.md) to `[~]`; when you finish, flip to `[x]` and add an entry under "Unreleased" in [`CHANGELOG.md`](./docs/CHANGELOG.md).

## License

License pending — see [ADR-001](./docs/DECISIONS.md#adr-001--open-source-license--monetization-model). Until that's resolved the repo is "all rights reserved" and external PRs cannot be accepted.
